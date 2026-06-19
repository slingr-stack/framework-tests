import {
	Action,
	BaseDataModel,
	DataModel,
	GlobalAction,
	IntegerField,
	TextField,
} from '@drumr/framework-backend';
import { ActivityLogService } from '@/global/services/activity-log.service';

@DataModel({
	crud: {
		api: 'gql',
		actions: ['create', 'deleteById', 'findBy', 'findById', 'update'],
	},
})
export class ActivityLogResult extends BaseDataModel {
	@IntegerField({ required: true, docs: 'Total number of log entries' })
	count!: number;

	@TextField({
		required: true,
		docs: 'Log entries as a newline-separated string. Each line is prefixed with a timestamp.',
	})
	entries!: string;
}

/**
 * Returns the shared application-wide activity log maintained by the singleton
 * ActivityLogService. Because the service is singleton-scoped, every call to
 * this action (regardless of which user makes it) reads from the same in-memory
 * log that has been accumulating entries since server start.
 *
 * Demonstrates: singleton-scoped constructor injection in a GlobalAction.
 */
@Action({
	type: 'read',
	api: 'gql',
	returns: ActivityLogResult,
})
export class GetActivityLog extends GlobalAction<void, ActivityLogResult> {
	constructor(private activityLog: ActivityLogService) {
		super();
	}

	protected async execute(): Promise<ActivityLogResult> {
		const entries = this.activityLog.getEntries();
		const result = new ActivityLogResult();
		result.count = entries.length;
		result.entries =
			entries.length > 0 ? entries.join('\n') : '(no entries yet)';
		return result;
	}
}
