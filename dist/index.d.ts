import { Tracker } from "./tracker";
import type { TrackerConfig, TrackerPublicAPI } from "./types";
/**
 * Create a browser analytics tracker.
 * This is the main entry point for web applications.
 *
 * For Expo/React Native apps, use `createExpoTracker` from `@smety/tracker/expo`.
 */
export declare function createTracker(config: TrackerConfig): TrackerPublicAPI;
export { Tracker };
export { isMobileContext, isBrowserContext } from "./types";
export type { TrackerConfig, TrackerPublicAPI, TrackEvent, BrowserContext, MobileContext, TrackingContext, ConsentConfig, CollectorType, Collector, Transport, PlatformAdapter, } from "./types";
export { createHttpTransport } from "./transports/http";
export { createClickCollector } from "./collectors/clicks";
export { createPageViewCollector } from "./collectors/page-views";
export { createSectionCollector } from "./collectors/sections";
export { getBrowserContext, getBrowserContextWithGeo, getGeolocation, } from "./collectors/context";
export { createConsentManager, defaultConsentManager } from "./consent";
//# sourceMappingURL=index.d.ts.map