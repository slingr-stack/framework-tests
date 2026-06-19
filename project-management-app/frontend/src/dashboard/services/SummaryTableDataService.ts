import type {
  ProjectArrayRichField,
  RichField,
  RichPaginationInfo,
  RichSummaryTableDataResult,
  RichUser,
  TaskArrayRichField,
  TaskWhereInputTaskStatusEnum,
  UserArrayRichField,
} from '@gql';
import {
  type DataTablePageInfo,
  type GraphQLClient,
  getGraphQLClient,
  type UiContext,
  uiAction,
} from '@drumr/framework-frontend';

export type SummaryTableData = {
  projects: ProjectArrayRichField;
  tasks: TaskArrayRichField;
  users: UserArrayRichField;
  manager: RichUser | null;
  taskPaginationInfo: DataTablePageInfo;
  fetchedAt: number;
};

export type SummaryTaskPaginationRequest = {
  page?: number | null;
  pageSize?: number | null;
};

export type SummaryTaskWhereRequest = {
  taskStatus?: TaskWhereInputTaskStatusEnum | null;
};

export type SummaryTaskSortFieldRequest =
  | 'title'
  | 'projectName'
  | 'status'
  | 'priority'
  | 'assigneeFullName'
  | 'dueDate';

export type SummaryTaskSortRequest = {
  field: SummaryTaskSortFieldRequest;
  order: 'asc' | 'desc';
};

export type SummaryProjectWhereRequest = {
  projectStatus?: string | null;
};

export type SummaryTableDataRequest = {
  projectId?: string | null;
  taskPagination?: SummaryTaskPaginationRequest;
  taskWhere?: SummaryTaskWhereRequest;
  taskSort?: SummaryTaskSortRequest;
  projectWhere?: SummaryProjectWhereRequest;
};

const CACHE_TTL_MS = 30_000;

type SummaryRequestActionContext = {
  target?: UiContext['action'] extends infer T
    ? T extends { target?: infer U }
      ? U
      : never
    : never;
  targetId?: string;
  query?: UiContext['action'] extends infer T
    ? T extends { query?: infer U }
      ? U
      : never
    : never;
  targetModel?: string;
  actionName?: string;
};

type SummaryRequestContext = {
  initializing?: UiContext['initializing'];
  changedFields?: UiContext['changedFields'];
  dirtyFields?: UiContext['dirtyFields'];
  action?: SummaryRequestActionContext;
};

type RichScalarFieldLike = {
  value?: unknown;
};

type RichReferenceValue = {
  fullName?: RichScalarFieldLike | null;
  id?: { value?: unknown } | string | null;
  name?: RichScalarFieldLike | null;
  email?: RichScalarFieldLike | null;
  title?: RichScalarFieldLike | null;
  code?: RichScalarFieldLike | null;
};

type RichReferenceFieldLike = {
  value?: RichReferenceValue | null;
  displayValue?: string | null;
};

function buildRequestActionContext(
  action?: UiContext['action'],
): SummaryRequestActionContext | undefined {
  if (!action) {
    return undefined;
  }

  const requestAction: SummaryRequestActionContext = {};

  if (action.target !== undefined) {
    requestAction.target = action.target;
  }
  if (action.targetId !== undefined) {
    requestAction.targetId = action.targetId;
  }
  if (action.query !== undefined) {
    requestAction.query = action.query;
  }
  if (action.targetModel !== undefined) {
    requestAction.targetModel = action.targetModel;
  }
  if (action.actionName !== undefined) {
    requestAction.actionName = action.actionName;
  }

  return Object.keys(requestAction).length > 0 ? requestAction : undefined;
}

function buildRequestContextForGraphQL(
  context?: UiContext,
): SummaryRequestContext {
  if (!context) {
    return {};
  }

  const requestContext: SummaryRequestContext = {};

  if (context.initializing !== undefined) {
    requestContext.initializing = context.initializing;
  }
  if (context.changedFields !== undefined) {
    requestContext.changedFields = context.changedFields;
  }
  if (context.dirtyFields !== undefined) {
    requestContext.dirtyFields = context.dirtyFields;
  }

  const action = buildRequestActionContext(context.action);
  if (action) {
    requestContext.action = action;
  }

  return requestContext;
}

