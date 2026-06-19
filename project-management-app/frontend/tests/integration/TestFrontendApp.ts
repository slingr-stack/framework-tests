import { App, DependencyContainer } from '@drumr/framework-frontend';
import { DashboardDataService } from '../../src/dashboard/services/DashboardDataService';
import { SummaryTableDataService } from '../../src/dashboard/services/SummaryTableDataService';
import { MockDashboardDataService } from './mocks/MockDashboardDataService';
import { MockSummaryTableDataService } from './mocks/MockSummaryTableDataService';

/**
 * Frontend testing context — overrides selected services with test doubles
 * before the application mounts.
 *
 * Usage in integration tests:
 *
 * ```typescript
 * import { clearRegisteredFrontendAppFn } from '@drumr/framework-frontend';
 * import { DependencyContainer } from '@drumr/framework-frontend';
 * import { DashboardDataService } from '../../src/dashboard/services/DashboardDataService';
 *
 * beforeAll(async () => {
 *   const lifecycle = TestFrontendApp();  // registers all mocks in the DI container
 *   await lifecycle.beforeStart?.();
 * });
 *
 * afterEach(() => {
 *   const mock = DependencyContainer.resolve(MockDashboardDataService);
 *   mock.reset();
 * });
 *
 * afterAll(() => {
 *   DependencyContainer.clearInstances();
 *   clearRegisteredFrontendAppFn();
 * });
 * ```
 */
export const TestFrontendApp = App(function TestFrontendApp() {
  return {
    beforeStart: async () => {
      const mockDashboard = new MockDashboardDataService();
      const mockSummary = new MockSummaryTableDataService();
      // Replace the real services (which make GraphQL calls) with
      // in-memory mocks so integration tests never touch the network.
      DependencyContainer.registerInstanceById(
        'dashboardDataService',
        MockDashboardDataService,
        mockDashboard,
      );
      // Also register under the real token so resolve(DashboardDataService) returns the mock.
      DependencyContainer.registerInstance(DashboardDataService, mockDashboard);

      DependencyContainer.registerInstanceById(
        'SummaryTableDataService',
        MockSummaryTableDataService,
        mockSummary,
      );
      DependencyContainer.registerInstance(
        SummaryTableDataService,
        mockSummary,
      );
    },
  };
});
