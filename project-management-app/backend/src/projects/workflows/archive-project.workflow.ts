import {
	BaseWorkflow,
	logger,
	Step,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { NotifyStakeholdersWorkflow } from '@/global/workflows/notify-stakeholders.workflow';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

interface ArchiveCheckResult {
	projectId: string;
	projectName: string;
	openTaskCount: number;
}

interface ArchivedTasksSummary {
	archivedCount: number;
	taskIds: string[];
}

@Workflow()
export class ArchiveProjectWorkflow extends BaseWorkflow {
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
	) {
		super();
	}

	async execute(project: Project): Promise<Project> {
		this.reportProgress(5);

		const check = await this.callStep(this.checkProjectState, project.id);
		this.reportProgress(30);
		logger.info(
			`[ArchiveProject] ${check.projectName} - ${check.openTaskCount} open task(s) will be closed`,
		);

		const taskSummary = await this.callStep(this.archiveOpenTasks, project.id);
		this.reportProgress(75);
		logger.info(
			`[ArchiveProject] archived ${taskSummary.archivedCount} task(s): ${taskSummary.taskIds.join(', ')}`,
		);

		const archivedProject = await this.callStep(
			this.archiveProject,
			project.id,
		);
		this.reportProgress(90);

		const notification = await this.callSubworkflow(
			NotifyStakeholdersWorkflow,
			{
				projectId: archivedProject.id,
				message:
					`Project "${archivedProject.name}" has been archived. ` +
					`${taskSummary.archivedCount} open task(s) were automatically closed.`,
			},
		);
		this.reportProgress(100);

		this.activityLog.addEntry(
			`Project "${archivedProject.name}" archived - ` +
				`${taskSummary.archivedCount} task(s) closed automatically, ` +
				`${notification.count} stakeholder(s) notified`,
		);

		return archivedProject;
	}

	private async collectProjectTasks(projectId: string): Promise<Task[]> {
		const tasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: { project: { id: { eq: projectId } } },
				orderBy: { id: 'ASC' },
			},
			async (task) => {
				tasks.push(task);
				return true;
			},
		);

		return tasks;
	}

	@Step({ transactional: false })
	async checkProjectState(projectId: string): Promise<ArchiveCheckResult> {
		const project = await this.ds.findOneBy(Project, { id: projectId });
		if (!project) {
			throw new Error(`Project ${projectId} not found`);
		}
		if (project.isArchived) {
			throw new Error(
				`Project "${project.name}" was already archived by another request`,
			);
		}

		const tasks = await this.collectProjectTasks(projectId);
		const openTaskCount = tasks.filter(
			(t) => t.status !== TaskStatus.Done,
		).length;

		logger.info(
			`[ArchiveProject] Step 1 OK - "${project.name}" has ${openTaskCount} open task(s)`,
		);
		return { projectId, projectName: project.name, openTaskCount };
	}

	@Step({ transactional: true })
	async archiveOpenTasks(projectId: string): Promise<ArchivedTasksSummary> {
		const tasks = await this.collectProjectTasks(projectId);

		const openTasks = tasks.filter((t) => t.status !== TaskStatus.Done);
		const taskIds: string[] = [];

		for (const task of openTasks) {
			task.status = TaskStatus.Blocked;
			await this.ds.save(task);
			taskIds.push(task.id);
		}

		logger.info(
			`[ArchiveProject] Step 2 OK - closed ${taskIds.length} task(s)`,
		);
		return { archivedCount: taskIds.length, taskIds };
	}

	@Step({ transactional: true })
	async archiveProject(projectId: string): Promise<Project> {
		const project = await this.ds.findOneBy(Project, { id: projectId });
		if (!project) {
			throw new Error(`Project ${projectId} not found during archive step`);
		}

		project.isArchived = true;

		if (project.status === ProjectStatus.Active) {
			project.status = ProjectStatus.Completed;
			project.completionPercentage = 100;
		}

		await this.ds.save(project);
		logger.info(
			`[ArchiveProject] Step 3 OK - project "${project.name}" archived`,
		);
		return project;
	}
}
