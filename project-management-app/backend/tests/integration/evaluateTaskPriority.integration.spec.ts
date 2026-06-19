import 'reflect-metadata';
import { App, DependencyContainer } from '@drumr/framework-backend';
import {
	EvaluateTaskPriority,
	EvaluatorCode,
} from '@/global/actions/evaluate-task-priority.action';
import { resolveEvaluator } from '@/tasks/services/task-priority-evaluator.service';
import { TestApp } from './TestApp';

/**
 * Reference integration spec:
 * validates DI-driven evaluator resolution through the action entry point.
 */

type ExecuteTaskPriorityAction = {
	execute(params: {
		code: EvaluatorCode;
		taskTitle: string;
	}): Promise<{ resolvedClass: string; result: string }>;
};

describe('EvaluateTaskPriority integration', () => {
	let app: TestApp;
	beforeAll(async () => {
		app = App.resolve(TestApp);
		await app.initTestContext();
	});
	afterAll(async () => {
		await app.stop();
	});

	it('resolves the urgent evaluator through the action execution path', async () => {
		// Arrange:
		// Resolve action in request scope to use real DI registrations.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(
				EvaluateTaskPriority,
			) as unknown as ExecuteTaskPriorityAction;

			// Act:
			// Execute with urgent evaluator code.
			const result = await action.execute({
				code: EvaluatorCode.Urgent,
				taskTitle: 'Fix login bug',
			});

			// Assert:
			// Returned class + message prove strategy resolution and output formatting.
			expect(result.resolvedClass).toBe('UrgentTaskEvaluator');
			expect(result.result).toBe(
				'[URGENT] Fix login bug requires immediate attention',
			);
		});
	});

	it('resolves the overdue evaluator through the action execution path', async () => {
		// Arrange:
		// Resolve the same action through DI for the overdue scenario.
		await DependencyContainer.runInRequestScope(async () => {
			const action = DependencyContainer.resolve(
				EvaluateTaskPriority,
			) as unknown as ExecuteTaskPriorityAction;

			// Act:
			// Execute with overdue evaluator code.
			const result = await action.execute({
				code: EvaluatorCode.Overdue,
				taskTitle: 'Finalize invoice batch',
			});

			// Assert:
			// Different evaluator path returns the expected class + message.
			expect(result.resolvedClass).toBe('OverdueTaskEvaluator');
			expect(result.result).toBe(
				'[OVERDUE] Finalize invoice batch is past its deadline',
			);
		});
	});

	it('throws a descriptive error when the evaluator id is not registered', () => {
		// Arrange / Act / Assert:
		// Call resolver directly with unknown id and verify diagnostic clarity.
		expect(() => resolveEvaluator('unknownEvaluator')).toThrow(
			"No injectable registered with id 'unknownEvaluator'",
		);
	});
});
