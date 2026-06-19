import type { DecimalNumber } from '@drumr/framework-backend';
import {
	BaseDataModel,
	DataModel,
	DecimalField,
	ReferenceField,
	TextField,
	UuidField,
	decimalInput,
	decimalLabel,
	referenceDropdown,
	referenceLabel,
	textInput,
	textLabel,
} from '@drumr/framework-backend';
import { MainDs } from '@/dataSources/mainDs';
import { Project } from './Project';

@DataModel({
	dataSource: MainDs,
	docs: 'Budget associated with a project',
	crud: {
		api: 'gql',
		actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
	},
	ui: {
		crud: {
			api: 'gql',
			actions: ['crud', 'refresh'],
		},
		labelField: 'currency',
	},
})
export class Budget extends BaseDataModel {
	@UuidField({ primaryKey: true, generated: true, required: true })
	id!: string;

	@ReferenceField({
		type: () => Project,
		required: true,
		load: true,
		ui: [
			{ context: 'read', label: 'Project', component: referenceLabel() },
			{
				context: 'write',
				label: 'Project',
				component: referenceDropdown({ placeholder: 'Select project' }),
			},
		],
	})
	project!: Project;

	@DecimalField({
		required: true,
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0.00',
		ui: [
			{ context: 'read', label: 'Total Amount', component: decimalLabel() },
			{ context: 'write', label: 'Total Amount', component: decimalInput() },
		],
	})
	totalAmount!: DecimalNumber;

	@TextField({
		required: true,
		maxLength: 3,
		ui: [
			{ context: 'read', label: 'Currency', component: textLabel() },
			{
				context: 'write',
				label: 'Currency',
				component: textInput({ placeholder: 'USD' }),
			},
		],
	})
	currency: string = 'USD';

	@TextField({
		maxLength: 500,
		ui: [
			{ context: 'read', label: 'Notes', component: textLabel() },
			{
				context: 'write',
				label: 'Notes',
				component: textInput({ placeholder: 'Enter notes' }),
			},
		],
	})
	notes!: string | null;
}
