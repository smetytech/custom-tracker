import type { ConsentConfig } from '../types';

export interface ConsentManager {
  canTrack(): boolean | Promise<boolean>;
  onUpdate(callback: (granted: boolean) => void): void;
  clearCallbacks(): void;
}

export function createConsentManager(config?: ConsentConfig): ConsentManager {
  const callbacks: Set<(granted: boolean) => void> = new Set();

  // FIX #17: Register the config-level onUpdate listener exactly once,
  // during construction, instead of once per onUpdate() call.
  if (config?.onUpdate) {
    config.onUpdate((granted) => {
      callbacks.forEach((cb) => {
        try {
          cb(granted);
        } catch {
          // Silently ignore callback errors
        }
      });
    });
  }

  const canTrack = (): boolean | Promise<boolean> => {
    if (!config) {
      return true;
    }
    try {
      return config.canTrack();
    } catch {
      return false;
    }
  };

  const onUpdate = (callback: (granted: boolean) => void): void => {
    callbacks.add(callback);
  };

  const clearCallbacks = (): void => {
    callbacks.clear();
  };

  return {
    canTrack,
    onUpdate,
    clearCallbacks,
  };
}

export const defaultConsentManager: ConsentManager = {
  canTrack: () => true,
  onUpdate: () => {},
  clearCallbacks: () => {},
};
