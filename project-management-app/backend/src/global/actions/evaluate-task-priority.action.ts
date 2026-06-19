import {
	Action,
	BaseDataModel,
	ChoiceField,
	DataModel,
	GlobalAction,
	TextField,
} from '@drumr/framework-backend';
import {
	type GlobalTaskPriorityEvaluator,
	resolveEvaluator,
	TaskPriorityEvaluator,
} from '@/tasks/services/task-priority-evaluator.service';

export enum EvaluatorCode {
	Urgent = 'urgent',
	Overdue = 'overdue',
}

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class EvaluateTaskPriorityParams extends BaseDataModel {
	@ChoiceField({
		required: true,
		type: () => EvaluatorCode,
		docs: 'The evaluator to resolve by string ID via DependencyContainer.resolveById(code)',
	})
	code!: EvaluatorCode;

	@TextField({
		required: true,
		minLength: 1,
		maxLength: 200,
		docs: 'The task title to evaluate',
	})
	taskTitle!: string;
}

@DataModel()
export class TaskEvaluationResult extends BaseDataModel {
	@TextField({
		required: true,
		docs: 'The evaluator class that handled the request',
	})
	resolvedClass!: string;

	@TextField({ required: true, docs: 'The evaluation result message' })
	result!: string;
}

/**
 * Replicates the user-reported use case:
 *   DependencyContainer.resolveById<TaskPriorityEvaluator | GlobalTaskPriorityEvaluator>(code)
 *
 * Select an evaluator code and provide a task title. The action resolves the
 * correct @Service subclass by its string ID and returns the evaluation result.
 */
@Action({
	type: 'read',
	api: 'gql',
	params: EvaluateTaskPriorityParams,
	returns: TaskEvaluationResult,
})
export class EvaluateTaskPriority extends GlobalAction<
	EvaluateTaskPriorityParams,
	TaskEvaluationResult
> {
	protected async execute(
		params: EvaluateTaskPriorityParams,
	): Promise<TaskEvaluationResult> {
		const evaluator = resolveEvaluator(params.code);

		const result = new TaskEvaluationResult();
		result.resolvedClass = evaluator.constructor.name;
		result.result =
			(evaluator as
				| TaskPriorityEvaluator
				| GlobalTaskPriorityEvaluator) instanceof TaskPriorityEvaluator
				? (evaluator as TaskPriorityEvaluator).evaluate(params.taskTitle)
				: (evaluator as GlobalTaskPriorityEvaluator).evaluateGlobal(
						params.taskTitle,
					);

		return result;
	}
}
