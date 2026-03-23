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

import { Tracker } from "./tracker";
import type {
  PlatformAdapter,
  Collector,
  MobileContext,
  TrackingContext,
} from "./types";
import type { ExpoTrackerConfig, ExpoTrackerPublicAPI } from "./expo/types";
import { getMobileContext, getMobileGeolocation } from "./expo/collectors/context";
import { getMobileSessionId } from "./expo/storage";
import { createScreenViewCollector } from "./expo/collectors/screen-views";
import { createTouchCollector } from "./expo/collectors/touch";
import { createLifecycleCollector } from "./expo/collectors/lifecycle";

// ─── Mobile Platform Adapter ────────────────────────────────────────────────

/**
 * Detect the current platform using React Native's Platform API.
 */
function detectPlatform(): "ios" | "android" {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require("react-native") as { Platform: { OS: string } };
    return Platform.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}

/**
 * FIX #2 + #9: The cached context is scoped per-adapter instance (inside the closure),
 * not at the module level, so multiple tracker instances don't collide.
 * The context is loaded eagerly and the promise is exposed so start() can await it.
 */
function createMobilePlatformAdapter(): {
  adapter: PlatformAdapter;
  contextReady: Promise<void>;
} {
  let cachedContext: MobileContext | null = null;
  const detectedPlatform = detectPlatform();

  // FIX #9: Eagerly load context, but expose the promise so start() can await it
  const contextReady = getMobileContext().then((ctx) => {
    cachedContext = ctx;
  }).catch(() => {
    // If context loading fails, we'll use the fallback
  });

  const adapter: PlatformAdapter = {
    getContext: (): TrackingContext => {
      if (cachedContext) {
        return cachedContext;
      }

      // Minimal fallback while async context is loading
      return {
        platform: detectedPlatform,
        deviceName: null,
        deviceBrand: null,
        deviceModel: null,
        osName: null,
        osVersion: null,
        appVersion: null,
        buildNumber: null,
        locale: "en",
        locales: ["en"],
        timeZone: "unknown",
        isDevice: true,
        screen: { width: 0, height: 0, pixelRatio: 1, fontScale: 1 },
        geolocation: null,
      } satisfies MobileContext;
    },
    getSessionId: getMobileSessionId,
    getGeolocation: getMobileGeolocation,
    onBackground: (callback) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AppState } = require("react-native") as {
          AppState: {
            addEventListener: (
              event: string,
              handler: (state: string) => void,
            ) => { remove: () => void };
          };
        };

        const subscription = AppState.addEventListener("change", (state: string) => {
          if (state === "background") {
            callback();
          }
        });

        return () => subscription.remove();
      } catch {
        return () => {};
      }
    },
  };

  return { adapter, contextReady };
}

// ─── Collector Setup ────────────────────────────────────────────────────────

function createMobileCollectors(config: ExpoTrackerConfig): Collector[] {
  const collectorTypes = config.collectors ?? ["screenViews", "lifecycle"];
  const collectors: Collector[] = [];

  if (collectorTypes.includes("screenViews") && config.navigationRef) {
    collectors.push(
      createScreenViewCollector({ navigationRef: config.navigationRef }),
    );
  }

  if (collectorTypes.includes("touch")) {
    collectors.push(createTouchCollector());
  }

  if (collectorTypes.includes("lifecycle")) {
    collectors.push(createLifecycleCollector());
  }

  return collectors;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create an analytics tracker for Expo / React Native apps.
 *
 * This is the mobile equivalent of `createTracker` from `@smety/tracker`.
 * It automatically sets up mobile-specific context collection, session
 * management (AsyncStorage), and mobile collectors (screen views, touch,
 * app lifecycle).
 */
export function createExpoTracker(config: ExpoTrackerConfig): ExpoTrackerPublicAPI {
  const { adapter } = createMobilePlatformAdapter();

  const collectors = createMobileCollectors(config);

  const tracker = new Tracker(
    {
      ...config,
      collectors: [], // We handle collectors externally
      platform: adapter,
    },
    collectors,
  );

  // Extend with mobile-specific methods
  const expoTracker: ExpoTrackerPublicAPI = {
    track: tracker.track.bind(tracker),
    trackEvent: tracker.trackEvent.bind(tracker),
    start: tracker.start.bind(tracker),
    stop: tracker.stop.bind(tracker),
    isTracking: tracker.isTracking.bind(tracker),
    flush: tracker.flush.bind(tracker),
    trackScreenView: (
      screenName: string,
      properties: Record<string, unknown> = {},
      userId?: string,
    ) => {
      tracker.trackEvent(
        {
          type: "screen_view",
          name: screenName,
          properties: {
            screen: screenName,
            ...properties,
          },
          timestamp: new Date().toISOString(),
        },
        userId,
      );
    },
  };

  return expoTracker;
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

// Core
export { Tracker } from "./tracker";
export { isMobileContext, isBrowserContext } from "./types";
export type {
  TrackerConfig,
  TrackerPublicAPI,
  TrackEvent,
  MobileContext,
  BrowserContext,
  TrackingContext,
  ConsentConfig,
  CollectorType,
  Collector,
  Transport,
  PlatformAdapter,
} from "./types";

// Expo types
export type {
  ExpoTrackerConfig,
  ExpoTrackerPublicAPI,
  ExpoCollectorType,
  NavigationRef,
} from "./expo/types";

// Transport
export { createHttpTransport } from "./transports/http";

// Consent
export { createConsentManager, defaultConsentManager } from "./consent";

// Mobile collectors
export { createScreenViewCollector } from "./expo/collectors/screen-views";
export type { ScreenViewCollectorOptions } from "./expo/collectors/screen-views";

export {
  createTouchCollector,
  trackPress,
  useTrackPress,
  TrackablePressable,
  createTrackablePressable,
} from "./expo/collectors/touch";
export type { TrackablePressableProps } from "./expo/collectors/touch";

export { createLifecycleCollector } from "./expo/collectors/lifecycle";

// Mobile context
export {
  getMobileContext,
  getMobileContextWithGeo,
  getMobileGeolocation,
  resetMobileContextCache,
} from "./expo/collectors/context";

// Mobile storage
export { getMobileSessionId, clearMobileSessionId } from "./expo/storage";

// React Context provider
export {
  TrackerProvider,
  useTracker,
  useTrackerOptional,
} from "./expo/provider";
export type { TrackerProviderProps } from "./expo/provider";
