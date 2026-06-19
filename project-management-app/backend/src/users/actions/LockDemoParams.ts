import {
	BaseDataModel,
	DataModel,
	IntegerField,
} from '@drumr/framework-backend';

@DataModel({ ui: { crud: { api: 'gql' } } })
export class LockDemoParams extends BaseDataModel {
	@IntegerField({
		required: true,
		min: 1,
		max: 60,
		docs: 'How many seconds to hold the lock before releasing it',
	})
	holdForSeconds: number = 10;
}
