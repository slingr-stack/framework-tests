/**
 * RescheduleTask — Example 1: Lightweight params, all fields from constructor probe
 *
 * Demonstrates the most extreme form of the lightweight model feature: none of
 * the three params fields carry ANY decorator at all — not even @Field(). The
 * framework discovers all three by running the constructor probe at registration
 * time and infers each field type from the initializer value:
 *
 *   extensionDays: number = 7    →  probe sees 7  (integer)  →  FIELD_TYPE_INTEGER
 *   reason:        string = ''   →  probe sees '' (string)   →  FIELD_TYPE_TEXT
 *   notifyAssignee:boolean = true →  probe sees true (boolean) → FIELD_TYPE_BOOLEAN
 *
 * This makes the model as concise as a plain TypeScript interface while retaining
 * full Drumr field registration (UI form, GraphQL args, validation, serialization).
 *
 * Compare this to the traditional approach that required:
 *
 *   @IntegerField({ required: false, min: 1, max: 365 })
 *   extensionDays!: number | null;
 *
 *   @TextField({ required: false, maxLength: 500 })
 *   reason!: string | null;
 *
 *   @BooleanField({ required: false })
 *   notifyAssignee!: boolean | null;
 *
 * The lightweight form is ideal when the field needs no extra options beyond its
 * basic type.  Add a full decorator only when you need maxLength, regex, label
 * overrides, or other field-specific configuration.
 */
import {
	Action,
	BaseDataModel,
	DataModel,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

// ─── Params model — zero decorators, all types from constructor probe ─────────

/**
 * Parameters for the RescheduleTask action.
 *
 * No @Field(), @IntegerField(), @BooleanField(), or @TextField() decorators.
 * The framework's constructor probe discovers these fields at @DataModel()
 * decoration time and infers the Drumr field type from the default value:
 *
 *   7    → integer
 *   ''   → text
 *   true → boolean
 */
@DataModel({
	ui: { crud: { api: 'gql' } },
})
export class RescheduleTaskParams extends BaseDataModel {
	/**
	 * Number of days to push the due date forward.
	 * Inferred as `integer` from the default value `7`.
	 * No decorator needed.
	 */
	extensionDays: number = 7;

	/**
	 * Optional reason for rescheduling. Appended to the task description.
	 * Inferred as `text` from the default value `''`.
	 */
	reason: string = '';

	/**
	 * Whether to send an email notification to the current assignee.
	 * Inferred as `boolean` from the default value `true`.
	 */
	notifyAssignee: boolean = true;
}

// ─── Action ───────────────────────────────────────────────────────────────────

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: RescheduleTaskParams,
	returns: Task,
})
export class RescheduleTask extends ObjectAction<
	Task,
	RescheduleTaskParams,
	Task
> {
	constructor(private ds: MainDs) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status === TaskStatus.Done) {
			return `"${task.title}" is already done — cannot reschedule`;
		}
		if (task.status === TaskStatus.Blocked) {
			return `"${task.title}" is blocked — resolve the blocker before rescheduling`;
		}
		return true;
	}

	protected async execute(
		task: Task,
		params: RescheduleTaskParams,
	): Promise<Task> {
		const days = params.extensionDays ?? 7;

		// Extend the due date (or set it to N days from now if not previously set)
		const base = task.dueDate ? new Date(task.dueDate) : new Date();
		base.setDate(base.getDate() + days);
		task.dueDate = base.toISOString().split('T')[0]; // ISO date string (YYYY-MM-DD)

		// Append reason to description when provided
		const reason = params.reason?.trim();
		if (reason) {
			const prefix = task.description ? `${task.description}\n\n` : '';
			task.description = `${prefix}[Rescheduled +${days}d] ${reason}`;
		}

		await this.ds.save(task);

		if (params.notifyAssignee && task.assignee) {
			// In a real app this would call an EmailService. We log here to keep
			// the example focused on the lightweight-model feature.
			logger.info(
				`[RescheduleTask] Would notify assignee ${task.assignee.id} for task "${task.title}"`,
			);
		}

		logger.info(
			`[RescheduleTask] Rescheduled "${task.title}" → new due date: ${task.dueDate}`,
		);
		return task;
	}
}
