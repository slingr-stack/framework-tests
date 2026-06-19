import {
	BaseDataModel,
	BaseScheduledWorkflow,
	DataModel,
	DateTimeField,
	dateToDateString,
	IntegerField,
	logger,
	TextField,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@DataModel()
export class InactiveTasksCleanupResult extends BaseDataModel {
	@DateTimeField({ required: true })
	cleanupDate!: Date;

	@IntegerField({ required: true })
	inactiveTasksFound!: number;

	@IntegerField({ required: true })
	tasksProcessed!: number;

	@TextField()
	processedTaskIds!: string[];

	@TextField()
	summary!: string | null;
}

@Workflow({
	schedule: {
		cron: '0 2 * * *',
		timezone: 'UTC',
	},
})
export class DailyInactiveTasksCleanupWorkflow extends BaseScheduledWorkflow {
	constructor(private ds: MainDs) {
		super();
	}

	async execute(): Promise<void> {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const thresholdDate = dateToDateString(thirtyDaysAgo);
		const blockedTasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: {
					status: TaskStatus.Blocked,
					updatedAt: { lt: thresholdDate },
				},
				orderBy: { id: 'ASC' },
			},
			async (task) => {
				blockedTasks.push(task);
				return true;
			},
		);

		let processedCount = 0;
		const processedTaskIds: string[] = [];

		for (const task of blockedTasks) {
			if (!task.title.includes('[INACTIVE]')) {
				task.title = `[INACTIVE] ${task.title}`;
				await this.ds.save(task);
				processedCount++;
				processedTaskIds.push(task.id);
			}
		}

		const result = new InactiveTasksCleanupResult();
		result.cleanupDate = new Date();
		result.inactiveTasksFound = blockedTasks.length;
		result.tasksProcessed = processedCount;
		result.processedTaskIds = processedTaskIds;
		result.summary = `Found ${blockedTasks.length} inactive tasks, flagged ${processedCount} for review`;

		logger.info(`[Daily Inactive Tasks Cleanup] ${result.summary}`);
		return;
	}
}
