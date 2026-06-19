import {
  clearRegisteredFrontendAppFn,
  clearViewRegistry,
  DependencyContainer,
} from '@drumr/framework-frontend';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactElement } from 'react';

jest.mock('../../src/projects/views/ProjectTableView', () => ({
  __esModule: true,
  default: class MockProjectTableView {},
}));

jest.mock('../../src/tasks/views/TaskTableView', () => ({
  __esModule: true,
  default: class MockTaskTableView {},
}));

jest.mock('../../src/users/views/UserTableView', () => ({
  __esModule: true,
  default: class MockUserTableView {},
}));

import DashboardView from '../../src/dashboard/views/DashboardView';
import ProjectTableView from '../../src/projects/views/ProjectTableView';
import TaskTableView from '../../src/tasks/views/TaskTableView';
import UserTableView from '../../src/users/views/UserTableView';
import { TestFrontendApp } from './TestFrontendApp';

function createViewProps(): any {
  return {
    routeParams: {
      params: {},
      query: {},
      pathname: '/',
      search: '',
    },
    containerContext: null,
  };
}

function createDashboardView(): DashboardView & {
  openView: jest.Mock;
  setState: (update: any) => Promise<void>;
  forceUpdate: jest.Mock;
  props: any;
  state: any;
} {
  const DashboardViewCtor = DashboardView as unknown as new (
    props: any,
  ) => DashboardView;
  const view = new DashboardViewCtor(createViewProps()) as DashboardView & {
    openView: jest.Mock;
    setState: (update: any) => Promise<void>;
    forceUpdate: jest.Mock;
    props: any;
    state: any;
  };

  view.forceUpdate = jest.fn();
  view.openView = jest.fn();
  view.setState = async (update: any): Promise<void> => {
    const partial =
      typeof update === 'function' ? update(view.state, view.props) : update;
    view.state = { ...view.state, ...partial };
  };

  return view;
}

describe('DashboardView integration rendering', () => {
  beforeAll(async () => {
    // TestFrontendApp is the FrontendAppFn registered via App(fn).
    const lifecycle = TestFrontendApp();
    await lifecycle.beforeStart?.();
  });

  afterEach(() => {
    DependencyContainer.clearInstances();
    clearViewRegistry();
  });

  afterAll(() => {
    DependencyContainer.clearInstances();
    clearRegisteredFrontendAppFn();
    clearViewRegistry();
  });

  it('loads dashboard data from the registered mock service and renders the main sections', async () => {
    const view = createDashboardView();

    await act(async () => {
      await view.loadDashboardData();
    });

    expect(view.state.data).toMatchObject({
      totalUsers: 2,
      projectsTotal: 3,
      projectsActive: 2,
      projectsCompleted: 1,
      projectsCritical: 1,
      tasksTotal: 4,
      tasksPending: 1,
      tasksInProgress: 1,
      tasksCompleted: 1,
      tasksBlocked: 1,
      tasksOverdue: 2,
      tasksHighPriorityPending: 2,
      totalActiveBudget: 65000,
    });

    const { container } = render(view.onRender() as ReactElement);

    expect(screen.getByText('Project Statistics')).toBeTruthy();
    expect(screen.getByText('Task Statistics')).toBeTruthy();
    expect(screen.getByText('User Statistics')).toBeTruthy();
    expect(screen.getByText('Quick views')).toBeTruthy();
    expect(screen.getByText('Task Status Distribution')).toBeTruthy();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy();
    const quickViewsSection = screen
      .getByText('Quick views')
      .closest('.ant-card') as HTMLElement;
    expect(
      within(quickViewsSection).getByRole('button', { name: /projects/i }),
    ).toBeTruthy();
    expect(
      within(quickViewsSection).getByRole('button', { name: /tasks/i }),
    ).toBeTruthy();
    expect(
      within(quickViewsSection).getByRole('button', { name: /users/i }),
    ).toBeTruthy();
    expect(container.textContent).toContain('Total Projects');
    expect(container.textContent).toContain('$65,000.00');
  });

  it('uses rendered controls to refresh data and open quick views', async () => {
    const view = createDashboardView();
    const loadDashboardDataSpy = jest.spyOn(view, 'loadDashboardData');

    await act(async () => {
      await view.loadDashboardData();
    });

    loadDashboardDataSpy.mockClear();

    const { rerender } = render(view.onRender() as ReactElement);
    const quickViewsSection = screen
      .getByText('Quick views')
      .closest('.ant-card') as HTMLElement;

    fireEvent.click(
      within(quickViewsSection).getByRole('button', { name: /projects/i }),
    );
    fireEvent.click(
      within(quickViewsSection).getByRole('button', { name: /tasks/i }),
    );
    fireEvent.click(
      within(quickViewsSection).getByRole('button', { name: /users/i }),
    );

    expect(view.openView).toHaveBeenCalledTimes(3);
    expect(view.openView).toHaveBeenNthCalledWith(
      1,
      ProjectTableView,
      expect.objectContaining({
        container: 'modal',
        modalPosition: 'right',
        modalSize: 'big',
      }),
    );
    expect(view.openView).toHaveBeenNthCalledWith(
      2,
      TaskTableView,
      expect.objectContaining({
        container: 'modal',
        modalPosition: 'right',
        modalSize: 'big',
      }),
    );
    expect(view.openView).toHaveBeenNthCalledWith(
      3,
      UserTableView,
      expect.objectContaining({
        container: 'modal',
        modalPosition: 'right',
        modalSize: 'big',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(loadDashboardDataSpy).toHaveBeenCalledTimes(1);
    });

    rerender(view.onRender() as ReactElement);
    expect(screen.getByText('Project Statistics')).toBeTruthy();
  });
});
