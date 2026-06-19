import {
	BaseWorkflow,
	logger,
	Step,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import {
	Task,
	TaskPriority,
	TaskStatus,
} from '@/tasks/data-models/task.data-model';

interface OverdueTask {
	id: string;
	title: string;
	currentPriority: TaskPriority;
	projectId: string | null;
	dueDate: string;
}

interface EscalationPlan {
	toEscalate: OverdueTask[];
	alreadyTop: OverdueTask[];
}

interface EscalationSummary {
	escalated: number;
	alreadyAtCritical: number;
	errors: string[];
}

const NEXT_PRIORITY: Partial<Record<TaskPriority, TaskPriority>> = {
	[TaskPriority.Low]: TaskPriority.Medium,
	[TaskPriority.Medium]: TaskPriority.High,
	[TaskPriority.High]: TaskPriority.Urgent,
	[TaskPriority.Urgent]: TaskPriority.Critical,
};

@Workflow()
export class EscalateOverdueTasksWorkflow extends BaseWorkflow {
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
	) {
		super();
	}

	override async execute(): Promise<string> {
		this.reportProgress(5);

		const overdue = await this.callStep(this.findOverdueTasks);
		this.reportProgress(35);
		logger.info(
			`[EscalateOverdueTasks] Step 1 OK - ${overdue.length} overdue task(s) found`,
		);

		if (overdue.length === 0) {
			this.reportProgress(100);
			return 'No overdue tasks found - nothing to escalate.';
		}

		const plan = await this.callStep(this.buildEscalationPlan, overdue);
		this.reportProgress(60);
		logger.info(
			`[EscalateOverdueTasks] Step 2 OK - ${plan.toEscalate.length} to escalate, ` +
				`${plan.alreadyTop.length} already Critical`,
		);

		const summary = await this.callStep(this.applyEscalations, plan.toEscalate);
		this.reportProgress(100);

		const message =
			`Escalation complete: ${summary.escalated} task(s) escalated` +
			(plan.alreadyTop.length > 0
				? `, ${plan.alreadyTop.length} already at Critical`
				: '') +
			(summary.errors.length > 0
				? `. Errors: ${summary.errors.join('; ')}`
				: '');

		this.activityLog.addEntry(message);
		logger.info(`[EscalateOverdueTasks] ${message}`);
		return message;
	}

	@Step({ transactional: false })
	async findOverdueTasks(): Promise<OverdueTask[]> {
		const todayStr = new Date().toISOString().slice(0, 10);
		const tasks: Task[] = [];

		await this.ds.findAndPaginate(
			Task,
			{
				where: {
					dueDate: { lt: todayStr },
					status: { nin: [TaskStatus.Done, TaskStatus.Blocked] },
				},
				orderBy: { id: 'ASC' },
			},
			async (task) => {
				tasks.push(task);
				return true;
			},
		);

		return tasks.map((t) => ({
			id: t.id,
			title: t.title,
			currentPriority: t.priority,
			projectId: t.project?.id ?? null,
			dueDate: t.dueDate ?? '',
		}));
	}

	@Step({ transactional: false })
	async buildEscalationPlan(overdue: OverdueTask[]): Promise<EscalationPlan> {
		const toEscalate: OverdueTask[] = [];
		const alreadyTop: OverdueTask[] = [];

		for (const task of overdue) {
			if (task.currentPriority === TaskPriority.Critical) {
				alreadyTop.push(task);
			} else {
				toEscalate.push(task);
			}
		}

		return { toEscalate, alreadyTop };
	}

	@Step({ transactional: false })
	async applyEscalations(tasks: OverdueTask[]): Promise<EscalationSummary> {
		let escalated = 0;
		const errors: string[] = [];

		for (const dto of tasks) {
			try {
				const task = await this.ds.findOneBy(Task, { id: dto.id });
				if (!task) {
					errors.push(`Task ${dto.id} not found (may have been deleted)`);
					continue;
				}

				if (
					task.status === TaskStatus.Done ||
					task.status === TaskStatus.Blocked
				) {
					continue;
				}

				const newPriority = NEXT_PRIORITY[task.priority];
				if (!newPriority) {
					continue;
				}

				task.priority = newPriority;
				await this.ds.save(task);
				escalated++;

				logger.info(
					`[EscalateOverdueTasks] "${task.title}" (${task.id}): ` +
						`${dto.currentPriority} -> ${newPriority}`,
				);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				errors.push(`Task ${dto.id}: ${msg}`);
			}
		}

		return { escalated, alreadyAtCritical: 0, errors };
	}
}
