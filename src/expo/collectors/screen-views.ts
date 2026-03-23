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

export class ScreenViewCollector implements Collector {
  name = "screenViews" as const;
  private tracker: TrackerPublicAPI | null = null;
  private navigationRef: NavigationRef;
  private trackInitialScreen: boolean;
  private readyPollInterval: number;
  private unsubscribe: (() => void) | null = null;
  private readyPoller: ReturnType<typeof setInterval> | null = null;
  private previousRouteName: string | null = null;

  constructor(options: ScreenViewCollectorOptions) {
    this.navigationRef = options.navigationRef;
    this.trackInitialScreen = options.trackInitialScreen ?? true;
    this.readyPollInterval = options.readyPollInterval ?? 100;
  }

  start(tracker: TrackerPublicAPI): void {
    this.tracker = tracker;

    // FIX #7: Guard against un-ready navigation.
    // If the navigation container hasn't mounted yet, poll until it's ready.
    if (this.navigationRef.isReady()) {
      this.attachListener();
    } else {
      this.readyPoller = setInterval(() => {
        if (this.navigationRef.isReady()) {
          this.clearReadyPoller();
          this.attachListener();
        }
      }, this.readyPollInterval);
    }
  }

  stop(): void {
    this.clearReadyPoller();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.tracker = null;
    this.previousRouteName = null;
  }

  private attachListener(): void {
    // Track initial screen
    if (this.trackInitialScreen) {
      this.trackCurrentScreen(true);
    }

    // Listen for navigation state changes
    this.unsubscribe = this.navigationRef.addListener(
      "state",
      () => {
        this.trackCurrentScreen(false);
      },
    );
  }

  private clearReadyPoller(): void {
    if (this.readyPoller) {
      clearInterval(this.readyPoller);
      this.readyPoller = null;
    }
  }

  private trackCurrentScreen(isInitial: boolean): void {
    if (!this.tracker) return;

    const currentRoute = this.navigationRef.getCurrentRoute?.();
    if (!currentRoute) return;

    const currentRouteName = currentRoute.name;

    // Don't track if route hasn't changed (unless it's the initial screen)
    if (!isInitial && currentRouteName === this.previousRouteName) return;

    const previousRouteName = this.previousRouteName;
    this.previousRouteName = currentRouteName;

    this.tracker.trackEvent({
      type: "screen_view",
      name: currentRouteName,
      properties: {
        screen: currentRouteName,
        params: currentRoute.params ?? {},
        previousScreen: previousRouteName,
        isInitialScreen: isInitial,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export function createScreenViewCollector(
  options: ScreenViewCollectorOptions,
): ScreenViewCollector {
  return new ScreenViewCollector(options);
}
