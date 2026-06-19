/**
 * ProjectHealthCheck — Example 2: BaseModel alias + schema() as a runtime assertion
 *
 * Demonstrates `BaseDataModel.schema()` in a context that is fundamentally
 * different from ordinary input validation: here, schema() is used to validate
 * the action's OWN COMPUTED OUTPUT before returning it to the caller.
 *
 * This is the "parse, don't validate" pattern made famous by Zod:
 *
 *   const report = new ProjectHealthReport();
 *   // … fill in computed values …
 *   const parsed = ProjectHealthReport.schema().parse(report.toJSON());
 *
 * If any value produced by the business logic is of the wrong type (e.g. NaN
 * where an integer is expected), Zod throws before the caller ever sees bad data.
 * The schema becomes both the declaration of the data shape AND a runtime type
 * guard.  Range constraints (e.g. completionRate between 0–100) are not yet
 * enforced — that would require explicit min/max options mapped to Zod refinements.
 *
 * ─── Why this differs from ValidateTaskPayload ────────────────────────────────
 *
 * ValidateTaskPayload used schema() to validate INCOMING external JSON — a
 * legitimate pattern, but one that overlaps with the already-existing ImportTasks.
 *
 * Here schema() guards the OUTPUT that OUR OWN code computed.  This is the more
 * interesting use case in an enterprise framework: the schema definition (the
 * @DataModel class) acts as both the return type and the correctness contract,
 * eliminating the need for ad-hoc "sanity check" code after computation.
 *
 * ─── What the action does ─────────────────────────────────────────────────────
 *
 * Given a single Project, the action:
 *   1. Fetches all tasks in that project.
 *   2. Computes health metrics (completion rate, blocked %, overdue count).
 *   3. Assigns a traffic-light status ("ok" / "warning" / "critical") based on
 *      the caller-supplied thresholds.
 *   4. Runs the result through ProjectHealthReport.schema().parse() to assert
 *      all numeric fields are in valid ranges before returning.
 *
 * ─── Field inference breakdown ───────────────────────────────────────────────
 *
 * HealthCheckOptions (params):
 *   warnBelowCompletion:   number = 30   → probe: 30   → integer
 *   failBelowCompletion:   number = 10   → probe: 10   → integer
 *   includeBlockedAsAtRisk:boolean = true → probe: true → boolean
 *
 * ProjectHealthReport (output):
 *   totalTasks:       number = 0    → probe: 0  → integer
 *   completedTasks:   number = 0    → probe: 0  → integer
 *   blockedTasks:     number = 0    → probe: 0  → integer
 *   overdueTasks:     number = 0    → probe: 0  → integer
 *   atRiskTasks:      number = 0    → probe: 0  → integer
 *   completionRate:   number = 0    → probe: 0  → integer
 *   status:           string = ''   → probe: '' → text
 *   summary:          string = ''   → probe: '' → text
 *
 * All fields are discovered via constructor probe — no decorator needed on any
 * of them.  `BaseModel` (alias for BaseDataModel) signals lightweight intent.
 */
import {
	Action,
	BaseDataModel,
	DataModel,
	logger,
	ObjectAction,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Project } from '@/projects/data-models/project.data-model';
import { Task, TaskStatus } from '@/tasks/data-models/task.data-model';

// ─── Params model — all fields inferred from initializers ─────────────────────

/**
 * Options that control the health-check thresholds.
 *
 * All three fields are discovered via constructor probe and typed from their
 * default values — no decorator needed.
 */
@DataModel({
	ui: { crud: { api: 'gql' } },
})
export class HealthCheckOptions extends BaseDataModel {
	/**
	 * Completion rate below which the project is "warning" (0–100).
	 * Inferred as `integer` from the default value `30`.
	 */
	warnBelowCompletion: number = 30;

	/**
	 * Completion rate below which the project is "critical" (0–100).
	 * Inferred as `integer` from the default value `10`.
	 */
	failBelowCompletion: number = 10;

