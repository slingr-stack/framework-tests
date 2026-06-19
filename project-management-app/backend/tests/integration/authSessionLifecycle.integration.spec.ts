import 'reflect-metadata';
import {
	App,
	app,
	blacklistToken,
	clearTokenBlacklist,
	generateToken,
} from '@drumr/framework-backend';
import type { Express } from 'express';
import request from 'supertest';
import { TestApp } from './TestApp';

const MANAGER_ID = '11111111-1111-4111-8111-111111111111';

describe('Auth session lifecycle over GraphQL — Integration', () => {
	let server: Express;
	let testApp: TestApp;
	let managerToken: string;

	beforeAll(async () => {
		testApp = App.resolve(TestApp);
		clearTokenBlacklist();
		app.defineGuestPermissions(() => {});
		server = await testApp.initTestContext({ dataSet: 'test-loading' });

		managerToken = generateToken({
			id: MANAGER_ID,
			email: 'dataset.manager@example.com',
			roles: ['manager'],
		});
	});

	afterAll(async () => {
		clearTokenBlacklist();
		app.defineGuestPermissions(() => {});
		await testApp.stop();
	});

	it('accepts a valid token before logout', async () => {
		const query = `query {
			UserFindById(id: "${MANAGER_ID}") {
				__typename
				... on User { id email }
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.UserFindById.__typename).toBe('User');
		expect(res.body.data.UserFindById.email).toBe(
			'dataset.manager@example.com',
		);
	});

	it('invalidates token after explicit blacklist', async () => {
		blacklistToken(managerToken);

		const query = `query {
			UserFindById(id: "${MANAGER_ID}") {
				__typename
				... on User { id }
			}
		}`;

		const afterLogout = await request(server)
			.post('/graphql')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ query });

		expect(afterLogout.status).toBe(401);
		expect(afterLogout.body.error).toBe('Token has been invalidated');
	});

	it('rejects malformed bearer tokens', async () => {
		const query = `query {
			UserFindById(id: "${MANAGER_ID}") {
				__typename
			}
		}`;

		const res = await request(server)
			.post('/graphql')
			.set('Authorization', 'Bearer malformed.token.value')
			.send({ query });

		expect(res.status).toBe(401);
		expect(res.body.error).toBe('Invalid or expired token');
	});
});
