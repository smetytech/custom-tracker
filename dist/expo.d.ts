/**
 * Expo / React Native entry point for @smety/tracker.
 *
 * Usage in an Expo app:
 *
 * ```typescript
 * import { createExpoTracker } from '@smety/tracker/expo';
 * import { navigationRef } from './navigation';
 *
 * const tracker = createExpoTracker({
 *   apiKey: 'your-key',
 *   endpoint: 'https://your-api.com/analytics',
 *   collectors: ['screenViews', 'lifecycle', 'touch'],
 *   navigationRef,
 *   geolocation: true,
 * });
 *
 * tracker.start();
 *
 * // Manual tracking
 * tracker.track('purchase', { productId: '123', price: 29.99 }, 'user-456');
 * ```
 */
import type { ExpoTrackerConfig, ExpoTrackerPublicAPI } from "./expo/types";
/**
 * Create an analytics tracker for Expo / React Native apps.
 *
 * This is the mobile equivalent of `createTracker` from `@smety/tracker`.
 * It automatically sets up mobile-specific context collection, session
 * management (AsyncStorage), and mobile collectors (screen views, touch,
 * app lifecycle).
 */
export declare function createExpoTracker(config: ExpoTrackerConfig): ExpoTrackerPublicAPI;
export { Tracker } from "./tracker";
export { isMobileContext, isBrowserContext } from "./types";
export type { TrackerConfig, TrackerPublicAPI, TrackEvent, MobileContext, BrowserContext, TrackingContext, ConsentConfig, CollectorType, Collector, Transport, PlatformAdapter, } from "./types";
export type { ExpoTrackerConfig, ExpoTrackerPublicAPI, ExpoCollectorType, NavigationRef, } from "./expo/types";
export { createHttpTransport } from "./transports/http";
export { createConsentManager, defaultConsentManager } from "./consent";
export { createScreenViewCollector } from "./expo/collectors/screen-views";
export type { ScreenViewCollectorOptions } from "./expo/collectors/screen-views";
export { createTouchCollector, trackPress, useTrackPress, TrackablePressable, createTrackablePressable, } from "./expo/collectors/touch";
export type { TrackablePressableProps } from "./expo/collectors/touch";
export { createLifecycleCollector } from "./expo/collectors/lifecycle";
export { getMobileContext, getMobileContextWithGeo, getMobileGeolocation, resetMobileContextCache, } from "./expo/collectors/context";
export { getMobileSessionId, clearMobileSessionId } from "./expo/storage";
export { TrackerProvider, useTracker, useTrackerOptional, } from "./expo/provider";
export type { TrackerProviderProps } from "./expo/provider";
//# sourceMappingURL=expo.d.ts.map