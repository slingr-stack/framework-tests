import type {
  Project,
  ProjectQueryResponse,
  Query,
  Task,
  TaskQueryResponse,
  TaskWhereInput,
  User,
  UserQueryResponse,
} from '@gql';

import {
  findBy,
  type GraphQLClient,
  getGraphQLClient,
} from '@drumr/framework-frontend';

export type DashboardRawData = {
  projects: Project[];
  tasks: Task[];
  users: User[];
  fetchedAt: number;
};

type ProjectDashboardQuery = Pick<Query, 'ProjectFindBy'>;
type TaskDashboardQuery = Pick<Query, 'TaskFindBy'>;
type UserDashboardQuery = Pick<Query, 'UserFindBy'>;

type DashboardResult<T> =
  | {
      __typename?: string;
      message?: string | null;
      objects?: T[] | null;
    }
  | null
  | undefined;

const DASHBOARD_PAGE_SIZE = 5000;

const DASHBOARD_PROJECTS_QUERY = findBy<ProjectQueryResponse>('Project')
  .paginate(DASHBOARD_PAGE_SIZE)
  .fields({
    id: true,
    name: true,
    code: true,
    status: true,
    priority: true,
    startDate: true,
    endDate: true,
    budget: true,
    isArchived: true,
  })
  .build();

const DASHBOARD_TASKS_QUERY = findBy<TaskQueryResponse, TaskWhereInput>('Task')
  .paginate(DASHBOARD_PAGE_SIZE)
  .fields({
    id: true,
    status: true,
    summary: true,
    priority: true,
    dueDate: true,
    project: { id: true, name: true },
  })
  .build();

const DASHBOARD_USERS_QUERY = findBy<UserQueryResponse>('User')
  .paginate(DASHBOARD_PAGE_SIZE)
  .fields({ id: true, status: true, roles: true })
  .build();

const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Singleton service that fetches and caches raw dashboard data (projects,
 * tasks, users). Because the DI container creates only one instance for the
 * entire page lifetime, data fetched by one view is immediately available to
 * any other view that resolves this service — no duplicate network calls.
 *
 * The cache is intentionally simple: data is valid for 30 s and must be
 * explicitly invalidated (e.g. after a write operation) via invalidate().
 *
 * Constructor-injects GraphQLClient — another singleton — showing
 * that the container handles full object graphs, not just leaf services.
 *
 * DI scope: module-level singleton
 *
 * @example
 * ```typescript
 * // In onLoad() of any CustomViewComponent:
 * const svc = getDashboardDataService();
 * const { projects, tasks } = await svc.getData();
 * ```
 */
export class DashboardDataService {
  private cache: DashboardRawData | null = null;
  private readonly gql: GraphQLClient;

  constructor() {
    this.gql = getGraphQLClient();
  }

  /**
   * Returns the raw dashboard data, fetching from the API if the cache is
   * stale or empty. Concurrent callers share the same in-flight promise so
   * only one network request is made even if multiple views load at once.
   */
  async getData(forceRefresh = false): Promise<DashboardRawData> {
    if (!forceRefresh && this.isCacheValid()) {
      const cached = this.cache;
      if (!cached) {
        return this.fetchAndCache();
      }

      console.log(
        `[DashboardDataService] Returning cached data (age: ${this.cacheAge()} ms) valid for  ${(cached.fetchedAt + CACHE_TTL_MS - Date.now()) / 1000}s more`,
      );
      return cached;
    }
    console.log(
      '[DashboardDataService] Cache is stale or empty, fetching new data...',
    );
    return this.fetchAndCache();
  }

  /** True when the cached data is still within the TTL window. */
  isCacheValid(): boolean {
    return (
      this.cache !== null && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS
    );
  }

  /** How long ago (ms) the data was last fetched, or -1 if never fetched. */
  cacheAge(): number {
    return this.cache ? Date.now() - this.cache.fetchedAt : -1;
  }

  /** Invalidates the cache, forcing the next getData() call to refetch. */
  invalidate(): void {
    this.cache = null;
  }

  private async fetchAndCache(): Promise<DashboardRawData> {
    const [
      { data: projectsResponse },
      { data: tasksResponse },
      { data: usersResponse },
    ] = await Promise.all([
      this.gql.query<ProjectDashboardQuery>({
        query: DASHBOARD_PROJECTS_QUERY.document,
        variables: DASHBOARD_PROJECTS_QUERY.variables,
      }),
      this.gql.query<TaskDashboardQuery>({
        query: DASHBOARD_TASKS_QUERY.document,
        variables: DASHBOARD_TASKS_QUERY.variables,
      }),
      this.gql.query<UserDashboardQuery>({
        query: DASHBOARD_USERS_QUERY.document,
        variables: DASHBOARD_USERS_QUERY.variables,
      }),
    ]);

    const projects = this.extractObjects<Project>(
      projectsResponse?.ProjectFindBy,
      'ProjectQueryResponse',
    );
    const tasks = this.extractObjects<Task>(
      tasksResponse?.TaskFindBy,
      'TaskQueryResponse',
    );
    const users = this.extractObjects<User>(
      usersResponse?.UserFindBy,
      'UserQueryResponse',
    );

    this.cache = { projects, tasks, users, fetchedAt: Date.now() };
    return this.cache;
  }

  private extractObjects<T>(result: unknown, typeName: string): T[] {
    const res = result as DashboardResult<T>;
    if (res?.__typename === typeName && Array.isArray(res.objects)) {
      return res.objects as T[];
    }
    if (res?.message) {
      console.warn(`[DashboardDataService] ${typeName} error:`, res.message);
    }
    return [];
  }
}

let _dashboardDataService: DashboardDataService | null = null;
/**
 * Returns the module-level singleton DashboardDataService.
 */
export function getDashboardDataService(): DashboardDataService {
  if (!_dashboardDataService) {
    _dashboardDataService = new DashboardDataService();
  }
  return _dashboardDataService;
}
