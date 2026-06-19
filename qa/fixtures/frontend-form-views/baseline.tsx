import type { Budget } from '@gql';
import {
  CreateView,
  CreateViewComponent,
  type FormViewLayout,
  type FormViewRefreshMode,
} from '@drumr/framework-frontend';
import FormLayout from '../../../layouts/FormLayout';

@CreateView({
  model: 'Budget',
  path: '/budgets/new',
})
export default class BudgetCreateView extends CreateViewComponent<Budget> {
  override header = {
    breadcrumb: ['Budgets', 'New Budget'],
  };
  override layout = FormLayout;
  override formLayout?: FormViewLayout = 'oneColumn';
  override refreshMode?: FormViewRefreshMode = 'auto';
}
