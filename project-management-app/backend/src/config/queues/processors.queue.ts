import {
	BaseQueue,
	logger,
	Queue,
	type WorkflowExecution,
} from '@drumr/framework-backend';

@Queue({
	name: 'report-queue',
	concurrency: 6,
	timeout: 10 * 60 * 1000,
	retryAttempts: 3,
	backoff: { type: 'exponential', delay: 2000 },
})
export class ReportQueue extends BaseQueue {
	protected override onWorkflowActive(workflow: WorkflowExecution): void {
		logger.info(`📊 Report workflow started`, {
			workflowId: workflow.id,
			action: workflow.action,
			status: workflow.status,
		});
	}

	protected override onWorkflowCompleted(
		workflow: WorkflowExecution,
		result: unknown,
	): void {
		logger.info(`✅ Report completed`, { workflowId: workflow.id, result });
	}

	protected override onWorkflowFailed(
		workflow: WorkflowExecution,
		error: Error,
	): void {
		logger.error(`❌ Report failed`, {
			workflowId: workflow.id,
			errorMsg: error.message,
			stack: error.stack,
		});
	}

	protected override onWorkflowProgress(
		workflow: WorkflowExecution,
		progress: number,
	): void {
		logger.info(`⏳ Report progress`, { workflowId: workflow.id, progress });
	}
}
