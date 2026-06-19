import {
	BaseDataModel,
	BooleanField,
	CompositionField,
	DataModel,
	OwnerReferenceField,
	UuidField,
} from '@drumr/framework-backend';
import { DeploymentChecks } from '@/support/data-models/deployment-checks.data-model';
import { Task } from '@/tasks/data-models/task.data-model';

@DataModel({
	dataSource: 'mainDs',
	crud: {
		api: 'gql',
	},
})
export class ReviewChecks extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@OwnerReferenceField({ type: () => Task, required: true })
	owner!: Task;

	@BooleanField()
	lintCode!: boolean | null;

	@BooleanField()
	testsCoverage!: boolean | null;

	@BooleanField()
	sampleAppImplementation!: boolean | null;

	@CompositionField({ type: () => DeploymentChecks, required: false })
	deploymentChecks!: DeploymentChecks | null;
}
