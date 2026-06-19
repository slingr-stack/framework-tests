// Custom field components must be registered before data model defaults compile.
import '../tasks/components/TaskPriorityBadge';
import '../tasks/config/actions';
import '../projects/config/actions';
import '../global/config/actions';
import '../users/config/dataModels';
import '../tasks/config/dataModels';
import '../projects/config/dataModels';
import '../books/config/dataModels';
import '../support/config/dataModels';
import '../global/config/dataModels';
import './layouts/formLayout';
import './layouts/mainLayout';
import './layouts/viewLayout';

import { AppRegistry } from '@drumr/framework-frontend';
import { registerUserActions } from '../users/config/actions';

export function registerActionDefaults(app: AppRegistry) {
  registerUserActions(app);
  // Others are registered when the modules are imported above.
}

export function registerModelDefaults(_app: AppRegistry) {
  // Defaults are registered when the modules are imported above.
}

export function registerLayouts(_app: AppRegistry) {
  // Defaults are registered when the modules are imported above.
}
