import {
	Action,
	ModelAction,
	ValidationError,
	ValidationErrors,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';
import {
	GenerateReportParams,
	GenerateReportWorkflow,
} from '@/projects/workflows/generate-report.workflow';

@Action({
	type: 'write',
	model: Project,
	api: 'gql',
	params: GenerateReportParams,
	returns: WorkflowExecution,
})
export class GenerateReport extends ModelAction<
	Project,
	GenerateReportParams,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async execute(
		params: GenerateReportParams,
	): Promise<WorkflowExecution> {
		const nonEmptySections = (params.sections ?? []).filter((s) => s?.trim());
		if (nonEmptySections.length === 0) {
			const err = new ValidationError();
			err.property = 'sections';
			err.constraints = { arrayMinSize: 'At least one section is required' };
			throw new ValidationErrors('Parameter validation failed', [err]);
		}
		return this.workflowsManager.execute(GenerateReportWorkflow, params);
	}
}
