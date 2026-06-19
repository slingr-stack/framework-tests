/**
 * Unit tests for the Task model validation rules.
 *
 * The validation function is a pure function defined in the @DataModel decorator.
 * We mock @drumr/framework-backend to intercept the decorator call and capture
 * the validation function for isolated testing — no database required.
 */

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

import {
	TaskPriority,
	TaskStatus,
} from '../../../src/tasks/data-models/task.data-model';

const backend = jest.requireMock('@drumr/framework-backend') as {
	_captured: { validation?: ValidationFn };
};
const validate = (task: unknown): ValidationIssue[] =>
	backend._captured.validation?.(task) ?? [];

describe('Task model – validation rules', () => {
	describe('completedAt requires startedAt', () => {
		it('errors when completedAt is set but startedAt is not', () => {
			const errors = validate({
				completedAt: '2024-06-01T12:00:00Z',
				startedAt: null,
			});
			expect(errors.some((e) => e.constraint === 'startedAtRequired')).toBe(
				true,
			);
		});

		it('passes when both startedAt and completedAt are set', () => {
			const errors = validate({
				startedAt: '2024-01-01T09:00:00Z',
				completedAt: '2024-01-15T17:00:00Z',
			});
			expect(errors).toHaveLength(0);
		});

		it('passes when neither startedAt nor completedAt is set', () => {
			const errors = validate({ startedAt: null, completedAt: null });
			expect(errors).toHaveLength(0);
		});
	});

	describe('completedAt must be after startedAt', () => {
		it('errors when completedAt is before startedAt', () => {
			const errors = validate({
				startedAt: '2024-06-15T09:00:00Z',
				completedAt: '2024-06-01T09:00:00Z',
			});
			expect(errors.some((e) => e.constraint === 'invalidDateRange')).toBe(
				true,
			);
		});

		it('passes when completedAt equals startedAt', () => {
			const dt = '2024-06-01T09:00:00Z';
			const errors = validate({ startedAt: dt, completedAt: dt });
			expect(errors).toHaveLength(0);
		});
	});

	describe('dueDate must not be before startedAt', () => {
		it('errors when dueDate is before startedAt', () => {
			const errors = validate({
				startedAt: '2024-06-15T09:00:00Z',
				dueDate: '2024-06-01',
			});
			expect(errors.some((e) => e.constraint === 'invalidDueDate')).toBe(true);
		});

		it('passes when dueDate is after startedAt', () => {
			const errors = validate({
				startedAt: '2024-01-01T09:00:00Z',
				dueDate: '2024-12-31',
			});
			expect(errors).toHaveLength(0);
		});

		it('passes when dueDate is not set', () => {
			const errors = validate({
				startedAt: '2024-01-01T09:00:00Z',
				dueDate: null,
			});
			expect(errors).toHaveLength(0);
		});
	});

	describe('TaskStatus and TaskPriority enums', () => {
		it('defines the expected task statuses', () => {
			expect(TaskStatus.ToDo).toBe('to_do');
			expect(TaskStatus.InProgress).toBe('in_progress');
			expect(TaskStatus.InReview).toBe('in_review');
			expect(TaskStatus.Done).toBe('done');
			expect(TaskStatus.Blocked).toBe('blocked');
		});

		it('defines the expected task priorities', () => {
			expect(TaskPriority.Low).toBe('low');
			expect(TaskPriority.Medium).toBe('medium');
			expect(TaskPriority.High).toBe('high');
			expect(TaskPriority.Urgent).toBe('urgent');
			expect(TaskPriority.Critical).toBe('critical');
		});
	});
});
