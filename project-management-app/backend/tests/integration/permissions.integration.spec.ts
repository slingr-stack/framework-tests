import 'reflect-metadata';
import { App, app, generateToken } from '@drumr/framework-backend';
import type { Express } from 'express';
import request from 'supertest';
import { TestApp } from './TestApp';

const MANAGER_ID = '11111111-1111-4111-8111-111111111111';
const DEVELOPER_ID = '66666666-6666-4666-8666-666666666666';

describe('GraphQL Permissions — Integration', () => {
	let server: Express;
	let testApp: TestApp;

	beforeAll(async () => {
		testApp = App.resolve(TestApp);
		app.defineGuestPermissions(() => {});
		server = await testApp.initTestContext({ dataSet: 'test-loading' });
	});

	afterAll(async () => {
		app.defineGuestPermissions(() => {});
		await testApp.stop();
	});

	describe('Guest (no token)', () => {
		it('rejects unauthenticated GraphQL requests with 401', async () => {
			const query = `query {
				UserFindById(id: "${MANAGER_ID}") {
					... on User { id email }
				}
			}`;

			const res = await request(server).post('/graphql').send({ query });
			expect(res.status).toBe(401);
			expect(res.body.error).toBeDefined();
		});
	});

	describe('Authenticated — Manager role', () => {
		let managerToken: string;

		beforeAll(() => {
			managerToken = generateToken({
				id: MANAGER_ID,
				email: 'dataset.manager@example.com',
				roles: ['manager'],
			});
		});

		it('can query users with a valid token', async () => {
			const query = `query {
				UserFindById(id: "${MANAGER_ID}") {
					... on User { id email firstName }
				}
			}`;

			const res = await request(server)
				.post('/graphql')
				.set('Authorization', `Bearer ${managerToken}`)
				.send({ query });

			expect(res.status).toBe(200);
			expect(res.body.errors).toBeUndefined();
			expect(res.body.data.UserFindById.email).toBe(
				'dataset.manager@example.com',
			);
		});

		it('can query projects (manager has project access)', async () => {
			const query = `query {
				ProjectFindBy {
					... on ProjectQueryResponse { objects { id name } }
				}
			}`;

			const res = await request(server)
				.post('/graphql')
				.set('Authorization', `Bearer ${managerToken}`)
				.send({ query });

			expect(res.status).toBe(200);
			expect(res.body.errors).toBeUndefined();
		});
	});

	describe('Authenticated — Developer role', () => {
		let developerToken: string;

		beforeAll(() => {
			developerToken = generateToken({
				id: DEVELOPER_ID,
				email: 'dataset.member@example.com',
				roles: ['developer'],
			});
		});

		it('can query tasks (developer has task access)', async () => {
			const query = `query {
				TaskFindBy {
					... on TaskQueryResponse { objects { id title } }
				}
			}`;

			const res = await request(server)
				.post('/graphql')
				.set('Authorization', `Bearer ${developerToken}`)
				.send({ query });

			expect(res.status).toBe(200);
			expect(res.body.errors).toBeUndefined();
		});
	});
});
