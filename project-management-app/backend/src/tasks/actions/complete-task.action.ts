import {
	Action,
	BaseDataModel,
	Context,
	DataModel,
	dateToDateString,
	logger,
	ObjectAction,
	TextField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { RequestAuditService } from '@/global/services/request-audit.service';
import { Note } from '@/tasks/data-models/note.data-model';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class CompleteTaskParams extends BaseDataModel {
	@TextField({
		maxLength: 1000,
		minLength: 3,
		docs: 'Completion note',
		required: true,
	})
	note!: string;
}

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: CompleteTaskParams,
	returns: Task,
})
export class CompleteTask extends ObjectAction<Task, CompleteTaskParams, Task> {
	/**
	 * Constructor injection example using all three DI scopes:
	 *
	 * - activityLog  (singleton)  — shared app-wide; accumulates entries across all users/requests
	 * - requestAudit (request)    — fresh per request; tracks steps within this execution only
	 * - context      (request)    — injectable context providing access to the current user
	 * - ds           (singleton)  — injectable data source
	 */
	constructor(
		private activityLog: ActivityLogService,
		private requestAudit: RequestAuditService,
		private context: Context,
		private ds: MainDs,
	) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status === TaskStatus.Done) {
			return 'Task is already completed';
		}
		if (task.status === TaskStatus.Blocked) {
			return 'Cannot complete a blocked task';
		}
		return true;
	}

	override async execute(
		task: Task,
		params: CompleteTaskParams,
	): Promise<Task> {
		this.requestAudit.addStep('complete-task: begin');

		task.status = TaskStatus.Done;
		task.completedAt = dateToDateString(new Date());

		if (params.note) {
			const note = new Note();
			note.title = 'Completion note';
			note.note = params.note;
			note.createdAt = new Date();
			const currentUser = await this.ds.findOneBy(User, {
				id: this.context.user?.id,
			});
			if (currentUser) {
				note.createdBy = currentUser;
			} else {
				logger.warn(
					'Could not find current user to attribute completion note. User: ' +
						JSON.stringify(this.context.user),
				);
			}
			task.notes = task.notes ? [...task.notes, note] : [note];
		}

		await this.ds.save(task);
		this.requestAudit.addStep('complete-task: saved');

		// Record in the shared singleton log (visible to all users via GetActivityLog)
		this.activityLog.addEntry(
			`Task "${task.title}" completed (id: ${task.id})`,
		);

		logger.info(
			`[CompleteTask] request audit: ${this.requestAudit.getSummary()}`,
		);

		return task;
	}
}
