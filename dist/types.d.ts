export interface ConsentConfig {
    canTrack: () => boolean | Promise<boolean>;
    onUpdate?: (callback: (granted: boolean) => void) => void;
}
export type CollectorType = "pageViews" | "clicks" | "sections" | "screenViews" | "touch" | "lifecycle";
export interface BrowserContext {
    url: string;
    path: string;
    query: string | null;
    referrer: string | null;
    language: string;
    languages: readonly string[];
    timeZone: string;
    userAgent: string;
    platform: string;
    cookieEnabled: boolean;
    onLine: boolean;
    screen: {
        width: number;
        height: number;
        availWidth: number;
        availHeight: number;
        pixelRatio: number;
        colorDepth: number;
        orientation: string | null;
    };
    viewport: {
        width: number;
        height: number;
    };
    connection: {
        effectiveType: string;
        downlink: number | null;
        rtt: number | null;
        saveData: boolean | null;
    } | null;
    memory: {
        usedJSHeapSize: number | null;
        totalJSHeapSize: number | null;
        jsHeapSizeLimit: number | null;
    } | null;
    utm: {
        source: string | null;
        medium: string | null;
        campaign: string | null;
        term: string | null;
        content: string | null;
    };
    geolocation: {
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
    } | null;
}
export interface MobileContext {
    platform: "ios" | "android";
    deviceName: string | null;
    deviceBrand: string | null;
    deviceModel: string | null;
    osName: string | null;
    osVersion: string | null;
    appVersion: string | null;
    buildNumber: string | null;
    locale: string;
    locales: string[];
    timeZone: string;
    isDevice: boolean;
    screen: {
        width: number;
        height: number;
        pixelRatio: number;
        fontScale: number;
    };
    geolocation: {
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
    } | null;
}
export type TrackingContext = BrowserContext | MobileContext;
/**
 * Type guard to check if a TrackingContext is a MobileContext.
 * Useful on the server side when processing events from both web and mobile.
 *
 * Discriminates using the `platform` field: MobileContext.platform is always "ios" | "android",
 * while BrowserContext.platform is navigator.platform (e.g. "MacIntel", "Win32", "Linux x86_64").
 */
export declare function isMobileContext(ctx: TrackingContext): ctx is MobileContext;
/**
 * Type guard to check if a TrackingContext is a BrowserContext.
 */
export declare function isBrowserContext(ctx: TrackingContext): ctx is BrowserContext;
export interface TrackEvent {
    type: "page_view" | "click" | "custom" | "screen_view" | "section_view" | "app_lifecycle" | "touch";
    name: string;
    properties: Record<string, unknown>;
    timestamp: string;
    sessionId?: string;
    userId?: string;
    context?: TrackingContext;
}
/**
 * Platform adapter interface that abstracts away browser vs mobile differences.
 * The core Tracker class uses this to remain platform-agnostic.
 */
export interface PlatformAdapter {
    /** Collect the current platform context (BrowserContext or MobileContext) */
    getContext: () => TrackingContext;
    /** Get or create a persistent session ID */
    getSessionId: () => string | Promise<string>;
    /** Optional: get geolocation data */
    getGeolocation?: () => Promise<{
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
    } | null>;
    /** Optional: register a callback for when the app/page goes to background */
    onBackground?: (callback: () => void) => () => void;
}
export interface TrackerConfig {
    apiKey: string;
    endpoint: string;
    projectId?: string;
    consent?: ConsentConfig;
    collectors?: CollectorType[];
    batchSize?: number;
    flushInterval?: number;
    geolocation?: boolean;
    onBeforeSend?: (event: TrackEvent) => TrackEvent | null;
    onError?: (error: Error, event: TrackEvent) => void;
    /** Platform adapter - injected by createTracker (browser) or createExpoTracker (mobile) */
    platform?: PlatformAdapter;
}
export interface Collector {
    name: string;
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
}
export interface Transport {
    send(events: TrackEvent[]): Promise<void> | void;
}
export type TrackerPublicAPI = {
    track: (name: string, properties?: Record<string, unknown>, userId?: string) => void;
    trackEvent: (event: TrackEvent, userId?: string) => void;
    start: () => void;
    stop: () => void;
    isTracking: () => boolean;
    flush: () => Promise<void>;
};
//# sourceMappingURL=types.d.ts.map