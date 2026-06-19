import {
	Action,
	BaseDataModel,
	DataModel,
	DateTimeField,
	dateToDateString,
	GlobalAction,
	IntegerField,
	type Money,
	MoneyField,
	ReferenceField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

/**
 * Parameters for filtering dashboard data
 */
@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class DashboardFilters extends BaseDataModel {
	@ReferenceField({
		required: false,
		type: () => Project,
		docs: 'Filter by specific project (optional - if not provided, shows all projects)',
	})
	project!: Project | null;

	@DateTimeField({
		required: false,
		docs: 'Start date for filtering data (optional)',
	})
	startDate!: Date | null;

	@DateTimeField({
		required: false,
		docs: 'End date for filtering data (optional)',
	})
	endDate!: Date | null;
}

/**
 * Result model for the dashboard summary
 */
@DataModel()
export class DashboardSummaryResult extends BaseDataModel {
	@IntegerField({ docs: 'Total number of users in the system', required: true })
	totalUsers!: number;

	// Note: Nested models would need @CompositionField, but for simplicity
	// we'll flatten the structure here
	@IntegerField({ docs: 'Total projects', required: true })
	projectsTotal!: number;

	@IntegerField({ docs: 'Active projects', required: true })
	projectsActive!: number;

	@IntegerField({ docs: 'Completed projects', required: true })
	projectsCompleted!: number;

	@IntegerField({ docs: 'Projects on hold', required: true })
	projectsOnHold!: number;

	@IntegerField({ docs: 'Critical priority projects', required: true })
	projectsCritical!: number;

	@IntegerField({ docs: 'Total tasks', required: true })
	tasksTotal!: number;

	@IntegerField({ docs: 'Pending tasks', required: true })
	tasksPending!: number;

	@IntegerField({ docs: 'In progress tasks', required: true })
	tasksInProgress!: number;

	@IntegerField({ docs: 'In review tasks', required: true })
	tasksInReview!: number;

	@IntegerField({ docs: 'Completed tasks', required: true })
	tasksCompleted!: number;

	@IntegerField({ docs: 'Blocked tasks', required: true })
	tasksBlocked!: number;

	@IntegerField({ docs: 'Overdue tasks', required: true })
	tasksOverdue!: number;

	@IntegerField({ docs: 'High priority pending tasks', required: true })
	tasksHighPriorityPending!: number;

	@MoneyField({
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Total budget of active projects',
	})
	totalActiveBudget!: Money | null;
}

/**
 * Global action that returns an application-wide dashboard summary.
 * This action is not tied to any specific model and provides an overview
 * of the entire system state including projects, tasks, and users.
 * Supports optional filtering by project and date range.
 */
@Action({
	type: 'read',
	api: 'gql',
	params: DashboardFilters,
	returns: DashboardSummaryResult,
})
export class GetDashboardSummary extends GlobalAction<
	DashboardFilters,
	DashboardSummaryResult
> {
	constructor(private ds: MainDs) {
		super();
	}

	protected async execute(
		params: DashboardFilters,
	): Promise<DashboardSummaryResult> {
		type QueryFilter = Record<string, unknown>;

		// Build filters for queries
		const projectFilter: QueryFilter = {};
		const taskFilter: QueryFilter = {};

		// Filter by project if specified
		if (params.project) {
			projectFilter.id = { eq: params.project.id };
			taskFilter.project = { id: { eq: params.project.id } };
		}

		// Filter by date range if specified

		if (params.startDate || params.endDate) {
			// For projects, filter by start/end dates
			const projectDateFilter: QueryFilter = {};
			if (params.startDate) {
				projectDateFilter.gte = params.startDate;
			}
			if (params.endDate) {
				projectDateFilter.lte = params.endDate;
			}
			// Projects with startDate or endDate in range
			projectFilter.startDate = projectDateFilter;

			// For tasks, filter by start/end dates
			const taskDateFilter: QueryFilter = {};
			if (params.startDate) {
				taskDateFilter.gte = dateToDateString(params.startDate);
			}
			if (params.endDate) {
				taskDateFilter.lte = dateToDateString(params.endDate);
			}
			// Tasks with startDate or endDate in range
			taskFilter.startedAt = taskDateFilter;
		}
		// Fetch all data in parallel for efficiency
		const [projects, tasks, users] = await Promise.all([
			this.ds.find(Project, { where: projectFilter }),
			this.ds.find(Task, { where: taskFilter }),
			this.ds.find(User, { where: {} }),
		]);

		const result = new DashboardSummaryResult();

		// User count
		result.totalUsers = users.length;

		// Project statistics
		result.projectsTotal = projects.length;
		result.projectsActive = projects.filter(
			(p) => p.status === ProjectStatus.Active,
		).length;
		result.projectsCompleted = projects.filter(
			(p) => p.status === ProjectStatus.Completed,
		).length;
		result.projectsOnHold = projects.filter(
			(p) => p.status === ProjectStatus.OnHold,
		).length;
		result.projectsCritical = projects.filter(
			(p) => p.priority === ProjectPriority.Critical,
		).length;

		// Calculate total budget for active projects
		const activeProjectsWithBudget = projects.filter(
			(p): p is Project & { budget: Money } =>
				p.status === ProjectStatus.Active && p.budget != null,
		);
		if (activeProjectsWithBudget.length > 0) {
			let totalBudget = activeProjectsWithBudget[0].budget;
			for (let i = 1; i < activeProjectsWithBudget.length; i++) {
				totalBudget = totalBudget.plus(activeProjectsWithBudget[i].budget);
			}
			result.totalActiveBudget = totalBudget;
		}

		// Task statistics
		result.tasksTotal = tasks.length;
		result.tasksPending = tasks.filter(
			(t) => t.status === TaskStatus.ToDo,
		).length;
		result.tasksInProgress = tasks.filter(
			(t) => t.status === TaskStatus.InProgress,
		).length;
		result.tasksInReview = tasks.filter(
			(t) => t.status === TaskStatus.InReview,
		).length;
		result.tasksCompleted = tasks.filter(
			(t) => t.status === TaskStatus.Done,
		).length;
		result.tasksBlocked = tasks.filter(
			(t) => t.status === TaskStatus.Blocked,
		).length;

		// Overdue tasks (have due date in the past and not completed)
		const now = new Date();
		result.tasksOverdue = tasks.filter((t) => {
			if (t.dueDate) {
				const dueDate = new Date(t.dueDate);
				return dueDate < now && t.status !== TaskStatus.Done;
			}
			return false;
		}).length;

		// High priority pending tasks (High, Urgent, or Critical and not done)
		result.tasksHighPriorityPending = tasks.filter(
			(t) =>
				(t.priority === TaskPriority.High ||
					t.priority === TaskPriority.Urgent ||
					t.priority === TaskPriority.Critical) &&
				t.status !== TaskStatus.Done,
		).length;

		return result;
	}
}
