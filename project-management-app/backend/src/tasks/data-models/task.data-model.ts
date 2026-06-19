import {
	BaseDataModel,
	BooleanField,
	ChoiceField,
	CompositionField,
	DataModel,
	DateField,
	DateTimeField,
	Index,
	Indexes,
	IntegerField,
	JsonField,
	logger,
	LongTextField,
	ReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';
import { File } from '@/support/data-models/file.data-model';
import { ReviewChecks } from '@/support/data-models/review-checks.data-model';
import { Role, User } from '@/users/data-models/user.data-model';
import { Note } from './note.data-model';
import { TaskMetadata } from './task-metadata.data-model';

export enum TaskStatus {
	ToDo = 'to_do',
	InProgress = 'in_progress',
	InReview = 'in_review',
	Done = 'done',
	Blocked = 'blocked',
}

export enum TaskPriority {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
	Urgent = 'urgent',
	Critical = 'critical',
}

@Indexes<Task>([
	{
		fields: ['project', 'status', 'priority'],
		name: 'idx_task_project_status_priority',
	},
	{ fields: ['assignee', 'status'], name: 'idx_task_assignee_status' },
	{ fields: ['project', 'dueDate'], name: 'idx_task_project_due_date' },
	{ fields: ['title'], type: 'fullText', name: 'idx_task_title_search' },
])
@DataModel({
	dataSource: 'mainDs',
	docs: 'Task model representing work items within projects',
	crud: {
		api: 'gql',
		actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
	},
	ui: {
		crud: {
			api: 'gql',
			actions: ['crud', 'refresh'],
		},
	},
	validation: (task: Task) => {
		const errors = [];
		// console.log(`[Task Validation] Validating task with title: ${task.title}, status: ${task.status}, startedAt: ${task.startedAt}, completedAt: ${task.completedAt}`);
		// If completedAt is set, startedAt must also be set
		if (task.completedAt && !task.startedAt) {
			errors.push({
				constraint: 'startedAtRequired',
				message: 'Started date must be set before completion date.',
			});
		}
		const startedAtDate: Date | null = task.startedAt
			? new Date(task.startedAt)
			: null;
		const completedAtDate: Date | null = task.completedAt
			? new Date(task.completedAt)
			: null;
		// CompletedAt must be after startedAt
		if (startedAtDate && completedAtDate && completedAtDate < startedAtDate) {
			errors.push({
				constraint: 'invalidDateRange',
				message: 'Completion date must be after start date.',
			});
		}
		const dueDate: Date | null = task.dueDate ? new Date(task.dueDate) : null;
		// Due date should be after start date if both are set
		if (startedAtDate && dueDate && dueDate < startedAtDate) {
			errors.push({
				constraint: 'invalidDueDate',
				message: 'Due date cannot be before start date.',
			});
		}
		return errors;
	},
})
export class Task extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the task',
	})
	id!: string;

	@TextField({
		minLength: 3,
		maxLength: 200,
		calculation: 'manual',
	})
	get summary(): string {
		// console.log('[Task] Manual CALCULATION Generating summary for task:', this.title);
		return (
			this.title +
			' - ' +
			(this.project ? this.project.name : 'No Project') +
			' (' +
			(this.status
				? this.status.replace('_', ' ').toUpperCase()
				: 'No Status') +
			')'
		);
	}

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 200,
		docs: 'Title of the task',
	})
	title!: string;

	@LongTextField({
		maxLength: 5000,
		docs: 'Detailed description of the task',
	})
	description!: string | null;

	@ChoiceField({
		required: true,
		type: () => TaskStatus,
		docs: 'Current status of the task',
	})
	@Index({ type: 'hash', name: 'idx_task_status' })
	status: TaskStatus = TaskStatus.ToDo;

	@ChoiceField({
		required: true,
		type: () => TaskPriority,
		docs: 'Priority level of the task',
		query: {
			sorting: false, // Test: Disable sorting for this field
		},
	})
	@Index({ type: 'hash', name: 'idx_task_priority' })
	priority: TaskPriority = TaskPriority.Medium;

	@ReferenceField<Project>({
		required: true,
		type: () => Project,
		load: true,
		onDelete: 'delete',
		filter: () => ({
			isArchived: false,
		}),
		docs: 'Project this task belongs to',
	})
	project!: Project;

	@ReferenceField<User>({
		type: () => User,
		load: true,
		filter: () => ({
			roles: {
				elemMatch: { in: [Role.Developer, Role.Manager, Role.Admin] },
			},
		}),
		docs: 'User assigned to work on this task',
	})
	assignee!: User | null;

	@ReferenceField<User>({
		type: () => User,
		load: true,
		filter: () => ({
			roles: {
				elemMatch: { in: [Role.Developer, Role.Manager, Role.Admin] },
			},
		}),
		docs: 'User who created this task',
	})
	reporter!: User | null;

	@IntegerField({
		min: 0,
		max: 999,
		docs: 'Estimated hours to complete the task',
	})
	estimatedHours!: number | null;

	@IntegerField({
		min: 0,
		max: 999,
		docs: 'Actual hours spent on the task',
	})
	actualHours!: number | null;

	@DateField({
		docs: 'Due date for the task',
	})
	@Index()
	dueDate!: string | null;

	@DateField({
		docs: 'When the task was started. Required once the task is actively being worked on.',
		required: (task: Task) =>
			task.status === TaskStatus.InProgress ||
			task.status === TaskStatus.InReview ||
			task.status === TaskStatus.Done ||
			task.status === TaskStatus.Blocked,
		available: (task: Task) =>
			task.status === TaskStatus.InProgress ||
			task.status === TaskStatus.InReview ||
			task.status === TaskStatus.Done ||
			task.status === TaskStatus.Blocked,
	})
	startedAt!: string | null;

	@DateField({
		docs: 'When the task was completed. Required when the task status is Done.',
		required: (task: Task) => task.status === TaskStatus.Done,
		available: (task: Task) => task.status === TaskStatus.Done,
	})
	completedAt!: string | null;

	@BooleanField({
		docs: 'Whether the task is billable to the client',
		required: true,
	})
	isBillable: boolean = true;

	@TextField({
		docs: 'Tags for categorizing the task',
	})
	tags!: string[];

	@DateTimeField({
		docs: 'When the task was created',
	})
	createdAt!: string | null;

	@DateTimeField({
		docs: 'When the task was last updated',
	})
	updatedAt!: string | null;

	@LongTextField({
		docs: 'Technical details, reproduction steps, or code snippets',
	})
	technicalDetails!: string | null;

	@JsonField({
		docs: 'Custom metadata for the task (e.g. external IDs, integration data, custom attributes)',
	})
	jsonMetadata!: string | null;

	@CompositionField({ type: () => ReviewChecks, required: false })
	reviewChecks!: ReviewChecks | null;

	@CompositionField({
		type: () => Note,
		docs: 'Notes associated with the task',
	})
	notes!: Note[];

	@CompositionField({
		type: () => TaskMetadata,
		docs: 'Key/value metadata entries for the task',
	})
	metadata!: TaskMetadata[];

	@ReferenceField({
		type: () => File,
		docs: 'File attachments for this task (images, PDFs, documents, etc.)',
	})
	attachments!: File[];

	override onRefresh(changedFields: string[]): void {
		if (!changedFields.includes('project')) {
			return;
		}

		const autoAssignmentNoteTitle = 'Auto-assigned to project manager';
		const notesWithoutAutoAssignment = (this.notes ?? []).filter(
			(existingNote) => existingNote.title !== autoAssignmentNoteTitle,
		);

		if (!this.project?.manager) {
			this.notes = notesWithoutAutoAssignment;
			return;
		}

		const projectManager = this.project.manager;
		logger.info(
			'[Task] onRefresh triggered due to project change. Auto-assigning task to project manager',
			{ managerEmail: projectManager.email },
		);
		this.reporter = projectManager;

		const note = new Note();
		note.title = autoAssignmentNoteTitle;
		note.createdBy = projectManager;
		note.note = `This task was automatically assigned to ${projectManager.fullName} because its project was selected.`;
		this.notes = [...notesWithoutAutoAssignment, note];
	}

	/**
	 * Lifecycle hook called after all field-level `defaultValue` functions have run.
	 *
	 * Initializes collection fields to empty arrays so the rest of the application
	 * can safely iterate over them without null-guards.
	 */
	override async onInit(): Promise<void> {
		if (!this.tags) this.tags = [];
		if (!this.notes) this.notes = [];
		if (!this.metadata) this.metadata = [];
	}

	/**
	 * Lifecycle hook invoked immediately before each database write (create and update).
	 *
	 * Stamps `createdAt` once on the first save and refreshes `updatedAt` on every save,
	 * replacing the manual timestamp logic that previously lived inside `validation` or
	 * action handlers scattered across the codebase.
	 */
	override async onBeforeSave(): Promise<void> {
		if (!this.createdAt) this.createdAt = new Date().toISOString();
		this.updatedAt = new Date().toISOString();
	}
}
