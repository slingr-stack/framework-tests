import { AppRegistry } from '@drumr/framework-frontend';
import enUS from 'antd/locale/en_US';
import { mainLayout } from './layouts/mainLayout';

export function registerAppDefaults(app: AppRegistry) {
  app.registerDefaults({
    appName: 'Tasky',
    appVersion: '1.0.0',
    defaultLayout: mainLayout,
    layoutSettings: {
      logo: '/logo.svg',
      navTheme: 'light',
      fixedHeader: false,
      fixSiderbar: true,
    },
    locale: enUS,
  });
}
