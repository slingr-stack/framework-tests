// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models so its @App() decorator marks bootstrap state as "app registered" before @DataModel decorators try to bind to a datasource; reordering would re-introduce the bug where models bind to MainDs instead of MockMainDs.
import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	App,
	DependencyContainer,
	type TypeOrmSqlDataSource,
} from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import type { Address } from '@/support/data-models/address.data-model';
import { File } from '@/support/data-models/file.data-model';
import { Project } from '@/projects/data-models/project.data-model';
import { Task } from '@/tasks/data-models/task.data-model';
import { User } from '@/users/data-models/user.data-model';

const datasetTaskId = '33333333-3333-4333-8333-333333333333';
const datasetProjectId = '22222222-2222-4222-8222-222222222222';
const datasetManagerUserId = '11111111-1111-4111-8111-111111111111';
const datasetTeamUserId = '66666666-6666-4666-8666-666666666666';
const attachedFileIds = [
	'44444444-4444-4444-8444-444444444444',
	'55555555-5555-4555-8555-555555555555',
];
const sourceFixtureDir = path.resolve(process.cwd(), 'tests/integration/files');
const storageDir = path.resolve(
	process.cwd(),
	process.env.STORAGE_PATH ?? 'files',
);

describe('Dataset loading with attachments — Integration', () => {
	let app: TestApp;
	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext({ dataSet: 'test-loading' });
	});

	afterAll(async () => {
		for (const fileId of attachedFileIds) {
			fs.rmSync(path.join(storageDir, fileId), { force: true });
		}
		await app.stop();
	});

	it('should load users, projects, tasks, and attached file binaries from the test-loading dataset', async () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');

		const userRepository = mainDs.getTypeOrmDataSource().getRepository(User);
		const projectRepository = mainDs
			.getTypeOrmDataSource()
			.getRepository(Project);
		const taskRepository = mainDs.getTypeOrmDataSource().getRepository(Task);
		const fileRepository = mainDs.getTypeOrmDataSource().getRepository(File);

		const manager = await userRepository.findOneByOrFail({
			id: datasetManagerUserId,
		});
		const teamMember = await userRepository.findOneByOrFail({
			id: datasetTeamUserId,
		});
		const project = await projectRepository.findOneByOrFail({
			id: datasetProjectId,
		});
		const task = await taskRepository.findOneOrFail({
			where: { id: datasetTaskId },
			relations: [
				'attachments',
				'project',
				'project.manager',
				'project.teamMembers',
			],
		});

		expect(manager.email).toBe('dataset.manager@example.com');
		expect(teamMember.email).toBe('dataset.member@example.com');
		expect(project.name).toBe('Dataset Loading Project');
		expect(project.manager.id).toBe(datasetManagerUserId);
		expect(project.teamMembers).toHaveLength(1);
		expect(project.teamMembers[0]?.id).toBe(datasetTeamUserId);
		expect(task.title).toBe('Validate Attached Files');
		expect(task.project.id).toBe(datasetProjectId);
		expect(task.attachments).toHaveLength(2);
		expect(task.attachments.map((file: File) => file.id).sort()).toEqual(
			[...attachedFileIds].sort(),
		);

		for (const fileId of attachedFileIds) {
			const persistedPath = path.join(storageDir, fileId);
			const fileRecord = await fileRepository.findOneByOrFail({ id: fileId });

			expect(fs.existsSync(persistedPath)).toBe(true);
			const persistedContent = fs.readFileSync(persistedPath, 'utf8');
			const sourceContent = fs.readFileSync(
				path.join(sourceFixtureDir, fileRecord.name),
				'utf8',
			);
			expect(persistedContent).toBe(sourceContent);
		}
	});

	it('should confirm the datasource is SQLite', () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
		expect(mainDs.getTypeOrmDataSource().options.type).toBe('sqlite');
	});

	it('should resolve SharedComposition addresses on the manager user', async () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
		const userRepository = mainDs.getTypeOrmDataSource().getRepository(User);

		const manager = await userRepository.findOneOrFail({
			where: { id: datasetManagerUserId },
			relations: ['addresses'],
		});

		expect(manager.addresses).toHaveLength(2);
		expect(manager.addresses.map((a: Address) => a.city).sort()).toEqual([
			'Portland',
			'Springfield',
		]);
	});

	it('should resolve Composition notes with nested reference (createdBy) on the task', async () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
		const taskRepository = mainDs.getTypeOrmDataSource().getRepository(Task);

		const task = await taskRepository.findOneOrFail({
			where: { id: datasetTaskId },
			relations: ['notes', 'notes.createdBy'],
		});

		expect(task.notes).toHaveLength(1);
		expect(task.notes[0].title).toBe('Test Note');
		expect(task.notes[0]?.createdBy?.id).toBe(datasetManagerUserId);
	});

	it('should resolve assignee and reporter reference fields on the task', async () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
		const taskRepository = mainDs.getTypeOrmDataSource().getRepository(Task);

		const task = await taskRepository.findOneOrFail({
			where: { id: datasetTaskId },
			relations: ['assignee', 'reporter'],
		});

		expect(task.assignee?.id).toBe(datasetTeamUserId);
		expect(task.reporter?.id).toBe(datasetManagerUserId);
	});

	it('should resolve transitive reference: task → project → manager', async () => {
		const mainDs =
			DependencyContainer.resolveById<TypeOrmSqlDataSource>('mainDs');
		const taskRepository = mainDs.getTypeOrmDataSource().getRepository(Task);

		const task = await taskRepository.findOneOrFail({
			where: { id: datasetTaskId },
			relations: ['project', 'project.manager'],
		});

		expect(task.project.manager.email).toBe('dataset.manager@example.com');
	});
});
