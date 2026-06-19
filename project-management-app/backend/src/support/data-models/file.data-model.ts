import { AppFile, DataModel, TextField } from '@drumr/framework-backend';

@DataModel({
	dataSource: 'mainDs',
	docs: 'System file model for storing uploads',
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
export class File extends AppFile {
	@TextField({
		docs: 'Optional description of the file',
	})
	description!: string | null;
}
