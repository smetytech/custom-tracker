import type {
  TrackerConfig,
  TrackEvent,
  Collector,
  Transport,
  TrackerPublicAPI,
} from "./types";
import { createHttpTransport } from "./transports/http";
import {
  createConsentManager,
  defaultConsentManager,
  ConsentManager,
} from "./consent";
import { createClickCollector } from "./collectors/clicks";
import { createPageViewCollector } from "./collectors/page-views";
import { getBrowserContext, getGeolocation } from "./collectors/context";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL = 5000;
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

function getSessionId(): string {
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

export class Tracker implements TrackerPublicAPI {
  private config: TrackerConfig;
  private transport: Transport;
  private consentManager: ConsentManager;
  private eventQueue: TrackEvent[] = [];
  private collectors: Collector[] = [];
  private isRunning = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private contextCached: ReturnType<typeof getBrowserContext> | null = null;
  private sessionId: string;

  constructor(config: TrackerConfig) {
    this.config = {
      batchSize: DEFAULT_BATCH_SIZE,
      flushInterval: DEFAULT_FLUSH_INTERVAL,
      geolocation: false,
      ...config,
    };

    this.sessionId = getSessionId();

    this.transport = createHttpTransport({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      useBeacon: false,
    });

    this.consentManager = this.config.consent
      ? createConsentManager(this.config.consent)
      : defaultConsentManager;

    this.setupConsentListener();
  }

  private setupConsentListener(): void {
    this.consentManager.onUpdate((granted) => {
      if (granted && !this.isRunning) {
        this.start();
      } else if (!granted && this.isRunning) {
        this.stop();
      }
    });
  }

  track(
    name: string,
    properties: Record<string, unknown> = {},
    userId?: string,
  ): void {
    this.trackEvent(
      {
        type: "custom",
        name,
        properties,
        timestamp: new Date().toISOString(),
      },
      userId,
    );
  }

  trackEvent(event: TrackEvent, userId?: string): void {
    const canTrack = this.consentManager.canTrack();

    const processEvent = (allowed: boolean): void => {
      if (!allowed) return;

      let processedEvent = event;
      if (this.config.onBeforeSend) {
        const result = this.config.onBeforeSend(event);
        if (!result) return;
        processedEvent = result;
      }

      if (event.type === "page_view") {
        this.contextCached = getBrowserContext();
      }

      processedEvent.context = this.contextCached ?? getBrowserContext();
      processedEvent.sessionId = this.sessionId;
      if (userId) {
        processedEvent.userId = userId;
      }

      this.eventQueue.push(processedEvent);

      if (
        this.eventQueue.length >= (this.config.batchSize ?? DEFAULT_BATCH_SIZE)
      ) {
        void this.flush();
      }
    };

    if (canTrack instanceof Promise) {
      canTrack.then(processEvent).catch(() => {});
    } else {
      processEvent(canTrack);
    }
  }

  start(): void {
    if (this.isRunning) return;

    const canTrack = this.consentManager.canTrack();

    const startTracking = (allowed: boolean): void => {
      if (!allowed) return;

      this.isRunning = true;
      this.contextCached = getBrowserContext();
      this.initializeCollectors();
      this.startFlushTimer();
      this.setupUnloadHandler();

      if (this.config.geolocation) {
        void this.requestGeolocation();
      }
    };

    if (canTrack instanceof Promise) {
      canTrack.then(startTracking).catch(() => {});
    } else {
      startTracking(canTrack);
    }
  }

  private async requestGeolocation(): Promise<void> {
    const geo = await getGeolocation();
    if (geo && this.contextCached) {
      this.contextCached.geolocation = geo;
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.collectors.forEach((collector) => collector.stop());
    this.collectors = [];
    this.stopFlushTimer();
    void this.flush();
  }

  isTracking(): boolean {
    return this.isRunning;
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.transport.send(events);
    } catch (error) {
      if (this.config.onError && events[0]) {
        this.config.onError(error as Error, events[0]);
      }
    }
  }

  private initializeCollectors(): void {
    const collectorTypes = this.config.collectors ?? ["pageViews", "clicks"];

    if (collectorTypes.includes("pageViews")) {
      this.collectors.push(createPageViewCollector());
    }

    if (collectorTypes.includes("clicks")) {
      this.collectors.push(createClickCollector());
    }

    this.collectors.forEach((collector) => collector.start(this));
  }

  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval ?? DEFAULT_FLUSH_INTERVAL);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private setupUnloadHandler(): void {
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void this.flush();
      }
    });
  }
}

export function createTracker(config: TrackerConfig): TrackerPublicAPI {
  return new Tracker(config);
}
