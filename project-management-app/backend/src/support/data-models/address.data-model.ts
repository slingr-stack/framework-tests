import {
	BaseDataModel,
	DataModel,
	TextField,
	UuidField,
} from '@drumr/framework-backend';

@DataModel({
	dataSource: 'mainDs',
})
export class Address extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@TextField({
		required: true,
		maxLength: 200,
		docs: 'Street address (including number, apartment, etc.)',
	})
	street?: string;

	@TextField({
		required: true,
		maxLength: 100,
		docs: 'City or locality',
	})
	city!: string;

	@TextField({
		maxLength: 100,
		docs: 'State, province, or region',
	})
	state!: string | null;

	@TextField({
		required: true,
		maxLength: 20,
		docs: 'Postal or ZIP code',
	})
	postalCode!: string;

	@TextField({
		required: true,
		maxLength: 100,
		docs: 'Country',
	})
	country!: string;
}
