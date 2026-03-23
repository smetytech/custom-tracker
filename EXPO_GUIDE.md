# @smety/tracker — Expo / React Native Integration Guide

## Table of Contents

1. [Why Not CDN?](#why-not-cdn)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration Reference](#configuration-reference)
5. [Navigation Setup (Expo Router)](#navigation-setup-expo-router)
6. [Navigation Setup (React Navigation)](#navigation-setup-react-navigation)
7. [TrackerProvider & Hooks](#trackerprovider--hooks)
8. [Tracking Events](#tracking-events)
9. [Touch Tracking](#touch-tracking)
10. [Screen View Tracking](#screen-view-tracking)
11. [Lifecycle Tracking](#lifecycle-tracking)
12. [Consent Management](#consent-management)
13. [Context Data Collected](#context-data-collected)
14. [Session Management](#session-management)
15. [Event Schema](#event-schema)
16. [API Reference](#api-reference)

---

## Why Not CDN?

On the web, the tracker is loaded via a `<script>` tag from jsDelivr CDN. **This does not work in React Native** because:

- React Native has no browser, no DOM, and no `<script>` tags
- Metro (the React Native bundler) resolves all imports at build time — there is no runtime script loading
- There is no `window` global to attach a UMD bundle to

Instead, the tracker must be installed as a proper dependency so Metro can bundle it.

## Installation

Install the tracker directly from GitHub, pinned to a release tag:

```bash
npx expo install github:smetytech/custom-tracker#v1.1.0
```

Or add it manually to your `package.json`:

```json
{
  "dependencies": {
    "@smety/tracker": "github:smetytech/custom-tracker#v1.1.0"
  }
}
```

Then run `npx expo install` or `bun install` to resolve it.

> **Updating to a new version:** Change the tag (e.g. `#v1.2.0`) and reinstall.
> The `dist/` folder is committed to the repo, so the built files are available directly from GitHub without a publish step.

Then install the optional Expo SDK peer dependencies for the features you need:

```bash
# Required for persistent sessions (strongly recommended)
npx expo install @react-native-async-storage/async-storage

# Required for automatic screen view tracking
npx expo install @react-navigation/native

# Optional — device info (model, OS, brand)
npx expo install expo-device

# Optional — locale & timezone
npx expo install expo-localization

# Optional — app version & build number
npx expo install expo-application

# Optional — geolocation
npx expo install expo-location
```

**All Expo SDK packages are optional.** If a package isn't installed, that section of context data gracefully falls back to `null` or default values. The tracker will always work — you just get richer context data with more packages installed.

### Minimum peer dependency versions

| Package | Minimum Version |
|---------|----------------|
| `react` | `>=18.0.0` |
| `react-native` | `>=0.70.0` |
| `@react-navigation/native` | `>=6.0.0` |
| `@react-native-async-storage/async-storage` | `>=1.19.0` |
| `expo-device` | `>=5.0.0` |
| `expo-localization` | `>=14.0.0` |
| `expo-location` | `>=16.0.0` |
| `expo-application` | `>=5.0.0` |

---

## Quick Start

The simplest possible setup — paste this into your root layout or App component and you're tracking:

```tsx
// app/_layout.tsx (Expo Router)
import { createExpoTracker, TrackerProvider } from '@smety/tracker/expo';
import { useNavigationContainerRef } from 'expo-router';

const tracker = createExpoTracker({
  apiKey: 'your-api-key',
  endpoint: 'https://your-api.com/api/events',
  collectors: ['screenViews', 'lifecycle', 'touch'],
  geolocation: false,
});

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  // Attach navigation ref once it's available
  // (see "Navigation Setup" sections below for production-ready patterns)

  return (
    <TrackerProvider tracker={tracker}>
      <Stack />
    </TrackerProvider>
  );
}
```

That's it. The `TrackerProvider` auto-starts the tracker on mount and stops it on unmount. Every screen navigation, app lifecycle transition, and touch event (when using the touch components/hooks) is tracked automatically.

---

## Configuration Reference

`createExpoTracker(config)` accepts the following options:

```typescript
interface ExpoTrackerConfig {
  // Required
  apiKey: string;              // Your analytics API key
  endpoint: string;            // URL where events are POSTed

  // Collectors
  collectors?: Array<'screenViews' | 'touch' | 'lifecycle'>;
                               // Default: ['screenViews', 'lifecycle']

  // Navigation (required for 'screenViews' collector)
  navigationRef?: NavigationRef;

  // Geolocation
  geolocation?: boolean;       // Request location permission & track GPS coords.
                               // Default: false

  // Batching
  batchSize?: number;          // Events to batch before sending. Default: 10
  flushInterval?: number;      // Ms between auto-flushes. Default: 5000

  // Consent
  consent?: {
    canTrack: () => boolean | Promise<boolean>;
    onUpdate?: (callback: (granted: boolean) => void) => void;
  };

  // Hooks
  onBeforeSend?: (event: TrackEvent) => TrackEvent | null;
                               // Mutate or drop events before sending.
                               // Return null to drop the event.
  onError?: (error: Error, event: TrackEvent) => void;
                               // Called when an event fails to send.
}
```

### Example with all options:

```typescript
const tracker = createExpoTracker({
  apiKey: 'sk_prod_abc123',
  endpoint: 'https://analytics.yourapp.com/api/events',
  collectors: ['screenViews', 'lifecycle', 'touch'],
  navigationRef: navigationRef,
  geolocation: true,
  batchSize: 20,
  flushInterval: 10000,
  consent: {
    canTrack: () => getUserConsent(),
    onUpdate: (cb) => onConsentChange((granted) => cb(granted)),
  },
  onBeforeSend: (event) => {
    // Strip PII from events
    if (event.properties.email) {
      event.properties.email = '[redacted]';
    }
    return event;
  },
  onError: (error, event) => {
    console.error('Failed to send event:', event.name, error);
  },
});
```

---

## Navigation Setup (Expo Router)

Expo Router is built on top of React Navigation, so the tracker's screen view collector works natively with it.

### Step 1: Get the navigation ref

Expo Router provides `useNavigationContainerRef()` which returns the same `NavigationContainerRef` that React Navigation uses.

### Step 2: Create the tracker with the ref

The challenge is that `createExpoTracker` is called at module level (outside a component), but `useNavigationContainerRef()` is a hook that must be called inside a component. There are two patterns:

**Pattern A: Create tracker at module level, attach navigation ref later**

This is the recommended pattern. Create the tracker without `navigationRef`, then set it up inside your layout:

```tsx
// lib/tracker.ts
import { createExpoTracker } from '@smety/tracker/expo';

export const tracker = createExpoTracker({
  apiKey: 'your-api-key',
  endpoint: 'https://your-api.com/api/events',
  collectors: ['screenViews', 'lifecycle', 'touch'],
});
```

```tsx
// app/_layout.tsx
import { Stack, useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';
import {
  TrackerProvider,
  createScreenViewCollector,
} from '@smety/tracker/expo';
import { tracker } from '../lib/tracker';

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  return (
    <TrackerProvider tracker={tracker}>
      <Stack />
    </TrackerProvider>
  );
}
```

> Note: With this pattern the `screenViews` collector won't have a `navigationRef` and won't auto-track screen views. You have two options: either pass `navigationRef` at creation time (Pattern B), or track screen views manually using `tracker.trackScreenView()` (see [Screen View Tracking](#screen-view-tracking)).

**Pattern B: Create tracker inside the component**

If you need automatic screen view tracking, create the tracker inside the component so you have access to the navigation ref:

```tsx
// app/_layout.tsx
import { Stack, useNavigationContainerRef } from 'expo-router';
import { useMemo } from 'react';
import { createExpoTracker, TrackerProvider } from '@smety/tracker/expo';

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  const tracker = useMemo(
    () =>
      createExpoTracker({
        apiKey: 'your-api-key',
        endpoint: 'https://your-api.com/api/events',
        collectors: ['screenViews', 'lifecycle', 'touch'],
        navigationRef: navigationRef as any, // Expo Router's ref is compatible
        geolocation: false,
      }),
    [navigationRef],
  );

  return (
    <TrackerProvider tracker={tracker}>
      <Stack />
    </TrackerProvider>
  );
}
```

The `useMemo` ensures the tracker is created once and doesn't re-create on every render.

---

## Navigation Setup (React Navigation)

If you're using React Navigation directly (without Expo Router), use `createNavigationContainerRef()` or `useNavigationContainerRef()`:

```tsx
// App.tsx
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createExpoTracker, TrackerProvider } from '@smety/tracker/expo';

const navigationRef = createNavigationContainerRef();

const tracker = createExpoTracker({
  apiKey: 'your-api-key',
  endpoint: 'https://your-api.com/api/events',
  collectors: ['screenViews', 'lifecycle', 'touch'],
  navigationRef,
});

export default function App() {
  return (
    <TrackerProvider tracker={tracker}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </TrackerProvider>
  );
}
```

The screen view collector automatically handles the case where the navigation container isn't mounted yet — it polls for readiness before attaching the state listener.

---

## TrackerProvider & Hooks

The `TrackerProvider` makes the tracker instance available to any component in the tree via React Context.

### TrackerProvider

```tsx
import { TrackerProvider } from '@smety/tracker/expo';

<TrackerProvider
  tracker={tracker}    // Required: the tracker instance
  autoStart={true}     // Optional: auto start/stop on mount/unmount (default: true)
>
  {children}
</TrackerProvider>
```

When `autoStart` is `true` (the default):
- `tracker.start()` is called on mount
- `tracker.stop()` is called on unmount
- You do **not** need to call `tracker.start()` manually

Set `autoStart={false}` if you want to control the tracker lifecycle yourself (e.g., start only after user consent).

### useTracker()

Access the tracker from any component inside a `TrackerProvider`. Throws if used outside.

```tsx
import { useTracker } from '@smety/tracker/expo';

function PurchaseButton({ productId, price }: { productId: string; price: number }) {
  const tracker = useTracker();

  const handlePurchase = () => {
    tracker.track('purchase', { productId, price }, 'user-456');
    // ... your purchase logic
  };

  return (
    <Pressable onPress={handlePurchase}>
      <Text>Buy Now</Text>
    </Pressable>
  );
}
```

### useTrackerOptional()

Same as `useTracker()` but returns `null` instead of throwing when there's no provider. Useful for shared/library components that may render outside a `TrackerProvider`:

```tsx
import { useTrackerOptional } from '@smety/tracker/expo';

function SharedButton({ label, onPress }: { label: string; onPress: () => void }) {
  const tracker = useTrackerOptional();

  const handlePress = () => {
    tracker?.track('button_press', { label });
    onPress();
  };

  return <Pressable onPress={handlePress}><Text>{label}</Text></Pressable>;
}
```

---

## Tracking Events

### Custom events

Use `tracker.track()` for custom business events:

```typescript
// Basic event
tracker.track('sign_up');

// Event with properties
tracker.track('purchase', {
  productId: 'sku-123',
  price: 29.99,
  currency: 'USD',
  category: 'electronics',
});

// Event with properties and userId
tracker.track('add_to_cart', { productId: 'sku-123' }, 'user-456');
```

### Low-level event tracking

Use `tracker.trackEvent()` when you need full control over the event object:

```typescript
tracker.trackEvent({
  type: 'custom',
  name: 'checkout_completed',
  properties: {
    orderId: 'ord-789',
    total: 149.97,
    items: 3,
  },
  timestamp: new Date().toISOString(),
}, 'user-456');  // optional userId
```

### Manual screen views

If you're not using automatic screen view tracking (no `navigationRef`), track screen views manually:

```typescript
tracker.trackScreenView('ProductDetail', {
  productId: 'sku-123',
  category: 'electronics',
}, 'user-456');
```

### Flushing events

Events are automatically flushed:
- Every `flushInterval` milliseconds (default: 5000ms)
- When `batchSize` is reached (default: 10 events)
- When the app goes to background

You can also flush manually:

```typescript
await tracker.flush();
```

---

## Touch Tracking

The touch collector provides three ways to track user taps, from declarative to imperative.

**Prerequisite:** Include `'touch'` in your `collectors` array.

### 1. TrackablePressable component

A drop-in replacement for React Native's `Pressable` that auto-tracks presses. This is the mobile equivalent of `data-track-*` attributes on the web:

```tsx
import { TrackablePressable } from '@smety/tracker/expo';

<TrackablePressable
  trackEvent="add_to_cart"
  trackProperties={{ productId: 'sku-123', price: 29.99 }}
  trackUserId="user-456"  // optional
  style={styles.button}
>
  <Text>Add to Cart</Text>
</TrackablePressable>
```

All standard `Pressable` props are passed through, so you can use `style`, `disabled`, `hitSlop`, etc. as normal.

### 2. useTrackPress hook

Wraps any `onPress` callback with tracking. Good when you have existing `Pressable` components and just want to add tracking:

```tsx
import { useTrackPress } from '@smety/tracker/expo';
import { Pressable, Text } from 'react-native';

function LikeButton({ postId }: { postId: string }) {
  const onPress = useTrackPress(
    'post_liked',                    // event name
    { postId },                      // properties (optional)
    () => { likePost(postId); },     // your onPress handler (optional)
    'user-456',                      // userId (optional)
  );

  return (
    <Pressable onPress={onPress}>
      <Text>Like</Text>
    </Pressable>
  );
}
```

The hook returns a memoized callback (`useCallback`), so it won't cause unnecessary re-renders.

### 3. trackPress() imperative function

For cases where you're not in a component or need full programmatic control:

```typescript
import { trackPress } from '@smety/tracker/expo';

function handleShare(articleId: string) {
  trackPress('article_shared', { articleId }, 'user-456');
  // ... share logic
}
```

---

## Screen View Tracking

When you include `'screenViews'` in the `collectors` array and provide a `navigationRef`, the tracker automatically:

1. Tracks the **initial screen** when the collector starts
2. Listens for **navigation state changes** and tracks each new screen
3. Deduplicates — same screen name in a row is not tracked twice
4. Handles **navigation readiness** — if the navigation container hasn't mounted yet, it polls until ready

Each screen view event includes:

```typescript
{
  type: 'screen_view',
  name: 'ProductDetail',       // Route name from React Navigation
  properties: {
    screen: 'ProductDetail',
    params: { id: '123' },     // Route params
    previousScreen: 'Home',    // Previous route name (null for initial)
    isInitialScreen: false,
  },
  timestamp: '2026-03-23T12:00:00.000Z',
  sessionId: 'abc-123',
  context: { /* MobileContext */ },
}
```

### Manual screen views

If you don't want automatic tracking, omit `'screenViews'` from collectors and track manually:

```typescript
const tracker = useTracker();

// In a screen component's useEffect or useFocusEffect:
useEffect(() => {
  tracker.trackScreenView('Settings', { section: 'account' });
}, []);
```

---

## Lifecycle Tracking

When you include `'lifecycle'` in the `collectors` array, the tracker automatically tracks app state transitions:

| Event Name | When |
|------------|------|
| `app_launch` | Once when the tracker starts |
| `app_foreground` | App comes back from background to active |
| `app_background` | App goes from active to background |

Events are flushed automatically when the app goes to background, so you don't lose pending events.

Event schema:

```typescript
{
  type: 'app_lifecycle',
  name: 'app_foreground',
  properties: {
    state: 'app_foreground',
  },
  timestamp: '2026-03-23T12:00:00.000Z',
  sessionId: 'abc-123',
  context: { /* MobileContext */ },
}
```

---

## Consent Management

The tracker supports a consent-based tracking model. If consent is not granted, events are silently dropped.

```typescript
const tracker = createExpoTracker({
  apiKey: 'your-key',
  endpoint: 'https://your-api.com/api/events',
  consent: {
    // Called before each event batch — return false to block tracking
    canTrack: () => {
      return getUserConsent(); // your consent logic
    },
    // Subscribe to consent changes — tracker auto-starts/stops
    onUpdate: (callback) => {
      onConsentChange((granted) => callback(granted));
    },
  },
});
```

### Behavior:

- If `canTrack()` returns `false`, the tracker won't start and events are dropped
- When `onUpdate` fires with `true`, the tracker auto-starts
- When `onUpdate` fires with `false`, the tracker auto-stops (flushes remaining events first)
- `canTrack` can return a `Promise<boolean>` for async consent checks

### Example with AsyncStorage-based consent:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

let consentCallbacks: ((granted: boolean) => void)[] = [];

async function hasAnalyticsConsent(): Promise<boolean> {
  const consent = await AsyncStorage.getItem('analytics_consent');
  return consent === 'true';
}

function onConsentChange(cb: (granted: boolean) => void) {
  consentCallbacks.push(cb);
}

// Call this when user toggles consent in settings
async function setConsent(granted: boolean) {
  await AsyncStorage.setItem('analytics_consent', String(granted));
  consentCallbacks.forEach(cb => cb(granted));
}

const tracker = createExpoTracker({
  apiKey: 'your-key',
  endpoint: 'https://your-api.com/api/events',
  consent: {
    canTrack: hasAnalyticsConsent,
    onUpdate: onConsentChange,
  },
});
```

---

## Context Data Collected

Every event is enriched with a `MobileContext` object containing device and environment data. This is the mobile equivalent of the browser context (URL, user agent, viewport, etc.).

```typescript
interface MobileContext {
  platform: 'ios' | 'android';

  // Device info (expo-device)
  deviceName: string | null;      // e.g. "iPhone 15 Pro"
  deviceBrand: string | null;     // e.g. "Apple"
  deviceModel: string | null;     // e.g. "iPhone16,2"
  osName: string | null;          // e.g. "iOS"
  osVersion: string | null;       // e.g. "17.4.1"
  isDevice: boolean;              // false if running in simulator

  // App info (expo-application)
  appVersion: string | null;      // e.g. "2.1.0" (native version)
  buildNumber: string | null;     // e.g. "42"

  // Locale (expo-localization)
  locale: string;                 // e.g. "en-US"
  locales: string[];              // e.g. ["en-US", "fr-FR"]
  timeZone: string;               // e.g. "America/New_York"

  // Screen (React Native Dimensions API)
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    fontScale: number;            // User's font scale preference
  };

  // Geolocation (expo-location) — only if geolocation: true
  geolocation: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;      // meters
  } | null;
}
```

### What you get without installing optional packages:

| Without | You lose | Fallback |
|---------|----------|----------|
| `expo-device` | Device name, brand, model, OS info | All `null` |
| `expo-application` | App version, build number | All `null` |
| `expo-localization` | Locale, timezone | `"en"`, `Intl` fallback |
| `expo-location` | GPS coordinates | `null` |
| `@react-native-async-storage/async-storage` | Persistent sessions | In-memory session ID (resets on restart) |

The tracker will always work. These are progressive enhancements.

---

## Session Management

Sessions are persisted to AsyncStorage under the key `@smety_tracker_session_id`. This means:

- The same `sessionId` survives app restarts and background kills
- Useful for tracking user journeys across multiple app sessions
- If AsyncStorage is not installed, a new session ID is generated each time (in-memory only)

### Clearing sessions

Use this on logout or when you want to start a fresh session:

```typescript
import { clearMobileSessionId } from '@smety/tracker/expo';

async function handleLogout() {
  await clearMobileSessionId();
  // Next time the tracker starts, a new sessionId will be generated
}
```

---

## Event Schema

Every event sent to your endpoint follows this shape:

```typescript
// POST to your endpoint
{
  "events": [
    {
      "type": "screen_view" | "touch" | "app_lifecycle" | "custom",
      "name": "ProductDetail",
      "properties": { /* event-specific data */ },
      "timestamp": "2026-03-23T12:00:00.000Z",
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-456",          // if provided
      "context": { /* MobileContext */ }
    }
  ]
}
```

Events are batched and sent as a JSON array. The request includes:
- Header: `Content-Type: application/json`
- Header: `X-API-Key: <your-api-key>`

### Server-side type discrimination

On your backend, use the `platform` field in `context` to distinguish mobile from web events:

```typescript
import { isMobileContext, isBrowserContext } from '@smety/tracker/expo';
// or from '@smety/tracker' — both export these

if (isMobileContext(event.context)) {
  // event.context.deviceModel, event.context.osName, etc.
}

if (isBrowserContext(event.context)) {
  // event.context.url, event.context.userAgent, etc.
}
```

---

## API Reference

### createExpoTracker(config)

Creates a new tracker instance. Does not start tracking — use `TrackerProvider` (auto-starts) or call `tracker.start()` manually.

Returns `ExpoTrackerPublicAPI`:

| Method | Signature | Description |
|--------|-----------|-------------|
| `track` | `(name, properties?, userId?) => void` | Track a custom event |
| `trackEvent` | `(event: TrackEvent, userId?) => void` | Track a raw event object |
| `trackScreenView` | `(screenName, properties?, userId?) => void` | Track a screen view |
| `start` | `() => void` | Start the tracker and all collectors |
| `stop` | `() => void` | Stop the tracker, flush remaining events |
| `isTracking` | `() => boolean` | Whether the tracker is currently running |
| `flush` | `() => Promise<void>` | Manually flush the event queue |

### TrackerProvider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tracker` | `ExpoTrackerPublicAPI` | required | Tracker instance |
| `autoStart` | `boolean` | `true` | Auto start/stop on mount/unmount |
| `children` | `ReactNode` | required | Child components |

### Hooks

| Hook | Returns | Throws? |
|------|---------|---------|
| `useTracker()` | `ExpoTrackerPublicAPI` | Yes, if no `TrackerProvider` |
| `useTrackerOptional()` | `ExpoTrackerPublicAPI \| null` | No |
| `useTrackPress(name, props?, onPress?, userId?)` | `() => void` | No |

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `TrackablePressable` | `trackEvent`, `trackProperties?`, `trackUserId?`, `onPress?`, + all `Pressable` props | Auto-tracking Pressable |

### Standalone functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `trackPress` | `(name, properties?, userId?) => void` | Imperative touch tracking |
| `clearMobileSessionId` | `() => Promise<void>` | Clear persisted session |
| `getMobileContext` | `() => Promise<MobileContext>` | Get current device context |
| `getMobileGeolocation` | `() => Promise<Geolocation \| null>` | Get GPS coords (requests permission) |
| `resetMobileContextCache` | `() => void` | Reset cached context (testing) |

---

## Full Example: Expo Router App

```
app/
  _layout.tsx          ← TrackerProvider + navigation setup
  (tabs)/
    _layout.tsx        ← Tab navigator
    index.tsx          ← Home screen
    profile.tsx        ← Profile screen with manual tracking
  product/[id].tsx     ← Product detail with purchase tracking
lib/
  tracker.ts           ← Tracker instance creation
```

### lib/tracker.ts

```typescript
import { createExpoTracker } from '@smety/tracker/expo';
import type { NavigationRef } from '@smety/tracker/expo';

let trackerInstance: ReturnType<typeof createExpoTracker> | null = null;

export function getTracker(navigationRef?: NavigationRef) {
  if (!trackerInstance) {
    trackerInstance = createExpoTracker({
      apiKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY ?? 'dev-key',
      endpoint: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT ?? 'http://localhost:3000/api/events',
      collectors: ['screenViews', 'lifecycle', 'touch'],
      navigationRef,
      geolocation: false,
      batchSize: 10,
      flushInterval: 5000,
    });
  }
  return trackerInstance;
}
```

### app/_layout.tsx

```tsx
import { Stack, useNavigationContainerRef } from 'expo-router';
import { useMemo } from 'react';
import { TrackerProvider } from '@smety/tracker/expo';
import { getTracker } from '../lib/tracker';

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  const tracker = useMemo(
    () => getTracker(navigationRef as any),
    [navigationRef],
  );

  return (
    <TrackerProvider tracker={tracker}>
      <Stack />
    </TrackerProvider>
  );
}
```

### app/product/[id].tsx

```tsx
import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';
import { useTracker, TrackablePressable } from '@smety/tracker/expo';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tracker = useTracker();

  const handlePurchase = () => {
    tracker.track('purchase', {
      productId: id,
      price: 29.99,
      currency: 'USD',
    }, 'user-456');
  };

  return (
    <View>
      <Text>Product {id}</Text>

      {/* Option 1: TrackablePressable */}
      <TrackablePressable
        trackEvent="add_to_cart"
        trackProperties={{ productId: id }}
      >
        <Text>Add to Cart</Text>
      </TrackablePressable>

      {/* Option 2: Manual tracking via useTracker */}
      <TrackablePressable
        trackEvent="purchase"
        trackProperties={{ productId: id, price: 29.99 }}
        onPress={handlePurchase}
      >
        <Text>Buy Now</Text>
      </TrackablePressable>
    </View>
  );
}
```

### app/(tabs)/profile.tsx

```tsx
import { View, Text, Pressable } from 'react-native';
import { useTracker } from '@smety/tracker/expo';
import { clearMobileSessionId } from '@smety/tracker/expo';

export default function Profile() {
  const tracker = useTracker();

  const handleLogout = async () => {
    tracker.track('logout');
    await tracker.flush();           // Send any pending events
    await clearMobileSessionId();    // Reset session for next login
    // ... navigate to login screen
  };

  return (
    <View>
      <Text>Profile</Text>
      <Pressable onPress={handleLogout}>
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}
```
