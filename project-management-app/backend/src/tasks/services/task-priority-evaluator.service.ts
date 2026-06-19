import { DependencyContainer, Service } from '@drumr/framework-backend';

/**
 * Abstract base class for task priority evaluation strategies.
 * Concrete evaluators are registered with a string ID so they can be
 * resolved dynamically at runtime via DependencyContainer.resolveById(code).
 */
export abstract class TaskPriorityEvaluator {
	abstract evaluate(taskTitle: string): string;
}

/**
 * Fallback evaluator used when a task has no specific priority handler.
 * Also acts as a second base type in union-type resolution scenarios.
 */
export abstract class GlobalTaskPriorityEvaluator {
	abstract evaluateGlobal(taskTitle: string): string;
}

/**
 * Evaluates tasks that are marked as urgent.
 *
 * DI id: 'urgent'
 */
@Service({ id: 'urgent' })
export class UrgentTaskEvaluator extends TaskPriorityEvaluator {
	evaluate(taskTitle: string): string {
		return `[URGENT] ${taskTitle} requires immediate attention`;
	}
}

/**
 * Evaluates tasks that are past their due date.
 *
 * DI id: 'overdue'
 */
@Service({ id: 'overdue' })
export class OverdueTaskEvaluator extends TaskPriorityEvaluator {
	evaluate(taskTitle: string): string {
		return `[OVERDUE] ${taskTitle} is past its deadline`;
	}
}

/**
 * Mirrors the exact pattern from the user's ticket:
 *   DependencyContainer.resolveById<TaskPriorityEvaluator | GlobalTaskPriorityEvaluator>(code)
 *
 * Resolves the correct evaluator by its string code, typed as a union.
 */
export function resolveEvaluator(
	code: string,
): TaskPriorityEvaluator | GlobalTaskPriorityEvaluator {
	return DependencyContainer.resolveById<
		TaskPriorityEvaluator | GlobalTaskPriorityEvaluator
	>(code);
}
