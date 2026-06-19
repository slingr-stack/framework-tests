import { AppRegistry } from '@drumr/framework-frontend';
import HoldLockManualView from '@/users/views/actions/HoldLockManualView';
import HoldLockWithLockView from '@/users/views/actions/HoldLockWithLockView';
import HoldLockWithTryLockView from '@/users/views/actions/HoldLockWithTryLockView';
import TryLockManualView from '@/users/views/actions/TryLockManualView';

export function registerUserActions(app: AppRegistry) {
  app.registerAction({
    action: 'HoldLockManual',
    label: 'Hold lock (manual lock)',
    view: HoldLockManualView,
  });

  app.registerAction({
    action: 'HoldLockWithLock',
    label: 'Hold lock (withLock)',
    view: HoldLockWithLockView,
  });

  app.registerAction({
    action: 'HoldLockWithTryLock',
    label: 'Hold lock (withTryLock)',
    view: HoldLockWithTryLockView,
  });

  app.registerAction({
    action: 'TryLockManual',
    label: 'Hold lock (manual tryLock)',
    view: TryLockManualView,
  });
}
