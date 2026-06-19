import 'reflect-metadata';
import { App, app, generateToken } from '@drumr/framework-backend';
import type { Express } from 'express';
import request from 'supertest';
import { TestApp } from './TestApp';

const MANAGER_ID = '11111111-1111-4111-8111-111111111111';
const ASSIGNED_DEVELOPER_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_DEVELOPER_ID = '77777777-7777-4777-8777-777777777777';
const TASK_ID = '33333333-3333-4333-8333-333333333333';

describe('Role conditions over GraphQL actions — Integration', () => {
	let server: Express;
	let testApp: TestApp;

	let managerToken: string;
	let assignedDeveloperToken: string;
	let otherDeveloperToken: string;

	beforeAll(async () => {
		testApp = App.resolve(TestApp);
		app.defineGuestPermissions(() => {});
		server = await testApp.initTestContext({ dataSet: 'test-loading' });

		managerToken = generateToken({
			id: MANAGER_ID,
			email: 'dataset.manager@example.com',
			roles: ['manager'],
		});
		assignedDeveloperToken = generateToken({
			id: ASSIGNED_DEVELOPER_ID,
			email: 'dataset.member@example.com',
			roles: ['developer'],
		});
		otherDeveloperToken = generateToken({
			id: OTHER_DEVELOPER_ID,
			email: 'other.developer@example.com',
			roles: ['developer'],
		});
	});

	afterAll(async () => {
		app.defineGuestPermissions(() => {});
		await testApp.stop();
	});

	it('allows manager to execute dashboard summary action', async () => {
		const query = `query {
			GetDashboardSummary(params: {}) {
				__typename
				... on DashboardSummaryResult { projectsTotal tasksTotal tasksCompleted }
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.GetDashboardSummary.__typename).toBe(
			'DashboardSummaryResult',
		);
		expect(res.body.data.GetDashboardSummary.tasksTotal).toBeGreaterThanOrEqual(
			0,
		);
	});

	it('denies developer dashboard summary execution', async () => {
		const query = `query {
			GetDashboardSummary(params: {}) {
				__typename
				... on PermissionErrorType { message }
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${assignedDeveloperToken}`)
			.send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.GetDashboardSummary.__typename).toBe(
			'PermissionErrorType',
		);
		expect(res.body.data.GetDashboardSummary.message).toBeDefined();
	});

	it('allows assigned developer to execute TaskStartTask on own task', async () => {
		const query = `mutation {
			TaskStartTask(id: "${TASK_ID}") {
				__typename
				... on Task { id status startedAt }
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${assignedDeveloperToken}`)
			.send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.TaskStartTask.__typename).toBe('Task');
		expect(res.body.data.TaskStartTask.id).toBe(TASK_ID);
		expect(res.body.data.TaskStartTask.status).toBe('in_progress');
		expect(res.body.data.TaskStartTask.startedAt).toBeTruthy();
	});

	it('denies a different developer from executing TaskStartTask on foreign task', async () => {
		const query = `mutation {
			TaskStartTask(id: "${TASK_ID}") {
				__typename
				... on PermissionErrorType { message }
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${otherDeveloperToken}`)
			.send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.TaskStartTask.__typename).toBe('PermissionErrorType');
		expect(res.body.data.TaskStartTask.message).toBeDefined();
	});
});
