import { app } from '@drumr/framework-backend';
import {
	DashboardFilters,
	DashboardSummaryResult,
	GetDashboardSummary,
} from '@/global/actions/get-dashboard-summary.action';
import {
	GetSummaryTableData,
	PaginationInfo,
	PaginationInput,
	ProjectWhereInput,
	SummaryTableDataFilters,
	SummaryTableDataResult,
	TaskSortInput,
	TaskWhereInput,
} from '@/global/actions/get-summary-table-data.action';
import { GenerateReport } from '@/projects/actions/generate-report.action';
import {
	GetProjectStatistics,
	ProjectStatisticsResult,
} from '@/projects/actions/get-project-statistics.action';
import {
	HealthCheckOptions,
	ProjectHealthCheck,
} from '@/projects/actions/project-health-check.action';
import {
	UpdateProjectStatus,
	UpdateProjectStatusParams,
} from '@/projects/actions/update-project-status.action';
import { Project } from '@/projects/data-models/project.data-model';
import { ProjectReport } from '@/projects/data-models/project-report.data-model';
import { Document } from '@/support/data-models/document.data-model';
import { File } from '@/support/data-models/file.data-model';
import { ArchiveTask } from '@/tasks/actions/archive-task.action';
import { Note } from '@/tasks/data-models/note.data-model';
import {
	AssignTask,
	AssignTaskParams,
} from '@/tasks/actions/assign-task.action';
import {
	BulkChangePriority,
	BulkChangePriorityParams,
} from '@/tasks/actions/bulk-change-priority.action';
import {
	CompleteTask,
	CompleteTaskParams,
} from '@/tasks/actions/complete-task.action';
import { RescheduleTask } from '@/tasks/actions/reschedule-task.action';
import { StartTask } from '@/tasks/actions/start-task.action';
import { Task } from '@/tasks/data-models/task.data-model';
import { Role, User } from '@/users/data-models/user.data-model';

// Guest permissions (unauthenticated users)
app.defineGuestPermissions((_) => {
	// Guests can only access login/auth endpoints
	// No model or action access
});

// Global permissions (all authenticated users)
app.defineGlobalPermissions((user, { can, cannot }) => {
	// Immutable audit fields protection
	cannot('write', User, ['createdAt']);
	cannot('write', Project, ['createdAt']);
	cannot('write', Document, ['createdAt']);
	cannot('write', Task, ['createdAt']);
	cannot('write', Note, ['createdAt', 'createdBy']);

	// All users can read their own profile
	can('access', User, { id: user.id });
	can('read', User, { id: user.id });
	can('update', User, { id: user.id });

	// Cannot change their own roles
	cannot('update', User, ['roles']);

	// Allow writing to action parameter classes (internal models used for action inputs)
	// This is safe because action execution is still controlled by 'execute' permission
	can('write', UpdateProjectStatusParams);
	can('write', AssignTaskParams);
	can('write', CompleteTaskParams);
	can('write', GenerateReport);
	can('write', BulkChangePriorityParams);
	can('write', HealthCheckOptions);
	can('execute', GenerateReport);
	can('execute', RescheduleTask);
	can('execute', ProjectHealthCheck);
});

// System role - full access
app.definePermissionsForRole(Role.System, (_user, { can, cannot: _cannot }) => {
	can('manage', 'all');
});

// Admin role - full access to everything except system operations
app.definePermissionsForRole(Role.Admin, (_user, { can, cannot: _cannot }) => {
	// Full access to users
	can('manage', User);

	// Full access to projects
	can('manage', Project);
	can('write', Project); // Allow writing all fields

	// Full access to tasks
	can('manage', Task);
	can('write', Task); // Allow writing all fields

	// Allow writing to all action parameters (since admin can execute all actions)
	can('manage', 'all'); // This grants all permissions including write to any model/parameter

	// Can execute all actions
	can('execute', CompleteTask);
	can('execute', AssignTask);
	can('execute', StartTask);
	can('execute', ArchiveTask);
	can('execute', BulkChangePriority);
	can('execute', UpdateProjectStatus);
	can('execute', GenerateReport);

	// ProjectReport permissions
	can('manage', ProjectReport);
	can('manage', File);

	can('manage', Document);
});

