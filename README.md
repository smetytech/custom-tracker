# @smety/tracker

A lightweight, privacy-first analytics tracker for browsers with consent support, auto-click tracking, and SPA navigation handling.

## Features

- **Zero-config** - Works out of the box with sensible defaults
- **Consent-first** - Respects user privacy preferences
- **Auto-click tracking** - Capture interactions via `data-*` attributes
- **SPA navigation** - Handles client-side routing (pushState, popstate)
- **Browser fingerprinting** - Rich context collection (screen, connection, UTM, etc.)
- **Batched sending** - Efficient network usage with batch+interval flushing
- **TypeScript** - Full type safety and IDE autocomplete

## Installation

```bash
npm install @smety/tracker
```

Or via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@smety/tracker@latest/dist/tracker.umd.js"></script>
```

## Quick Start

### ES Modules

```typescript
import { createTracker } from '@smety/tracker';

const tracker = createTracker({
  endpoint: '/api/analytics',
});

tracker.start();
```

### CDN (UMD)

```html
<script src="https://cdn.jsdelivr.net/npm/@smety/tracker@latest/dist/tracker.umd.js"></script>
<script>
  const tracker = new AnalyticsTracker({
    endpoint: '/api/analytics',
  });
  tracker.start();
</script>
```

## Configuration

```typescript
interface TrackerConfig {
  endpoint: string;
  consent?: {
    canTrack: () => boolean | Promise<boolean>;
    onUpdate?: (callback: (granted: boolean) => void) => void;
  };
  collectors?: ('pageViews' | 'clicks')[];
  batchSize?: number;
  flushInterval?: number;
  onBeforeSend?: (event: TrackEvent) => TrackEvent | null;
  onError?: (error: Error, event: TrackEvent) => void;
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `endpoint` | *required* | API endpoint to send events |
| `consent` | `undefined` | Consent configuration (see below) |
| `collectors` | `['pageViews', 'clicks']` | Which collectors to enable |
| `batchSize` | `10` | Send events when queue reaches this size |
| `flushInterval` | `5000` | Flush interval in milliseconds |
| `onBeforeSend` | - | Transform or filter events before sending |
| `onError` | - | Handle send errors |

## Consent Integration

The tracker can be paused/resumed based on user consent:

```typescript
const tracker = createTracker({
  endpoint: '/api/analytics',
  consent: {
    canTrack: () => window.__consent?.analytics ?? false,
    onUpdate: (callback) => {
      window.addEventListener('consent-change', (e) => {
        callback(e.detail.analytics);
      });
    },
  },
});
```

### Consent Manager Pattern

```javascript
// In your consent UI
window.__consent = { analytics: false };

function grantConsent() {
  window.__consent.analytics = true;
  window.dispatchEvent(new CustomEvent('consent-change', {
    detail: window.__consent
  }));
}
```

## Auto-Click Tracking

Add `data-track-event` (or `data-track` or `data-goal`) to any clickable element:

```html
<button data-track-event="cta_click" data-location="hero" data-product="pro">
  Buy Now
</button>

<a href="/pricing" data-track="nav_click" data-section="header">Pricing</a>
```

All `data-*` attributes are captured as event properties:

```json
{
  "type": "click",
  "name": "cta_click",
  "properties": {
    "location": "hero",
    "product": "pro"
  }
}
```

## Manual Tracking

```typescript
// Track custom events
tracker.track('form_submitted', {
  formId: 'contact',
  fields: ['name', 'email'],
});
```

## Event Payload

All events include browser context:

```typescript
interface TrackEvent {
  type: 'page_view' | 'click' | 'custom';
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
  context: {
    url: string;
    path: string;
    query: string | null;
    referrer: string | null;
    language: string;
    languages: string[];
    timeZone: string;
    userAgent: string;
    platform: string;
    screen: { width, height, availWidth, availHeight, pixelRatio, colorDepth, orientation };
    viewport: { width, height };
    connection: { effectiveType, downlink, rtt, saveData } | null;
    memory: { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } | null;
    utm: { source, medium, campaign, term, content };
  };
}
```

## Server Integration

Send events to a Supabase-backed endpoint:

```typescript
// In your API route (e.g., SvelteKit)
export async function POST({ request }) {
  const { events } = await request.json();
  
  for (const event of events) {
    await supabase.from('analytics').insert({
      type: event.type,
      name: event.name,
      properties: event.properties,
      context: event.context,
      timestamp: event.timestamp,
    });
  }
  
  return json({ ok: true });
}
```

## Collector Options

### Page View Collector

```typescript
import { createPageViewCollector } from '@smety/tracker';

const pageViews = createPageViewCollector({
  trackOnLoad: true,      // Track initial page load
  trackHashChanges: false, // Track hash navigation
});
```

### Click Collector

```typescript
import { createClickCollector } from '@smety/tracker';

const clicks = createClickCollector({
  selectors: ['[data-track-event]', '[data-track]', '[data-goal]'],
});
```

## API Reference

### `createTracker(config)`

Creates a new tracker instance.

### `tracker.start()`

Starts tracking (collectors and auto-flush).

### `tracker.stop()`

Stops all tracking and flushes remaining events.

### `tracker.track(name, properties?)`

Manually track a custom event.

### `tracker.trackEvent(event)`

Manually track a raw event object.

### `tracker.flush()`

Immediately send all queued events.

### `tracker.isTracking()`

Returns whether tracking is active.

## Development

```bash
npm install
npm run build
npm run typecheck
```

Outputs:
- `dist/tracker.umd.js` - UMD bundle for `<script>` tags
- `dist/tracker.es.js` - ES Module bundle
- `dist/*.d.ts` - TypeScript declarations

## License

MIT