import type { TrackerConfig, CollectorType, TrackerPublicAPI } from "../types";

/**
 * Navigation ref type compatible with React Navigation's NavigationContainerRef.
 * We use a minimal interface to avoid requiring @react-navigation/native as a
 * direct dependency at the type level.
 */
export interface NavigationRef {
  getCurrentRoute(): { name: string; params?: Record<string, unknown> } | undefined;
  addListener(event: string, callback: (...args: unknown[]) => void): () => void;
  isReady(): boolean;
}

/**
 * Expo-specific collector types.
 */
export type ExpoCollectorType = Extract<
  CollectorType,
  "screenViews" | "touch" | "lifecycle"
>;

/**
 * Configuration for the Expo tracker.
 * Extends the base TrackerConfig with mobile-specific options.
 */
export interface ExpoTrackerConfig extends Omit<TrackerConfig, "collectors" | "platform"> {
  /** Which automatic collectors to enable. Defaults to ['screenViews', 'lifecycle'] */
  collectors?: ExpoCollectorType[];
  /** React Navigation ref for automatic screen view tracking */
  navigationRef?: NavigationRef;
  /** Request geolocation permission and track location. Defaults to false. */
  geolocation?: boolean;
}

/**
 * Extended public API for the Expo tracker with mobile-specific methods.
 */
export interface ExpoTrackerPublicAPI extends TrackerPublicAPI {
  /** Manually track a screen view (useful if not using automatic screen tracking) */
  trackScreenView: (
    screenName: string,
    properties?: Record<string, unknown>,
    userId?: string,
  ) => void;
}
