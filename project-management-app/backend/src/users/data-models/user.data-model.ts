import {
	AppUser,
	ChoiceField,
	DataModel,
	DateTimeField,
	SharedCompositionField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { Address } from '@/support/data-models/address.data-model';

export enum Role {
	System = 'system',
	Admin = 'admin',
	Manager = 'manager',
	Developer = 'developer',
}

@DataModel({
	dataSource: 'mainDs',
	docs: 'User model representing application users with different roles',
	crud: {
		api: 'gql',
		actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
	},
	ui: {
		labelField: 'fullName',
		crud: {
			api: 'gql',
			actions: ['crud', 'refresh'],
		},
	},
})
export class User extends AppUser<Role> {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
		docs: 'Unique identifier for the user',
	})
	id!: string;

	@DateTimeField({
		docs: 'When the user account was created',
	})
	createdAt: Date | null = new Date();

	@DateTimeField({
		docs: 'When the user account was last updated',
	})
	updatedAt!: Date | null;

	@ChoiceField({
		type: () => Role,
		docs: 'Roles assigned to the user',
	})
	roles!: Role[];

	@SharedCompositionField({
		type: () => Address,
	})
	addresses!: Address[];
}
