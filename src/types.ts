export interface ConsentConfig {
  canTrack: () => boolean | Promise<boolean>;
  onUpdate?: (callback: (granted: boolean) => void) => void;
}

export type CollectorType = "pageViews" | "clicks" | "context";

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

export interface TrackEvent {
  type: "page_view" | "click" | "custom";
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  context?: BrowserContext;
}

export interface TrackerConfig {
  endpoint: string;
  consent?: ConsentConfig;
  collectors?: CollectorType[];
  batchSize?: number;
  flushInterval?: number;
  geolocation?: boolean;
  onBeforeSend?: (event: TrackEvent) => TrackEvent | null;
  onError?: (error: Error, event: TrackEvent) => void;
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
  track: (
    name: string,
    properties?: Record<string, unknown>,
    userId?: string,
  ) => void;
  trackEvent: (event: TrackEvent, userId?: string) => void;
  start: () => void;
  stop: () => void;
  isTracking: () => boolean;
  flush: () => Promise<void>;
};
