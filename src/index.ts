import { Tracker } from "./tracker";
import type { TrackerConfig, TrackerPublicAPI, PlatformAdapter } from "./types";
import { getBrowserContext, getGeolocation } from "./collectors/context";
import { createClickCollector } from "./collectors/clicks";
import { createPageViewCollector } from "./collectors/page-views";

// ─── Browser Session Management ─────────────────────────────────────────────

const SESSION_STORAGE_KEY = "analytics_session_id";

function generateSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getBrowserSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    return generateSessionId();
  }

  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const newId = generateSessionId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

// ─── Browser Platform Adapter ───────────────────────────────────────────────

function createBrowserAdapter(): PlatformAdapter {
  return {
    getContext: getBrowserContext,
    getSessionId: getBrowserSessionId,
    getGeolocation,
    onBackground: (callback) => {
      const handler = () => {
        if (document.visibilityState === "hidden") {
          callback();
        }
      };
      window.addEventListener("visibilitychange", handler);
      return () => window.removeEventListener("visibilitychange", handler);
    },
  };
}

// ─── Browser Collector Setup ────────────────────────────────────────────────

function createBrowserCollectors(config: TrackerConfig) {
  const collectorTypes = config.collectors ?? ["pageViews", "clicks"];
  const collectors = [];

  if (collectorTypes.includes("pageViews")) {
    collectors.push(createPageViewCollector());
  }
  if (collectorTypes.includes("clicks")) {
    collectors.push(createClickCollector());
  }

  return collectors;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a browser analytics tracker.
 * This is the main entry point for web applications.
 *
 * For Expo/React Native apps, use `createExpoTracker` from `@smety/tracker/expo`.
 */
export function createTracker(config: TrackerConfig): TrackerPublicAPI {
  const browserConfig: TrackerConfig = {
    ...config,
    platform: config.platform ?? createBrowserAdapter(),
  };

  const collectors = createBrowserCollectors(config);
  return new Tracker(browserConfig, collectors);
}

// Re-export core
export { Tracker };
export { isMobileContext, isBrowserContext } from "./types";
export type {
  TrackerConfig,
  TrackerPublicAPI,
  TrackEvent,
  BrowserContext,
  MobileContext,
  TrackingContext,
  ConsentConfig,
  CollectorType,
  Collector,
  Transport,
  PlatformAdapter,
} from "./types";
export { createHttpTransport } from "./transports/http";
export { createClickCollector } from "./collectors/clicks";
export { createPageViewCollector } from "./collectors/page-views";
export {
  getBrowserContext,
  getBrowserContextWithGeo,
  getGeolocation,
} from "./collectors/context";
export { createConsentManager, defaultConsentManager } from "./consent";
