import {
	Action,
	BaseDataModel,
	BooleanField,
	DataModel,
	LongTextField,
	ObjectAction,
	TextField,
} from '@drumr/framework-backend';
import { TaskEstimate } from '@/tasks/data-models/task-estimate.data-model';

// ============================================================================
// Result model
// ============================================================================

@DataModel()
class EstimationResult extends BaseDataModel {
	@TextField({
		docs: 'Confirmation message',
		required: true,
	})
	message!: string;

	@BooleanField({
		docs: 'Whether the estimate was approved',
		required: true,
	})
	approved!: boolean;
}

// ============================================================================
// Params model
// ============================================================================

@DataModel({
	ui: {
		crud: {
			api: 'gql',
			actions: ['refresh'],
		},
	},
})
class SubmitEstimateParams extends BaseDataModel {
	@BooleanField({
		required: false,
		docs: 'Approve or reject the estimate',
	})
	approved: boolean | null = true;

	@LongTextField({
		required: false,
		maxLength: 500,
		docs: 'Reviewer notes or rejection reason',
	})
	notes!: string[];
}

// ============================================================================
// Action
// ============================================================================

/**
 * SubmitEstimate - Approves or rejects a task effort estimate.
 *
 * This is an ObjectAction on a NON-PERSISTENT model (TaskEstimate).
 *
 * Key differences from actions on persistent models (e.g. AssignTask):
 * - The GraphQL mutation receives `object: TaskEstimateInput!` instead of
 *   `id: String!` — the full object is sent as the action target.
 * - On the UI side, the ActionView passes `action.target` (full object) in
 *   the refresh context instead of `action.targetId`, so param fields can
 *   react to the target's values (e.g. show estimated hours in a label).
 */
@Action({
	type: 'write',
	model: TaskEstimate,
	api: 'gql',
	params: SubmitEstimateParams,
	returns: EstimationResult,
})
export class SubmitEstimate extends ObjectAction<
	TaskEstimate,
	SubmitEstimateParams,
	EstimationResult
> {
	async execute(
		target: TaskEstimate,
		params: SubmitEstimateParams,
	): Promise<EstimationResult> {
		const result = new EstimationResult();
		result.approved = params.approved ?? false;

		if (params.approved) {
			result.message =
				`Estimate for "${target.taskTitle}" approved: ${target.estimatedHours}h` +
				(target.storyPoints ? `, ${target.storyPoints} SP` : '') +
				(params.notes ? `. Notes: ${params.notes}` : '.');
		} else {
			result.message =
				`Estimate for "${target.taskTitle}" rejected.` +
				(params.notes ? ` Reason: ${params.notes}` : '');
		}

		return result;
	}
}
