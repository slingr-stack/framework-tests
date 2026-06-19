import { App, BaseApp, ConfigService, logger } from '@drumr/framework-backend';
import { ActivityLogService } from '@/global/services/activity-log.service';
import { MockEmailService } from '@/global/services/mock-email.service';

@App()
export class ProjectManagementApp extends BaseApp {
	constructor(
		private activityLog: ActivityLogService,
		private configService: ConfigService,
	) {
		super();
	}

	override beforeStart(): Promise<void> {
		// this can be replaced with real implementations or mocks as needed, e.g. for testing or different environments
		this.register('emailService', MockEmailService);
		return Promise.resolve();
	}

	override async afterStart(): Promise<void> {
		this.activityLog.addEntry('Application started');

		const workflowsEnabled = this.configService.workflows.enabled;
		if (workflowsEnabled) {
			logger.info('Workflows are enabled', {
				dataSource: this.configService.workflows.dataSource,
				pruneThresholdDays: this.configService.workflows.pruneThresholdDays,
				pruningIntervalSeconds:
					this.configService.workflows.pruningIntervalSeconds,
			});
		} else {
			logger.info('Workflows are disabled via configuration');
		}
	}

	override async beforeStop(): Promise<void> {
		logger.info('Tasky app stopping');
		this.activityLog.addEntry('Application stopping');
	}

	override async onError(error: Error): Promise<void> {
		logger.error('Unhandled startup error', error);
		this.activityLog.addEntry(`Startup error: ${error.message}`);
	}
}
