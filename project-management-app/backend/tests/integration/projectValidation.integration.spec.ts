// biome-ignore-all assist/source/organizeImports: TestApp must be imported before data models so its @App() decorator marks bootstrap state as "app registered" before @DataModel decorators try to bind to a datasource; reordering would re-introduce the bug where models bind to MainDs instead of MockMainDs.
import 'reflect-metadata';
import { App, DependencyContainer } from '@drumr/framework-backend';
import { TestApp } from './TestApp';
import {
	Project,
	ProjectPriority,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';

/**
 * Integration test: Project model-level validation hook.
 *
 * Verifies that the framework's validation pipeline correctly invokes
 * the model-level `validation` function defined in @DataModel options
 * and returns properly structured ValidationError objects.
 *
 */

function createValidProject(): Project {
	const project = new Project();
	project.name = 'Validation Test Project';
	project.code = `VT-${Math.floor(Math.random() * 9000 + 1000)}`;
	project.status = ProjectStatus.Planning;
	project.priority = ProjectPriority.Medium;
	project.isArchived = false;
	return project;
}

describe('Project model validation', () => {
	let app: TestApp;

	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext();
	});

	afterAll(async () => {
		await app.stop();
	});

	it('returns invalidDateRange error when endDate is before startDate', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const project = createValidProject();
			project.startDate = new Date('2099-12-31');
			project.endDate = new Date('2099-01-01'); // endDate < startDate

			const errors = await project.validate();

			// Should have at least one validation error
			expect(errors.length).toBeGreaterThanOrEqual(1);

			// Find the date range constraint
			const dateRangeError = errors.find(
				(e) => e.constraints && 'invalidDateRange' in e.constraints,
			);
			expect(dateRangeError).toBeDefined();
			expect(dateRangeError!.constraints!['invalidDateRange']).toBe(
				'End date must be after start date.',
			);
		});
	});

	it('returns incompleteProject error when status is Completed but percentage is not 100', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const project = createValidProject();
			project.status = ProjectStatus.Completed;
			project.completionPercentage = 75;

			const errors = await project.validate();

			const incompleteError = errors.find(
				(e) => e.constraints && 'incompleteProject' in e.constraints,
			);
			expect(incompleteError).toBeDefined();
			expect(incompleteError!.constraints!['incompleteProject']).toBe(
				'Completion percentage must be 100% for completed projects.',
			);
		});
	});

	it('returns no model-level errors when dates are valid and status is consistent', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const project = createValidProject();
			project.startDate = new Date('2099-01-01');
			project.endDate = new Date('2099-12-31'); // endDate > startDate

			const errors = await project.validate();

			// No model-level validation constraint errors expected
			const modelLevelErrors = errors.filter(
				(e) =>
					e.constraints &&
					('invalidDateRange' in e.constraints ||
						'incompleteProject' in e.constraints),
			);
			expect(modelLevelErrors).toHaveLength(0);
		});
	});

	it('returns multiple validation errors simultaneously', async () => {
		await DependencyContainer.runInRequestScope(async () => {
			const project = createValidProject();
			// Both conditions invalid at once
			project.startDate = new Date('2099-12-31');
			project.endDate = new Date('2099-01-01');
			project.status = ProjectStatus.Completed;
			project.completionPercentage = 50;

			const errors = await project.validate();

			const constraintKeys = errors
				.filter((e) => e.constraints)
				.flatMap((e) => Object.keys(e.constraints!));

			expect(constraintKeys).toContain('invalidDateRange');
			expect(constraintKeys).toContain('incompleteProject');
		});
	});
});
