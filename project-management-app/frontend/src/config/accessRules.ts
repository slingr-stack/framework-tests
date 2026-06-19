import { app } from '@drumr/framework-frontend';
import { UserRolesEnum } from '../../generated/gql/types';

import ActivityLogView from '../activityLog/views/ActivityLogView';
import SummaryView from '../dashboard/views/SummaryView';
import ArchiveCompletedProjectsView from '../global/views/ArchiveCompletedProjectsView';
import EvaluateTaskPriorityView from '../global/views/EvaluateTaskPriorityView';
import GenerateReportView from '../global/views/GenerateReportView';
import GetDashboardSummaryView from '../global/views/GetDashboardSummaryView';
import StartReportInBackgroundView from '../global/views/StartReportInBackgroundView';
import InitializeProjectView from '../projects/views/actions/InitializeProjectView';
import ProjectHealthCheckView from '../projects/views/actions/ProjectHealthCheckView';
import UpdateProjectStatusView from '../projects/views/actions/UpdateProjectStatusView';
import ProjectCreateView from '../projects/views/ProjectCreateView';
import ProjectEditView from '../projects/views/ProjectEditView';
import ErrorPagesTestView from '../shared/views/ErrorPagesTestView';
import ApproveTaskView from '../tasks/views/actions/ApproveTaskView';
import AssignTaskView from '../tasks/views/actions/AssignTaskView';
import UserCreateView from '../users/views/UserCreateView';
import UserEditView from '../users/views/UserEditView';
import UserReadView from '../users/views/UserReadView';
import UserTableView from '../users/views/UserTableView';

export function setAccessRules(): void {
  // System role — unrestricted access to all views.
  app.registerViewAccessForRole(
    UserRolesEnum.System,
    (_user, { allowView }) => {
      allowView('all');
    },
  );

  // Admin role — full view access including user management.
  app.registerViewAccessForRole(UserRolesEnum.Admin, (_user, { allowView }) => {
    allowView('all');
  });

  // Manager role — all views except user management and error-pages test.
  app.registerViewAccessForRole(
    UserRolesEnum.Manager,
    (_user, { allowView, denyView }) => {
      allowView('all');
      denyView(UserTableView);
      denyView(UserReadView);
      denyView(UserEditView);
      denyView(UserCreateView);
      denyView(ErrorPagesTestView);
    },
  );

  // Developer role — limited to task/project work; no admin or management views.
  app.registerViewAccessForRole(
    UserRolesEnum.Developer,
    (_user, { allowView, denyView }) => {
      allowView('all');
      denyView(UserTableView);
      denyView(UserReadView);
      denyView(UserEditView);
      denyView(UserCreateView);
      denyView(SummaryView);
      denyView(ActivityLogView);
      denyView(ProjectCreateView);
      denyView(ProjectEditView);
      denyView(AssignTaskView);
      denyView(ApproveTaskView);
      denyView(UpdateProjectStatusView);
      denyView(ProjectHealthCheckView);
      denyView(InitializeProjectView);
      denyView(EvaluateTaskPriorityView);
      denyView(ArchiveCompletedProjectsView);
      denyView(StartReportInBackgroundView);
      denyView(GetDashboardSummaryView);
      denyView(GenerateReportView);
      denyView(ErrorPagesTestView);
    },
  );
}
