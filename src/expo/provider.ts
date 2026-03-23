/**
 * React Context provider for the Expo tracker.
 *
 * Allows components anywhere in the tree to access the tracker
 * instance via the `useTracker()` hook instead of prop-drilling
 * or relying on module-level singletons.
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { createExpoTracker, TrackerProvider } from '@smety/tracker/expo';
 *
 * const tracker = createExpoTracker({
 *   apiKey: 'your-key',
 *   endpoint: 'https://your-api.com/analytics',
 *   collectors: ['screenViews', 'lifecycle', 'touch'],
 *   navigationRef,
 * });
 *
 * export default function App() {
 *   return (
 *     <TrackerProvider tracker={tracker}>
 *       <RootNavigator />
 *     </TrackerProvider>
 *   );
 * }
 *
 * // Any nested component
 * import { useTracker } from '@smety/tracker/expo';
 *
 * function PurchaseButton({ productId }: { productId: string }) {
 *   const tracker = useTracker();
 *
 *   return (
 *     <Pressable onPress={() => tracker.track('purchase', { productId })}>
 *       <Text>Buy</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require("react") as typeof import("react");

import type { ExpoTrackerPublicAPI } from "./types";

const TrackerContext = React.createContext<ExpoTrackerPublicAPI | null>(null);

/**
 * Props for the TrackerProvider component.
 */
export interface TrackerProviderProps {
  /** The tracker instance created by `createExpoTracker()` */
  tracker: ExpoTrackerPublicAPI;
  /** Whether to automatically call `tracker.start()` on mount and `tracker.stop()` on unmount. Defaults to true. */
  autoStart?: boolean;
  /** React children */
  children: React.ReactNode;
}

/**
 * Provides the tracker instance to all descendant components via React Context.
 *
 * When `autoStart` is true (the default), the tracker is started on mount
 * and stopped on unmount, so you don't need to manage the lifecycle manually.
 */
export function TrackerProvider(props: TrackerProviderProps): React.ReactElement {
  const { tracker, autoStart = true, children } = props;

  React.useEffect(() => {
    if (autoStart && !tracker.isTracking()) {
      tracker.start();
    }

    return () => {
      if (autoStart && tracker.isTracking()) {
        tracker.stop();
      }
    };
  }, [tracker, autoStart]);

  return React.createElement(
    TrackerContext.Provider,
    { value: tracker },
    children,
  );
}

TrackerProvider.displayName = "TrackerProvider";

/**
 * Hook to access the tracker instance from any component inside a `<TrackerProvider>`.
 *
 * Throws if called outside a TrackerProvider — this is intentional to catch
 * setup errors early rather than silently returning null.
 *
 * @returns The `ExpoTrackerPublicAPI` instance.
 */
export function useTracker(): ExpoTrackerPublicAPI {
  const tracker = React.useContext(TrackerContext);
  if (!tracker) {
    throw new Error(
      "[@smety/tracker] useTracker() must be used inside a <TrackerProvider>. " +
      "Wrap your app with <TrackerProvider tracker={tracker}> first.",
    );
  }
  return tracker;
}

/**
 * Hook to access the tracker instance, returning null if no provider is present.
 *
 * Useful in shared components that may or may not be rendered inside a
 * TrackerProvider. Prefer `useTracker()` in app code where the provider
 * is guaranteed to exist.
 *
 * @returns The tracker instance, or null if no provider is found.
 */
export function useTrackerOptional(): ExpoTrackerPublicAPI | null {
  return React.useContext(TrackerContext);
}
