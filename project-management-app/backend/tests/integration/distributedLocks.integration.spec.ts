// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models
import 'reflect-metadata';
import {
	App,
	CannotExecuteError,
	ContextManager,
	DependencyContainer,
	LockService,
	createUserContext,
} from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';
import { DeploymentChecks } from '@/support/data-models/deployment-checks.data-model';
import { ReviewChecks } from '@/support/data-models/review-checks.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';
import { Role, User } from '@/users/data-models/user.data-model';
import { TaskLockingService } from '@/global/services/TaskLockingService';

function makeUser(): User {
	const u = new User();
	u.firstName = 'Alex';
	u.lastName = 'Smith';
	u.email = `alex.${Date.now()}@example.com`;
	u.roles = [Role.Developer];
	return u;
}

function makeProject(): Project {
	const p = new Project();
	p.name = 'Lock Test Project';
	p.code = `LCK-${Math.floor(Math.random() * 9000 + 1000)}`;
	p.status = ProjectStatus.Active;
	p.priority = ProjectPriority.Medium;
	p.isArchived = false;
	return p;
}

function makeTask(project: Project, status = TaskStatus.ToDo): Task {
	const t = new Task();
	t.title = 'Locked task';
	t.project = project;
	t.status = status;
	t.priority = TaskPriority.Medium;
	t.isBillable = false;
	t.notes = [];
	t.tags = [];
	t.metadata = [];
	const dc = new DeploymentChecks();
	dc.stagingDeploy = false;
	dc.productionDeploy = false;
	dc.rollbackPlan = false;
	const rc = new ReviewChecks();
	rc.lintCode = false;
	rc.testsCoverage = false;
	rc.sampleAppImplementation = false;
	rc.deploymentChecks = dc;
	t.reviewChecks = rc;
	return t;
}

describe('Distributed locks integration (memory provider)', () => {
	let ds: MainDs;
	let lockService: LockService;
	let taskLockingService: TaskLockingService;

	beforeAll(async () => {
		await App.resolve(TestApp).initTestContext();
		ds = DependencyContainer.resolve(MainDs);
		lockService = DependencyContainer.resolve(LockService);
		taskLockingService = DependencyContainer.resolve(TaskLockingService);
	});

	afterAll(async () => {
		await App.resolve(TestApp).stop();
	});

	it('LockService is resolvable as a singleton', () => {
		const svc2 = DependencyContainer.resolve(LockService);
		expect(lockService).toBe(svc2);
	});

	it('withLock runs the callback and returns its value', async () => {
		const result = await lockService.withLock('test:basic', async () => 'done');
		expect(result).toBe('done');
	});

	it('withTryLock returns null when lock is already held', async () => {
		const lock = await lockService.lock('test:contention');
		const result = await lockService.withTryLock(
			'test:contention',
			async () => true,
		);
		expect(result).toBeNull();
		await lock.release();
	});

	it('TaskLockingService.startTask transitions status and returns the updated task', async () => {
		const user = makeUser();
		const project = makeProject();
		const task = makeTask(project);

		await DependencyContainer.runInRequestScope(async () => {
			await ds.save(user);
			await ds.save(project);
			await ds.save(task);
		});

		let result: Awaited<ReturnType<typeof taskLockingService.startTask>>;

		await ContextManager.run(
			createUserContext({ id: user.id!, email: user.email }),
			async () => {
				await DependencyContainer.runInRequestScope(async () => {
					result = await taskLockingService.startTask(task);
				});
			},
		);

		expect(result!).not.toBeInstanceOf(CannotExecuteError);
		const updated = result as Task;
		expect(updated.status).toBe(TaskStatus.InProgress);
		expect(updated.startedAt).toBeDefined();
	});

	it('TaskLockingService.startTask returns CannotExecuteError when lock is unavailable', async () => {
		const user = makeUser();
		const project = makeProject();
		const task = makeTask(project);

		await DependencyContainer.runInRequestScope(async () => {
			await ds.save(user);
			await ds.save(project);
			await ds.save(task);
		});

		// Grab the lock manually to simulate concurrent access.
		const lock = await lockService.lock(`task:${task.id}`, { timeout: 5000 });

		let result: Awaited<ReturnType<typeof taskLockingService.startTask>>;

		await ContextManager.run(
			createUserContext({ id: user.id!, email: user.email }),
			async () => {
				await DependencyContainer.runInRequestScope(async () => {
					result = await taskLockingService.startTask(task);
				});
			},
		);

		await lock.release();

		expect(result!).toBeInstanceOf(CannotExecuteError);
	});
});
