import {
  DataModel,
  BaseDataModel,
  DecimalField,
  TextField,
} from '@drumr/framework-backend';

@DataModel({
  docs: 'Budget associated with a project.',
  labelField: 'currency',
  ui: {
    crud: {
      api: 'gql',
    },
  },
})
export class Budget extends BaseDataModel {
  @DecimalField({
    docs: 'Total budgeted amount.',
    required: true,
    ui: {
      label: 'Total Amount',
    },
  })
  totalAmount!: number;

  @TextField({
    docs: 'ISO 4217 currency code.',
    required: true,
    maxLength: 3,
    defaultValue: 'USD',
    ui: {
      label: 'Currency',
    },
  })
  currency!: string;

  @TextField({
    docs: 'Optional budget notes.',
    required: false,
    maxLength: 500,
    ui: {
      label: 'Notes',
    },
  })
  notes?: string;
}
