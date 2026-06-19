import 'reflect-metadata';
import { App, app } from '@drumr/framework-backend';
import type { Express } from 'express';
import request from 'supertest';
import { TestApp } from './TestApp';

const MANAGER_ID = '11111111-1111-4111-8111-111111111111';
const DEVELOPER_ID = '66666666-6666-4666-8666-666666666666';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';

describe('Dataset loading exposed via GraphQL — Integration', () => {
	let server: Express;
	let testApp: TestApp;

	beforeAll(async () => {
		testApp = App.resolve(TestApp);
		server = await testApp.initTestContext({ dataSet: 'test-loading' });
		app.defineGuestPermissions(({ can }) => {
			can('manage', 'all');
		});
	});

	afterAll(async () => {
		await testApp.stop();
	});

	it('UserFindById returns the loaded manager with shared-composition addresses', async () => {
		const query = `query {
      UserFindById(id: "${MANAGER_ID}") {
        ... on User { id email firstName lastName addresses { city country } }
      }
    }`;
		const res = await request(server).post('/graphql').send({ query });
		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.UserFindById.email).toBe(
			'dataset.manager@example.com',
		);
		expect(res.body.data.UserFindById.addresses).toHaveLength(2);
	});

	it('ProjectFindById resolves manager ReferenceField and teamMembers array via GraphQL', async () => {
		const query = `query {
      ProjectFindById(id: "${PROJECT_ID}") {
        ... on Project { id name manager { id email } teamMembers { id } }
      }
    }`;
		const res = await request(server).post('/graphql').send({ query });
		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.ProjectFindById.name).toBe('Dataset Loading Project');
		expect(res.body.data.ProjectFindById.manager.id).toBe(MANAGER_ID);
		expect(res.body.data.ProjectFindById.manager.email).toBe(
			'dataset.manager@example.com',
		);
		expect(res.body.data.ProjectFindById.teamMembers).toHaveLength(1);
	});

	it('TaskFindById exposes transitive ref (project.manager), assignee, reporter and notes composition', async () => {
		const query = `query {
      TaskFindById(id: "${TASK_ID}") {
        ... on Task {
          id title
          assignee { id }
          reporter { id }
          project { id manager { id email } }
          notes { id title createdBy { id } }
        }
      }
    }`;
		const res = await request(server).post('/graphql').send({ query });
		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.TaskFindById.title).toBe('Validate Attached Files');
		expect(res.body.data.TaskFindById.assignee.id).toBe(DEVELOPER_ID);
		expect(res.body.data.TaskFindById.reporter.id).toBe(MANAGER_ID);
		expect(res.body.data.TaskFindById.project.manager.email).toBe(
			'dataset.manager@example.com',
		);
		expect(res.body.data.TaskFindById.notes).toHaveLength(1);
		expect(res.body.data.TaskFindById.notes[0].title).toBe('Test Note');
		expect(res.body.data.TaskFindById.notes[0].createdBy.id).toBe(MANAGER_ID);
	});

	it('UserFindBy returns both loaded users when filtered by status=active', async () => {
		const query = `query {
      UserFindBy(where: { status: { eq: active } }) {
        ... on UserQueryResponse { objects { id email } }
      }
    }`;
		const res = await request(server).post('/graphql').send({ query });
		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.UserFindBy.objects).toHaveLength(2);
	});
});
