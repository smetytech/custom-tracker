export { Tracker, createTracker } from "./tracker";
export type { TrackerConfig, TrackerPublicAPI, TrackEvent, BrowserContext, ConsentConfig, CollectorType, Collector, Transport, } from "./types";
export { createHttpTransport } from "./transports/http";
export { createClickCollector } from "./collectors/clicks";
export { createPageViewCollector } from "./collectors/page-views";
export { getBrowserContext, getBrowserContextWithGeo, getGeolocation, } from "./collectors/context";
export { createConsentManager, defaultConsentManager } from "./consent";
//# sourceMappingURL=index.d.ts.map