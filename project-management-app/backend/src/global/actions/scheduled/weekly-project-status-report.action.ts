import {
	Action,
	GlobalAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { WeeklyProjectStatusReportWorkflow } from '@/global/workflows/scheduled/weekly-project-status-report.workflow';

@Action({
	type: 'write',
	api: 'gql',
	returns: WorkflowExecution,
})
export class WeeklyProjectStatusReport extends GlobalAction<
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(WeeklyProjectStatusReportWorkflow);
	}
}
