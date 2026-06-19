import {
	Action,
	BaseDataModel,
	DataModel,
	ModelAction,
	type Money,
	MoneyField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { Task } from '@/tasks/data-models/task.data-model';

/**
 * Result model for project statistics.
 *
 * All plain counters are declared as initialised properties — no @IntegerField
 * decorator needed.  The framework's constructor probe discovers them and infers
 * `integer` from the `0` default value.
 *
 * Only `totalBudget` keeps @MoneyField because it carries configuration
 * (decimals, roundingType) that has no sensible default inference.
 */
@DataModel()
export class ProjectStatisticsResult extends BaseDataModel {
	totalProjects = 0;
	planningCount = 0;
	activeCount = 0;
	onHoldCount = 0;
	completedCount = 0;
	cancelledCount = 0;
	lowPriorityCount = 0;
	mediumPriorityCount = 0;
	highPriorityCount = 0;
	criticalPriorityCount = 0;
	averageCompletion = 0;

	@MoneyField({
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Total budget across all projects',
	})
	totalBudget!: Money | null;
}

/**
 * Model action that returns aggregate statistics for all projects.
 * This action is associated with the Project model but operates at the collection level.
 */
@Action({
	type: 'read',
	model: Project,
	api: 'gql',
	returns: ProjectStatisticsResult,
})
export class GetProjectStatistics extends ModelAction<
	Project,
	void,
	ProjectStatisticsResult
> {
	constructor(private ds: MainDs) {
		super();
	}

	private async collectAllProjects(): Promise<Project[]> {
		const projects: Project[] = [];

		await this.ds.findAndPaginate(
			Project,
			{
				where: {},
				orderBy: { id: 'ASC' },
			},
			async (project) => {
				projects.push(project);
				return true;
			},
		);

		return projects;
	}

	protected async execute(): Promise<ProjectStatisticsResult> {
		// Fetch all projects across all pages
		const projects = await this.collectAllProjects();

		// Query tasks by reference instance (validates reference-field querying works)
		if (projects.length > 0) {
			await this.ds.find(Task, {
				where: { project: projects[0] },
			});
		}

		const result = new ProjectStatisticsResult();
		result.totalProjects = projects.length;

		// Count by status
		result.planningCount = projects.filter(
			(p) => p.status === ProjectStatus.Planning,
		).length;
		result.activeCount = projects.filter(
			(p) => p.status === ProjectStatus.Active,
		).length;
		result.onHoldCount = projects.filter(
			(p) => p.status === ProjectStatus.OnHold,
		).length;
		result.completedCount = projects.filter(
			(p) => p.status === ProjectStatus.Completed,
		).length;
		result.cancelledCount = projects.filter(
			(p) => p.status === ProjectStatus.Cancelled,
		).length;

		// Count by priority
		result.lowPriorityCount = projects.filter(
			(p) => p.priority === ProjectPriority.Low,
		).length;
		result.mediumPriorityCount = projects.filter(
			(p) => p.priority === ProjectPriority.Medium,
		).length;
		result.highPriorityCount = projects.filter(
			(p) => p.priority === ProjectPriority.High,
		).length;
		result.criticalPriorityCount = projects.filter(
			(p) => p.priority === ProjectPriority.Critical,
		).length;

		// Calculate total budget (sum of all project budgets)
		const projectBudgets = projects.flatMap((p) =>
			p.budget ? [p.budget] : [],
		);
		if (projectBudgets.length > 0) {
			let totalBudget = projectBudgets[0];
			for (let i = 1; i < projectBudgets.length; i++) {
				totalBudget = totalBudget.plus(projectBudgets[i]);
			}
			result.totalBudget = totalBudget;
		}

		// Calculate average completion for active/in-progress projects
		const activeProjects = projects.filter(
			(p) =>
				p.status === ProjectStatus.Active ||
				p.status === ProjectStatus.Planning,
		);
		if (activeProjects.length > 0) {
			const totalCompletion = activeProjects.reduce(
				(sum, p) => sum + (p.completionPercentage || 0),
				0,
			);
			result.averageCompletion = Math.round(
				totalCompletion / activeProjects.length,
			);
		} else {
			result.averageCompletion = 0;
		}

		return result;
	}
}
