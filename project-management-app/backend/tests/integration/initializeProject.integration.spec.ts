// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models so its @App() decorator marks bootstrap state as "app registered" before @DataModel decorators try to bind to a datasource; reordering would re-introduce the bug where models bind to MainDs instead of MockMainDs.
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import {
	App,
	DependencyContainer,
	type TypeOrmSqlDataSource,
} from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import { InitializeProject } from '@/projects/actions/initialize-project.action';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

/**
 * Reference integration spec:
 * - success flow (project activation + setup task creation)
 * - failure flow (simulated write interruption)
 * - canExecute guard coverage
 */

function createProject(
	status: ProjectStatus = ProjectStatus.Planning,
): Project {
	const project = new Project();
	project.id = randomUUID();
	project.name = 'Apollo Migration';
	project.code = 'PROJ-101';
	project.status = status;
	project.priority = ProjectPriority.High;
	project.isArchived = false;
	return project;
}

function spyOnSave(ds: TypeOrmSqlDataSource) {
	const originalSave: TypeOrmSqlDataSource['save'] = ds.save.bind(ds);
	return jest
		.spyOn(ds, 'save')
		.mockImplementation(async <T extends object>(entity: T): Promise<T> => {
			return originalSave(entity);
		});
}

describe('InitializeProject integration', () => {
	let app: TestApp;
	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext();
	});

	afterAll(async () => {
		await app.stop();
	});

	it('activates the project and creates the initial setup task', async () => {
		// Arrange:
		// Build a request-scoped action instance and intercept persistence writes,
		// so we can assert both the project update and the setup-task creation order.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(InitializeProject);
			const ds =
				DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
			const project = createProject();
			const saveSpy = spyOnSave(ds);

			try {
				// Act:
				// Execute normal initialization (no simulated failure).
				const result = await action.execute(project, {
					simulateTaskFailure: false,
				} as unknown as InitializeProjectExecuteParams);

				// Assert:
				// 1) Project is activated.
				// 2) The action calls ds.save() twice (project first, setup task second).
				//    The framework's hookCallChain re-entry wrapper causes each logical
				//    save() call to invoke the method twice (outer + inner), so the spy
				//    records 4 total invocations: project×2 then setupTask×2.
				// 3) Setup task is created with expected default fields.
				expect(result).toBe(project);
				expect(project.status).toBe(ProjectStatus.Active);
				expect(saveSpy).toHaveBeenCalledTimes(4);
				expect(saveSpy).toHaveBeenNthCalledWith(1, project);

				const setupTask = saveSpy.mock.calls[2][0] as Task;
				expect(setupTask).toBeInstanceOf(Task);
				expect(setupTask.title).toBe('Project Setup');
				expect(setupTask.description).toContain(project.name);
				expect(setupTask.project).toBe(project);
				expect(setupTask.status).toBe(TaskStatus.ToDo);
				expect(setupTask.priority).toBe(TaskPriority.High);
				expect(setupTask.isBillable).toBe(false);
			} finally {
				saveSpy.mockRestore();
			}
		});
	});

	it('propagates the simulated failure after saving the project status', async () => {
		// Arrange:
		// Use the same persistence spy pattern as the success scenario,
		// but enable failure simulation after the project save.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(InitializeProject);
			const ds =
				DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
			const project = createProject();
			const saveSpy = spyOnSave(ds);

			try {
				// Act + Assert:
				// Initialization should fail with the expected domain error,
				// while still persisting the project status update that happened first.
				await expect(
					action.execute(project, {
						simulateTaskFailure: true,
					} as unknown as InitializeProjectExecuteParams),
				).rejects.toThrow('Simulated failure after project save');

				expect(saveSpy).toHaveBeenCalledTimes(2);
				expect(saveSpy).toHaveBeenCalledWith(project);
			} finally {
				saveSpy.mockRestore();
			}
		});
	});

	it('rejects projects that are already active', async () => {
		// Arrange:
		// Build a project already in Active state.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(InitializeProject);
			const project = createProject(ProjectStatus.Active);

			// Act + Assert:
			// canExecute exposes the guard reason expected by callers.
			await expect(action.canExecute(project)).resolves.toBe(
				'Project is already active',
			);
		});
	});

	it('rejects cancelled projects', async () => {
		// Arrange:
		// Build a project in Cancelled state.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(InitializeProject);
			const project = createProject(ProjectStatus.Cancelled);

			// Act + Assert:
			// Guard reason documents why initialization is disallowed.
			await expect(action.canExecute(project)).resolves.toBe(
				'Cannot initialize a cancelled project',
			);
		});
	});
});
type InitializeProjectExecuteParams = Parameters<
	InitializeProject['execute']
>[1];
