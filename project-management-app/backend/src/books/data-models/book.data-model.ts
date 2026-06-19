import {
	BaseDataModel,
	BooleanField,
	ChoiceField,
	CompositionField,
	DataModel,
	ReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { User } from '@/users/data-models/user.data-model';
import { BookEvaluation } from './book-evaluation.data-model';
import { BookNote } from './book-note.data-model';

export enum BookStatus {
	InStock = 'inStock',
	Borrowed = 'borrowed',
	Missing = 'missing',
}

@DataModel({
	dataSource: 'mainDs',
	docs: 'Book model representing books within the library system',
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
export class Book extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the book',
	})
	id!: string;

	@TextField({
		required: true,
		minLength: 3,
		docs: 'Description of the book',
	})
	title!: string;

	@ChoiceField({
		type: () => BookStatus,
		docs: 'Status of the book',
	})
	status: BookStatus | null = BookStatus.InStock;

	@ReferenceField({
		docs: 'Author',
		type: () => User,
	})
	author!: User | null;

	@BooleanField({ required: true })
	showDescription: boolean = true;
	@BooleanField({ required: true })
	descriptionRequired: boolean = true;

	@TextField({
		required: (book: Book) => book.descriptionRequired,
		minLength: 3,
		maxLength: 200,
		docs: 'Description of the book',
	})
	description!: string | null;

	@CompositionField({
		type: () => BookNote,
		docs: 'Notes associated with the book',
	})
	notes!: BookNote[];

	@CompositionField({
		type: () => BookEvaluation,
		docs: 'Notes associated with the book',
	})
	evaluation!: BookEvaluation | null;
}
