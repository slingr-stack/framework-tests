/**
 * useDashboardData – hook that fetches dashboard data (projects, tasks, users).
 *
 * The Apollo cache acts as an in-memory cache across navigations in the same session.
 * Use `refetch()` to force a fresh fetch after writes.
 */
import type { Project, Task, TaskWhereInput, User } from '@gql';
import { useApiFindBy } from '@drumr/framework-frontend';

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  users: User[];
}

export interface UseDashboardDataResult {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const DASHBOARD_PAGE_SIZE = 5000;

export function useDashboardData(): UseDashboardDataResult {
  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useApiFindBy<Project>('Project', {
    first: DASHBOARD_PAGE_SIZE,
    fields: {
      id: true,
      name: true,
      code: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      budget: true,
      isArchived: true,
    },
    fetchPolicy: 'cache-first',
  });

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useApiFindBy<Task, TaskWhereInput>('Task', {
    first: DASHBOARD_PAGE_SIZE,
    fields: {
      id: true,
      status: true,
      summary: true,
      priority: true,
      dueDate: true,
      project: { id: true, name: true },
    },
    fetchPolicy: 'cache-first',
  });

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useApiFindBy<User>('User', {
    first: DASHBOARD_PAGE_SIZE,
    fields: { id: true, status: true, roles: true },
    fetchPolicy: 'cache-first',
  });

  const loading = projectsLoading || tasksLoading || usersLoading;
  const error = projectsError || tasksError || usersError;

  const refetch = () => {
    void refetchProjects();
    void refetchTasks();
    void refetchUsers();
  };

  return { data: { projects, tasks, users }, loading, error, refetch };
}
