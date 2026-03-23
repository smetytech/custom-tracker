/**
 * App lifecycle collector for React Native.
 *
 * Tracks app state transitions using React Native's AppState API:
 * - app_launch: Emitted once when the collector starts
 * - app_foreground: When the app comes to the foreground (from background)
 * - app_background: When the app goes to the background
 */
import type { Collector, TrackerPublicAPI } from "../../types";
export declare class LifecycleCollector implements Collector {
    name: "lifecycle";
    private tracker;
    private subscription;
    private lastState;
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
    private handleAppStateChange;
    private trackLifecycleEvent;
}
export declare function createLifecycleCollector(): LifecycleCollector;
//# sourceMappingURL=lifecycle.d.ts.map