import {
	Action,
	BaseDataModel,
	ChoiceField,
	DataModel,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class UpdateProjectStatusParams extends BaseDataModel {
	@ChoiceField({
		required: true,
		type: () => ProjectStatus,
		docs: 'New status for the project',
	})
	status!: ProjectStatus;
}

@Action({
	type: 'write',
	model: Project,
	api: 'gql',
	params: UpdateProjectStatusParams,
	returns: Project,
})
export class UpdateProjectStatus extends ObjectAction<
	Project,
	UpdateProjectStatusParams,
	Project
> {
	constructor(private ds: MainDs) {
		super();
	}

	override async canExecute(project: Project): Promise<boolean | string> {
		if (project.status === ProjectStatus.Cancelled) {
			return 'Cannot change status of a cancelled project';
		}
		if (project.status === ProjectStatus.Completed) {
			return 'Completed project can only be reopened to Active status';
		}
		return true;
	}

	override async execute(
		project: Project,
		params: UpdateProjectStatusParams,
	): Promise<Project> {
		project.status = params.status;
		project.updatedAt = new Date();

		// Set end date when completing
		if (params.status === ProjectStatus.Completed && !project.endDate) {
			project.endDate = new Date();
			project.completionPercentage = 100;
		}

		await this.ds.save(project);
		return project;
	}
}
