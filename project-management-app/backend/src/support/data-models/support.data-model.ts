import {
	BaseDataModel,
	DataModel,
	EmailField,
	OwnerReferenceField,
	UuidField,
} from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';

@DataModel({
	dataSource: 'mainDs',
})
export class Support extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@OwnerReferenceField({
		type: () => Project,
		required: true,
	})
	owner!: Project;

	@EmailField({
		required: true,
	})
	email!: string;
}
