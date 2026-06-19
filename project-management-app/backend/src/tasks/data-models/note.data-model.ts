import {
	BaseDataModel,
	Context,
	DataModel,
	DateTimeField,
	DependencyContainer,
	LongTextField,
	OwnerReferenceField,
	ReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { User } from '@/users/data-models/user.data-model';
import { Task } from './task.data-model';

@DataModel({
	dataSource: 'mainDs',
	crud: {
		api: 'gql',
		actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
	},
	ui: {
		crud: {
			api: 'gql',
			actions: ['crud', 'refresh'],
		},
	},
})
export class Note extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string | null;

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 200,
	})
	title!: string;

	@LongTextField({
		required: true,
		maxLength: 2000,
	})
	note!: string;

	@ReferenceField({
		type: () => User,
		required: false,
		defaultValue: async (): Promise<User | null> => {
			try {
				const context = DependencyContainer.resolve(Context);
				const currentUserId = context.user?.id;
				if (!currentUserId) {
					return null;
				}

				const datasource = DependencyContainer.resolve(MainDs);
				const currentUser = await datasource.findOneBy(User, {
					id: currentUserId,
				});
				return currentUser || null;
			} catch {
				return null;
			}
		},
	})
	createdBy!: User | null;

	@DateTimeField({
		calculation: 'automatic',
	})
	createdAt: Date | null = new Date();

	@OwnerReferenceField({ type: () => Task, required: true })
	owner!: Task;

	override async onInit(): Promise<void> {
		if (this.createdAt === undefined || this.createdAt === null) {
			this.createdAt = new Date();
		}

		if (!this.createdBy) {
			try {
				const context = DependencyContainer.resolve(Context);
				const currentUserId = context.user?.id;
				if (!currentUserId) {
					return;
				}

				const datasource = DependencyContainer.resolve(MainDs);
				const currentUser = await datasource.findOneBy(User, {
					id: currentUserId,
				});
				if (currentUser) {
					this.createdBy = currentUser;
				}
			} catch {
				// Keep initialization resilient for startup/testing where DI context may not be available.
			}
		}
	}
}
