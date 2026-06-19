import {
	Action,
	dateToDateString,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { RequestAuditService } from '@/global/services/request-audit.service';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	returns: Task,
})
export class StartTask extends ObjectAction<Task, void, Task> {
	/**
	 * Constructor injection example using all three DI scopes:
	 *
	 * - activityLog  (singleton)  — shared app-wide; accumulates entries across all users/requests
	 * - requestAudit (request)    — fresh per request; tracks steps within this execution only
	 * - ds           (singleton)  — injectable data source
	 */
	constructor(
		private activityLog: ActivityLogService,
		private requestAudit: RequestAuditService,
		private ds: MainDs,
	) {
		super();
	}

	override async canExecute(task: Task): Promise<boolean | string> {
		if (task.status !== TaskStatus.ToDo) {
			return 'Task must be in ToDo status to start';
		}
		if (!task.assignee) {
			return 'Task must be assigned before starting';
		}
		return true;
	}

	async execute(task: Task): Promise<Task> {
		this.requestAudit.addStep('start-task: begin');

		task.status = TaskStatus.InProgress;
		const dateString = dateToDateString(new Date());
		task.startedAt = dateString;
		await this.ds.save(task);

		this.requestAudit.addStep('start-task: saved');

		// Record in the shared singleton log (visible to all users via GetActivityLog)
		this.activityLog.addEntry(`Task "${task.title}" started (id: ${task.id})`);

		logger.info(`[StartTask] request audit: ${this.requestAudit.getSummary()}`);

		return task;
	}
}
