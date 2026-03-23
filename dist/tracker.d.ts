import type { TrackerConfig, TrackEvent, Collector, TrackerPublicAPI } from "./types";
export declare class Tracker implements TrackerPublicAPI {
    private config;
    private transport;
    private consentManager;
    private eventQueue;
    private collectors;
    private isRunning;
    private flushTimer;
    private contextCached;
    private sessionId;
    private platformAdapter;
    private externalCollectors;
    private backgroundCleanup;
    constructor(config: TrackerConfig, externalCollectors?: Collector[]);
    private setupConsentListener;
    track(name: string, properties?: Record<string, unknown>, userId?: string): void;
    trackEvent(event: TrackEvent, userId?: string): void;
    start(): void;
    /**
     * Called after session ID is resolved. Initializes context, collectors,
     * flush timer, and background handler.
     */
    private postSessionInit;
    private requestGeolocation;
    stop(): void;
    isTracking(): boolean;
    flush(): Promise<void>;
    private initializeCollectors;
    private startFlushTimer;
    private stopFlushTimer;
    private setupBackgroundHandler;
}
//# sourceMappingURL=tracker.d.ts.map