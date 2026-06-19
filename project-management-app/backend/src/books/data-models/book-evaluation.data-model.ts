import {
	BaseDataModel,
	DataModel,
	IntegerField,
	OwnerReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { Book } from './book.data-model';

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
export class BookEvaluation extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string | null;

	@IntegerField({
		required: true,
		min: 1,
		max: 5,
	})
	stars!: number | null;

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 2000,
	})
	comment!: string;

	@OwnerReferenceField({ type: () => Book, required: true })
	owner!: Book;
}
