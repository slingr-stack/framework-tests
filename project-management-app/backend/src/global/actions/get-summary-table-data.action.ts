import {
	Action,
	BaseDataModel,
	BooleanField,
	ChoiceField,
	CompositionField,
	DataModel,
	GlobalAction,
	IntegerField,
	ReferenceField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

@DataModel({})
export class PaginationInput extends BaseDataModel {
	@IntegerField({
		required: false,
		min: 1,
		docs: 'Page number (1-indexed).',
	})
	page!: number | null;

	@IntegerField({
		required: false,
		min: 1,
		docs: 'Page size.',
	})
	pageSize!: number | null;
}

@DataModel()
export class PaginationInfo extends BaseDataModel {
	@IntegerField({ required: true, docs: 'Current page.' })
	page!: number;

	@IntegerField({ required: true, docs: 'Current page size.' })
	pageSize!: number;

	@IntegerField({ required: true, docs: 'Total pages.' })
	totalPages!: number;

	@IntegerField({ required: true, docs: 'Total count for the current filter.' })
	totalCount!: number;

	@BooleanField({ required: true, docs: 'Whether another page exists.' })
	hasNextPage!: boolean;

	@BooleanField({ required: true, docs: 'Whether a previous page exists.' })
	hasPreviousPage!: boolean;
}

export enum TaskSortField {
	Title = 'title',
	ProjectName = 'projectName',
	Status = 'status',
	Priority = 'priority',
	AssigneeFullName = 'assigneeFullName',
	DueDate = 'dueDate',
}

export enum TaskSortOrder {
	Asc = 'asc',
	Desc = 'desc',
}

@DataModel({})
export class TaskSortInput extends BaseDataModel {
	@ChoiceField({
		required: false,
		type: () => TaskSortField,
		docs: 'Optional task field used to sort summary task results.',
	})
	field!: TaskSortField | null;

	@ChoiceField({
		required: false,
		type: () => TaskSortOrder,
		docs: 'Optional sort direction used for summary task results.',
	})
	order!: TaskSortOrder | null;
}

@DataModel({})
export class TaskWhereInput extends BaseDataModel {
	@ChoiceField({
		required: false,
		type: () => TaskStatus,
		docs: 'Optional task status used to filter summary task results.',
	})
	taskStatus!: TaskStatus | null;
}

@DataModel({})
export class ProjectWhereInput extends BaseDataModel {
	@ChoiceField({
		required: false,
		type: () => ProjectStatus,
		docs: 'Optional project status used to filter summary project results.',
	})
	projectStatus!: ProjectStatus | null;
}

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class SummaryTableDataFilters extends BaseDataModel {
	@ReferenceField({
		required: false,
		type: () => Project,
		docs: 'Optional project used to scope summary table data.',
	})
	project!: Project | null;

	@CompositionField({ type: () => PaginationInput })
	taskPagination!: PaginationInput | null;

	@CompositionField({ type: () => TaskWhereInput })
	taskWhere!: TaskWhereInput | null;

	@CompositionField({ type: () => TaskSortInput })
	taskSort!: TaskSortInput | null;

	@CompositionField({ type: () => ProjectWhereInput })
	projectWhere!: ProjectWhereInput | null;
}

@DataModel()
export class SummaryTableDataResult extends BaseDataModel {
	@CompositionField({ type: () => Project })
	projects!: Project[];

	@CompositionField({ type: () => Task })
	tasks!: Task[];

	@CompositionField({ type: () => User })
	users!: User[];

	@CompositionField({ type: () => User })
	manager!: User | null;

	@CompositionField({ type: () => PaginationInfo })
	taskPaginationInfo!: PaginationInfo | null;
}

@Action({
	type: 'read',
	api: 'gql',
	params: SummaryTableDataFilters,
	returns: SummaryTableDataResult,
})
export class GetSummaryTableData extends GlobalAction<
	SummaryTableDataFilters,
	SummaryTableDataResult
> {
	constructor(private readonly ds: MainDs) {
		super();
	}

	private async collectAllProjects(
		where: Record<string, unknown>,
	): Promise<Project[]> {
		const projects: Project[] = [];

		await this.ds.findAndPaginate(
			Project,
			{
				where,
				orderBy: { id: 'ASC' },
			},
			async (project) => {
				projects.push(project);
				return true;
			},
		);

		return projects;
	}

	private buildTaskOrderBy(
		taskSort: TaskSortInput | null | undefined,
	): Record<string, unknown> {
		if (!taskSort?.field || !taskSort.order) {
			return { id: 'DESC' };
		}

		const direction = taskSort.order === TaskSortOrder.Desc ? 'DESC' : 'ASC';

		switch (taskSort.field) {
			case TaskSortField.ProjectName:
				return { project: { name: direction } };
			case TaskSortField.AssigneeFullName:
				return { assignee: { fullName: direction } };
			case TaskSortField.Title:
				return { title: direction };
			case TaskSortField.Status:
				return { status: direction };
			case TaskSortField.Priority:
				return { priority: direction };
			case TaskSortField.DueDate:
				return { dueDate: direction };
			default:
				return { id: 'DESC' };
		}
	}

	protected async execute(
		params: SummaryTableDataFilters,
	): Promise<SummaryTableDataResult> {
		const selectedProjectId = params.project?.id ?? null;
		const selectedProjectStatus = params.projectWhere?.projectStatus ?? null;
		const projectWhere = params.projectWhere?.projectStatus
			? {
					status: {
						eq: params.projectWhere.projectStatus,
					},
				}
			: {};
		const taskWhere = {
			...(selectedProjectId
				? {
						project: {
							id: { eq: selectedProjectId },
						},
					}
				: selectedProjectStatus
					? {
							project: {
								status: { eq: selectedProjectStatus },
							},
						}
					: {}),
			...(params.taskWhere?.taskStatus
				? {
						status: {
							eq: params.taskWhere.taskStatus,
						},
					}
				: {}),
		};
		const taskPage = params.taskPagination?.page ?? 1;
		const taskPageSize = params.taskPagination?.pageSize ?? 10;
		const taskOrderBy = this.buildTaskOrderBy(params.taskSort);
		const taskStartIndex = (taskPage - 1) * taskPageSize;
		const taskEndExclusive = taskStartIndex + taskPageSize;
		let taskIndex = 0;
		const pagedTasks: Task[] = [];

		const [projects, totalTaskCount] = await Promise.all([
			this.collectAllProjects(projectWhere),
			this.ds.count(Task, taskWhere),
			this.ds.findAndPaginate(
				Task,
				{
					where: taskWhere,
					orderBy: taskOrderBy,
					first: taskPageSize,
				},
				async (task) => {
					if (taskIndex >= taskStartIndex && taskIndex < taskEndExclusive) {
						pagedTasks.push(task);
					}

					taskIndex += 1;

					if (taskIndex >= taskEndExclusive) {
						return false;
					}

					return true;
				},
			),
		]);

		const selectedProject = selectedProjectId
			? (projects.find((project) => project.id === selectedProjectId) ?? null)
			: null;

		const users =
			selectedProject?.teamMembers ??
			projects.flatMap((project) => project.teamMembers ?? []);
		const dedupedUsers = Array.from(
			new Map(users.map((user) => [user.id, user])).values(),
		);

		const result = new SummaryTableDataResult();
		result.projects = projects;
		result.tasks = pagedTasks;
		result.users = dedupedUsers;
		result.manager = selectedProject?.manager ?? null;

		const totalPages =
			totalTaskCount > 0 ? Math.ceil(totalTaskCount / taskPageSize) : 1;
		const paginationInfo = new PaginationInfo();
		paginationInfo.page = taskPage;
		paginationInfo.pageSize = taskPageSize;
		paginationInfo.totalPages = totalPages;
		paginationInfo.totalCount = totalTaskCount;
		paginationInfo.hasNextPage = taskPage < totalPages;
		paginationInfo.hasPreviousPage = totalTaskCount > 0 && taskPage > 1;
		result.taskPaginationInfo = paginationInfo;

		return result;
	}
}
