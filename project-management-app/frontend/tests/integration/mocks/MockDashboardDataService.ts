import { Service } from '@drumr/framework-frontend';
import {
  DashboardDataService,
  type DashboardRawData,
} from '../../../src/dashboard/services/DashboardDataService';

const DEFAULT_DASHBOARD_DATA = (): DashboardRawData => ({
  fetchedAt: Date.now(),
  projects: [
    {
      id: 'p1',
      name: 'Alpha Platform',
      code: 'ALPHA',
      status: 'active',
      priority: 'critical',
      budget: '25000',
      isArchived: false,
    } as any,
    {
      id: 'p2',
      name: 'Beta Redesign',
      code: 'BETA',
      status: 'completed',
      priority: 'medium',
      budget: '15000',
      isArchived: false,
    } as any,
    {
      id: 'p3',
      name: 'Gamma Rollout',
      code: 'GAMMA',
      status: 'active',
      priority: 'high',
      budget: '40000',
      isArchived: false,
    } as any,
  ],
  tasks: [
    {
      id: 't1',
      status: 'to_do',
      priority: 'high',
      dueDate: '2000-01-01',
      project: { id: 'p1' },
    } as any,
    {
      id: 't2',
      status: 'in_progress',
      priority: 'urgent',
      dueDate: '2999-01-01',
      project: { id: 'p1' },
    } as any,
    {
      id: 't3',
      status: 'done',
      priority: 'low',
      dueDate: '2999-01-01',
      project: { id: 'p2' },
    } as any,
    {
      id: 't4',
      status: 'blocked',
      priority: 'medium',
      dueDate: '2000-01-01',
      project: { id: 'p3' },
    } as any,
  ],
  users: [
    { id: 'u1', status: 'active', roles: ['admin'] } as any,
    { id: 'u2', status: 'active', roles: ['member'] } as any,
    { id: 'u3', status: 'inactive', roles: ['member'] } as any,
  ],
});

/**
 * In-memory mock of {@link DashboardDataService} for integration tests.
 *
 * Register this in a TestFrontendApp via `DependencyContainer.registerInstanceById('dashboardDataService', MockDashboardDataService, new MockDashboardDataService())`
 * so every view that resolves DashboardDataService receives this mock instead.
 *
 * @example Controlling mock data in a test
 * ```typescript
 * const mock = DependencyContainer.resolve(DashboardDataService) as MockDashboardDataService;
 * mock.setData({ projects: [...], tasks: [...], users: [] });
 * const data = await mock.getData();
 * expect(data.projects).toHaveLength(2);
 * ```
 */
@Service()
export class MockDashboardDataService extends DashboardDataService {
  private mockData: DashboardRawData = DEFAULT_DASHBOARD_DATA();

  private callCount = 0;

  /**
   * Returns the mock data immediately — no network call.
   * Increments the internal call counter so tests can assert that
   * the correct number of fetches occurred.
   */
  override async getData(_forceRefresh = false): Promise<DashboardRawData> {
    this.callCount++;
    return { ...this.mockData, fetchedAt: Date.now() };
  }

  /** Always true — the mock data is always considered fresh. */
  override isCacheValid(): boolean {
    return true;
  }

  /** Always 0 — the mock data was "just fetched". */
  override cacheAge(): number {
    return 0;
  }

  /** No-op: mock cache never needs explicit invalidation. */
  override invalidate(): void {
    // no-op
  }

  // ── Test helpers ──────────────────────────────────────────────────────────

  /**
   * Replaces the mock data returned by subsequent `getData()` calls.
   */
  setData(data: Partial<DashboardRawData>): void {
    this.mockData = { ...this.mockData, ...data, fetchedAt: Date.now() };
  }

  /**
   * Returns the number of times `getData()` was called since the last {@link reset}.
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Resets the call counter and clears mock data.
   * Call in `afterEach` to keep tests isolated.
   */
  reset(): void {
    this.callCount = 0;
    this.mockData = DEFAULT_DASHBOARD_DATA();
  }
}
