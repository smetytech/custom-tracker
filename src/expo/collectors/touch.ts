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

// Tracker reference used by the hook, component, and imperative API.
// While this is module-level, the TouchCollector properly nulls it on stop(),
// and only one tracker instance should be active at a time in a mobile app.
let activeTracker: TrackerPublicAPI | null = null;

/**
 * Touch collector that registers the active tracker reference.
 * The TrackablePressable component and useTrackPress hook use this reference.
 */
export class TouchCollector implements Collector {
  name = "touch" as const;

  start(tracker: TrackerPublicAPI): void {
    activeTracker = tracker;
  }

  stop(): void {
    activeTracker = null;
  }
}

export function createTouchCollector(): TouchCollector {
  return new TouchCollector();
}

/**
 * Get the currently active tracker for touch events.
 * Returns null if no tracker is running with touch collector enabled.
 */
export function getActiveTracker(): TrackerPublicAPI | null {
  return activeTracker;
}

/**
 * Track a touch/press event programmatically.
 * Can be called directly without the hook or component.
 */
export function trackPress(
  eventName: string,
  properties: Record<string, unknown> = {},
  userId?: string,
): void {
  if (!activeTracker) {
    console.warn(
      "[@smety/tracker] Touch tracking not initialized. " +
      "Make sure the tracker is started with the 'touch' collector enabled.",
    );
    return;
  }

  activeTracker.trackEvent(
    {
      type: "touch",
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
    },
    userId,
  );
}

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
export function useTrackPress(
  eventName: string,
  properties?: Record<string, unknown>,
  onPress?: () => void,
  userId?: string,
): () => void {
  // FIX #6: Use React.useCallback for stable reference (proper hook)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  return React.useCallback(() => {
    trackPress(eventName, properties ?? {}, userId);
    onPress?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, userId]);
}

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

/**
 * A Pressable wrapper that automatically tracks press events.
 * This is the React Native equivalent of using data-track-* attributes on web elements.
 *
 * @example
 * ```tsx
 * import { TrackablePressable } from '@smety/tracker/expo';
 *
 * <TrackablePressable
 *   trackEvent="add_to_cart"
 *   trackProperties={{ productId: '123', price: 29.99 }}
 *   style={styles.button}
 * >
 *   <Text>Add to Cart</Text>
 * </TrackablePressable>
 * ```
 *
 * Note: This component dynamically requires React and React Native.
 * It is designed to be used only in a React Native environment.
 */
// FIX #14: Export the component directly instead of through a factory.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _React = (() => { try { return require("react") as typeof import("react"); } catch { return null; } })();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _RN = (() => { try { return require("react-native") as { Pressable: React.ComponentType<{ onPress?: () => void; children?: React.ReactNode; [key: string]: unknown }> }; } catch { return null; } })();

function TrackablePressableImpl(props: TrackablePressableProps): React.ReactElement | null {
  if (!_React || !_RN) return null;

  const {
    trackEvent: eventName,
    trackProperties,
    trackUserId,
    onPress,
    children,
    ...rest
  } = props;

  const handlePress = _React.useCallback(() => {
    trackPress(eventName, trackProperties ?? {}, trackUserId);
    onPress?.();
  }, [eventName, trackProperties, trackUserId, onPress]);

  return _React.createElement(
    _RN.Pressable,
    { ...rest, onPress: handlePress },
    children,
  );
}

TrackablePressableImpl.displayName = "TrackablePressable";

export const TrackablePressable = TrackablePressableImpl;

// Keep the factory for backward compatibility
export function createTrackablePressable(): typeof TrackablePressableImpl | null {
  if (!_React || !_RN) return null;
  return TrackablePressableImpl;
}
