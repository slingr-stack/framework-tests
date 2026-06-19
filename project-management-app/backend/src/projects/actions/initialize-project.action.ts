import {
	Action,
	BaseDataModel,
	BooleanField,
	DataModel,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

/**
 * Parameters for the InitializeProject action.
 */
@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
class InitializeProjectParams extends BaseDataModel {
	/**
	 * When true, a simulated error is thrown after the project status has been
	 * saved but before the setup task is created. Because this action uses
	 * `transactional: true`, the framework rolls back the status change as well,
	 * leaving the project exactly as it was before the action ran.
	 *
	 * Use this to demonstrate that declarative transactions cover every write
	 * in the execute() body — not just the last one.
	 */
	@BooleanField({
		required: false,
		docs: 'Set to true to throw after saving the project status, demonstrating full transaction rollback.',
	})
	simulateTaskFailure: boolean | null = false;
}

/**
 * Activates a project and creates an initial "Project Setup" task atomically.
 *
 * This action uses `transactional: true` to wrap the entire execute() body in a
 * database transaction. If saving either the project or the setup task fails,
 * both writes are rolled back — the project never ends up Active without its
 * setup task, and no orphaned task is left behind.
 */
@Action({
	type: 'write',
	model: Project,
	api: 'gql',
	params: InitializeProjectParams,
	returns: Project,
	transactional: true,
})
export class InitializeProject extends ObjectAction<
	Project,
	InitializeProjectParams,
	Project
> {
	constructor(private ds: MainDs) {
		super();
	}

	override async canExecute(project: Project): Promise<boolean | string> {
		if (project.status === ProjectStatus.Active) {
			return 'Project is already active';
		}
		if (project.status === ProjectStatus.Cancelled) {
			return 'Cannot initialize a cancelled project';
		}
		return true;
	}

	override async execute(
		project: Project,
		params: InitializeProjectParams,
	): Promise<Project> {
		logger.info(
			`[InitializeProject] Starting — "${project.name}" current status: ${project.status}`,
		);

		// Step 1: activate the project
		project.status = ProjectStatus.Active;
		await this.ds.save(project);
		logger.info(
			`[InitializeProject] Step 1 ✓ — status saved as Active inside transaction`,
		);

		// Failure hook: throw here to prove the status change above is rolled back.
		// Because transactional: true wraps the entire execute() in a transaction,
		// this error causes the project status save to be rolled back as well.
		if (params.simulateTaskFailure) {
			logger.info(
				`[InitializeProject] Simulating failure — the step-1 write above will be rolled back`,
			);
			throw new Error(
				'Simulated failure after project save — transaction will roll back the status change',
			);
		}

		// Step 2: create the initial setup task linked to this project.
		// If this save throws (e.g. a validation error), the status change above
		// is automatically rolled back because both writes share the same transaction.
		const setupTask = new Task();
		setupTask.title = 'Project Setup';
		setupTask.description = `Initial setup tasks for ${project.name}`;
		setupTask.status = TaskStatus.ToDo;
		setupTask.priority = TaskPriority.High;
		setupTask.project = project;
		setupTask.isBillable = false;
		await this.ds.save(setupTask);
		logger.info(
			`[InitializeProject] Step 2 ✓ — setup task "${setupTask.title}" saved inside transaction`,
		);
		logger.info(
			`[InitializeProject] Transaction committed — both writes persisted`,
		);

		return project;
	}
}
