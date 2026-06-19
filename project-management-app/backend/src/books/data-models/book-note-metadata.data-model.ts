import {
	BaseDataModel,
	DataModel,
	OwnerReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { BookNote } from './book-note.data-model';

/**
 * BookNoteMetadata — key/value metadata entries associated with a BookNote.
 *
 * This model intentionally uses a field named "value" to exercise the
 * GraphQL field-selection edge case where an entity field collides with
 * the UI wrapper field name "value".
 */
@DataModel({
	dataSource: 'mainDs',
	crud: {
		api: 'gql',
	},
})
export class BookNoteMetadata extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@OwnerReferenceField({
		type: () => BookNote,
		required: true,
	})
	owner!: BookNote;

	@TextField({
		required: true,
		minLength: 3,
		docs: 'Metadata key (e.g. "source", "environment")',
	})
	key!: string;

	@TextField({
		maxLength: 500,
		docs: 'Metadata value',
	})
	value!: string | null;
}
