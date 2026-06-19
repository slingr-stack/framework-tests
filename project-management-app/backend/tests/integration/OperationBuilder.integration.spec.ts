import 'reflect-metadata';
import { App, app } from '@drumr/framework-backend';
import type { Express } from 'express';
import request from 'supertest';
import { TestApp } from './TestApp';

describe('GraphQL Integration — query API via supertest', () => {
	let server: Express;
	let testApp: TestApp;

	beforeAll(async () => {
		testApp = App.resolve(TestApp);
		server = await testApp.initTestContext();
		app.defineGuestPermissions(({ can }) => {
			can('manage', 'all');
		});
	});

	afterAll(async () => {
		app.defineGuestPermissions(() => {
			// Reset guest permissions so this suite doesn't leak global auth state
			// into other integration tests running in the same Jest worker.
		});
		await testApp.stop();
	});

	it('executes GetActivityLog query and returns expected fields', async () => {
		const query = `query {
			GetActivityLog {
				... on ActivityLogResult { __typename count entries }
			}
		}`;

		const res = await request(server).post('/graphql').send({ query });

		expect(res.status).toBe(200);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.GetActivityLog.__typename).toBe('ActivityLogResult');
		expect(typeof res.body.data.GetActivityLog.count).toBe('number');
		expect(res.body.data.GetActivityLog.count).toBeGreaterThanOrEqual(0);
		expect(typeof res.body.data.GetActivityLog.entries).toBe('string');
		expect(res.body.data.GetActivityLog.entries.length).toBeGreaterThan(0);
	});
});
