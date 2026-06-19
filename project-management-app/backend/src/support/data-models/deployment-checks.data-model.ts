import {
	BaseDataModel,
	BooleanField,
	DataModel,
	OwnerReferenceField,
	UuidField,
} from '@drumr/framework-backend';
import { ReviewChecks } from '@/support/data-models/review-checks.data-model';

@DataModel({
	dataSource: 'mainDs',
	crud: {
		api: 'gql',
	},
})
export class DeploymentChecks extends BaseDataModel {
	@UuidField({
		primaryKey: true,
		generated: true,
		required: true,
	})
	id!: string;

	@OwnerReferenceField({ type: () => ReviewChecks, required: true })
	owner!: ReviewChecks;

	@BooleanField()
	stagingDeploy!: boolean | null;

	@BooleanField()
	productionDeploy!: boolean | null;

	@BooleanField()
	rollbackPlan!: boolean | null;
}