function hasRequestContextEntries(context: SummaryRequestContext): boolean {
  return Object.keys(context).length > 0;
}

function readReferenceId(
  value: RichReferenceValue | null | undefined,
): string | null {
  const rawId = value?.id;
  if (typeof rawId === 'string' && rawId.length > 0) {
    return rawId;
  }
  if (
    rawId &&
    typeof rawId === 'object' &&
    'value' in rawId &&
    typeof rawId.value === 'string' &&
    rawId.value.length > 0
  ) {
    return rawId.value;
  }
  return null;
}

function readRichScalarField(
  field: RichScalarFieldLike | null | undefined,
): string | null {
  const rawValue = field?.value;
  return typeof rawValue === 'string' && rawValue.length > 0 ? rawValue : null;
}

function readReferenceDisplayValue(
  value: RichReferenceValue | null | undefined,
): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return (
    readRichScalarField(value.fullName) ??
    readRichScalarField(value.name) ??
    readRichScalarField(value.title) ??
    readRichScalarField(value.email) ??
    readRichScalarField(value.code)
  );
}

function normalizeReferenceField<
  T extends RichReferenceFieldLike | null | undefined,
>(field: T): T {
  if (!field || !field.value || typeof field.value !== 'object') {
    return field;
  }

  const id = readReferenceId(field.value);
  const displayValue =
    typeof field.displayValue === 'string' && field.displayValue.length > 0
      ? field.displayValue
      : (readReferenceDisplayValue(field.value) ?? id);

  if (!id && !displayValue) {
    return field;
  }

  return {
    ...field,
    value: {
      ...(id ? { id } : {}),
      ...(displayValue ? { _displayValue: displayValue } : {}),
    },
  } as T;
}

function normalizeProjectRows(
  projects: ProjectArrayRichField,
): ProjectArrayRichField {
  if (!Array.isArray(projects.value)) {
    return projects;
  }

  return {
    ...projects,
    value: projects.value.map((project) => ({
      ...project,
      manager: normalizeReferenceField(project.manager),
    })),
  };
}

function normalizeTaskRows(tasks: TaskArrayRichField): TaskArrayRichField {
  if (!Array.isArray(tasks.value)) {
    return tasks;
  }

  return {
    ...tasks,
    value: tasks.value.map((task) => ({
      ...task,
      project: normalizeReferenceField(task.project),
      assignee: normalizeReferenceField(task.assignee),
    })),
  };
}

export class SummaryTableDataService {
  private cache = new Map<string, SummaryTableData>();
  private readonly gql: GraphQLClient;

  constructor() {
    this.gql = getGraphQLClient();
  }

  async getData(
    request: SummaryTableDataRequest = {},
    forceRefresh = false,
    context?: UiContext,
  ): Promise<SummaryTableData> {
    const cacheKey = this.buildCacheKey(request);
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    return this.fetchAndCache(request, cacheKey, context);
  }

  isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    return cached !== undefined && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  }

  cacheAge(): number {
    const firstEntry = this.cache.values().next().value as
      | SummaryTableData
      | undefined;
    return firstEntry ? Date.now() - firstEntry.fetchedAt : -1;
  }

  invalidate(): void {
    this.cache.clear();
  }

  private async fetchAndCache(
    request: SummaryTableDataRequest,
    cacheKey: string,
    context?: UiContext,
  ): Promise<SummaryTableData> {
    const gqlContext = buildRequestContextForGraphQL(context);
    const variables = {
      ...(hasRequestContextEntries(gqlContext) ? { context: gqlContext } : {}),
      params: {
        project: request.projectId ? request.projectId : null,
        taskPagination: request.taskPagination
          ? {
              page: request.taskPagination.page ?? 1,
              pageSize: request.taskPagination.pageSize ?? 10,
            }
          : null,
        taskWhere: request.taskWhere
          ? {
              taskStatus: request.taskWhere.taskStatus ?? null,
            }
          : null,
        taskSort: request.taskSort
          ? {
              field: request.taskSort.field,
              order: request.taskSort.order,
            }
          : null,
        projectWhere: request.projectWhere
          ? {
              projectStatus: request.projectWhere.projectStatus ?? null,
            }
          : null,
      },
    };

    const operation = uiAction<RichSummaryTableDataResult>(
      'GetSummaryTableData',
    )
      .fields({
        projects: {
          id: true,
          name: true,
          code: true,
          manager: { id: true, fullName: true, email: true },
          status: true,
          priority: true,
          budget: true,
          completionPercentage: true,
        },
        tasks: {
          id: true,
          title: true,
          project: { id: true, name: true },
          status: true,
          priority: true,
          assignee: { id: true, fullName: true, email: true },
          dueDate: true,
        },
        users: {
          id: true,
          fullName: true,
          email: true,
          roles: true,
          status: true,
        },
        manager: { fullName: true, email: true },
        taskPaginationInfo: {
          page: true,
          pageSize: true,
          totalPages: true,
          totalCount: true,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      })
      .variables(variables)
      .build();

    const response = await this.gql.execute(operation);

    const projects = normalizeProjectRows(response?.projects ?? { value: [] });
    const tasks = normalizeTaskRows(response?.tasks ?? { value: [] });
    const users: UserArrayRichField = response?.users ?? { value: [] };
    const manager = this.unwrapObjectField(response.manager);
    const taskPaginationInfo = this.readTaskPageInfo(
      response.taskPaginationInfo?.value,
      tasks.value?.length ?? 0,
    );

    const payload = {
      projects,
      tasks,
      users,
      manager,
      taskPaginationInfo,
      fetchedAt: Date.now(),
    };

    this.cache.set(cacheKey, payload);

    return payload;
  }

  private buildCacheKey(request: SummaryTableDataRequest): string {
    return [
      request.projectId ?? '__all__',
      request.projectWhere?.projectStatus ?? '__projectStatus__',
      request.taskPagination?.page ?? '__page__',
      request.taskPagination?.pageSize ?? '__pageSize__',
      request.taskWhere?.taskStatus ?? '__status__',
      request.taskSort?.field ?? '__sortField__',
      request.taskSort?.order ?? '__sortOrder__',
    ].join('::');
  }

  private readTaskPageInfo(
    paginationInfo: RichPaginationInfo | null | undefined,
    taskCount: number,
  ): DataTablePageInfo {
    return {
      hasNextPage: this.readBooleanField(paginationInfo?.hasNextPage) ?? false,
      hasPreviousPage:
        this.readBooleanField(paginationInfo?.hasPreviousPage) ?? false,
      page: this.readNumberField(paginationInfo?.page) ?? 1,
      pageSize: this.readNumberField(paginationInfo?.pageSize) ?? taskCount,
      totalPages: this.readNumberField(paginationInfo?.totalPages) ?? 1,
      totalCount: this.readNumberField(paginationInfo?.totalCount) ?? taskCount,
    };
  }

  private readNumberField(
    field: RichField | null | undefined,
  ): number | undefined {
    return typeof field?.value === 'number' ? field.value : undefined;
  }

  private readBooleanField(
    field: RichField | null | undefined,
  ): boolean | undefined {
    return typeof field?.value === 'boolean' ? field.value : undefined;
  }

  private unwrapObjectField<T extends object>(
    field: { value?: T | null } | null | undefined,
  ): T | null {
    return field?.value && typeof field.value === 'object' ? field.value : null;
  }
}

let _summaryTableDataService: SummaryTableDataService | null = null;
export function getSummaryTableDataService(): SummaryTableDataService {
  if (!_summaryTableDataService) {
    _summaryTableDataService = new SummaryTableDataService();
  }
  return _summaryTableDataService;
}
