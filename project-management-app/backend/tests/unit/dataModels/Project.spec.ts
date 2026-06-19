/**
 * Unit tests for the Project model validation rules.
 *
 * The validation function is a pure function defined in the @DataModel decorator.
 * We mock @drumr/framework-backend to intercept the decorator call and capture
 * the validation function for isolated testing — no database required.
 */

// Capture storage lives inside the mock factory (avoids babel-jest hoisting issues).
// A Proxy catch-all handles any unknown export as a noop, making the mock
// resilient to new imports being added to transitive model dependencies.
type ValidationIssue = { constraint: string; message?: string };
type ValidationFn = (value: unknown) => ValidationIssue[];

jest.mock('@drumr/framework-backend', () => {
	const captured: { validation?: ValidationFn } = {};
	function noop(..._args: unknown[]) {
		return (..._rest: unknown[]) => undefined;
	}
	const explicit: Record<string, unknown> = {
		_captured: captured,
		BaseDataModel: class {},
		AppUser: class {},
		AppFile: class {},
		Money: class {},
		TypeOrmSqlDataSource: class {},
		DataSource: noop,
		DataModel:
			(opts: { validation?: ValidationFn }) =>
			<T>(cls: T): T => {
				if (opts?.validation) captured.validation = opts.validation;
				return cls;
			},
	};
	return new Proxy(explicit, {
		get: (target, prop: string) =>
			prop in target ? target[prop as keyof typeof target] : noop,
	});
});

jest.mock('../../../src/config/data-sources/main/main.ds', () => ({
	MainDs: class {},
}));

import { ProjectStatus } from '../../../src/projects/data-models/project.data-model';

const backend = jest.requireMock('@drumr/framework-backend') as {
	_captured: { validation?: ValidationFn };
};
const validate = (project: unknown): ValidationIssue[] =>
	backend._captured.validation?.(project) ?? [];

describe('Project model – validation rules', () => {
	describe('date range', () => {
		it('passes when endDate is after startDate', () => {
			const errors = validate({
				startDate: '2024-01-01',
				endDate: '2024-12-31',
				status: ProjectStatus.Active,
				completionPercentage: 50,
			});
			expect(errors).toHaveLength(0);
		});

		it('errors when endDate is before startDate', () => {
			const errors = validate({
				startDate: '2024-12-31',
				endDate: '2024-01-01',
				status: ProjectStatus.Active,
				completionPercentage: 0,
			});
			expect(errors).toHaveLength(1);
			expect(errors[0].constraint).toBe('invalidDateRange');
		});

		it('passes when only one date is provided', () => {
			const errors = validate({
				startDate: '2024-01-01',
				status: ProjectStatus.Planning,
				completionPercentage: 0,
			});
			expect(errors).toHaveLength(0);
		});

		it('passes when no dates are provided', () => {
			const errors = validate({
				status: ProjectStatus.Planning,
				completionPercentage: 0,
			});
			expect(errors).toHaveLength(0);
		});
	});

	describe('completion percentage for Completed status', () => {
		it('passes when Completed status has 100% completion', () => {
			const errors = validate({
				status: ProjectStatus.Completed,
				completionPercentage: 100,
			});
			expect(errors).toHaveLength(0);
		});

		it('errors when Completed status has less than 100% completion', () => {
			const errors = validate({
				status: ProjectStatus.Completed,
				completionPercentage: 80,
			});
			expect(errors).toHaveLength(1);
			expect(errors[0].constraint).toBe('incompleteProject');
		});

		it('allows any completion percentage for non-Completed status', () => {
			for (const status of [
				ProjectStatus.Active,
				ProjectStatus.OnHold,
				ProjectStatus.Planning,
			]) {
				const errors = validate({ status, completionPercentage: 0 });
				expect(errors).toHaveLength(0);
			}
		});
	});

	describe('multiple validation errors', () => {
		it('accumulates both date-range and completion errors simultaneously', () => {
			const errors = validate({
				startDate: '2024-12-31',
				endDate: '2024-01-01',
				status: ProjectStatus.Completed,
				completionPercentage: 50,
			});
			expect(errors).toHaveLength(2);
			const constraints = errors.map((e) => e.constraint);
			expect(constraints).toContain('invalidDateRange');
			expect(constraints).toContain('incompleteProject');
		});
	});
});
