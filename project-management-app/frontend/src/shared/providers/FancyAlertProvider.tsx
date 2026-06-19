import { notification } from 'antd';
import React, { createContext, useContext } from 'react';

type FancyAlertContextValue = {
  showAlert: (message: string) => void;
};

const FancyAlertContext = createContext<FancyAlertContextValue | null>(null);

/**
 * Provides a fancy notification alert capability to the component tree.
 *
 * Wrap your app (or a subtree) with this provider and call `useFancyAlert`
 * to display an Ant Design notification from any descendant.
 *
 * @example
 * ```tsx
 * // In app.tsx providers:
 * providers: ({ children }) => (
 *   <FancyAlertProvider>{children}</FancyAlertProvider>
 * )
 *
 * // In a component:
 * const showAlert = useFancyAlert();
 * showAlert('Task created successfully!');
 * ```
 */
export function FancyAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [api, contextHolder] = notification.useNotification();

  const showAlert = React.useCallback(
    (message: string) => {
      api.info({
        message,
        placement: 'topRight',
      });
    },
    [api],
  );

  return (
    <FancyAlertContext.Provider value={{ showAlert }}>
      {contextHolder}
      {children}
    </FancyAlertContext.Provider>
  );
}

/**
 * Returns a `showAlert(message)` function that displays a fancy notification.
 *
 * Must be called inside a component tree wrapped by `FancyAlertProvider`.
 *
 * @example
 * ```tsx
 * const showAlert = useFancyAlert();
 * <Button onClick={() => showAlert('Hello world!')}>Notify</Button>
 * ```
 */
export function useFancyAlert(): (message: string) => void {
  const ctx = useContext(FancyAlertContext);
  if (!ctx) {
    throw new Error('useFancyAlert must be used within a FancyAlertProvider');
  }
  return ctx.showAlert;
}
