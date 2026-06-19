import {
	BaseDataModel,
	ChoiceField,
	DataModel,
	DateTimeField,
	LongTextField,
	TextField,
	UuidField,
	VersionField,
} from '@drumr/framework-backend';

export enum DocumentStatus {
	Draft = 'draft',
	Published = 'published',
	Archived = 'archived',
}

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
export class Document extends BaseDataModel {
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
		required: false,
		maxLength: 5000,
	})
	content?: string | null;

	@ChoiceField({
		required: true,
		type: () => DocumentStatus,
	})
	status: DocumentStatus = DocumentStatus.Draft;

	@DateTimeField({
		calculation: 'automatic',
	})
	createdAt: Date | null = new Date();

	@VersionField()
	version!: number | null;
}
