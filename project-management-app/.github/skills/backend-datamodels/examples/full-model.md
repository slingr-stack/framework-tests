# Full model example: Advanced `@DataModel` metadata

> Part of the [backend-datamodels](../SKILL.md) skill.

Demonstrates: `dataSource`, `crud`, `ui`, `validation`, all major field types, `choiceLabel`/`choiceDropdown`, `htmlBlock`/`htmlEditor`, `moneyInput`/`moneyLabel`, calculated fields.

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
  choiceDropdown,
  choiceLabel,
  htmlBlock,
  htmlEditor,
  moneyInput,
  moneyLabel,
  textInput,
  textLabel,
  type ValidationIssue,
} from '@drumr/framework-backend';
import { MainDs } from '../dataSources/mainDs';

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
  ui: {
    crud: {
      api: 'gql',
      actions: ['crud', 'refresh'],
    },
    labelField: 'name',
    defaultCreateView: 'ProjectCreateView',
    defaultEditView: 'ProjectEditView',
    defaultReadView: 'ProjectReadView',
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
    ui: [{ context: 'all', component: textLabel() }],
  })
  get summary(): string {
    return `${this.name} (${this.status})`;
  }

  @TextField({
    required: true,
    minLength: 3,
    maxLength: 100,
    docs: 'Project name',
    ui: [
      { context: 'read', component: textLabel() },
      { context: 'write', component: textInput({ placeholder: 'Enter project name' }) },
    ],
  })
  name!: string;

  @ChoiceField({
    required: true,
    type: () => ProjectStatus,
    ui: [
      {
        context: 'read',
        component: choiceLabel({
          valueMetadata: {
            [ProjectStatus.Planning]: { label: 'Planning', color: 'default' },
            [ProjectStatus.Active]: { label: 'Active', color: 'processing' },
            [ProjectStatus.Completed]: { label: 'Completed', color: 'success' },
            [ProjectStatus.Cancelled]: { label: 'Cancelled', color: 'error' },
          },
        }),
      },
      {
        context: 'write',
        component: choiceDropdown({
          placeholder: 'Select status',
          valueMetadata: {
            [ProjectStatus.Planning]: { label: 'Planning', color: 'default' },
            [ProjectStatus.Active]: { label: 'Active', color: 'processing' },
            [ProjectStatus.Completed]: { label: 'Completed', color: 'success' },
            [ProjectStatus.Cancelled]: { label: 'Cancelled', color: 'error' },
          },
        }),
      },
    ],
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
    ui: [
      { context: 'read', component: htmlBlock({ previewCharacters: 200 }) },
      { context: 'write', component: htmlEditor({ height: '300px' }) },
    ],
  })
  description!: string | null;

  @MoneyField({
    decimals: 2,
    roundingType: 'roundHalfToEven',
    min: '0',
    positive: true,
    ui: [
      { context: 'read', component: moneyLabel({ symbol: '$', numberOfDecimals: 2 }) },
      { context: 'write', component: moneyInput({ symbol: '$', numberOfDecimals: 2 }) },
    ],
  })
  budget!: Money | null;

  @IntegerField({ min: 0, max: 100 })
  completionPercentage!: number | null;
}
```
