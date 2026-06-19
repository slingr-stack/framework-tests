import {
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  MenuOutlined,
  ProjectOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
} from '@drumr/framework-frontend';
import React from 'react';
import ActivityLogView from '@/activityLog/views/ActivityLogView';
import { getViewedUserId, useViewedUserId } from '@/context/viewedUser';
import DashboardView from '@/dashboard/views/DashboardView';
import SummaryView from '@/dashboard/views/SummaryView';
import ProjectTableView from '@/projects/views/ProjectTableView';
import ProjectReportTableView from '@/reports/views/ProjectReportTableView';
import TaskTableView from '@/tasks/views/TaskTableView';
import UserReadView from '@/users/views/UserReadView';
import UserTableView from '@/users/views/UserTableView';

export const viewLayout = app.registerLayout('view', {
  navigation: 'left' as Navigation,
  contentWidth: 'fluid' as ContentWidth,

  features: {
    header: true,
    footer: true,
    leftMenu: true,
    topMenu: true,
    userMenu: true,
  } as LayoutFeatures,

  header: {
    title: 'Details View',
  } as LayoutHeaderConfig,

  footer: {
    copyright: '© 2026 Tasky App',
  } as LayoutFooterConfig,

  leftMenu: {
    menu: menu({
      items: [
        menu.group({
          elementId: 'main-menu',
          label: 'Main',
          icon: <MenuOutlined />,
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
              label: () => {
                const viewedUserId = useViewedUserId();
                return viewedUserId ? "User's tasks" : 'All tasks';
              },
              icon: <CheckSquareOutlined />,
              queryParams: () => {
                const viewedUserId = getViewedUserId();
                return viewedUserId ? { assignee: viewedUserId } : {};
              },
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
              icon: <UserOutlined />,
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
          ],
        }),
      ],
    }),
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
    console.log('[Custom Layout: ViewLayout] Menu item clicked');
  },

  onMenuCollapse: (collapsed: boolean) => {
    console.log(
      '[Custom Layout: ViewLayout] Menu ' +
        (collapsed ? 'collapsed' : 'uncollapsed'),
    );
  },

  onPageSwitch: () => {
    console.log('[Custom Layout: ViewLayout] Page switched');
  },
});

export default viewLayout;