// Manager role - can manage projects and tasks
app.definePermissionsForRole(Role.Manager, (user, { can, cannot }) => {
	// Can view all user
	can('access', User);
	can('read', User);

	can('access', Project);
	can('read', Project);

	// Can manage projects where they are the manager
	can('create', Project);
	can('update', Project, { manager: { id: { eq: user.id } } });
	can('write', Project, { manager: { id: { eq: user.id } } }); // Allow writing all fields for their projects
	can('delete', Project, { manager: { id: { eq: user.id } } });

	// Can view all tasks (to see context)
	can('read', Task);

	// Can manage tasks in their projects
	can('access', Task, {
		project: {
			manager: { id: { eq: user.id } },
		},
	});
	can('create', Task);
	can('update', Task, {
		project: {
			manager: { id: { eq: user.id } },
		},
	});
	can('write', Task, {
		project: {
			manager: { id: { eq: user.id } },
		},
	}); // Allow writing all fields for tasks in their projects
	can('delete', Task, {
		project: {
			manager: { id: { eq: user.id } },
		},
	});

	// Access reports
	can('manage', ProjectReport);
	can('access', File);
	can('read', File);

	// Can execute task and project actions on their projects
	can('execute', CompleteTask);
	can('access', CompleteTaskParams);
	can('read', CompleteTaskParams);
	can('write', CompleteTaskParams);

	can('execute', AssignTask);
	can('access', AssignTaskParams);
	can('read', AssignTaskParams);
	can('write', AssignTaskParams);

	can('execute', StartTask);
	can('execute', ArchiveTask);
	can('execute', BulkChangePriority);
	can('access', BulkChangePriorityParams);
	can('read', BulkChangePriorityParams);
	can('write', BulkChangePriorityParams);

	can('execute', UpdateProjectStatus);
	can('access', UpdateProjectStatusParams);
	can('read', UpdateProjectStatusParams);
	can('write', UpdateProjectStatusParams);

	can('execute', GetDashboardSummary);
	can('access', DashboardFilters);
	can('read', DashboardFilters);
	can('write', DashboardFilters);
	can('access', DashboardSummaryResult);
	can('read', DashboardSummaryResult);

	can('execute', GetSummaryTableData);
	can('access', SummaryTableDataFilters);
	can('read', SummaryTableDataFilters);
	can('write', SummaryTableDataFilters);
	can('access', PaginationInput);
	can('read', PaginationInput);
	can('write', PaginationInput);
	can('access', TaskWhereInput);
	can('read', TaskWhereInput);
	can('write', TaskWhereInput);
	can('access', TaskSortInput);
	can('read', TaskSortInput);
	can('write', TaskSortInput);
	can('access', ProjectWhereInput);
	can('read', ProjectWhereInput);
	can('write', ProjectWhereInput);
	can('access', SummaryTableDataResult);
	can('read', SummaryTableDataResult);
	can('access', PaginationInfo);
	can('read', PaginationInfo);

	can('execute', GetProjectStatistics);
	can('access', ProjectStatisticsResult);
	can('read', ProjectStatisticsResult);

	can('execute', GenerateReport);
});

// Developer role - can work on assigned tasks
app.definePermissionsForRole(Role.Developer, (user, { can, cannot }) => {
	// Can view users (to see who to collaborate with)
	can('read', User);

	// Can view projects they're part of as team members
	can('access', Project, {
		teamMembers: {
			elemMatch: { id: { eq: user.id } },
		},
	});
	can('read', Project, {
		teamMembers: {
			elemMatch: { id: { eq: user.id } },
		},
	});

	// Can view all tasks in their projects (to see context)
	can('access', Task, {
		project: {
			teamMembers: {
				elemMatch: { id: { eq: user.id } },
			},
		},
	});
	can('read', Task, {
		project: {
			teamMembers: {
				elemMatch: { id: { eq: user.id } },
			},
		},
	});

	// Can update tasks assigned to them
	can('update', Task, { assignee: { id: { eq: user.id } } });

	// Can write to specific fields on their assigned tasks
	can(
		'write',
		Task,
		['status', 'actualHours', 'description', 'completedAt', 'startedAt'],
		{
			assignee: { id: { eq: user.id } },
		},
	);

	// Can execute actions on their own tasks
	// Can execute task and project actions on their projects
	can('execute', CompleteTask, (task: Task) => task.assignee?.id === user.id);
	can('access', CompleteTaskParams);
	can('read', CompleteTaskParams);
	can('write', CompleteTaskParams);

	can('execute', StartTask, (task: Task) => {
		return task.assignee?.id === user.id;
	});

	// Cannot assign tasks or update project status
	cannot('execute', AssignTask);
	cannot('execute', UpdateProjectStatus);

	// cannot view projects statistics
	cannot('execute', GetDashboardSummary);
	cannot('execute', GetSummaryTableData);
	cannot('execute', GetProjectStatistics);
});
