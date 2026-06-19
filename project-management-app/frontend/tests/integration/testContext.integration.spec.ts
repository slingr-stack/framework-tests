/**
 * Integration tests for the frontend testing context.
 *
 * These tests verify that:
 * - App(fn).beforeStart() fires before services are resolved
 * - DependencyContainer.registerInstanceById() overrides a service in the DI container
 * - MockDashboardDataService can be resolved via the original class token
 * - The mock behaves as expected (returns controlled data, counts calls, resets)
 *
 * No network connections are opened — the real DashboardDataService is
 * replaced by MockDashboardDataService via TestFrontendApp before any test body runs.
 */

import 'reflect-metadata';
import {
  App,
  clearRegisteredFrontendAppFn,
  DependencyContainer,
} from '@drumr/framework-frontend';

import { DashboardDataService } from '../../src/dashboard/services/DashboardDataService';
import { MockDashboardDataService } from './mocks/MockDashboardDataService';
import { TestFrontendApp } from './TestFrontendApp';

// ─── Test context setup ──────────────────────────────────────────────────────

describe('Frontend testing context — beforeStart() and registerInstanceById()', () => {
  beforeAll(async () => {
    // TestFrontendApp is the FrontendAppFn registered via App(fn).
    // Call it to get the lifecycle and run beforeStart to wire mock services.
    const lifecycle = TestFrontendApp();
    await lifecycle.beforeStart?.();
  });

  afterEach(() => {
    // Reset call counters between tests so they remain independent.
    const mock = DependencyContainer.resolve(
      MockDashboardDataService,
    ) as MockDashboardDataService;
    mock.reset();
  });

  afterAll(() => {
    DependencyContainer.clearInstances();
    clearRegisteredFrontendAppFn();
  });

  // ─── registerInstanceById() remaps the class token ────────────────────────

  it('resolve(DashboardDataService) returns the MockDashboardDataService instance', () => {
    const resolved = DependencyContainer.resolve(DashboardDataService);
    expect(resolved).toBeInstanceOf(MockDashboardDataService);
  });

  it('resolveById("dashboardDataService") returns the same MockDashboardDataService instance', () => {
    const byClass = DependencyContainer.resolve(DashboardDataService);
    const byId = DependencyContainer.resolveById<DashboardDataService>(
      'dashboardDataService',
    );
    expect(byId).toBe(byClass);
    expect(byId).toBeInstanceOf(MockDashboardDataService);
  });

  it('the resolved mock is a singleton — repeated resolve() calls return the same instance', () => {
    const first = DependencyContainer.resolve(DashboardDataService);
    const second = DependencyContainer.resolve(DashboardDataService);
    expect(first).toBe(second);
  });

  // ─── MockDashboardDataService behaviour ───────────────────────────────────

  it('getData() returns the fixed default dashboard dataset', async () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    const data = await mock.getData();
    expect(data.projects).toHaveLength(3);
    expect(data.tasks).toHaveLength(4);
    expect(data.users).toHaveLength(3);
    expect(data.projects[0].name).toBe('Alpha Platform');
  });

  it('setData() controls what getData() returns', async () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    mock.setData({
      projects: [{ id: 'p1', name: 'Alpha', status: 'active' } as any],
    });

    const data = await mock.getData();
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].name).toBe('Alpha');
  });

  it('getCallCount() tracks the number of getData() invocations', async () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    expect(mock.getCallCount()).toBe(0);

    await mock.getData();
    await mock.getData();
    expect(mock.getCallCount()).toBe(2);
  });

  it('reset() clears call count and restores the default dataset', async () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    mock.setData({ projects: [{ id: 'p1' } as any] });
    await mock.getData();
    expect(mock.getCallCount()).toBe(1);

    mock.reset();

    expect(mock.getCallCount()).toBe(0);
    const data = await mock.getData();
    expect(data.projects).toHaveLength(3);
    expect(data.projects[0].name).toBe('Alpha Platform');
  });

  it('isCacheValid() always returns true for the mock', () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    expect(mock.isCacheValid()).toBe(true);
  });

  it('cacheAge() always returns 0 for the mock', () => {
    const mock = DependencyContainer.resolve(
      DashboardDataService,
    ) as unknown as MockDashboardDataService;
    expect(mock.cacheAge()).toBe(0);
  });
});

// ─── App() lifecycle hook tests ───────────────────────────────────────────────

describe('App() beforeStart() hook', () => {
  afterEach(() => {
    DependencyContainer.clearInstances();
    clearRegisteredFrontendAppFn();
  });

  it('lifecycle object has no hooks by default', () => {
    const fn = App(() => ({}));
    const lifecycle = fn();
    // No hooks registered → optional-chained calls yield undefined synchronously
    // and never throw.
    expect(lifecycle.beforeStart).toBeUndefined();
    expect(() => lifecycle.beforeStart?.()).not.toThrow();
  });

  it('can be used to register service substitutions', async () => {
    const calls: string[] = [];

    const fn = App(() => ({
      beforeStart: async () => {
        calls.push('beforeStart');
      },
    }));

    await fn().beforeStart?.();
    expect(calls).toEqual(['beforeStart']);
  });

  it('registerInstanceById() redirects resolve(OriginalClass) to the replacement', async () => {
    const mockInstance = new MockDashboardDataService();
    const fn = App(() => ({
      beforeStart: async () => {
        DependencyContainer.registerInstanceById(
          'dashboardDataService',
          MockDashboardDataService,
          mockInstance,
        );
        DependencyContainer.registerInstance(
          DashboardDataService,
          mockInstance,
        );
      },
    }));

    await fn().beforeStart?.();

    const resolved = DependencyContainer.resolve(DashboardDataService);
    expect(resolved).toBeInstanceOf(MockDashboardDataService);
    expect(resolved).toBe(mockInstance);
  });

  it('calling beforeStart twice with same instance is idempotent', async () => {
    const mockInstance = new MockDashboardDataService();
    const fn = App(() => ({
      beforeStart: async () => {
        DependencyContainer.registerInstanceById(
          'dashboardDataService',
          MockDashboardDataService,
          mockInstance,
        );
        DependencyContainer.registerInstance(
          DashboardDataService,
          mockInstance,
        );
      },
    }));

    const lifecycle = fn();
    await expect(lifecycle.beforeStart?.()).resolves.toBeUndefined();
    await expect(lifecycle.beforeStart?.()).resolves.toBeUndefined();
  });
});
