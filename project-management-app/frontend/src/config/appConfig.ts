import { AppRegistry } from '@drumr/framework-frontend';
import { setAccessRules } from './accessRules';
import { registerAppDefaults } from './appDefaults';
import {
  registerActionDefaults,
  registerLayouts,
  registerModelDefaults,
} from './index';
import { registerProviders } from './providers/appProviders';
import { registerRoutes } from './routing';

export function configureApp(app: AppRegistry) {
  registerAppDefaults(app);
  registerLayouts(app);
  registerRoutes(app);
  registerModelDefaults(app);
  registerActionDefaults(app);
  registerProviders(app);
  setAccessRules();
}
