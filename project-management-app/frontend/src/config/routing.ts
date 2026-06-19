import { AppRegistry } from '@drumr/framework-frontend';
import BookCreateView from '@/books/views/BookCreateView';
import BookEditView from '@/books/views/BookEditView';
import BookReadView from '@/books/views/BookReadView';
import BookTableView from '@/books/views/BookTableView';
import { formLayout } from '@/config/layouts/formLayout';
import { mainLayout } from '@/config/layouts/mainLayout';
import { viewLayout } from '@/config/layouts/viewLayout';
// Document views
import DocumentCreateView from '@/documents/views/DocumentCreateView';
import DocumentEditView from '@/documents/views/DocumentEditView';
import DocumentReadView from '@/documents/views/DocumentReadView';
import DocumentTableView from '@/documents/views/DocumentTableView';
// Dashboard views
import ActivityLogView from '../activityLog/views/ActivityLogView';
import DashboardView from '../dashboard/views/DashboardView';
import SummaryView from '../dashboard/views/SummaryView';
// Global action views
import ArchiveCompletedProjectsView from '../global/views/ArchiveCompletedProjectsView';
import EvaluateTaskPriorityView from '../global/views/EvaluateTaskPriorityView';
import GenerateReportView from '../global/views/GenerateReportView';
import GetDashboardSummaryView from '../global/views/GetDashboardSummaryView';
import StartReportInBackgroundView from '../global/views/StartReportInBackgroundView';
import InitializeProjectView from '../projects/views/actions/InitializeProjectView';
import ProjectHealthCheckView from '../projects/views/actions/ProjectHealthCheckView';
import UpdateProjectStatusView from '../projects/views/actions/UpdateProjectStatusView';
// Project views
import ProjectCreateView from '../projects/views/ProjectCreateView';
import ProjectEditView from '../projects/views/ProjectEditView';
import ProjectReadView from '../projects/views/ProjectReadView';
import ProjectTableView from '../projects/views/ProjectTableView';
// Report views
import ProjectReportCreateView from '../reports/views/ProjectReportCreateView';
import ProjectReportEditView from '../reports/views/ProjectReportEditView';
import ProjectReportReadView from '../reports/views/ProjectReportReadView';
import ProjectReportTableView from '../reports/views/ProjectReportTableView';
// Shared views
import ErrorPagesTestView from '../shared/views/ErrorPagesTestView';
import ApproveTaskView from '../tasks/views/actions/ApproveTaskView';
import AssignTaskView from '../tasks/views/actions/AssignTaskView';
import BulkChangePriorityView from '../tasks/views/actions/BulkChangePriorityView';
import CloneTaskView from '../tasks/views/actions/CloneTaskView';
import CompleteTaskHeadlessView from '../tasks/views/actions/CompleteTaskHeadlessView';
import CompleteTaskView from '../tasks/views/actions/CompleteTaskView';
import RescheduleTaskView from '../tasks/views/actions/RescheduleTaskView';
import StartTaskView from '../tasks/views/actions/StartTaskView';
import SubmitEstimateView from '../tasks/views/actions/SubmitEstimateView';
// Task views
import HighPriorityTasksView from '../tasks/views/HighPriorityTasksView';
import PendingTasksView from '../tasks/views/PendingTasksView';
import TaskCreateView from '../tasks/views/TaskCreateView';
import TaskEditView from '../tasks/views/TaskEditView';
import TaskEstimateView from '../tasks/views/TaskEstimateView';
import TaskFormCustomView from '../tasks/views/TaskFormCustomView';
import TaskReadView from '../tasks/views/TaskReadView';
import TaskTableView from '../tasks/views/TaskTableView';
// User views
import UserCreateView from '../users/views/UserCreateView';
import UserEditView from '../users/views/UserEditView';
import UserReadView from '../users/views/UserReadView';
import UserTableView from '../users/views/UserTableView';

