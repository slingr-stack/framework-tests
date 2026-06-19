import {
	BaseDataModel,
	DataModel,
	OwnerReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { Task } from './task.data-model';

/**
 * TaskMetadata — key/value metadata entries associated with a Task.
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
export class TaskMetadata extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@OwnerReferenceField({
		type: () => Task,
		required: true,
	})
	owner!: Task;

	@TextField({
		required: true,
		maxLength: 100,
		docs: 'Metadata key (e.g. "source", "environment")',
	})
	key!: string;

	@TextField({
		maxLength: 500,
		docs: 'Metadata value',
	})
	value!: string | null;
}
