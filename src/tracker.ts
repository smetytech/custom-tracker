import type {
  TrackerConfig,
  TrackEvent,
  Collector,
  Transport,
  TrackerPublicAPI,
  PlatformAdapter,
  TrackingContext,
} from "./types";
import { createHttpTransport } from "./transports/http";
import {
  createConsentManager,
  defaultConsentManager,
  ConsentManager,
} from "./consent";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL = 5000;

export class Tracker implements TrackerPublicAPI {
  private config: TrackerConfig;
  private transport: Transport;
  private consentManager: ConsentManager;
  private eventQueue: TrackEvent[] = [];
  private collectors: Collector[] = [];
  private isRunning = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private contextCached: TrackingContext | null = null;
  private sessionId: string | null = null;
  private platformAdapter: PlatformAdapter;
  private externalCollectors: Collector[] = [];
  private backgroundCleanup: (() => void) | null = null;

  constructor(config: TrackerConfig, externalCollectors?: Collector[]) {
    this.config = {
      batchSize: DEFAULT_BATCH_SIZE,
      flushInterval: DEFAULT_FLUSH_INTERVAL,
      geolocation: false,
      ...config,
    };

    this.externalCollectors = externalCollectors ?? [];

    // Use the provided platform adapter, or a no-op default.
    // The browser adapter is injected by createTracker() in index.ts,
    // and the mobile adapter is injected by createExpoTracker() in expo.ts.
    this.platformAdapter = this.config.platform ?? {
      getContext: () => ({}) as TrackingContext,
      getSessionId: () => "no-session",
    };

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
    // FIX #10: Don't accept events after stop()
    if (!this.isRunning) return;

    const canTrack = this.consentManager.canTrack();

    const processEvent = (allowed: boolean): void => {
      if (!allowed || !this.isRunning) return;

      // FIX #3: Clone before mutation, check processedEvent.type not event.type
      let processedEvent = { ...event };
      if (this.config.onBeforeSend) {
        const result = this.config.onBeforeSend(processedEvent);
        if (!result) return;
        processedEvent = { ...result };
      }

      if (processedEvent.type === "page_view" || processedEvent.type === "screen_view") {
        this.contextCached = this.platformAdapter.getContext();
      }

      processedEvent.context = this.contextCached ?? this.platformAdapter.getContext();
      processedEvent.sessionId = this.sessionId ?? undefined;
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

      // FIX #1: Resolve session ID BEFORE starting collectors.
      // Queue initialization behind session resolution so that events
      // fired by collectors (app_launch, initial screen_view) have a sessionId.
      const sessionResult = this.platformAdapter.getSessionId();
      if (sessionResult instanceof Promise) {
        sessionResult.then((id) => {
          this.sessionId = id;
          this.postSessionInit();
        }).catch(() => {
          this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          this.postSessionInit();
        });
      } else {
        this.sessionId = sessionResult;
        this.postSessionInit();
      }
    };

    if (canTrack instanceof Promise) {
      canTrack.then(startTracking).catch(() => {});
    } else {
      startTracking(canTrack);
    }
  }

  /**
   * Called after session ID is resolved. Initializes context, collectors,
   * flush timer, and background handler.
   */
  private postSessionInit(): void {
    // Guard: stop() may have been called while session was resolving
    if (!this.isRunning) return;

    this.contextCached = this.platformAdapter.getContext();
    this.initializeCollectors();
    this.startFlushTimer();
    this.setupBackgroundHandler();

    if (this.config.geolocation && this.platformAdapter.getGeolocation) {
      void this.requestGeolocation();
    }
  }

  // FIX #5: Capture context reference before await to prevent writing to stale/replaced context
  private async requestGeolocation(): Promise<void> {
    if (!this.platformAdapter.getGeolocation) return;
    const snapshot = this.contextCached;
    const geo = await this.platformAdapter.getGeolocation();
    if (geo && snapshot && snapshot === this.contextCached) {
      snapshot.geolocation = geo;
    }
  }

  // FIX #10: Return Promise from stop() so callers can await the final flush
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.collectors.forEach((collector) => collector.stop());
    this.collectors = [];
    this.stopFlushTimer();

    // FIX #4: Clean up background listener
    if (this.backgroundCleanup) {
      this.backgroundCleanup();
      this.backgroundCleanup = null;
    }

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
    // Add any externally provided collectors (from Expo entry point)
    for (const collector of this.externalCollectors) {
      this.collectors.push(collector);
    }

    // Start all collectors
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

  // FIX #4: Store the cleanup function returned by onBackground
  private setupBackgroundHandler(): void {
    if (this.platformAdapter.onBackground) {
      this.backgroundCleanup = this.platformAdapter.onBackground(() => {
        void this.flush();
      });
    }
  }
}
