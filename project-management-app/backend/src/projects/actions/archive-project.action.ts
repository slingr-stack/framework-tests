import {
	Action,
	ObjectAction,
	WorkflowExecution,
	WorkflowsManager,
} from '@drumr/framework-backend';
import { Project } from '@/projects/data-models/project.data-model';
import { ArchiveProjectWorkflow } from '@/projects/workflows/archive-project.workflow';

@Action({
	type: 'write',
	model: Project,
	api: 'gql',
	returns: WorkflowExecution,
})
export class ArchiveProject extends ObjectAction<
	Project,
	void,
	WorkflowExecution
> {
	constructor(private workflowsManager: WorkflowsManager) {
		super();
	}

	override async canExecute(project: Project): Promise<boolean | string> {
		if (project.isArchived) {
			return 'Project is already archived';
		}
		return true;
	}

	override async execute(project: Project): Promise<WorkflowExecution> {
		return this.workflowsManager.execute(ArchiveProjectWorkflow, project);
	}
}
