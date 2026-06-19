/**
 * Reactive store for the currently viewed user.
 *
 * `UserReadView` calls `setViewedUserId(id)` on mount and
 * `setViewedUserId(undefined)` on unmount. Consumers use
 * `useViewedUserId()` to reactively read the value.
 */
import { useEffect, useState } from 'react';

type Listener = () => void;

let currentViewedUserId: string | undefined;
const listeners = new Set<Listener>();

export function setViewedUserId(id: string | undefined): void {
  currentViewedUserId = id;
  listeners.forEach((fn) => {
    fn();
  });
}

export function getViewedUserId(): string | undefined {
  return currentViewedUserId;
}

export function useViewedUserId(): string | undefined {
  const [value, setValue] = useState(() => currentViewedUserId);

  useEffect(() => {
    // Sync in case the value changed between the initial render and this effect.
    setValue(currentViewedUserId);
    const listener = () => setValue(currentViewedUserId);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return value;
}
