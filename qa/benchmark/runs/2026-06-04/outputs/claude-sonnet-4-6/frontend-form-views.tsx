import { CreateView, CreateViewComponent } from '@drumr/framework-frontend';
import type { FormViewLayout, FormViewRefreshMode } from '@drumr/framework-frontend';
import type { Budget } from '@gql/types';
import FormLayout from '../../../layouts/FormLayout';

@CreateView({ model: 'Budget', path: '/budgets/new' })
export default class BudgetCreateView extends CreateViewComponent<Budget> {
  override layout = FormLayout;
  override formLayout?: FormViewLayout = 'oneColumn';
  override refreshMode?: FormViewRefreshMode = 'auto';
  override header = { breadcrumb: ['Budgets', 'New Budget'] };
}
