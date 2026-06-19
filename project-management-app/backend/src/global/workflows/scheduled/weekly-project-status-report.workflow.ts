import {
	BaseDataModel,
	BaseScheduledWorkflow,
	DataModel,
	DateTimeField,
	IntegerField,
	logger,
	TextField,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

@DataModel()
export class WeeklyProjectReport extends BaseDataModel {
	@DateTimeField({ required: true })
	reportDate!: Date;

	@IntegerField({ required: true })
	totalActiveProjects!: number;

	@IntegerField({ required: true })
	projectsOnTrack!: number;

	@IntegerField({ required: true })
	projectsAtRisk!: number;

	@IntegerField({ required: true })
	totalActiveTasks!: number;

	@TextField()
	summary!: string | null;
}

@Workflow({
	schedule: {
		cron: '0 8 * * 1',
		timezone: 'America/New_York',
	},
})
export class WeeklyProjectStatusReportWorkflow extends BaseScheduledWorkflow {
	constructor(private ds: MainDs) {
		super();
	}

	private async collectActiveProjects(): Promise<Project[]> {
		const projects: Project[] = [];

		await this.ds.findAndPaginate(
			Project,
			{
				where: {
					status: { in: [ProjectStatus.Active, ProjectStatus.Planning] },
					isArchived: false,
				},
				orderBy: { id: 'ASC' },
			},
			async (project) => {
				projects.push(project);
				return true;
			},
		);

		return projects;
	}

	private async collectActiveProjectTasks(projectId: string): Promise<Task[]> {
		const tasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: {
					project: { id: { eq: projectId } },
					status: { nin: [TaskStatus.Done] },
				},
				orderBy: { id: 'ASC' },
			},
			async (task) => {
				tasks.push(task);
				return true;
			},
		);

		return tasks;
	}

	async execute(): Promise<void> {
		const activeProjects = await this.collectActiveProjects();

		let projectsOnTrack = 0;
		let projectsAtRisk = 0;
		let totalActiveTasks = 0;

		for (const project of activeProjects) {
			const projectTasks = await this.collectActiveProjectTasks(project.id);

			totalActiveTasks += projectTasks.length;

			const overdueTasks = projectTasks.filter((t) => {
				if (t.dueDate) {
					const dueDate = new Date(t.dueDate);
					return dueDate < new Date() && t.status !== TaskStatus.Done;
				}
				return false;
			});

			if (
				(project.completionPercentage && project.completionPercentage >= 50) ||
				overdueTasks.length === 0
			) {
				projectsOnTrack++;
			} else {
				projectsAtRisk++;
			}
		}

		const report = new WeeklyProjectReport();
		report.reportDate = new Date();
		report.totalActiveProjects = activeProjects.length;
		report.projectsOnTrack = projectsOnTrack;
		report.projectsAtRisk = projectsAtRisk;
		report.totalActiveTasks = totalActiveTasks;
		report.summary = `${activeProjects.length} active projects: ${projectsOnTrack} on track, ${projectsAtRisk} at risk. ${totalActiveTasks} active tasks.`;

		logger.info(`[Weekly Project Status Report] ${report.summary}`);
		return;
	}
}
