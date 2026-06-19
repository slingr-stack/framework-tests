import { Service } from '@drumr/framework-frontend';
import {
  type SummaryTableData,
  type SummaryTableDataRequest,
  SummaryTableDataService,
} from '../../../src/dashboard/services/SummaryTableDataService';

const DEFAULT_PAGE_INFO = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  pageSize: 3,
  totalPages: 1,
  totalCount: 2,
};

const DEFAULT_SUMMARY_DATA = (): SummaryTableData => ({
  projects: [
    {
      id: 'p1',
      name: 'Alpha Platform',
      code: 'ALPHA',
      manager: 'Alice Manager',
      status: 'active',
      priority: 'critical',
      budget: 25000,
      completionPercentage: 80,
    },
    {
      id: 'p2',
      name: 'Beta Planning',
      code: 'BETA',
      manager: 'Bob Planner',
      status: 'planning',
      priority: 'medium',
      budget: 10000,
      completionPercentage: 20,
    },
  ],
  tasks: [
    {
      id: 't1',
      title: 'Onboard vendor',
      project: 'Alpha Platform',
      status: 'to_do',
      priority: 'high',
      assignee: 'Alicia Keys',
      dueDate: '2026-05-01',
    },
    {
      id: 't2',
      title: 'Prepare rollout plan',
      project: 'Beta Planning',
      status: 'in_progress',
      priority: 'medium',
      assignee: 'Bruno Costa',
      dueDate: '2026-05-12',
    },
  ],
  users: [
    {
      id: 'u1',
      fullName: 'Alice Manager',
      email: 'alice.manager@example.com',
      roles: ['manager'],
      status: 'active',
    },
    {
      id: 'u2',
      fullName: 'Bruno Costa',
      email: 'bruno.costa@example.com',
      roles: ['developer'],
      status: 'active',
    },
  ],
  manager: {
    fullName: { value: 'Alice Manager' },
    email: { value: 'alice.manager@example.com' },
  },
  taskPaginationInfo: DEFAULT_PAGE_INFO,
  fetchedAt: Date.now(),
});

@Service()
export class MockSummaryTableDataService extends SummaryTableDataService {
  private mockData: SummaryTableData = DEFAULT_SUMMARY_DATA();

  private callCount = 0;

  private lastRequest: SummaryTableDataRequest | null = null;

  override async getData(
    request: SummaryTableDataRequest = {},
  ): Promise<SummaryTableData> {
    this.callCount++;
    this.lastRequest = request;

    return {
      ...this.mockData,
      projects: [...this.mockData.projects],
      tasks: [...this.mockData.tasks],
      users: [...this.mockData.users],
      taskPaginationInfo: { ...this.mockData.taskPaginationInfo },
      fetchedAt: Date.now(),
    };
  }

  override isCacheValid(): boolean {
    return true;
  }

  override cacheAge(): number {
    return 0;
  }

  override invalidate(): void {
    // no-op
  }

  setData(data: Partial<SummaryTableData>): void {
    this.mockData = {
      ...this.mockData,
      ...data,
      taskPaginationInfo:
        data.taskPaginationInfo ?? this.mockData.taskPaginationInfo,
      fetchedAt: Date.now(),
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  getLastRequest(): SummaryTableDataRequest | null {
    return this.lastRequest;
  }

  reset(): void {
    this.callCount = 0;
    this.lastRequest = null;
    this.mockData = DEFAULT_SUMMARY_DATA();
  }
}
