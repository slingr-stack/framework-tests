import {
	BaseDataModel,
	CompositionField,
	DataModel,
	OwnerReferenceField,
	ReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { User } from '@/users/data-models/user.data-model';
import { Book } from './book.data-model';
import { BookNoteMetadata } from './book-note-metadata.data-model';

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
export class BookNote extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string | null;

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 2000,
	})
	note!: string;

	@CompositionField({ type: () => BookNoteMetadata })
	metadata!: BookNoteMetadata[];

	@ReferenceField({
		docs: 'Author',
		type: () => User,
	})
	author!: User | null;

	@OwnerReferenceField({ type: () => Book, required: true })
	owner!: Book;
}
