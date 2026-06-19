import {
	Action,
	BaseDataModel,
	BooleanField,
	ChoiceField,
	DataModel,
	DateField,
	GlobalAction,
	IntegerField,
	logger,
	NumberField,
	TextField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import {
	Project,
	ProjectStatus,
} from '@/projects/data-models/project.data-model';

export enum ArchiveStrategy {
	Soft = 'soft',
	Hard = 'hard',
}

export enum PostArchiveAction {
	None = 'none',
	ExportCsv = 'exportCsv',
	Webhook = 'webhook',
}

@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
class ArchiveCompletedProjectsParams extends BaseDataModel {
	/**
	 * When provided, the archiving loop throws an error as soon as it encounters
	 * a project whose name matches this value. Because all saves run inside a
	 * single `dataSource.transaction()` call, none of the archive flags are
	 * persisted — every project is left unarchived.
	 *
	 * Use this to demonstrate that manual transactions batch all writes into an
	 * all-or-nothing unit.
	 */
	@TextField({
		required: false,
		docs: 'If set, archiving fails when a project with this name is encountered, rolling back all changes.',
	})
	failOnProjectName!: string | null;

	/** Archive strategy — tests a ChoiceField (select/radio component). */
	@ChoiceField({
		required: true,
		type: () => ArchiveStrategy,
	})
	strategy!: ArchiveStrategy;

	/** Minimum age in days for a project to be eligible — tests an IntegerField. */
	@IntegerField({
		required: true,
		min: 1,
		docs: 'Only archive projects completed at least this many days ago.',
	})
	minAgeDays!: number;

	/** Budget threshold — tests a NumberField (decimal). */
	@NumberField({
		required: false,
		min: 0,
		docs: 'Skip projects whose budget exceeds this value. Leave empty to archive regardless of budget.',
	})
	maxBudget!: number | null;

	/** Cut-off date — tests a DateField (date picker). */
	@DateField({
		required: false,
		docs: 'If set, only archive projects whose completion date is on or before this date.',
	})
	archiveBeforeDate!: Date | null;

	/** Send notification on completion — tests a BooleanField (toggle/checkbox). */
	@BooleanField({
		required: false,
		docs: 'When enabled, a summary notification is sent after archiving completes.',
	})
	notifyOnCompletion!: boolean | null;

	/** Notification email — tests a second TextField (email-like free text). */
	@TextField({
		required: false,
		maxLength: 254,
		docs: 'Email address to notify when archiving completes. Only used when Notify on Completion is enabled.',
	})
	notificationEmail!: string | null;

	/** Batch size — tests a second IntegerField. */
	@IntegerField({
		required: false,
		min: 1,
		max: 500,
		docs: 'How many projects to archive per database batch. Defaults to 50 when not set.',
	})
	batchSize!: number | null;

	/** Retry on failure — tests a second BooleanField. */
	@BooleanField({
		required: false,
		docs: 'When enabled, failed batches are retried once before the whole operation is rolled back.',
	})
	retryOnFailure!: boolean | null;

	/** Completion date range start — tests a second DateField. */
	@DateField({
		required: false,
		docs: 'If set, only archive projects completed on or after this date.',
	})
	completedAfterDate!: Date | null;

	/** Audit tag — tests a third TextField. */
	@TextField({
		required: false,
		maxLength: 100,
		docs: 'Free-form tag written to the audit log entry for each archived project.',
	})
	auditTag!: string | null;

	/** Cost centre override — tests a second NumberField. */
	@NumberField({
		required: false,
		min: 0,
		docs: "Override cost centre code to stamp on archived records. Leave empty to preserve the project's existing value.",
	})
	costCentreOverride!: number | null;

	/** Post-archive action — tests a second ChoiceField. */
	@ChoiceField({
		required: false,
		type: () => PostArchiveAction,
	})
	postArchiveAction!: PostArchiveAction | null;
}

/**
 * Archives all completed projects that finished more than 90 days ago.
 *
 * This action demonstrates the manual `dataSource.transaction()` API.
 * All project updates are batched inside a single transaction: if any save
 * fails, none of the archive flags are persisted.
 */
@Action({
	type: 'write',
	api: 'gql',
	params: ArchiveCompletedProjectsParams,
	returns: ArchiveCompletedProjectsParams,
})
export class ArchiveCompletedProjects extends GlobalAction<
	ArchiveCompletedProjectsParams,
	ArchiveCompletedProjectsParams
> {
	constructor(private ds: MainDs) {
		super();
	}

	private async collectProjectsToArchive(): Promise<Project[]> {
		const projects: Project[] = [];

		await this.ds.findAndPaginate(
			Project,
			{
				where: {
					status: { eq: ProjectStatus.Completed },
					isArchived: { eq: false },
				},
				orderBy: { id: 'ASC' },
			},
			async (project) => {
				projects.push(project);
				return true;
			},
		);

		return projects;
	}

	override async execute(
		params: ArchiveCompletedProjectsParams,
	): Promise<ArchiveCompletedProjectsParams> {
		// Find completed, non-archived projects across all pages
		const projects = await this.collectProjectsToArchive();

		logger.info(
			`[ArchiveCompletedProjects] Found ${projects.length} completed project(s) to archive`,
		);
		if (projects.length === 0) {
			logger.info('[ArchiveCompletedProjects] No projects to archive');
			return params;
		}

		// Open a manual transaction: all saves commit together or all roll back.
		// If any individual save throws, none of the archive flags are written.
		let archivedCount = 0;
		await this.ds.transaction(async () => {
			for (const project of projects) {
				if (
					params.failOnProjectName &&
					project.name === params.failOnProjectName
				) {
					logger.info(
						`[ArchiveCompletedProjects] Simulating failure on "${project.name}" ` +
							`— ${archivedCount} archive(s) written above will be rolled back`,
					);
					throw new Error(
						`Project ${project.name} cannot be archived because its name matches the provided parameter.`,
					);
				}
				project.isArchived = true;
				await this.ds.save(project);
				archivedCount++;
				logger.info(
					`[ArchiveCompletedProjects] ✓ "${project.name}" archived inside transaction (${archivedCount} of ${projects.length})`,
				);
			}
		});
		logger.info(
			`[ArchiveCompletedProjects] Transaction committed — all ${archivedCount} archive(s) persisted`,
		);
		return params;
	}
}
