// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models so its @App() decorator marks bootstrap state as "app registered" before @DataModel decorators try to bind to a datasource; reordering would re-introduce the bug where models bind to MainDs instead of MockMainDs.
import 'reflect-metadata';
import {
	App,
	ContextManager,
	createUserContext,
	DependencyContainer,
} from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import { MainDs } from '@/config/data-sources/main/main.ds';
import type { CompleteTaskParams } from '@/tasks/actions/complete-task.action';
import { CompleteTask } from '@/tasks/actions/complete-task.action';
import { DeploymentChecks } from '@/support/data-models/deployment-checks.data-model';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { ReviewChecks } from '@/support/data-models/review-checks.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';
import { Role, User } from '@/users/data-models/user.data-model';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { RequestAuditService } from '@/global/services/request-audit.service';

/**
 * Reference integration spec:
 * - Boots TestApp once.
 * - Uses request context + DI scope.
 * - Verifies both domain result and cross-service side effects.
 */

function createUser(): User {
	const user = new User();
	user.firstName = 'Jordan';
	user.lastName = 'Lee';
	user.email = 'jordan.lee@example.com';
	user.roles = [Role.Manager];
	return user;
}

function createProject(): Project {
	const project = new Project();
	project.name = 'Release Train';
	project.code = `REL-${Math.floor(Math.random() * 9000 + 1000)}`;
	project.status = ProjectStatus.Active;
	project.priority = ProjectPriority.High;
	project.isArchived = false;
	return project;
}

function createTask(
	project: Project,
	status: TaskStatus = TaskStatus.InProgress,
): Task {
	const task = new Task();
	// Do NOT pre-set task.id — let TypeORM auto-generate it on insert.
	// Pre-setting an id causes deleteOrphanedOneToOneCompositions to try to
	// load a non-existent entity with its OneToOne relations, crashing the query.
	task.title = 'Ship release candidate';
	task.project = project;
	task.status = status;
	task.priority = TaskPriority.High;
	task.isBillable = true;
	task.notes = [];
	task.tags = [];
	task.metadata = [];

	const deploymentChecks = new DeploymentChecks();
	deploymentChecks.stagingDeploy = false;
	deploymentChecks.productionDeploy = false;
	deploymentChecks.rollbackPlan = false;

	const reviewChecks = new ReviewChecks();
	reviewChecks.lintCode = false;
	reviewChecks.testsCoverage = false;
	reviewChecks.sampleAppImplementation = false;
	reviewChecks.deploymentChecks = deploymentChecks;
	task.reviewChecks = reviewChecks;

	return task;
}

describe('CompleteTask integration', () => {
	let ds: MainDs;
	let app: TestApp;
	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext();
		ds = DependencyContainer.resolve(MainDs);
	});

	afterAll(async () => {
		await app.stop();
	});

	it('completes the task, records the note, and updates both singleton and request-scoped services', async () => {
		const currentUser = createUser();
		const project = createProject();
		const task = createTask(project);

		// Seed the DB so FK constraints and findOneBy succeed
		await DependencyContainer.runInRequestScope(async () => {
			await ds.save(currentUser);
			await ds.save(project);
			await ds.save(task);
		});

		await ContextManager.run(
			createUserContext({
				id: currentUser.id,
				email: currentUser.email,
				roles: currentUser.roles,
			}),
			async () => {
				await DependencyContainer.runInRequestScope(async () => {
					const action = DependencyContainer.resolve(CompleteTask);
					const requestAudit = DependencyContainer.resolve(RequestAuditService);
					const activityLog = DependencyContainer.resolve(ActivityLogService);

					// Spy so we can assert the calls without disrupting real behaviour
					const saveSpy = jest.spyOn(ds, 'save');
					const findOneBySpy = jest.spyOn(ds, 'findOneBy');

					try {
						const result = await action.execute(task, {
							note: 'Verified with product and QA.',
						} as unknown as CompleteTaskParams);
						// Assert:
						// 1) Domain mutation: task transitions to Done and captures metadata.
						// 2) Persistence boundary: task is saved and actor user is resolved.
						// 3) Cross-service side effects: request audit trail + activity log entries.
						expect(result).toBe(task);
						expect(task.status).toBe(TaskStatus.Done);
						expect(task.completedAt).toBeTruthy();
						expect(task.notes).toHaveLength(1);
						expect(task.notes[0].title).toBe('Completion note');
						expect(task.notes[0].note).toBe('Verified with product and QA.');
						expect(task.notes[0].createdBy?.id).toBe(currentUser.id);
						expect(saveSpy).toHaveBeenCalledWith(task);
						expect(findOneBySpy).toHaveBeenCalledWith(User, {
							id: currentUser.id,
						});

						expect(requestAudit.getSteps()).toHaveLength(2);
						expect(
							requestAudit
								.getSteps()
								.some((step) => step.includes('complete-task: begin')),
						).toBe(true);
						expect(
							requestAudit
								.getSteps()
								.some((step) => step.includes('complete-task: saved')),
						).toBe(true);
						expect(activityLog.getEntries()).toHaveLength(1);
						expect(activityLog.getEntries()[0]).toContain(
							'Task "Ship release candidate" completed',
						);
					} catch {
						saveSpy.mockRestore();
						findOneBySpy.mockRestore();
					}
				});
			},
		);
	});

	it('rejects tasks that are already completed', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(CompleteTask);
			const project = createProject();
			const task = createTask(project, TaskStatus.Done);

			await expect(action.canExecute(task)).resolves.toBe(
				'Task is already completed',
			);
		});
	});

	it('rejects blocked tasks', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(CompleteTask);
			const project = createProject();
			const task = createTask(project, TaskStatus.Blocked);

			await expect(action.canExecute(task)).resolves.toBe(
				'Cannot complete a blocked task',
			);
		});
	});
});
