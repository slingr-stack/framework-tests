import {
	Action,
	BaseDataModel,
	Context,
	DataModel,
	GlobalAction,
	TextField,
	WorkflowsManager,
} from '@drumr/framework-backend';

/**
 * Regular (non-workflow) action that starts the GenerateReport workflow internally
 * and returns the workflow ID. This demonstrates the use case from issue #887:
 * the UI can call `this.workflows.trackWorkflow(workflowId)` to manually
 * add the workflow to the notification center.
 */

@DataModel({ ui: { crud: { api: 'gql' } } })
export class StartReportResult extends BaseDataModel {
	@TextField({ required: true })
	workflowId!: string;
}

@Action({
	type: 'write',
	api: 'gql',
	returns: StartReportResult,
})
export class StartReportInBackground extends GlobalAction<
	void,
	StartReportResult
> {
	constructor(
		private workflowsManager: WorkflowsManager,
		private context: Context,
	) {
		super();
	}

	override async execute(): Promise<StartReportResult> {
		// Start the GenerateReport workflow indirectly
		const workflow = await this.workflowsManager.start(
			'GenerateReportWorkflow',
			{ title: `Background Report ${new Date().toISOString().slice(0, 10)}` },
			{
				queueName: 'report-queue',
				userId: this.context.user?.id,
			},
		);

		// Return the workflow ID so the frontend can track it
		const result = new StartReportResult();
		result.workflowId = workflow.id;
		return result;
	}
}
