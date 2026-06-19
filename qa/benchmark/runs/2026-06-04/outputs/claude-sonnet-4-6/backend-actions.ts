import { Action, logger, ObjectAction } from '@drumr/framework-backend';
import { Budget } from '../../dataModels/Budget';
import { MainDs } from '../../dataSources/mainDs';

@Action({
	type: 'write',
	model: Budget,
	api: 'gql',
	returns: Budget,
	ui: {
		label: 'Archive budget',
	},
})
export class ArchiveBudget extends ObjectAction<Budget, void, Budget> {
	constructor(private ds: MainDs) {
		super();
	}

	override async canExecute(budget: Budget): Promise<boolean | string> {
		if (budget.status === 'archived') {
			return 'Budget is already archived';
		}
		return true;
	}

	override async execute(budget: Budget): Promise<Budget> {
		budget.status = 'archived';
		await this.ds.save(budget);
		logger.info(`[ArchiveBudget] Budget ${budget.id} archived`);
		return budget;
	}
}
