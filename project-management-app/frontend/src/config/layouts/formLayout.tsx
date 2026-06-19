import {
  CheckSquareOutlined,
  DashboardOutlined,
  ProjectOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  app,
  type ContentWidth,
  type LayoutFeatures,
  type LayoutFooterConfig,
  type LayoutHeaderConfig,
  menu,
  type Navigation,
  type TopMenuConfig,
  type UserMenuConfig,
} from '@drumr/framework-frontend';
import React from 'react';
import DashboardView from '@/dashboard/views/DashboardView';
import SummaryView from '@/dashboard/views/SummaryView';
import ProjectTableView from '@/projects/views/ProjectTableView';
import TaskTableView from '@/tasks/views/TaskTableView';
import UserTableView from '@/users/views/UserTableView';

export const formLayout = app.registerLayout('form', {
  navigation: 'top' as Navigation,
  contentWidth: 'fixed' as ContentWidth,

  features: {
    header: true,
    footer: false,
    leftMenu: false,
    topMenu: true,
    userMenu: true,
  } as LayoutFeatures,

  header: {
    title: 'Edit View',
  } as LayoutHeaderConfig,

  footer: {
    copyright: '© 2026 Tasky App',
  } as LayoutFooterConfig,

  topMenu: {
    menu: menu({
      items: [
        menu.subMenu({
          elementId: 'main-group',
          label: 'Views',
          icon: <TableOutlined />,
          items: [
            menu.view({
              elementId: 'projects',
              view: () => ProjectTableView,
              label: 'Projects',
              icon: <ProjectOutlined />,
            }),
            menu.view({
              elementId: 'tasks',
              view: () => TaskTableView,
              label: 'Tasks',
              icon: <CheckSquareOutlined />,
            }),
            menu.view({
              elementId: 'users',
              view: () => UserTableView,
              label: 'Users',
              icon: <UserOutlined />,
            }),
          ],
        }),
        menu.view({
          elementId: 'dashboard-secondary',
          view: () => DashboardView,
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        }),
        menu.view({
          elementId: 'summary-secondary',
          view: () => SummaryView,
          label: 'Summary',
          icon: <TableOutlined />,
        }),
      ],
    }),
    position: 'header' as const,
  } as TopMenuConfig,

  userMenu: {
    menu: menu({
      items: [
        menu.divider(),
        menu.view({
          elementId: 'dashboard-user',
          view: () => DashboardView,
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        }),
        menu.view({
          elementId: 'summary-user',
          view: () => SummaryView,
          label: 'Summary',
          icon: <TableOutlined />,
        }),
        menu.divider(),
      ],
    }),
  } as UserMenuConfig,

  onMenuClick: () => {
    console.log('[Custom Layout: FormLayout] Menu item clicked');
  },

  onMenuCollapse: (collapsed: boolean) => {
    console.log(
      '[Custom Layout: FormLayout] Menu ' +
        (collapsed ? 'collapsed' : 'uncollapsed'),
    );
  },

  onPageSwitch: () => {
    console.log('[CustomLayout: FormLayout] Form page switched');
  },
});

export default formLayout;
