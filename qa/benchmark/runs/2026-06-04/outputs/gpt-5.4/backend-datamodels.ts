import type { Decimal as DecimalType } from '@drumr/framework-backend';
import {
	BaseDataModel,
	DataModel,
	DecimalField,
	ReferenceField,
	referenceDropdown,
	referenceLabel,
	TextField,
	textInput,
	textLabel,
	UuidField,
} from '@drumr/framework-backend';
import { Project } from './Project';

@DataModel({
	dataSource: 'postgres-db',
	docs: 'Budget model for project financial planning',
	crud: {
		api: 'gql',
	},
	ui: {
		labelField: 'currency',
	},
})
export class Budget extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the budget',
	})
	id!: string;

	@ReferenceField<Project>({
		required: true,
		type: () => Project,
		load: true,
		onDelete: 'delete',
		docs: 'Project this budget belongs to',
		ui: [
			{
				context: 'read',
				label: 'Project',
				component: referenceLabel({
					label: 'name',
				}),
			},
			{
				context: 'write',
				label: 'Project',
				component: referenceDropdown({
					label: 'name',
					placeholder: 'Select project',
					sorting: { name: 'asc' },
				}),
			},
		],
	})
	project!: Project;

	@DecimalField({
		required: true,
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0',
		docs: 'Total amount allocated for the budget',
		ui: [
			{
				context: 'read',
				label: 'Total Amount',
				component: textLabel(),
			},
			{
				context: 'write',
				label: 'Total Amount',
				component: textInput({
					placeholder: 'Enter total amount',
				}),
			},
		],
	})
	totalAmount!: DecimalType;

	@TextField({
		required: true,
		maxLength: 3,
		docs: 'Currency code for the budget',
		ui: [
			{
				context: 'read',
				label: 'Currency',
				component: textLabel(),
			},
			{
				context: 'write',
				label: 'Currency',
				component: textInput({
					placeholder: 'Enter currency code',
				}),
			},
		],
	})
	currency: string = 'USD';

	@TextField({
		maxLength: 500,
		docs: 'Additional notes for the budget',
		ui: [
			{
				context: 'read',
				label: 'Notes',
				component: textLabel(),
			},
			{
				context: 'write',
				label: 'Notes',
				component: textInput({
					placeholder: 'Enter notes',
				}),
			},
		],
	})
	notes!: string | null;
}