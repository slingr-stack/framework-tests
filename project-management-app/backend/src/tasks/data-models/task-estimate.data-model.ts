import {
	BaseDataModel,
	ChoiceField,
	DataModel,
	IntegerField,
	LongTextField,
	TextField,
} from '@drumr/framework-backend';

export enum EstimateComplexity {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
	VeryHigh = 'very_high',
}

/**
 * TaskEstimate - Non-persistent model for task effort estimation.
 *
 * No dataSource means instances are never saved to the database.
 * When used as an ObjectAction target on the UI, the full object is
 * passed as `action.target` in the refresh context (instead of
 * `action.targetId` used for persistent models), and sent as the
 * `object` argument in the action mutation.
 */
@DataModel({
	docs: 'Non-persistent model for estimating task effort before committing to a task',
	ui: {
		crud: {
			api: 'gql',
			actions: ['refresh'],
		},
	},
})
export class TaskEstimate extends BaseDataModel {
	@TextField({
		required: true,
		minLength: 3,
		maxLength: 200,
		docs: 'Title of the task being estimated',
	})
	taskTitle!: string;

	@ChoiceField({
		required: true,
		type: () => EstimateComplexity,
		docs: 'Estimated complexity of the task',
	})
	complexity!: EstimateComplexity;

	@IntegerField({
		required: true,
		min: 1,
		max: 999,
		docs: 'Estimated hours to complete the task',
	})
	estimatedHours!: number;

	@IntegerField({
		required: false,
		min: 1,
		max: 100,
		docs: 'Story points for this task',
	})
	storyPoints!: number | null;

	@LongTextField({
		maxLength: 1000,
		docs: 'Assumptions or risks identified during estimation',
	})
	notes!: string | null;
}
