import {
	BaseDataModel,
	BaseWorkflow,
	BooleanField,
	DataModel,
	logger,
	Step,
	TextField,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@DataModel({
	ui: { crud: { api: 'gql' } },
})
export class ApproveTaskParams extends BaseDataModel {
	@TextField({
		maxLength: 500,
		docs: 'Optional approval comment recorded alongside the status change.',
	})
	comment: string | null = null;

	@BooleanField()
	executeInWorkFlow = true;
}

@Workflow()
export class ApproveTaskWorkflow extends BaseWorkflow {
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
	) {
		super();
	}

	async execute(input: {
		task: Task;
		params: ApproveTaskParams;
	}): Promise<Task> {
		const { task, params } = input;
		const freshTask = await this.callStep(this.validateReview, task.id);

		await this.callStep(this.recordApproval, {
			taskId: task.id,
			comment: params.comment,
		});

		const completed = await this.callStep(this.completeTask, {
			taskId: freshTask.id,
			comment: params.comment,
		});

		return completed;
	}

	@Step({ transactional: false })
	async validateReview(taskId: string): Promise<Task> {
		const task = await this.ds.findOneBy(Task, { id: taskId });
		if (!task) {
			throw new Error(`Task ${taskId} not found`);
		}
		if (task.status !== TaskStatus.InReview) {
			throw new Error(
				`Task ${taskId} is no longer In Review (current status: ${task.status}). ` +
					'Another user may have changed it while this workflow was queued.',
			);
		}
		logger.info(`[ApproveTask] Step 1 OK - task ${taskId} confirmed In Review`);
		return task;
	}

	@Step({ transactional: false })
	async recordApproval(input: {
		taskId: string;
		comment: string | null;
	}): Promise<void> {
		const entry =
			`Task ${input.taskId} approved` +
			(input.comment ? `: "${input.comment}"` : ' (no comment)');
		this.activityLog.addEntry(entry);
		logger.info(`[ApproveTask] Step 2 OK - approval recorded: ${entry}`);
	}

	@Step({ transactional: true })
	async completeTask(input: {
		taskId: string;
		comment: string | null;
	}): Promise<Task> {
		const task = await this.ds.findOneBy(Task, { id: input.taskId });
		if (!task) {
			throw new Error(`Task ${input.taskId} not found during completion step`);
		}

		task.status = TaskStatus.Done;
		task.completedAt = new Date().toISOString();

		await this.ds.save(task);
		logger.info(`[ApproveTask] Step 3 OK - task ${task.id} marked as Done`);
		return task;
	}
}
