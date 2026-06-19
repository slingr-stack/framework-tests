import {
	BaseDataModel,
	BaseScheduledWorkflow,
	DataModel,
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
export class ProgressUpdateResult extends BaseDataModel {
	@IntegerField({ required: true })
	projectsUpdated!: number;

	@IntegerField({ required: true })
	projectsProcessed!: number;

	@TextField()
	summary!: string | null;

	@TextField()
	updatedProjectCodes!: string[];
}

@Workflow({
	schedule: {
		cron: '0 * * * *',
		timezone: 'UTC',
	},
})
export class HourlyTaskProgressUpdateWorkflow extends BaseScheduledWorkflow {
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

	private async collectProjectTasks(projectId: string): Promise<Task[]> {
		const tasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: {
					project: { id: { eq: projectId } },
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

		let updatedCount = 0;
		const updatedProjectCodes: string[] = [];

		for (const project of activeProjects) {
			const projectTasks = await this.collectProjectTasks(project.id);

			if (projectTasks.length === 0) {
				if (project.completionPercentage !== 0) {
					project.completionPercentage = 0;
					await this.ds.save(project);
					updatedCount++;
					updatedProjectCodes.push(project.code);
				}
				continue;
			}

			const completedTasks = projectTasks.filter(
				(t) => t.status === TaskStatus.Done,
			).length;
			const newPercentage = Math.round(
				(completedTasks / projectTasks.length) * 100,
			);

			if (project.completionPercentage !== newPercentage) {
				project.completionPercentage = newPercentage;
				await this.ds.save(project);
				updatedCount++;
				updatedProjectCodes.push(project.code);
			}
		}

		const result = new ProgressUpdateResult();
		result.projectsProcessed = activeProjects.length;
		result.projectsUpdated = updatedCount;
		result.updatedProjectCodes = updatedProjectCodes;
		result.summary = `Processed ${activeProjects.length} projects, updated ${updatedCount} completion percentages`;

		logger.info(`[Hourly Progress Update] ${result.summary}`);
		return;
	}
}
