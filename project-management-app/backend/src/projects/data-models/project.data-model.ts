import {
	BaseDataModel,
	BooleanField,
	ChoiceField,
	CompositionField,
	DataModel,
	DateField,
	DateTimeField,
	DependencyContainer,
	HtmlField,
	Indexes,
	IntegerField,
	type Money,
	MoneyField,
	ReferenceField,
	TextField,
	TimeField,
	UuidField,
} from '@drumr/framework-backend';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { Support } from '@/support/data-models/support.data-model';
import { User } from '@/users/data-models/user.data-model';

export enum ProjectStatus {
	Planning = 'planning',
	Active = 'active',
	OnHold = 'on_hold',
	Completed = 'completed',
	Cancelled = 'cancelled',
}

export enum ProjectPriority {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
	Critical = 'critical',
}

@Indexes<Project>([
	{ fields: ['status', 'priority'], name: 'idx_project_status_priority' },
	{ fields: ['manager', 'isArchived'], name: 'idx_project_manager_archived' },
	{ fields: ['name'], type: 'fullText', name: 'idx_project_name_search' },
])
@DataModel({
	dataSource: 'mainDs',
	docs: 'Project model representing a work project with tasks and team members',
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
	validation: (project: Project) => {
		const errors = [];

		// End date must be after start date
		if (
			project.startDate &&
			project.endDate &&
			project.endDate < project.startDate
		) {
			errors.push({
				constraint: 'invalidDateRange',
				message: 'End date must be after start date.',
			});
		}

		// Completed projects should have 100% completion
		if (
			project.status === ProjectStatus.Completed &&
			project.completionPercentage !== 100
		) {
			errors.push({
				constraint: 'incompleteProject',
				message: 'Completion percentage must be 100% for completed projects.',
			});
		}

		return errors;
	},
})
export class Project extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the project',
	})
	id!: string;

	@TextField({
		minLength: 3,
		maxLength: 200,
		calculation: 'automatic',
	})
	get summary(): string {
		// console.log('[Project] AUTOMATIC CALCULATION Generating summary for project:', this.name);
		return `${this.name} - ${this.code} (${this.status.toUpperCase()})`;
	}

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 100,
		docs: 'Name of the project',
	})
	name!: string;

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 20,
		regex: /^[A-Z]{2,5}-\d{1,5}$/,
		regexMessage: 'Code must be in format: PREFIX-NUMBER (e.g., PROJ-123)',
		docs: 'Unique project code identifier',
	})
	code!: string;

	@HtmlField({
		maxLength: 5000,
		docs: 'Detailed description of the project',
	})
	description!: string | null;

	@ChoiceField({
		required: true,
		type: () => ProjectStatus,
		docs: 'Current status of the project',
	})
	status: ProjectStatus = ProjectStatus.Planning;

	@ChoiceField({
		required: true,
		type: () => ProjectPriority,
		docs: 'Priority level of the project',
	})
	priority: ProjectPriority = ProjectPriority.Medium;

	@DateField({
		docs: 'Project start date',
	})
	startDate!: Date | null;

	@DateField({
		docs: 'Project end date',
	})
	endDate!: Date | null;

	@MoneyField({
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0',
		positive: true,
		docs: 'Total budget allocated for the project',
	})
	budget!: Money | null;

	@IntegerField({
		min: 0,
		max: 100,
		docs: 'Project completion percentage (0-100)',
	})
	completionPercentage!: number | null;

	@TimeField({
		min: '08:00',
		max: '17:00',
		precision: 'HH:mm',
		docs: 'Daily meeting time for the project team',
	})
	meetingTime!: string | null;

	@ReferenceField({
		required: true,
		type: () => User,
		load: true,
		docs: 'Project manager responsible for this project',
	})
	manager!: User;

	@ReferenceField({
		type: () => User,
		load: true,
		docs: 'Team members assigned to this project',
	})
	teamMembers!: User[];

	@BooleanField({
		docs: 'Whether the project is archived',
		required: true,
	})
	isArchived: boolean = false;

	@DateTimeField({
		docs: 'When the project was created',
	})
	createdAt!: Date | null;

	@DateTimeField({
		docs: 'When the project was last updated',
	})
	updatedAt!: Date | null;

	@CompositionField({
		type: () => Support,
		docs: 'Support details associated with the project',
	})
	support!: Support | null;

	/**
	 * Lifecycle hook invoked immediately before each database write (create and update).
	 *
	 * Stamps `createdAt` once on first save and refreshes `updatedAt` on every save.
	 */
	override async onBeforeSave(): Promise<void> {
		const now = new Date();
		if (!this.createdAt) this.createdAt = now;
		this.updatedAt = now;
	}

	/**
	 * Lifecycle hook invoked immediately after the project has been successfully persisted.
	 *
	 * Records an activity log entry for every create/update so the team has a simple
	 * audit trail without having to add logging to every action that saves a project.
	 */
	override onAfterSave(saved: this): void {
		const log = DependencyContainer.resolve(
			ActivityLogService,
		) as ActivityLogService;
		const operation =
			saved.createdAt?.getTime() === saved.updatedAt?.getTime()
				? 'created'
				: 'updated';
		log.addEntry(`Project "${saved.name}" (${saved.id}) was ${operation}`);
	}
}
