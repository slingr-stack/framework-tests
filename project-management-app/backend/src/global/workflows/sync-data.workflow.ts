import {
	BaseWorkflow,
	logger,
	Step,
	SystemQueue,
	Workflow,
} from '@drumr/framework-backend';

@Workflow({
	queue: SystemQueue,
})
export class SyncDataWorkflow extends BaseWorkflow {
	async execute(): Promise<string> {
		logger.info('[SyncData] Syncing data...');

		await this.callStep(this.validateData);
		await this.reportProgress(33, { step: 'validation_complete' });

		await this.callStep(this.syncData);
		await this.reportProgress(66, { step: 'sync_complete' });

		const result = await this.callStep(this.verifySync);
		await this.reportProgress(100, { step: 'verification_complete' });

		return result;
	}

	@Step({})
	async validateData(): Promise<void> {
		logger.info('[SyncData] Validating data...');
		await new Promise((resolve) => setTimeout(resolve, 2000));
		logger.info('[SyncData] Validation complete');
	}

	@Step({})
	async syncData(): Promise<void> {
		logger.info('[SyncData] Syncing data...');
		await new Promise((resolve) => setTimeout(resolve, 2000));
		logger.info('[SyncData] Sync complete');
	}

	@Step({})
	async verifySync(): Promise<string> {
		logger.info('[SyncData] Verifying sync...');
		await new Promise((resolve) => setTimeout(resolve, 2000));
		logger.info('[SyncData] Verification complete');
		return 'Data synchronized successfully';
	}
}
