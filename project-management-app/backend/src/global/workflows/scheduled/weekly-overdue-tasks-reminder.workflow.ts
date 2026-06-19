import {
	BaseDataModel,
	BaseScheduledWorkflow,
	DataModel,
	dateToDateString,
	IntegerField,
	logger,
	TextField,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

@DataModel()
export class OverdueTasksReport extends BaseDataModel {
	@IntegerField({ required: true })
	totalOverdueTasks!: number;

	@IntegerField({ required: true })
	highPriorityCount!: number;

	@IntegerField({ required: true })
	unassignedCount!: number;

	@TextField()
	summary!: string | null;

	@TextField()
	overdueTaskIds!: string[];
}

@Workflow({
	schedule: {
		cron: '0 9 * * 1',
		timezone: 'America/New_York',
	},
})
export class WeeklyOverdueTasksReminderWorkflow extends BaseScheduledWorkflow {
	constructor(private ds: MainDs) {
		super();
	}

	async execute(): Promise<void> {
		const today = dateToDateString(new Date());
		const overdueTasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: {
					dueDate: { lt: today },
					status: { nin: [TaskStatus.Done, TaskStatus.Blocked] },
				},
				orderBy: { id: 'ASC' },
			},
			async (task) => {
				overdueTasks.push(task);
				return true;
			},
		);

		const highPriorityCount = overdueTasks.filter(
			(t: Task) =>
				t.priority === TaskPriority.High ||
				t.priority === TaskPriority.Urgent ||
				t.priority === TaskPriority.Critical,
		).length;

		const unassignedCount = overdueTasks.filter(
			(t: Task) => !t.assignee,
		).length;

		const report = new OverdueTasksReport();
		report.totalOverdueTasks = overdueTasks.length;
		report.highPriorityCount = highPriorityCount;
		report.unassignedCount = unassignedCount;
		report.overdueTaskIds = overdueTasks.map((t: Task) => t.id);
		report.summary = `Found ${overdueTasks.length} overdue tasks (${highPriorityCount} high priority, ${unassignedCount} unassigned)`;

		logger.info(`[Weekly Overdue Tasks] ${report.summary}`);
		return;
	}
}
