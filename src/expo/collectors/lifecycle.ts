/**
 * App lifecycle collector for React Native.
 *
 * Tracks app state transitions using React Native's AppState API:
 * - app_launch: Emitted once when the collector starts
 * - app_foreground: When the app comes to the foreground (from background)
 * - app_background: When the app goes to the background
 */

import type { Collector, TrackerPublicAPI } from "../../types";

export class LifecycleCollector implements Collector {
  name = "lifecycle" as const;
  private tracker: TrackerPublicAPI | null = null;
  private subscription: { remove: () => void } | null = null;
  private lastState: string = "active";

  start(tracker: TrackerPublicAPI): void {
    this.tracker = tracker;

    try {
      // Dynamic import to avoid requiring react-native at the module level
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require("react-native") as {
        AppState: {
          currentState: string;
          addEventListener: (
            event: string,
            handler: (state: string) => void,
          ) => { remove: () => void };
        };
      };

      // FIX #19: Initialize lastState from AppState BEFORE emitting app_launch
      // so that subsequent state changes are relative to the actual initial state.
      this.lastState = AppState.currentState;

      // Track the initial app launch
      this.trackLifecycleEvent("app_launch");

      this.subscription = AppState.addEventListener(
        "change",
        (nextAppState: string) => {
          this.handleAppStateChange(nextAppState);
        },
      );
    } catch {
      // AppState not available - still emit app_launch for tracking purposes
      this.trackLifecycleEvent("app_launch");
    }
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.tracker = null;
  }

  private handleAppStateChange(nextState: string): void {
    if (!this.tracker) return;

    // Transitioning from background/inactive to active
    if (
      (this.lastState === "background" || this.lastState === "inactive") &&
      nextState === "active"
    ) {
      this.trackLifecycleEvent("app_foreground");
    }

    // Transitioning from active to background
    if (this.lastState === "active" && nextState === "background") {
      this.trackLifecycleEvent("app_background");

      // Flush events when going to background (equivalent to visibilitychange on web)
      void this.tracker.flush();
    }

    this.lastState = nextState;
  }

  private trackLifecycleEvent(name: string): void {
    if (!this.tracker) return;

    this.tracker.trackEvent({
      type: "app_lifecycle",
      name,
      properties: {
        state: name,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export function createLifecycleCollector(): LifecycleCollector {
  return new LifecycleCollector();
}
