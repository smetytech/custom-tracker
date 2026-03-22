import type { Transport, TrackEvent } from "../types";

export interface HttpTransportOptions {
  apiKey: string;
  endpoint: string;
  headers?: Record<string, string>;
  useBeacon?: boolean;
}

export class HttpTransport implements Transport {
  private endpoint: string;
  private headers: Record<string, string>;
  private useBeacon: boolean;

  constructor(options: HttpTransportOptions) {
    this.endpoint = options.endpoint;
    this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": options.apiKey,
      ...options.headers,
    };
    this.useBeacon = options.useBeacon ?? false;
  }

  async send(events: TrackEvent[]): Promise<void> {
    if (events.length === 0) return;

    const payload = { events };

    if (this.useBeacon && typeof navigator.sendBeacon === "function") {
      this.sendWithBeacon(payload);
      return;
    }

    await this.sendWithFetch(payload);
  }

  private sendWithBeacon(payload: { events: TrackEvent[] }): void {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon(this.endpoint, blob);
  }

  private async sendWithFetch(payload: {
    events: TrackEvent[];
  }): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
        keepalive: true,
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