export function registerRoutes(app: AppRegistry) {
  app.registerRoutes([
    // ─── Custom views ─────────────────────────────────────────────────
    { path: '/', view: DashboardView },
    { path: '/summary', view: SummaryView },
    { path: '/activity', view: ActivityLogView },
    { path: '/error-pages-test', view: ErrorPagesTestView },

    // ─── Global action views ──────────────────────────────────────────
    {
      path: '/get-dashboard-summary',
      view: GetDashboardSummaryView,
      layout: formLayout,
    },
    { path: '/generate-report', view: GenerateReportView },
    {
      path: '/archive-completed-projects',
      view: ArchiveCompletedProjectsView,
      layout: formLayout,
    },
    {
      path: '/evaluate-task-priority',
      view: EvaluateTaskPriorityView,
      layout: formLayout,
    },
    {
      path: '/start-report-in-background',
      view: StartReportInBackgroundView,
      layout: formLayout,
    },

    // ─── Projects ─────────────────────────────────────────────────────
    { path: '/projects', view: ProjectTableView },
    { path: '/projects/new', view: ProjectCreateView, layout: formLayout },
    { path: '/projects/:id/view', view: ProjectReadView, layout: viewLayout },
    { path: '/projects/:id/edit', view: ProjectEditView, layout: formLayout },
    {
      path: '/projects/:id/initialize-project',
      view: InitializeProjectView,
      layout: formLayout,
    },
    {
      path: '/projects/:id/update-project-status',
      view: UpdateProjectStatusView,
      layout: formLayout,
    },
    {
      path: '/projects/:id/project-health-check',
      view: ProjectHealthCheckView,
      layout: formLayout,
    },

    // ─── Tasks ────────────────────────────────────────────────────────
    { path: '/tasks', view: TaskTableView },
    { path: '/tasks/pending', view: PendingTasksView },
    { path: '/tasks/high-priority', view: HighPriorityTasksView },
    { path: '/tasks/new', view: TaskCreateView, layout: formLayout },
    {
      path: '/tasks/bulk-change-priority',
      view: BulkChangePriorityView,
      layout: formLayout,
    },
    { path: '/tasks/:id', view: TaskReadView, layout: formLayout },
    { path: '/tasks/:id/edit', view: TaskEditView, layout: formLayout },
    {
      path: '/tasks/:id/edit-custom',
      view: TaskFormCustomView,
      layout: formLayout,
    },
    { path: '/tasks/estimate', view: TaskEstimateView },
    {
      path: '/tasks/:id/approve-task',
      view: ApproveTaskView,
      layout: formLayout,
    },
    {
      path: '/tasks/:id/assign-task',
      view: AssignTaskView,
      layout: formLayout,
    },
    { path: '/tasks/:id/clone-task', view: CloneTaskView, layout: formLayout },
    {
      path: '/tasks/:id/complete-task',
      view: CompleteTaskView,
      layout: formLayout,
    },
    {
      // useActionView headless example — same action, fully custom render
      path: '/tasks/:id/complete-task-headless',
      view: CompleteTaskHeadlessView,
      layout: formLayout,
    },
    {
      path: '/tasks/:id/reschedule-task',
      view: RescheduleTaskView,
      layout: formLayout,
    },
    { path: '/tasks/:id/start-task', view: StartTaskView, layout: formLayout },
    {
      path: '/taskestimate/action/submitestimate',
      view: SubmitEstimateView,
      layout: formLayout,
    },

    // ─── Project Reports ──────────────────────────────────────────────────────
    {
      path: '/project-reports',
      view: ProjectReportTableView,
      layout: mainLayout,
    },
    {
      path: '/project-reports/new',
      view: ProjectReportCreateView,
      layout: formLayout,
    },
    {
      path: '/project-reports/:id',
      view: ProjectReportReadView,
      layout: formLayout,
    },
    {
      path: '/project-reports/:id/edit',
      view: ProjectReportEditView,
      layout: formLayout,
    },

    // ─── Users ────────────────────────────────────────────────────────
    { path: '/users', view: UserTableView },
    { path: '/users/new', view: UserCreateView, layout: formLayout },
    { path: '/users/:id/view', view: UserReadView, layout: viewLayout },
    { path: '/users/:id/edit', view: UserEditView, layout: formLayout },

    // ─── Books ────────────────────────────────────────────────────────
    { path: '/books', view: BookTableView },
    { path: '/books/new', view: BookCreateView },
    { path: '/books/:id/view', view: BookReadView },
    { path: '/books/:id/edit', view: BookEditView },

    // ─── Documents ───────────────────────────────────────────────────
    { path: '/documents', view: DocumentTableView },
    { path: '/documents/new', view: DocumentCreateView, layout: formLayout },
    { path: '/documents/:id', view: DocumentReadView, layout: formLayout },
    { path: '/documents/:id/edit', view: DocumentEditView, layout: formLayout },
  ]);
}
