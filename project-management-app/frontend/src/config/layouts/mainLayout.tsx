import {
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LoadingOutlined,
  ProjectOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Task } from '@gql';
import {
  app,
  type ContentWidth,
  getContext,
  type LayoutFeatures,
  type LayoutFooterConfig,
  type LayoutHeaderConfig,
  type LeftMenuConfig,
  menu,
  type Navigation,
  type TopMenuConfig,
  type UserMenuConfig,
  useApiFindBy,
} from '@drumr/framework-frontend';
import { Badge } from 'antd';
import React from 'react';
import ActivityLogView from '@/activityLog/views/ActivityLogView';
import BookTableView from '@/books/views/BookTableView';
import DashboardView from '@/dashboard/views/DashboardView';
import SummaryView from '@/dashboard/views/SummaryView';
import ProjectTableView from '@/projects/views/ProjectTableView';
import ProjectReportTableView from '@/reports/views/ProjectReportTableView';
import TaskTableView from '@/tasks/views/TaskTableView';
import UserReadView from '@/users/views/UserReadView';
import UserTableView from '@/users/views/UserTableView';

function TaskCountLabel() {
  const { loading, data, pageInfo } = useApiFindBy<Task>('Task', {
    fields: { id: true },
  });
  // Prefer totalCount (single-request, exact) — fall back to data.length when
  // the server doesn't populate it (both are accurate because first: null
  // fetches all records in one shot).
  const count = pageInfo.totalCount ?? data.length;

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <span>Tasks</span>
      {loading ? (
        <LoadingOutlined style={{ fontSize: 11 }} spin />
      ) : (
        <Badge
          count={count}
          showZero
          style={{ backgroundColor: '#52c41a' }}
          overflowCount={999}
        />
      )}
    </span>
  );
}

export const mainLayout = app.registerLayout('main', {
  navigation: 'mix' as Navigation,
  contentWidth: 'fixed' as ContentWidth,

  features: {
    header: true,
    footer: true,
    leftMenu: true,
    topMenu: true,
    userMenu: true,
  } as LayoutFeatures,

  collapsible: true,

  header: {
    title: 'Tasky app',
  } as LayoutHeaderConfig,

  footer: {
    copyright: '© 2026 Tasky app',
  } as LayoutFooterConfig,

  leftMenu: {
    menu: menu({
      items: [
        menu.group({
          elementId: 'main-menu',
          label: 'Main',
          items: [
            menu.view({
              elementId: 'projects',
              view: ProjectTableView,
              label: 'Projects',
              icon: <ProjectOutlined />,
            }),
            menu.view({
              elementId: 'tasks',
              view: TaskTableView,
              label: TaskCountLabel,
              icon: <CheckSquareOutlined />,
            }),
            menu.view({
              elementId: 'reports',
              view: ProjectReportTableView,
              label: 'Reports',
              icon: <FileTextOutlined />,
            }),
          ],
        }),
        menu.group({
          elementId: 'settings',
          label: 'Settings',
          items: [
            menu.view({
              elementId: 'users',
              view: UserTableView,
              label: 'Users',
            }),
            menu.view({
              elementId: 'myProfileDetails',
              view: UserReadView,
              label: 'My profile',
              icon: <UserOutlined />,
              params: async () => {
                const ctx = getContext();
                const userId = ctx.user?.id;
                return userId ? { id: userId } : {};
              },
            }),
            menu.view({
              elementId: 'books',
              view: BookTableView,
              icon: <UserOutlined />,
              label: 'Books',
            }),
          ],
        }),
      ],
    }),
    split: true,
  } as LeftMenuConfig,

  topMenu: {
    menu: menu({
      items: [
        menu.view({
          elementId: 'dashboard-secondary',
          view: DashboardView,
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        }),
        menu.view({
          elementId: 'summary-secondary',
          view: SummaryView,
          label: 'Summary',
          icon: <TableOutlined />,
        }),
        menu.view({
          elementId: 'activity',
          view: ActivityLogView,
          label: 'Activity',
        }),
      ],
    }),
    position: 'header' as const,
  } as TopMenuConfig,

  userMenu: {
    menu: menu({
      items: [
        menu.myProfileAction({
          elementId: 'myProfile-user-menu',
          view: UserReadView,
          label: 'My Profile',
          icon: <UserOutlined />,
        }),
      ],
    }),
  } as UserMenuConfig,

  onMenuClick: () => {
    console.log('[Custom Layout: MainLayout] Menu item clicked');
  },

  onMenuCollapse: (collapsed: boolean) => {
    console.log(
      '[Custom Layout: MainLayout] Menu ' +
        (collapsed ? 'collapsed' : 'uncollapsed'),
    );
  },

  onPageSwitch: () => {
    console.log('[Custom Layout: MainLayout] Page switched');
  },
});

export default mainLayout;
