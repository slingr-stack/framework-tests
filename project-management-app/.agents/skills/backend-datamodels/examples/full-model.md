# Full model example: Advanced `@DataModel` metadata

> Part of the [backend-datamodels](../SKILL.md) skill.

Demonstrates: `dataSource`, `crud`, model-level `validation`, all major field types, and calculated fields. Field UI rendering (components, labels) for this model is configured on the frontend — see [frontend-datamodels](../../frontend-datamodels/SKILL.md) and its `examples/full-model-ui.md`.

---

```typescript
import {
  BaseDataModel,
  DataModel,
  TextField,
  ChoiceField,
  DateField,
  IntegerField,
  HtmlField,
  MoneyField,
  Money,
  UuidField,
  type ValidationIssue,
} from '@drumr/framework-backend';
import { MainDs } from '@/infra/data-sources/main.ds';

export enum ProjectStatus {
  Planning = 'planning',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum ProjectPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

@DataModel({
  dataSource: MainDs,
  docs: 'Project model with advanced metadata',
  crud: {
    api: 'gql',
    actions: ['create', 'findById', 'findBy', 'update', 'deleteById'],
  },
  validation: (project: Project): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (project.startDate && project.endDate && project.endDate < project.startDate) {
      issues.push({
        constraint: 'invalidDateRange',
        message: 'End date must be after start date.',
      });
    }
    if (project.status === ProjectStatus.Completed && project.completionPercentage !== 100) {
      issues.push({
        constraint: 'incompleteProject',
        message: 'Completion percentage must be 100% for completed projects.',
      });
    }
    return issues;
  },
})
export class Project extends BaseDataModel {
  @UuidField({ primaryKey: true, generated: true, required: true })
  id!: string;

  @TextField({
    calculation: 'automatic',
  })
  get summary(): string {
    return `${this.name} (${this.status})`;
  }

  @TextField({
    required: true,
    minLength: 3,
    maxLength: 100,
    docs: 'Project name',
  })
  name!: string;

  @ChoiceField({
    required: true,
    type: () => ProjectStatus,
  })
  status: ProjectStatus = ProjectStatus.Planning;

  @ChoiceField({
    type: () => ProjectPriority,
    required: true,
    query: { sorting: false },
  })
  priority: ProjectPriority = ProjectPriority.Medium;

  @DateField()
  startDate!: string | null;

  @DateField()
  endDate!: string | null;

  @HtmlField({
    maxLength: 5000,
  })
  description!: string | null;

  @MoneyField({
    decimals: 2,
    roundingType: 'roundHalfToEven',
    min: '0',
    positive: true,
  })
  budget!: Money | null;

  @IntegerField({ min: 0, max: 100 })
  completionPercentage!: number | null;
}
```
