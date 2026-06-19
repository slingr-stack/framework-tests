import {
	Action,
	App,
	BaseDataModel,
	ChoiceField,
	Context,
	DataModel,
	logger,
	ObjectAction,
	TextField,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { Task, TaskPriority } from '@/tasks/data-models/task.data-model';

/**
 * BulkChangePriorityParams - params model for bulk priority change.
 *
 * ## How bulkQuery reaches the backend
 *
 * The frontend's `context.bulkQuery` (set by `ActionView.onLoad`) is sent as the
 * `query` GraphQL argument on the bulk mutation. For example:
 *
 * ```graphql
 * mutation {
 *   # Explicit selection (user ticked 3 rows)
 *   BulkChangePriority(query: { id: { in: ["t-1", "t-2", "t-3"] } }, priority: urgent) { ... }
 *
 *   # Select-all with an active filter (e.g. only open tasks)
 *   BulkChangePriority(query: { status: { eq: "open" } }, priority: high) { ... }
 *
 *   # Select-all with no filter (every record)
 *   BulkChangePriority(query: {}, priority: low) { ... }
 * }
 * ```
 *
 * `BulkObjectActionWrapper` receives the `query`, translates it to a TypeORM WHERE
 * clause via `transformWhereClause`, fetches matching IDs from the DB, and then calls
 * `execute(task, params)` once per record. The action itself therefore always receives
 * individual `task` objects — it does NOT need to handle the query manually.
 *
 * ## Detecting bulk mode inside the action
 *
 * Use `ctx.action.bulkAction` (set to `true` by `BulkObjectActionWrapper`):
 *
 * ```typescript
 * const ctx = App.resolve(Context);
 * if (ctx.action?.bulkAction) {
 *   // Running inside a bulk workflow — skip expensive single-record side-effects
 *   // or adjust defaults so the user's explicit choice is always honoured.
 * }
 * ```
 *
 * `bulkAction` is available during **action execution** (inside `ActionResolver`,
 * which runs in a DI request scope). It is NOT available during the initial UI
 * refresh that renders the form — for that, set defaults in the view's `onLoad()`
 * using `context.bulkQuery` (see BulkChangePriorityView).
 *
 * Pattern: wrap the field initializer in a try/catch so it degrades gracefully when
 * there is no active request scope (e.g. during UI refresh or unit tests).
 */
@DataModel({
	ui: {
		crud: {
			api: 'gql',
		},
	},
})
export class BulkChangePriorityParams extends BaseDataModel {
	@ChoiceField({
		required: true,
		type: () => TaskPriority,
		docs: 'New priority level to apply to all selected tasks',
	})
	priority?: TaskPriority | null;

	@TextField({
		required: false,
		maxLength: 500,
		docs: 'Reason for the bulk priority change',
	})
	reason?: string | null;
}

/**
 * BulkChangePriority - bulk ObjectAction with a custom params view.
 *
 * Demonstrates: bulk execution with a params model whose defaults differ
 * between bulk and single-record mode, combined with a custom view
 * (BulkChangePriorityView) that also sets frontend defaults via onLoad().
 */
@Action({
	type: 'write',
	model: Task,
	api: 'gql',
	params: BulkChangePriorityParams,
	returns: Task,
	bulk: true,
})
export class BulkChangePriority extends ObjectAction<
	Task,
	BulkChangePriorityParams,
	Task
> {
	constructor(private ds: MainDs) {
		super();
	}

	override async onInit(
		_target: Task,
		params: BulkChangePriorityParams,
	): Promise<void> {
		// ctx.action is populated by ObjectAction._callInScope for every per-record call.
		//
		// ctx.action.bulkAction  → true when running inside BulkObjectActionWrapper
		// ctx.action.bulkQuery   → the original GQL filter used to select records:
		//   { id: { in: ['t-1','t-2'] } }  — explicit selection
		//   { status: { eq: 'active' } }   — select-all with an active filter
		//   {}                             — select-all, no filter (all records)
		let isBulk = false;
		let bulkQuery: Record<string, unknown> | undefined;
		try {
			const ctx = App.resolve(Context);
			isBulk = ctx.action?.bulkAction ?? false;
			bulkQuery = ctx.action?.bulkQuery as Record<string, unknown> | undefined;
		} catch {
			// No active DI scope — UI-refresh or unit test; treat as single.
		}

		if (isBulk && bulkQuery) {
			if (!params.priority) {
				params.priority = null;
			}

			// Guard: a completely empty query means "all records" — warn so developers
			// don't accidentally mass-update without an active filter.
			if (Object.keys(bulkQuery).length === 0) {
				logger.warn(
					'[BulkChangePriority] Running against ALL tasks (no filter). ' +
						'Consider requiring an active filter before allowing this operation.',
				);
			}

			// You can pass bulkQuery directly to any datasource method — the framework
			// normalises reference fields automatically, so this works for all field types:
			//   await this.ds.findBy(Task, bulkQuery)
			//   await this.ds.findAndPaginate(Task, { where: bulkQuery }, callback)
			//
			// Example: build a context-aware default reason from the active filter.
			if (!params.reason) {
				const statusFilter =
					typeof bulkQuery.status === 'object' && bulkQuery.status !== null
						? (bulkQuery.status as { eq?: string }).eq
						: undefined;
				params.reason = statusFilter
					? `Bulk priority change for tasks with status: ${statusFilter}`
					: 'Bulk priority change';
			}
		} else {
			// Single-record mode defaults
			if (!params.reason) params.reason = 'No reason provided';
			if (!params.priority) params.priority = TaskPriority.Urgent;
		}
	}

	override async canExecute(_task: Task): Promise<boolean | string> {
		return true;
	}

	override async execute(
		task: Task,
		params: BulkChangePriorityParams,
	): Promise<Task> {
		if (params.priority != null) {
			task.priority = params.priority;
		}
		if (params.reason) {
			task.description = task.description
				? `${task.description}\n\n[Bulk priority change to ${params.priority}: ${params.reason}]`
				: `[Bulk priority change to ${params.priority}: ${params.reason}]`;
		}
		await this.ds.save(task);
		return task;
	}
}
