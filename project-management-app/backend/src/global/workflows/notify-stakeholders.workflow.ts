import {
	BaseWorkflow,
	logger,
	Step,
	Workflow,
} from '@drumr/framework-backend';
import { MainDs } from '@/config/data-sources/main/main.ds';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { Project } from '@/projects/data-models/project.data-model';

export interface NotifyStakeholdersWorkflowParams {
	projectId: string;
	message: string;
}

interface StakeholderInfo {
	userId: string;
	email: string;
	name: string;
	role: 'manager' | 'member';
}

export interface NotificationSummary {
	count: number;
	stakeholders: string[];
}

@Workflow()
export class NotifyStakeholdersWorkflow extends BaseWorkflow {
	constructor(
		private ds: MainDs,
		private activityLog: ActivityLogService,
	) {
		super();
	}

	async execute(
		params: NotifyStakeholdersWorkflowParams,
	): Promise<NotificationSummary> {
		const stakeholders = await this.callStep(
			this.loadStakeholders,
			params.projectId,
		);

		const sent = await this.callStep(this.dispatchNotifications, {
			stakeholders,
			message: params.message,
		});

		logger.info(
			`[NotifyStakeholders] Sent ${sent.count} notification(s) for project ${params.projectId}`,
		);

		return sent;
	}

	@Step({ transactional: false })
	async loadStakeholders(projectId: string): Promise<StakeholderInfo[]> {
		const project = await this.ds.findOneBy(Project, { id: projectId });
		if (!project) {
			throw new Error(
				`Project ${projectId} not found - cannot notify stakeholders`,
			);
		}

		const stakeholders: StakeholderInfo[] = [];

		if (project.manager) {
			stakeholders.push({
				userId: project.manager.id,
				email: project.manager.email,
				name: project.manager.fullName,
				role: 'manager',
			});
		}

		if (project.teamMembers?.length) {
			for (const member of project.teamMembers) {
				if (!stakeholders.some((s) => s.userId === member.id)) {
					stakeholders.push({
						userId: member.id,
						email: member.email,
						name: member.fullName,
						role: 'member',
					});
				}
			}
		}

		logger.info(
			`[NotifyStakeholders] Step 1 OK - found ${stakeholders.length} stakeholder(s) for project ${projectId}`,
		);

		return stakeholders;
	}

	@Step({ transactional: false, retries: 2 })
	async dispatchNotifications(input: {
		stakeholders: StakeholderInfo[];
		message: string;
	}): Promise<NotificationSummary> {
		let count = 0;

		for (const s of input.stakeholders) {
			this.activityLog.addEntry(
				`[Notification -> ${s.name} <${s.email}> (${s.role})]: ${input.message}`,
			);
			logger.info(`[NotifyStakeholders] notified ${s.name} <${s.email}>`);
			count++;
		}

		logger.info(
			`[NotifyStakeholders] Step 2 OK - dispatched ${count} notification(s)`,
		);

		return { count, stakeholders: input.stakeholders.map((s) => s.email) };
	}
}
