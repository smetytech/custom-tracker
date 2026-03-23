/**
 * Screen view collector for React Navigation / Expo Router.
 *
 * Automatically tracks screen changes by listening to navigation state events
 * on a NavigationContainerRef. Works with both React Navigation directly
 * and Expo Router (which wraps React Navigation).
 */
import type { Collector, TrackerPublicAPI } from "../../types";
import type { NavigationRef } from "../types";
export interface ScreenViewCollectorOptions {
    /** React Navigation container ref. Required for automatic tracking. */
    navigationRef: NavigationRef;
    /** Track the initial screen when the collector starts. Defaults to true. */
    trackInitialScreen?: boolean;
    /** How often (ms) to poll for navigation readiness if not ready on start. Defaults to 100. */
    readyPollInterval?: number;
}
export declare class ScreenViewCollector implements Collector {
    name: "screenViews";
    private tracker;
    private navigationRef;
    private trackInitialScreen;
    private readyPollInterval;
    private unsubscribe;
    private readyPoller;
    private previousRouteName;
    constructor(options: ScreenViewCollectorOptions);
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
    private attachListener;
    private clearReadyPoller;
    private trackCurrentScreen;
}
export declare function createScreenViewCollector(options: ScreenViewCollectorOptions): ScreenViewCollector;
//# sourceMappingURL=screen-views.d.ts.map