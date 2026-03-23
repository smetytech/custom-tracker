/**
 * Touch/press tracking for React Native.
 *
 * Provides three approaches:
 * 1. TrackablePressable - a drop-in Pressable that auto-tracks presses
 * 2. useTrackPress - a React hook that wraps any onPress handler with tracking
 * 3. trackPress() - imperative function for manual tracking
 *
 * These are the mobile equivalents of the web click collector with data-track-* attributes.
 */
import type { TrackerPublicAPI } from "../../types";
import type { Collector } from "../../types";
/**
 * Touch collector that registers the active tracker reference.
 * The TrackablePressable component and useTrackPress hook use this reference.
 */
export declare class TouchCollector implements Collector {
    name: "touch";
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
}
export declare function createTouchCollector(): TouchCollector;
/**
 * Get the currently active tracker for touch events.
 * Returns null if no tracker is running with touch collector enabled.
 */
export declare function getActiveTracker(): TrackerPublicAPI | null;
/**
 * Track a touch/press event programmatically.
 * Can be called directly without the hook or component.
 */
export declare function trackPress(eventName: string, properties?: Record<string, unknown>, userId?: string): void;
/**
 * React hook that wraps an onPress callback with automatic tracking.
 * Uses React.useCallback internally for stable references.
 *
 * @example
 * ```tsx
 * import { useTrackPress } from '@smety/tracker/expo';
 *
 * function MyButton() {
 *   const onPress = useTrackPress('button_pressed', { screen: 'Home' }, () => {
 *     // your actual onPress logic
 *   });
 *
 *   return <Pressable onPress={onPress}><Text>Tap me</Text></Pressable>;
 * }
 * ```
 */
export declare function useTrackPress(eventName: string, properties?: Record<string, unknown>, onPress?: () => void, userId?: string): () => void;
/**
 * Props for the TrackablePressable component.
 */
export interface TrackablePressableProps {
    /** The event name to track when pressed */
    trackEvent: string;
    /** Additional properties to attach to the tracking event */
    trackProperties?: Record<string, unknown>;
    /** User ID to associate with this event */
    trackUserId?: string;
    /** Called when the press is detected (after tracking) */
    onPress?: () => void;
    /** React children */
    children?: React.ReactNode;
    /** Any other props are passed through to the underlying Pressable */
    [key: string]: unknown;
}
declare function TrackablePressableImpl(props: TrackablePressableProps): React.ReactElement | null;
declare namespace TrackablePressableImpl {
    var displayName: string;
}
export declare const TrackablePressable: typeof TrackablePressableImpl;
export declare function createTrackablePressable(): typeof TrackablePressableImpl | null;
export {};
//# sourceMappingURL=touch.d.ts.map