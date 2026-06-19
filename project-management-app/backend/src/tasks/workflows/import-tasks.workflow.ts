import {
	BaseDataModel,
	BaseWorkflow,
	DataModel,
	LongTextField,
	logger,
	Step,
	TextField,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Project } from '@/projects/data-models/project.data-model';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

interface RawTaskInput {
	title: string;
	description?: string;
	priority?: string;
	dueDate?: string;
	projectId?: string;
}

interface ParsedTask {
	title: string;
	description: string | null;
	priority: TaskPriority;
	dueDate: string | null;
	projectId: string | null;
}

interface ValidationResult {
	valid: ParsedTask[];
	skipped: string[];
}

interface ImportSummary {
	imported: number;
	skipped: number;
	reasons: string[];
}

@DataModel({
	ui: { crud: { api: 'gql' } },
})
export class ImportTasksParams extends BaseDataModel {
	@LongTextField({
		required: true,
		maxLength: 100_000,
		docs: 'JSON array of task objects to import. Each entry must have at least a "title" field.',
	})
	tasksJson!: string;

	@TextField({
		maxLength: 100,
		docs: 'Default project ID to assign when a task row does not specify one.',
	})
	defaultProjectId: string | null = null;
}

@Workflow()
export class ImportTasksWorkflow extends BaseWorkflow {
	constructor(private ds: MainDs) {
		super();
	}

	override async execute(params: ImportTasksParams): Promise<string> {
		this.reportProgress(5);
		const raw = await this.callStep(this.parseInput, params.tasksJson);
		this.reportProgress(33);

		const validation = await this.callStep(this.validateEntries, {
			raw,
			defaultProjectId: params.defaultProjectId,
		});
		this.reportProgress(66);

		const summary = await this.callStep(this.persistBatch, validation.valid);
		this.reportProgress(100);

		const message =
			`Import complete: ${summary.imported} task(s) created` +
			(summary.skipped > 0
				? `, ${summary.skipped} skipped (${summary.reasons.join('; ')})`
				: '');

		logger.info(`[ImportTasks] ${message}`);
		return message;
	}

	@Step({ transactional: false })
	async parseInput(tasksJson: string): Promise<RawTaskInput[]> {
		let parsed: unknown;
		try {
			parsed = JSON.parse(tasksJson);
		} catch (err) {
			throw new Error(`Invalid JSON: ${(err as Error).message}`);
		}
		if (!Array.isArray(parsed)) {
			throw new Error('Input must be a JSON array of task objects');
		}
		logger.info(`[ImportTasks] Step 1 OK - parsed ${parsed.length} row(s)`);
		return parsed as RawTaskInput[];
	}

	@Step({ transactional: false })
	async validateEntries(input: {
		raw: RawTaskInput[];
		defaultProjectId: string | null;
	}): Promise<ValidationResult> {
		const priorityMap: Record<string, TaskPriority> = {
			low: TaskPriority.Low,
			medium: TaskPriority.Medium,
			high: TaskPriority.High,
			urgent: TaskPriority.Urgent,
			critical: TaskPriority.Critical,
		};

		const valid: ParsedTask[] = [];
		const skipped: string[] = [];

		for (let i = 0; i < input.raw.length; i++) {
			const row = input.raw[i];

			if (
				!row.title ||
				typeof row.title !== 'string' ||
				row.title.trim().length < 3
			) {
				skipped.push(`Row ${i + 1}: missing or too-short title`);
				continue;
			}

			const priorityKey = (row.priority ?? 'medium').toLowerCase();
			const priority = priorityMap[priorityKey] ?? TaskPriority.Medium;

			valid.push({
				title: row.title.trim(),
				description: row.description?.trim() ?? null,
				priority,
				dueDate: row.dueDate ?? null,
				projectId: row.projectId ?? input.defaultProjectId,
			});
		}

		logger.info(
			`[ImportTasks] Step 2 OK - ${valid.length} valid, ${skipped.length} skipped`,
		);
		return { valid, skipped };
	}

	@Step({ transactional: false })
	async persistBatch(tasks: ParsedTask[]): Promise<ImportSummary> {
		let imported = 0;
		const reasons: string[] = [];

		for (const parsed of tasks) {
			try {
				let project: Project | null = null;
				if (parsed.projectId) {
					project = await this.ds.findOneBy(Project, { id: parsed.projectId });
					if (!project) {
						reasons.push(
							`Project ${parsed.projectId} not found - task "${parsed.title}" skipped`,
						);
						continue;
					}
				}

				const task = new Task();
				task.title = parsed.title;
				task.description = parsed.description;
				task.status = TaskStatus.ToDo;
				task.priority = parsed.priority;
				task.dueDate = parsed.dueDate;
				if (project) {
					task.project = project;
				}

				await this.ds.save(task);
				imported++;
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				reasons.push(`"${parsed.title}": ${msg}`);
			}
		}

		logger.info(
			`[ImportTasks] Step 3 OK - persisted ${imported}/${tasks.length} tasks`,
		);
		return { imported, skipped: tasks.length - imported, reasons };
	}
}
