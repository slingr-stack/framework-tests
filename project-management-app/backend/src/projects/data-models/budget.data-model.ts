import type { Decimal as DecimalType } from '@drumr/framework-backend';
import {
	BaseDataModel,
	DataModel,
	DecimalField,
	decimal,
	NumberField,
	TextField,
	UuidField,
} from '@drumr/framework-backend';

/**
 * Budget model demonstrating calculated field dependency ordering.
 *
 * This model showcases how the framework efficiently handles complex
 * dependency chains between calculated fields. The fields are calculated
 * in topological order based on their dependencies, requiring only a
 * single pass instead of multiple iterations.
 *
 * Dependency chain:
 * - laborCost = hourlyRate * estimatedHours
 * - materialsCost (independent)
 * - subtotal = laborCost + materialsCost
 * - taxAmount = subtotal * taxRate
 * - total = subtotal + taxAmount
 * - profitMargin = (total - subtotal) / total * 100
 *
 * Without dependency ordering, this would require multiple iterations
 * to resolve. With dependency ordering, it's calculated in a single pass.
 */
@DataModel({
	dataSource: 'mainDs',
	docs: 'Budget calculation demonstrating calculated field dependencies',
})
export class Budget extends BaseDataModel {
	@UuidField({
		required: true,
		primaryKey: true,
		generated: true,
		docs: 'Unique identifier for the budget',
	})
	id!: string;

	@TextField({
		required: true,
		minLength: 3,
		maxLength: 200,
		docs: 'Budget name or description',
	})
	name!: string;

	// Base input fields
	@DecimalField({
		required: true,
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0',
		docs: 'Hourly labor rate',
	})
	hourlyRate!: DecimalType;

	@NumberField({
		required: true,
		min: 0,
		docs: 'Estimated hours for the project',
	})
	estimatedHours!: number;

	@DecimalField({
		required: true,
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0',
		docs: 'Cost of materials',
	})
	materialsCost!: DecimalType;

	@DecimalField({
		required: true,
		decimals: 2,
		roundingType: 'roundHalfToEven',
		min: '0',
		max: '100',
		docs: 'Tax rate as a percentage',
	})
	taxRate!: DecimalType;

	// Level 1: Direct dependencies on base fields
	@DecimalField({
		required: false,
		calculation: 'manual',
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Total labor cost (hourlyRate * estimatedHours)',
	})
	get laborCost(): DecimalType {
		const rate = decimal(this.hourlyRate?.toString() || '0');
		const hours = decimal(this.estimatedHours || 0);
		return rate.times(hours).changePrecision(2);
	}

	// Level 2: Depends on laborCost
	@DecimalField({
		required: false,
		calculation: 'manual',
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Subtotal before tax (laborCost + materialsCost)',
	})
	get subtotal(): DecimalType {
		const labor = decimal(this.laborCost?.toString() || '0');
		const materials = decimal(this.materialsCost?.toString() || '0');
		return labor.plus(materials).changePrecision(2);
	}

	// Level 3: Depends on subtotal
	@DecimalField({
		required: false,
		calculation: 'manual',
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Tax amount calculated on subtotal',
	})
	get taxAmount(): DecimalType {
		const sub = decimal(this.subtotal?.toString() || '0');
		const rate = decimal(this.taxRate?.toString() || '0');
		return sub.times(rate.div(100)).changePrecision(2);
	}

	// Level 4: Depends on subtotal and taxAmount
	@DecimalField({
		required: false,
		calculation: 'manual',
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Total cost including tax',
	})
	get total(): DecimalType {
		const sub = decimal(this.subtotal?.toString() || '0');
		const tax = decimal(this.taxAmount?.toString() || '0');
		return sub.plus(tax).changePrecision(2);
	}

	// Level 5: Depends on total and subtotal
	@DecimalField({
		required: false,
		calculation: 'manual',
		decimals: 2,
		roundingType: 'roundHalfToEven',
		docs: 'Effective tax rate as percentage of total',
	})
	get effectiveTaxRate(): DecimalType {
		const tot = decimal(this.total?.toString() || '0');
		const tax = decimal(this.taxAmount?.toString() || '0');
		if (tot.equal(0)) {
			return decimal('0');
		}
		return tax.div(tot).times(100).changePrecision(2);
	}

	// Complex dependency: depends on multiple calculated fields
	@TextField({
		required: false,
		calculation: 'manual',
		docs: 'Summary of the budget breakdown',
	})
	get summary(): string {
		return `${this.name}: Labor $${this.laborCost} + Materials $${this.materialsCost} = Subtotal $${this.subtotal}, Tax $${this.taxAmount} (${this.effectiveTaxRate}%) = Total $${this.total}`;
	}
}