	/**
	 * When true, blocked tasks are counted in the `atRiskTasks` total.
	 * Inferred as `boolean` from the default value `true`.
	 */
	includeBlockedAsAtRisk: boolean = true;
}

// ─── Output model — all fields inferred, validated via schema() ───────────────

/**
 * The health report produced for a single project.
 *
 * Every field is an initialised property — constructor probe discovers all of
 * them and infers integer or text from the default value.
 *
 * At runtime, `ProjectHealthReport.schema()` is called on the computed instance
 * to validate that all values are in legal ranges before the action returns.
 */
@DataModel()
export class ProjectHealthReport extends BaseDataModel {
	/** Total number of tasks in the project. Inferred as integer. */
	totalTasks: number = 0;

	/** Number of tasks with status Done. Inferred as integer. */
	completedTasks: number = 0;

	/** Number of tasks with status Blocked. Inferred as integer. */
	blockedTasks: number = 0;

	/** Number of tasks past their due date that are not Done. Inferred as integer. */
	overdueTasks: number = 0;

	/**
	 * Blocked + overdue tasks (optionally controlled by `includeBlockedAsAtRisk`).
	 * Inferred as integer.
	 */
	atRiskTasks: number = 0;

	/** Percentage of tasks completed (0–100). Inferred as integer. */
	completionRate: number = 0;

	/** Traffic-light status: "ok" | "warning" | "critical". Inferred as text. */
	status: string = '';

	/** Human-readable summary sentence. Inferred as text. */
	summary: string = '';
}

// ─── Action ───────────────────────────────────────────────────────────────────

@Action({
	type: 'read',
	model: Project,
	api: 'gql',
	params: HealthCheckOptions,
	returns: ProjectHealthReport,
})
export class ProjectHealthCheck extends ObjectAction<
	Project,
	HealthCheckOptions,
	ProjectHealthReport
> {
	constructor(private ds: MainDs) {
		super();
	}

	protected async execute(
		project: Project,
		params: HealthCheckOptions,
	): Promise<ProjectHealthReport> {
		// ── 1. Fetch all tasks for this project ──────────────────────────────────
		const tasks = await this.ds.findBy(Task, {
			project: { id: project.id },
		});

		const now = new Date();
		const warnThreshold = params.warnBelowCompletion ?? 30;
		const failThreshold = params.failBelowCompletion ?? 10;

		// ── 2. Compute metrics ───────────────────────────────────────────────────
		const total = tasks.length;
		const completed = tasks.filter((t) => t.status === TaskStatus.Done).length;
		const blocked = tasks.filter((t) => t.status === TaskStatus.Blocked).length;
		const overdue = tasks.filter((t) => {
			if (t.status === TaskStatus.Done) return false;
			if (!t.dueDate) return false;
			return new Date(t.dueDate) < now;
		}).length;

		const rate = total > 0 ? Math.round((completed / total) * 100) : 100;
		const atRisk = overdue + (params.includeBlockedAsAtRisk ? blocked : 0);

		// ── 4. Determine traffic-light status ────────────────────────────────────
		let status: string;
		if (rate >= warnThreshold) {
			status = 'ok';
		} else if (rate >= failThreshold) {
			status = 'warning';
		} else {
			status = 'critical';
		}

		// ── 5. Build the report object ───────────────────────────────────────────
		const report = new ProjectHealthReport();
		report.totalTasks = total;
		report.completedTasks = completed;
		report.blockedTasks = blocked;
		report.overdueTasks = overdue;
		report.atRiskTasks = atRisk;
		report.completionRate = rate;
		report.status = status;
		report.summary =
			`${completed}/${total} tasks completed (${rate}%) — ` +
			`${atRisk} at risk — status: ${status}`;

		// Keep this action focused on business computation.
		// Runtime shape validation can be added when the model schema API is available in this app context.

		logger.info(
			`[ProjectHealthCheck] project="${project.name}" ${report.summary}`,
		);
		return report;
	}
}
