import {
	BaseDataModel,
	DataModel,
	DateTimeField,
	Indexes,
	ReferenceField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';
import { File } from '@/support/data-models/file.data-model';

@Indexes<ProjectReport>([
	{ fields: ['project', 'generatedAt'], name: 'idx_report_project_date' },
	{ fields: ['title'], type: 'fullText', name: 'idx_report_title_search' },
])
@DataModel({
	dataSource: 'mainDs',
	docs: 'Project report containing generated PDF files',
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
export class ProjectReport extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the report',
	})
	id!: string;

	@TextField({
		required: true,
		docs: 'Title of the report',
	})
	title!: string;

	@DateTimeField({
		required: true,
		docs: 'Date and time when the report was generated',
	})
	generatedAt!: Date;

	@ReferenceField({
		required: false,
		type: () => Project,
		docs: 'The project this report belongs to',
	})
	project!: Project | null;

	@ReferenceField({
		required: true,
		type: () => File,
		docs: 'The associated PDF file',
	})
	file!: File;

	@TextField({
		required: true,
		docs: 'Sections included in the report',
	})
	sections!: string[];
}
