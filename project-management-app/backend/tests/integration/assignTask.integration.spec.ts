/**
 * Integration tests verifying that AssignTask sends a notification email
 * through the EmailService.
 *
 * The real SMTP EmailService is replaced by MockEmailService via the TestApp
 * testing context — no network connection is opened during these tests.
 */

// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models so its @App() decorator marks bootstrap state as "app registered" before @DataModel decorators try to bind to a datasource; reordering would re-introduce the bug where models bind to MainDs instead of MockMainDs.
import 'reflect-metadata';
import { App, DependencyContainer } from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import type { MainDs } from '@/config/data-sources/main/main.ds';
import {
	AssignTask,
	type AssignTaskParams,
} from '@/tasks/actions/assign-task.action';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';
import { Role, User } from '@/users/data-models/user.data-model';
import type { MockEmailService } from './mocks/MockEmailService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(email: string, firstName = 'Test', lastName = 'User'): User {
	const u = new User();
	u.email = email;
	u.firstName = firstName;
	u.lastName = lastName;
	u.roles = [Role.Developer];
	return u;
}

function makeTask(title: string, assignee: User | null = null): Task {
	const t = new Task();
	t.title = title;
	t.status = TaskStatus.ToDo;
	t.priority = TaskPriority.Medium;
	t.assignee = assignee;
	return t;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AssignTask — email notification', () => {
	let emailMock: MockEmailService;
	let ds: MainDs;
	let app: TestApp;

	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext();
		emailMock = DependencyContainer.resolveById(
			'emailService',
		) as MockEmailService;
		ds = DependencyContainer.resolveById('mainDs') as MainDs;
	});

	afterAll(async () => {
		await app.stop();
	});

	afterEach(() => {
		emailMock?.reset();
	});

	it('sends an assignment email to the new assignee', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(AssignTask);
			const newAssignee = makeUser('dev@example.com', 'Alice', 'Dev');
			const task = makeTask('Fix critical bug');
			await ds.save(newAssignee);
			await ds.save(task);

			await action.execute(task, {
				assignee: newAssignee,
			} as unknown as AssignTaskParams);
			await new Promise<void>((r) => setImmediate(r));

			expect(emailMock.getSentEmails()).toHaveLength(1);
			const email = emailMock.getSentEmails()[0];
			expect(email.to).toBe('dev@example.com');
			expect(email.subject).toContain('Fix critical bug');
		});
	});

	it('email subject mentions the task title', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(AssignTask);
			const assignee = makeUser('pm@example.com', 'Bob', 'Manager');
			const task = makeTask('Implement new dashboard');
			await ds.save(assignee);
			await ds.save(task);

			await action.execute(task, { assignee } as unknown as AssignTaskParams);
			await new Promise<void>((r) => setImmediate(r));

			const savedTask = await ds.findOne(Task, {
				where: { id: task.id },
				references: { assignee: true },
			});
			const email = emailMock.getLastSentEmail();
			expect(savedTask?.assignee?.id).toBe(assignee.id);
			expect(savedTask?.assignee?.email).toBe('pm@example.com');
			expect(email?.subject).toContain('Implement new dashboard');
		});
	});

	it('email HTML body contains the assignee name', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(AssignTask);
			const assignee = makeUser('charlie@example.com', 'Charlie', 'Brown');
			const task = makeTask('Review PR #42');
			await ds.save(assignee);
			await ds.save(task);

			await action.execute(task, { assignee } as unknown as AssignTaskParams);
			await new Promise<void>((r) => setImmediate(r));

			const email = emailMock.getLastSentEmail();
			expect(email?.html).toContain('Charlie Brown');
		});
	});

	it('does not send email when assignee has no email address', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(AssignTask);
			const assignee = makeUser('');
			const task = makeTask('Silent task');
			await ds.save(assignee);
			await ds.save(task);

			await action.execute(task, { assignee } as unknown as AssignTaskParams);
			await new Promise<void>((r) => setImmediate(r));

			expect(emailMock.getSentEmails()).toHaveLength(0);
		});
	});

	it('canExecute returns an error for a completed task', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(AssignTask);
			const task = makeTask('Archived task');
			task.status = TaskStatus.Done;

			const result = await action.canExecute(task);
			expect(result).toBe('Cannot reassign a completed task');
		});
	});
});
