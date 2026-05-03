import type { Transport, TrackEvent } from "../types";

export interface HttpTransportOptions {
  apiKey: string;
  endpoint: string;
  projectId?: string;
  sourceIdentifier?: string;
  headers?: Record<string, string>;
  useBeacon?: boolean;
}

export class HttpTransport implements Transport {
  private endpoint: string;
  private headers: Record<string, string>;
  private useBeacon: boolean;
  private sourceIdentifier?: string;

  constructor(options: HttpTransportOptions) {
    this.endpoint = options.endpoint;
    this.sourceIdentifier = options.sourceIdentifier;
    this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": options.apiKey,
      ...(options.projectId ? { "X-Project-ID": options.projectId } : {}),
      ...(options.sourceIdentifier ? { "X-Source-Identifier": options.sourceIdentifier } : {}),
      ...options.headers,
    };
    this.useBeacon = options.useBeacon ?? false;
  }

  async send(events: TrackEvent[]): Promise<void> {
    if (events.length === 0) return;

    const payload = { events, ...(this.sourceIdentifier ? { sourceIdentifier: this.sourceIdentifier } : {}) };

    if (this.useBeacon && typeof navigator.sendBeacon === "function") {
      this.sendWithBeacon(payload);
      return;
    }

    await this.sendWithFetch(payload);
  }

  private sendWithBeacon(payload: { events: TrackEvent[] }): void {
    // Guard: sendBeacon and Blob may not be available in React Native
    if (typeof Blob === "undefined" || typeof navigator?.sendBeacon !== "function") {
      void this.sendWithFetch(payload);
      return;
    }

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon(this.endpoint, blob);
  }

  private async sendWithFetch(payload: {
    events: TrackEvent[];
  }): Promise<void> {
    try {
      // FIX #18: keepalive is not supported in React Native's fetch implementation
      const isReactNative =
        typeof navigator !== "undefined" && navigator.product === "ReactNative";

      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
        ...(isReactNative ? {} : { keepalive: true }),
      });
    } catch (error) {
      console.warn("Analytics tracking failed:", error);
    }
  }
}

export function createHttpTransport(
  options: HttpTransportOptions,
): HttpTransport {
  return new HttpTransport(options);
}
