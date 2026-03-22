import type { TrackerConfig, TrackEvent, TrackerPublicAPI } from "./types";
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
    constructor(config: TrackerConfig);
    private setupConsentListener;
    track(name: string, properties?: Record<string, unknown>, userId?: string): void;
    trackEvent(event: TrackEvent, userId?: string): void;
    start(): void;
    private requestGeolocation;
    stop(): void;
    isTracking(): boolean;
    flush(): Promise<void>;
    private initializeCollectors;
    private startFlushTimer;
    private stopFlushTimer;
    private setupUnloadHandler;
}
export declare function createTracker(config: TrackerConfig): TrackerPublicAPI;
//# sourceMappingURL=tracker.d.ts.map