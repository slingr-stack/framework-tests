import {
	Action,
	BaseDataModel,
	DataModel,
	GlobalAction,
	TextField,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { NotifyStakeholdersWorkflow } from '@/global/workflows/notify-stakeholders.workflow';

@DataModel({ ui: { crud: { api: 'gql' } } })
export class NotifyStakeholdersParams extends BaseDataModel {
	@TextField({ required: true })
	projectId!: string;

	@TextField({ required: true })
	message!: string;
}

@Action({
	type: 'write',
	api: 'gql',
	params: NotifyStakeholdersParams,
	returns: WorkflowExecution,
})
export class NotifyStakeholders extends GlobalAction<
	NotifyStakeholdersParams,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(
		params: NotifyStakeholdersParams,
	): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(NotifyStakeholdersWorkflow, {
			projectId: params.projectId,
			message: params.message,
		});
	}
}
