import {
	Action,
	BaseDataModel,
	DataModel,
	DependencyContainer,
	Inject,
	logger,
	ObjectAction,
	ReferenceField,
	referenceDropdown,
	referenceLabel,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import type { EmailService } from '@/global/services/email.service';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import { Role, User } from '@/users/data-models/user.data-model';

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class AssignTaskParams extends BaseDataModel {
	/**
	 * The user to assign the task to.
	 *
	 * `defaultValue` demonstrates the async default-value feature: when the action
	 * form opens without a pre-selected assignee, the framework calls this async
	 * function and pre-fills the field with the first available manager found in
	 * the database.  The user can still override the value before submitting.
	 */
	@ReferenceField({
		required: true,
		type: () => User,
		docs: 'User to assign the task to. Defaults to the first available manager.',
		defaultValue: async (): Promise<User | null> => {
			const ds = DependencyContainer.resolve(MainDs);
			const defaultAssignee = await ds
				.getTypeOrmDataSource()
				.getRepository(User)
				.createQueryBuilder('user')
				.innerJoin('user._roles_elements', 'roleEl', 'roleEl.value = :role', {
					role: Role.Manager,
				})
				.getOne();
			return defaultAssignee;
		},
	})
	assignee!: User | null;
}

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: AssignTaskParams,
	returns: Task,
})
export class AssignTask extends ObjectAction<Task, AssignTaskParams, Task> {
	constructor(
		private ds: MainDs,
		@Inject('emailService') private emailService: EmailService,
	) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status === TaskStatus.Done) {
			return 'Cannot reassign a completed task';
		}
		return true;
	}

	override async execute(task: Task, params: AssignTaskParams): Promise<Task> {
		const previousAssignee = task.assignee;
		task.assignee = params.assignee;
		await this.ds.save(task);

		// Notify the new assignee by email (fire-and-forget — a delivery failure
		// should never block the action from completing).
		const assignee = params.assignee;
		const assigneeEmail = assignee?.email;
		if (assignee && assigneeEmail) {
			this.emailService
				.send({
					to: assigneeEmail,
					subject: `You have been assigned to task: ${task.title}`,
					text: this.buildAssignmentEmailText(task, assignee, previousAssignee),
					html: this.buildAssignmentEmailHtml(task, assignee, previousAssignee),
				})
				.catch((err: unknown) => {
					// Log but do not propagate — email failure must not roll back the task update.
					logger.error(
						'[AssignTask] Failed to send assignment notification email',
						{ error: err },
					);
				});
		}

		return task;
	}

	/**
	 * Returns the display name for a user.
	 * Prefers the first+last name combination; falls back to the email address
	 * when no name is available (e.g. when loading a partial user reference).
	 */
	private getDisplayName(user: User): string {
		const first = user.firstName ?? '';
		const last = user.lastName ?? '';
		const full = `${first} ${last}`.trim();
		return full || user.email;
	}

	private buildAssignmentEmailText(
		task: Task,
		assignee: User,
		previousAssignee: User | null,
	): string {
		const greeting = `Hi ${this.getDisplayName(assignee)},`;
		const body = `You have been assigned to the following task:\n\n  Title:  ${task.title}\n  Status: ${task.status}`;
		const previous = previousAssignee
			? `\nPreviously assigned to: ${this.getDisplayName(previousAssignee)}`
			: '';
		return `${greeting}\n\n${body}${previous}\n\nPlease log in to review the details.`;
	}

	private buildAssignmentEmailHtml(
		task: Task,
		assignee: User,
		previousAssignee: User | null,
	): string {
		const previousHtml = previousAssignee
			? `<p>Previously assigned to: <strong>${this.getDisplayName(previousAssignee)}</strong></p>`
			: '';
		return `
      <p>Hi <strong>${this.getDisplayName(assignee)}</strong>,</p>
      <p>You have been assigned to the following task:</p>
      <ul>
        <li><strong>Title:</strong> ${task.title}</li>
        <li><strong>Status:</strong> ${task.status}</li>
      </ul>
      ${previousHtml}
      <p>Please log in to review the details.</p>
    `.trim();
	}
}
