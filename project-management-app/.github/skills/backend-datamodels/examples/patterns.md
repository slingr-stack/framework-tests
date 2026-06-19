# Field pattern examples

> Part of the [backend-datamodels](../SKILL.md) skill.

---

## Conditional required fields

```typescript
import { BaseDataModel, DataModel, TextField, BooleanField } from '@drumr/framework-backend';

@DataModel({ docs: 'Supplier onboarding form' })
export class Supplier extends BaseDataModel {
  @TextField({ required: true, maxLength: 120 })
  legalName!: string;

  @BooleanField({ required: true })
  isInternational: boolean = false;

  // Conditionally required when supplier is international.
  @TextField({ required: (supplier: Supplier) => supplier.isInternational, minLength: 2, maxLength: 2 })
  countryCode!: string | null;
}
```

## Default values (property + constructor)

```typescript
import { BaseDataModel, DataModel, DateTimeField, TextField, ChoiceField, UuidField } from '@drumr/framework-backend';

enum TicketStatus {
  Draft = 'draft',
  Open = 'open',
}

@DataModel({ docs: 'Support ticket model' })
export class Ticket extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  // Simple default directly at property declaration.
  @ChoiceField({ required: true, type: () => TicketStatus })
  status: TicketStatus = TicketStatus.Draft;

  @DateTimeField({ required: true })
  createdAt: Date = new Date();

  @TextField({ maxLength: 30 })
  code!: string;

  constructor() {
    super();

    // Complex default combining timestamp + random suffix.
    if (!this.code) {
      const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
      this.code = `TCK-${Date.now()}-${seed}`;
    }
  }
}
```

## Calculated fields (automatic getter + manual calculation)

```typescript
import { BaseDataModel, DataModel, IntegerField, DecimalField, TextField, decimal } from '@drumr/framework-backend';
import type { DecimalNumber } from '@drumr/framework-backend';

@DataModel({ docs: 'Invoice line summary model' })
export class InvoiceSummary extends BaseDataModel {
  @IntegerField({ required: true, min: 1 })
  quantity: number = 1;

  @DecimalField({ required: true, decimals: 2, roundingType: 'roundHalfToEven', min: '0.00' })
  unitPrice!: DecimalNumber;

  // Automatic calculation: standard getter, always current when accessed.
  @DecimalField({ decimals: 2, roundingType: 'roundHalfToEven', min: '0.00' })
  get subtotalAuto(): DecimalNumber {
    return this.unitPrice.multiply(String(this.quantity));
  }

  // Manual calculation: value updates when calculate() is invoked.
  @TextField({ calculation: 'manual' })
  get summaryManual(): string {
    return `Items: ${this.quantity} | Unit: ${this.unitPrice.toString()}`;
  }

  @DecimalField({ calculation: 'manual', decimals: 2, roundingType: 'roundHalfToEven', min: '0.00' })
  get subtotalManual(): DecimalNumber {
    return this.unitPrice.multiply(String(this.quantity));
  }
}

// Manual calculated fields require an explicit calculate() call:
async function calculateExample(): Promise<void> {
  const invoice = InvoiceSummary.fromJSON({ quantity: 2, unitPrice: '10.25' });
  await invoice.calculate();
  const value = invoice.subtotalManual;
  void value;
}

void calculateExample;
```

## Validations and field availability

```typescript
import { BaseDataModel, DataModel, TextField, BooleanField, type ValidationIssue } from '@drumr/framework-backend';

@DataModel({
  docs: 'Customer profile with field and model validations',
  validation: (profile: CustomerProfile): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Model-level validation for cross-field business rules.
    if (profile.isCompany && !profile.taxId) {
      issues.push({
        constraint: 'taxIdRequiredForCompany',
        message: 'Tax ID is required when profile is a company.',
      });
    }

    return issues;
  },
})
export class CustomerProfile extends BaseDataModel {
  @BooleanField({ required: true })
  isCompany: boolean = false;

  @TextField({
    maxLength: 20,
    // Field-level custom validation.
    validation: (value: string | null, profile: CustomerProfile): ValidationIssue[] => {
      if (!value || !profile.isCompany) return [];
      const taxIdRegex = /^[A-Z0-9-]{8,20}$/;
      return taxIdRegex.test(value) ? [] : [{ constraint: 'invalidTaxIdFormat', message: 'Tax ID format is invalid.' }];
    },
    available: (profile: CustomerProfile) => profile.isCompany,
  })
  taxId!: string | null;

  // Field is present only when the condition is true.
  @TextField({ available: (profile: CustomerProfile) => profile.isCompany, maxLength: 200 })
  legalRepresentative!: string | null;
}
```
