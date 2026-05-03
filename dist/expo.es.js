class P {
  constructor(e) {
    this.endpoint = e.endpoint, this.sourceIdentifier = e.sourceIdentifier, this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": e.apiKey,
      ...e.projectId ? { "X-Project-ID": e.projectId } : {},
      ...e.sourceIdentifier ? { "X-Source-Identifier": e.sourceIdentifier } : {},
      ...e.headers
    }, this.useBeacon = e.useBeacon ?? !1;
  }
  async send(e) {
    if (e.length === 0) return;
    const n = { events: e, ...this.sourceIdentifier ? { sourceIdentifier: this.sourceIdentifier } : {} };
    if (this.useBeacon && typeof navigator.sendBeacon == "function") {
      this.sendWithBeacon(n);
      return;
    }
    await this.sendWithFetch(n);
  }
  sendWithBeacon(e) {
    if (typeof Blob > "u" || typeof (navigator == null ? void 0 : navigator.sendBeacon) != "function") {
      this.sendWithFetch(e);
      return;
    }
    const n = new Blob([JSON.stringify(e)], {
      type: "application/json"
    });
    navigator.sendBeacon(this.endpoint, n);
  }
  async sendWithFetch(e) {
    try {
      const n = typeof navigator < "u" && navigator.product === "ReactNative";
      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(e),
        ...n ? {} : { keepalive: !0 }
      });
    } catch (n) {
      console.warn("Analytics tracking failed:", n);
    }
  }
}
function x(t) {
  return new P(t);
}
function E(t) {
  const e = /* @__PURE__ */ new Set();
  return t != null && t.onUpdate && t.onUpdate((a) => {
    e.forEach((s) => {
      try {
        s(a);
      } catch {
      }
    });
  }), {
    canTrack: () => {
      if (!t)
        return !0;
      try {
        return t.canTrack();
      } catch {
        return !1;
      }
    },
    onUpdate: (a) => {
      e.add(a);
    },
    clearCallbacks: () => {
      e.clear();
    }
  };
}
const N = {
  canTrack: () => !0,
  onUpdate: () => {
  },
  clearCallbacks: () => {
  }
}, y = 10, b = 5e3;
class A {
  constructor(e, n) {
    this.eventQueue = [], this.collectors = [], this.isRunning = !1, this.flushTimer = null, this.contextCached = null, this.sessionId = null, this.externalCollectors = [], this.backgroundCleanup = null, this.config = {
      batchSize: y,
      flushInterval: b,
      geolocation: !1,
      ...e
    }, this.externalCollectors = n ?? [], this.platformAdapter = this.config.platform ?? {
      getContext: () => ({}),
      getSessionId: () => "no-session"
    }, this.transport = x({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      projectId: this.config.projectId,
      sourceIdentifier: this.config.sourceIdentifier,
      useBeacon: !1
    }), this.consentManager = this.config.consent ? E(this.config.consent) : N, this.setupConsentListener();
  }
  setupConsentListener() {
    this.consentManager.onUpdate((e) => {
      e && !this.isRunning ? this.start() : !e && this.isRunning && this.stop();
    });
  }
  track(e, n = {}, r) {
    this.trackEvent(
      {
        type: "custom",
        name: e,
        properties: n,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      r
    );
  }
  trackEvent(e, n) {
    if (!this.isRunning) return;
    const r = this.consentManager.canTrack(), i = (a) => {
      if (!a || !this.isRunning) return;
      let s = { ...e };
      if (this.config.onBeforeSend) {
        const o = this.config.onBeforeSend(s);
        if (!o) return;
        s = { ...o };
      }
      (s.type === "page_view" || s.type === "screen_view") && (this.contextCached = this.platformAdapter.getContext()), s.context = this.contextCached ?? this.platformAdapter.getContext(), s.sessionId = this.sessionId ?? void 0, n && (s.userId = n), this.eventQueue.push(s), this.eventQueue.length >= (this.config.batchSize ?? y) && this.flush();
    };
    r instanceof Promise ? r.then(i).catch(() => {
    }) : i(r);
  }
  start() {
    if (this.isRunning) return;
    const e = this.consentManager.canTrack(), n = (r) => {
      if (!r) return;
      this.isRunning = !0;
      const i = this.platformAdapter.getSessionId();
      i instanceof Promise ? i.then((a) => {
        this.sessionId = a, this.postSessionInit();
      }).catch(() => {
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`, this.postSessionInit();
      }) : (this.sessionId = i, this.postSessionInit());
    };
    e instanceof Promise ? e.then(n).catch(() => {
    }) : n(e);
  }
  /**
   * Called after session ID is resolved. Initializes context, collectors,
   * flush timer, and background handler.
   */
  postSessionInit() {
    this.isRunning && (this.contextCached = this.platformAdapter.getContext(), this.initializeCollectors(), this.startFlushTimer(), this.setupBackgroundHandler(), this.config.geolocation && this.platformAdapter.getGeolocation && this.requestGeolocation());
  }
  // FIX #5: Capture context reference before await to prevent writing to stale/replaced context
  async requestGeolocation() {
    if (!this.platformAdapter.getGeolocation) return;
    const e = this.contextCached, n = await this.platformAdapter.getGeolocation();
    n && e && e === this.contextCached && (e.geolocation = n);
  }
  // FIX #10: Return Promise from stop() so callers can await the final flush
  stop() {
    this.isRunning && (this.isRunning = !1, this.collectors.forEach((e) => e.stop()), this.collectors = [], this.stopFlushTimer(), this.backgroundCleanup && (this.backgroundCleanup(), this.backgroundCleanup = null), this.flush());
  }
  isTracking() {
    return this.isRunning;
  }
  async flush() {
    if (this.eventQueue.length === 0) return;
    const e = [...this.eventQueue];
    this.eventQueue = [];
    try {
      await this.transport.send(e);
    } catch (n) {
      this.config.onError && e[0] && this.config.onError(n, e[0]);
    }
  }
  initializeCollectors() {
    for (const e of this.externalCollectors)
      this.collectors.push(e);
    this.collectors.forEach((e) => e.start(this));
  }
  startFlushTimer() {
    this.stopFlushTimer(), this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval ?? b);
  }
  stopFlushTimer() {
    this.flushTimer && (clearInterval(this.flushTimer), this.flushTimer = null);
  }
  // FIX #4: Store the cleanup function returned by onBackground
  setupBackgroundHandler() {
    this.platformAdapter.onBackground && (this.backgroundCleanup = this.platformAdapter.onBackground(() => {
      this.flush();
    }));
  }
}
let c = null, u = null, l = !1;
async function B() {
  try {
    const t = await import("expo-device");
    return {
      deviceName: t.deviceName ?? null,
      deviceBrand: t.brand ?? null,
      deviceModel: t.modelName ?? null,
      osName: t.osName ?? null,
      osVersion: t.osVersion ?? null,
      isDevice: t.isDevice ?? !1
    };
  } catch {
    return {
      deviceName: null,
      deviceBrand: null,
      deviceModel: null,
      osName: null,
      osVersion: null,
      isDevice: !0
    };
  }
}
async function D() {
  try {
    const t = await import("expo-application");
    return {
      appVersion: t.nativeApplicationVersion ?? null,
      buildNumber: t.nativeBuildVersion ?? null
    };
  } catch {
    return {
      appVersion: null,
      buildNumber: null
    };
  }
}
async function M() {
  var t, e, n, r;
  try {
    const i = await import("expo-localization"), a = ((t = i.getLocales) == null ? void 0 : t.call(i)) ?? [], s = ((e = i.getCalendars) == null ? void 0 : e.call(i)) ?? [];
    return {
      locale: ((n = a[0]) == null ? void 0 : n.languageTag) ?? "en",
      locales: a.map((o) => o.languageTag),
      timeZone: ((r = s[0]) == null ? void 0 : r.timeZone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown"
    };
  } catch {
    try {
      return {
        locale: "en",
        locales: ["en"],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch {
      return {
        locale: "en",
        locales: ["en"],
        timeZone: "unknown"
      };
    }
  }
}
function S() {
  try {
    const { Dimensions: t, PixelRatio: e } = require("react-native"), n = t.get("screen");
    return {
      width: n.width,
      height: n.height,
      pixelRatio: e.get(),
      fontScale: e.getFontScale()
    };
  } catch {
    return {
      width: 0,
      height: 0,
      pixelRatio: 1,
      fontScale: 1
    };
  }
}
function I() {
  try {
    const { Platform: t } = require("react-native");
    return t.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}
async function C() {
  var t;
  if (l)
    return u;
  try {
    const e = await import("expo-location"), { status: n } = await e.requestForegroundPermissionsAsync();
    if (n !== "granted")
      return l = !0, null;
    const r = await e.getCurrentPositionAsync({
      accuracy: ((t = e.Accuracy) == null ? void 0 : t.Balanced) ?? 3
    });
    return u = {
      latitude: r.coords.latitude,
      longitude: r.coords.longitude,
      accuracy: r.coords.accuracy
    }, l = !0, u;
  } catch {
    return l = !0, null;
  }
}
async function V() {
  if (c)
    return c;
  const [t, e, n] = await Promise.all([
    B(),
    D(),
    M()
  ]);
  return c = {
    platform: I(),
    ...t,
    ...e,
    ...n,
    screen: S()
  }, c;
}
async function w() {
  const t = await V();
  return {
    platform: t.platform ?? I(),
    deviceName: t.deviceName ?? null,
    deviceBrand: t.deviceBrand ?? null,
    deviceModel: t.deviceModel ?? null,
    osName: t.osName ?? null,
    osVersion: t.osVersion ?? null,
    appVersion: t.appVersion ?? null,
    buildNumber: t.buildNumber ?? null,
    locale: t.locale ?? "en",
    locales: t.locales ?? ["en"],
    timeZone: t.timeZone ?? "unknown",
    isDevice: t.isDevice ?? !0,
    screen: S(),
    // Always get fresh screen info (orientation changes)
    geolocation: u
  };
}
async function K() {
  return await C(), w();
}
function $() {
  c = null, u = null, l = !1;
}
const g = "@smety_tracker_session_id";
function p() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
async function _() {
  try {
    const t = await T();
    if (!t)
      return p();
    const e = await t.getItem(g);
    if (e)
      return e;
    const n = p();
    return await t.setItem(g, n), n;
  } catch {
    return p();
  }
}
async function X() {
  try {
    const t = await T();
    t && await t.removeItem(g);
  } catch {
  }
}
async function T() {
  try {
    const t = await import("@react-native-async-storage/async-storage");
    return t.default ?? t;
  } catch {
    return null;
  }
}
class L {
  constructor(e) {
    this.name = "screenViews", this.tracker = null, this.unsubscribe = null, this.readyPoller = null, this.previousRouteName = null, this.navigationRef = e.navigationRef, this.trackInitialScreen = e.trackInitialScreen ?? !0, this.readyPollInterval = e.readyPollInterval ?? 100;
  }
  start(e) {
    this.tracker = e, this.navigationRef.isReady() ? this.attachListener() : this.readyPoller = setInterval(() => {
      this.navigationRef.isReady() && (this.clearReadyPoller(), this.attachListener());
    }, this.readyPollInterval);
  }
  stop() {
    this.clearReadyPoller(), this.unsubscribe && (this.unsubscribe(), this.unsubscribe = null), this.tracker = null, this.previousRouteName = null;
  }
  attachListener() {
    this.trackInitialScreen && this.trackCurrentScreen(!0), this.unsubscribe = this.navigationRef.addListener(
      "state",
      () => {
        this.trackCurrentScreen(!1);
      }
    );
  }
  clearReadyPoller() {
    this.readyPoller && (clearInterval(this.readyPoller), this.readyPoller = null);
  }
  trackCurrentScreen(e) {
    var a, s;
    if (!this.tracker) return;
    const n = (s = (a = this.navigationRef).getCurrentRoute) == null ? void 0 : s.call(a);
    if (!n) return;
    const r = n.name;
    if (!e && r === this.previousRouteName) return;
    const i = this.previousRouteName;
    this.previousRouteName = r, this.tracker.trackEvent({
      type: "screen_view",
      name: r,
      properties: {
        screen: r,
        params: n.params ?? {},
        previousScreen: i,
        isInitialScreen: e
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function F(t) {
  return new L(t);
}
let f = null;
class O {
  constructor() {
    this.name = "touch";
  }
  start(e) {
    f = e;
  }
  stop() {
    f = null;
  }
}
function U() {
  return new O();
}
function R(t, e = {}, n) {
  if (!f) {
    console.warn(
      "[@smety/tracker] Touch tracking not initialized. Make sure the tracker is started with the 'touch' collector enabled."
    );
    return;
  }
  f.trackEvent(
    {
      type: "touch",
      name: t,
      properties: e,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    n
  );
}
function z(t, e, n, r) {
  return require("react").useCallback(() => {
    R(t, e ?? {}, r), n == null || n();
  }, [t, r]);
}
const d = (() => {
  try {
    return require("react");
  } catch {
    return null;
  }
})(), m = (() => {
  try {
    return require("react-native");
  } catch {
    return null;
  }
})();
function v(t) {
  if (!d || !m) return null;
  const {
    trackEvent: e,
    trackProperties: n,
    trackUserId: r,
    onPress: i,
    children: a,
    ...s
  } = t, o = d.useCallback(() => {
    R(e, n ?? {}, r), i == null || i();
  }, [e, n, r, i]);
  return d.createElement(
    m.Pressable,
    { ...s, onPress: o },
    a
  );
}
v.displayName = "TrackablePressable";
const J = v;
function Y() {
  return !d || !m ? null : v;
}
class q {
  constructor() {
    this.name = "lifecycle", this.tracker = null, this.subscription = null, this.lastState = "active";
  }
  start(e) {
    this.tracker = e;
    try {
      const { AppState: n } = require("react-native");
      this.lastState = n.currentState, this.trackLifecycleEvent("app_launch"), this.subscription = n.addEventListener(
        "change",
        (r) => {
          this.handleAppStateChange(r);
        }
      );
    } catch {
      this.trackLifecycleEvent("app_launch");
    }
  }
  stop() {
    this.subscription && (this.subscription.remove(), this.subscription = null), this.tracker = null;
  }
  handleAppStateChange(e) {
    this.tracker && ((this.lastState === "background" || this.lastState === "inactive") && e === "active" && this.trackLifecycleEvent("app_foreground"), this.lastState === "active" && e === "background" && (this.trackLifecycleEvent("app_background"), this.tracker.flush()), this.lastState = e);
  }
  trackLifecycleEvent(e) {
    this.tracker && this.tracker.trackEvent({
      type: "app_lifecycle",
      name: e,
      properties: {
        state: e
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function G() {
  return new q();
}
function Z(t) {
  const e = t.platform;
  return e === "ios" || e === "android";
}
function ee(t) {
  return !Z(t);
}
const h = require("react"), k = h.createContext(null);
function j(t) {
  const { tracker: e, autoStart: n = !0, children: r } = t;
  return h.useEffect(() => (n && !e.isTracking() && e.start(), () => {
    n && e.isTracking() && e.stop();
  }), [e, n]), h.createElement(
    k.Provider,
    { value: e },
    r
  );
}
j.displayName = "TrackerProvider";
function te() {
  const t = h.useContext(k);
  if (!t)
    throw new Error(
      "[@smety/tracker] useTracker() must be used inside a <TrackerProvider>. Wrap your app with <TrackerProvider tracker={tracker}> first."
    );
  return t;
}
function ne() {
  return h.useContext(k);
}
function W() {
  try {
    const { Platform: t } = require("react-native");
    return t.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}
function H() {
  let t = null;
  const e = W(), n = w().then((i) => {
    t = i;
  }).catch(() => {
  });
  return { adapter: {
    getContext: () => t || {
      platform: e,
      deviceName: null,
      deviceBrand: null,
      deviceModel: null,
      osName: null,
      osVersion: null,
      appVersion: null,
      buildNumber: null,
      locale: "en",
      locales: ["en"],
      timeZone: "unknown",
      isDevice: !0,
      screen: { width: 0, height: 0, pixelRatio: 1, fontScale: 1 },
      geolocation: null
    },
    getSessionId: _,
    getGeolocation: C,
    onBackground: (i) => {
      try {
        const { AppState: a } = require("react-native"), s = a.addEventListener("change", (o) => {
          o === "background" && i();
        });
        return () => s.remove();
      } catch {
        return () => {
        };
      }
    }
  }, contextReady: n };
}
function Q(t) {
  const e = t.collectors ?? ["screenViews", "lifecycle"], n = [];
  return e.includes("screenViews") && t.navigationRef && n.push(
    F({ navigationRef: t.navigationRef })
  ), e.includes("touch") && n.push(U()), e.includes("lifecycle") && n.push(G()), n;
}
function re(t) {
  const { adapter: e } = H(), n = Q(t), r = new A(
    {
      ...t,
      collectors: [],
      // We handle collectors externally
      platform: e
    },
    n
  );
  return {
    track: r.track.bind(r),
    trackEvent: r.trackEvent.bind(r),
    start: r.start.bind(r),
    stop: r.stop.bind(r),
    isTracking: r.isTracking.bind(r),
    flush: r.flush.bind(r),
    trackScreenView: (a, s = {}, o) => {
      r.trackEvent(
        {
          type: "screen_view",
          name: a,
          properties: {
            screen: a,
            ...s
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        },
        o
      );
    }
  };
}
export {
  J as TrackablePressable,
  A as Tracker,
  j as TrackerProvider,
  X as clearMobileSessionId,
  E as createConsentManager,
  re as createExpoTracker,
  x as createHttpTransport,
  G as createLifecycleCollector,
  F as createScreenViewCollector,
  U as createTouchCollector,
  Y as createTrackablePressable,
  N as defaultConsentManager,
  w as getMobileContext,
  K as getMobileContextWithGeo,
  C as getMobileGeolocation,
  _ as getMobileSessionId,
  ee as isBrowserContext,
  Z as isMobileContext,
  $ as resetMobileContextCache,
  R as trackPress,
  z as useTrackPress,
  te as useTracker,
  ne as useTrackerOptional
};
//# sourceMappingURL=expo.es.js.map
