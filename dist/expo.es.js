class P {
  constructor(t) {
    this.endpoint = t.endpoint, this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": t.apiKey,
      ...t.projectId ? { "X-Project-ID": t.projectId } : {},
      ...t.headers
    }, this.useBeacon = t.useBeacon ?? !1;
  }
  async send(t) {
    if (t.length === 0) return;
    const n = { events: t };
    if (this.useBeacon && typeof navigator.sendBeacon == "function") {
      this.sendWithBeacon(n);
      return;
    }
    await this.sendWithFetch(n);
  }
  sendWithBeacon(t) {
    if (typeof Blob > "u" || typeof (navigator == null ? void 0 : navigator.sendBeacon) != "function") {
      this.sendWithFetch(t);
      return;
    }
    const n = new Blob([JSON.stringify(t)], {
      type: "application/json"
    });
    navigator.sendBeacon(this.endpoint, n);
  }
  async sendWithFetch(t) {
    try {
      const n = typeof navigator < "u" && navigator.product === "ReactNative";
      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(t),
        ...n ? {} : { keepalive: !0 }
      });
    } catch (n) {
      console.warn("Analytics tracking failed:", n);
    }
  }
}
function x(e) {
  return new P(e);
}
function E(e) {
  const t = /* @__PURE__ */ new Set();
  return e != null && e.onUpdate && e.onUpdate((a) => {
    t.forEach((s) => {
      try {
        s(a);
      } catch {
      }
    });
  }), {
    canTrack: () => {
      if (!e)
        return !0;
      try {
        return e.canTrack();
      } catch {
        return !1;
      }
    },
    onUpdate: (a) => {
      t.add(a);
    },
    clearCallbacks: () => {
      t.clear();
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
  constructor(t, n) {
    this.eventQueue = [], this.collectors = [], this.isRunning = !1, this.flushTimer = null, this.contextCached = null, this.sessionId = null, this.externalCollectors = [], this.backgroundCleanup = null, this.config = {
      batchSize: y,
      flushInterval: b,
      geolocation: !1,
      ...t
    }, this.externalCollectors = n ?? [], this.platformAdapter = this.config.platform ?? {
      getContext: () => ({}),
      getSessionId: () => "no-session"
    }, this.transport = x({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      projectId: this.config.projectId,
      useBeacon: !1
    }), this.consentManager = this.config.consent ? E(this.config.consent) : N, this.setupConsentListener();
  }
  setupConsentListener() {
    this.consentManager.onUpdate((t) => {
      t && !this.isRunning ? this.start() : !t && this.isRunning && this.stop();
    });
  }
  track(t, n = {}, r) {
    this.trackEvent(
      {
        type: "custom",
        name: t,
        properties: n,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      r
    );
  }
  trackEvent(t, n) {
    if (!this.isRunning) return;
    const r = this.consentManager.canTrack(), i = (a) => {
      if (!a || !this.isRunning) return;
      let s = { ...t };
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
    const t = this.consentManager.canTrack(), n = (r) => {
      if (!r) return;
      this.isRunning = !0;
      const i = this.platformAdapter.getSessionId();
      i instanceof Promise ? i.then((a) => {
        this.sessionId = a, this.postSessionInit();
      }).catch(() => {
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`, this.postSessionInit();
      }) : (this.sessionId = i, this.postSessionInit());
    };
    t instanceof Promise ? t.then(n).catch(() => {
    }) : n(t);
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
    const t = this.contextCached, n = await this.platformAdapter.getGeolocation();
    n && t && t === this.contextCached && (t.geolocation = n);
  }
  // FIX #10: Return Promise from stop() so callers can await the final flush
  stop() {
    this.isRunning && (this.isRunning = !1, this.collectors.forEach((t) => t.stop()), this.collectors = [], this.stopFlushTimer(), this.backgroundCleanup && (this.backgroundCleanup(), this.backgroundCleanup = null), this.flush());
  }
  isTracking() {
    return this.isRunning;
  }
  async flush() {
    if (this.eventQueue.length === 0) return;
    const t = [...this.eventQueue];
    this.eventQueue = [];
    try {
      await this.transport.send(t);
    } catch (n) {
      this.config.onError && t[0] && this.config.onError(n, t[0]);
    }
  }
  initializeCollectors() {
    for (const t of this.externalCollectors)
      this.collectors.push(t);
    this.collectors.forEach((t) => t.start(this));
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
    const e = await import("expo-device");
    return {
      deviceName: e.deviceName ?? null,
      deviceBrand: e.brand ?? null,
      deviceModel: e.modelName ?? null,
      osName: e.osName ?? null,
      osVersion: e.osVersion ?? null,
      isDevice: e.isDevice ?? !1
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
    const e = await import("expo-application");
    return {
      appVersion: e.nativeApplicationVersion ?? null,
      buildNumber: e.nativeBuildVersion ?? null
    };
  } catch {
    return {
      appVersion: null,
      buildNumber: null
    };
  }
}
async function M() {
  var e, t, n, r;
  try {
    const i = await import("expo-localization"), a = ((e = i.getLocales) == null ? void 0 : e.call(i)) ?? [], s = ((t = i.getCalendars) == null ? void 0 : t.call(i)) ?? [];
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
    const { Dimensions: e, PixelRatio: t } = require("react-native"), n = e.get("screen");
    return {
      width: n.width,
      height: n.height,
      pixelRatio: t.get(),
      fontScale: t.getFontScale()
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
function C() {
  try {
    const { Platform: e } = require("react-native");
    return e.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}
async function w() {
  var e;
  if (l)
    return u;
  try {
    const t = await import("expo-location"), { status: n } = await t.requestForegroundPermissionsAsync();
    if (n !== "granted")
      return l = !0, null;
    const r = await t.getCurrentPositionAsync({
      accuracy: ((e = t.Accuracy) == null ? void 0 : e.Balanced) ?? 3
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
  const [e, t, n] = await Promise.all([
    B(),
    D(),
    M()
  ]);
  return c = {
    platform: C(),
    ...e,
    ...t,
    ...n,
    screen: S()
  }, c;
}
async function T() {
  const e = await V();
  return {
    platform: e.platform ?? C(),
    deviceName: e.deviceName ?? null,
    deviceBrand: e.deviceBrand ?? null,
    deviceModel: e.deviceModel ?? null,
    osName: e.osName ?? null,
    osVersion: e.osVersion ?? null,
    appVersion: e.appVersion ?? null,
    buildNumber: e.buildNumber ?? null,
    locale: e.locale ?? "en",
    locales: e.locales ?? ["en"],
    timeZone: e.timeZone ?? "unknown",
    isDevice: e.isDevice ?? !0,
    screen: S(),
    // Always get fresh screen info (orientation changes)
    geolocation: u
  };
}
async function K() {
  return await w(), T();
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
    const e = await I();
    if (!e)
      return p();
    const t = await e.getItem(g);
    if (t)
      return t;
    const n = p();
    return await e.setItem(g, n), n;
  } catch {
    return p();
  }
}
async function z() {
  try {
    const e = await I();
    e && await e.removeItem(g);
  } catch {
  }
}
async function I() {
  try {
    const e = await import("@react-native-async-storage/async-storage");
    return e.default ?? e;
  } catch {
    return null;
  }
}
class L {
  constructor(t) {
    this.name = "screenViews", this.tracker = null, this.unsubscribe = null, this.readyPoller = null, this.previousRouteName = null, this.navigationRef = t.navigationRef, this.trackInitialScreen = t.trackInitialScreen ?? !0, this.readyPollInterval = t.readyPollInterval ?? 100;
  }
  start(t) {
    this.tracker = t, this.navigationRef.isReady() ? this.attachListener() : this.readyPoller = setInterval(() => {
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
  trackCurrentScreen(t) {
    var a, s;
    if (!this.tracker) return;
    const n = (s = (a = this.navigationRef).getCurrentRoute) == null ? void 0 : s.call(a);
    if (!n) return;
    const r = n.name;
    if (!t && r === this.previousRouteName) return;
    const i = this.previousRouteName;
    this.previousRouteName = r, this.tracker.trackEvent({
      type: "screen_view",
      name: r,
      properties: {
        screen: r,
        params: n.params ?? {},
        previousScreen: i,
        isInitialScreen: t
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function F(e) {
  return new L(e);
}
let f = null;
class O {
  constructor() {
    this.name = "touch";
  }
  start(t) {
    f = t;
  }
  stop() {
    f = null;
  }
}
function U() {
  return new O();
}
function R(e, t = {}, n) {
  if (!f) {
    console.warn(
      "[@smety/tracker] Touch tracking not initialized. Make sure the tracker is started with the 'touch' collector enabled."
    );
    return;
  }
  f.trackEvent(
    {
      type: "touch",
      name: e,
      properties: t,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    n
  );
}
function J(e, t, n, r) {
  return require("react").useCallback(() => {
    R(e, t ?? {}, r), n == null || n();
  }, [e, r]);
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
function v(e) {
  if (!d || !m) return null;
  const {
    trackEvent: t,
    trackProperties: n,
    trackUserId: r,
    onPress: i,
    children: a,
    ...s
  } = e, o = d.useCallback(() => {
    R(t, n ?? {}, r), i == null || i();
  }, [t, n, r, i]);
  return d.createElement(
    m.Pressable,
    { ...s, onPress: o },
    a
  );
}
v.displayName = "TrackablePressable";
const X = v;
function Y() {
  return !d || !m ? null : v;
}
class q {
  constructor() {
    this.name = "lifecycle", this.tracker = null, this.subscription = null, this.lastState = "active";
  }
  start(t) {
    this.tracker = t;
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
  handleAppStateChange(t) {
    this.tracker && ((this.lastState === "background" || this.lastState === "inactive") && t === "active" && this.trackLifecycleEvent("app_foreground"), this.lastState === "active" && t === "background" && (this.trackLifecycleEvent("app_background"), this.tracker.flush()), this.lastState = t);
  }
  trackLifecycleEvent(t) {
    this.tracker && this.tracker.trackEvent({
      type: "app_lifecycle",
      name: t,
      properties: {
        state: t
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function G() {
  return new q();
}
function Z(e) {
  const t = e.platform;
  return t === "ios" || t === "android";
}
function tt(e) {
  return !Z(e);
}
const h = require("react"), k = h.createContext(null);
function j(e) {
  const { tracker: t, autoStart: n = !0, children: r } = e;
  return h.useEffect(() => (n && !t.isTracking() && t.start(), () => {
    n && t.isTracking() && t.stop();
  }), [t, n]), h.createElement(
    k.Provider,
    { value: t },
    r
  );
}
j.displayName = "TrackerProvider";
function et() {
  const e = h.useContext(k);
  if (!e)
    throw new Error(
      "[@smety/tracker] useTracker() must be used inside a <TrackerProvider>. Wrap your app with <TrackerProvider tracker={tracker}> first."
    );
  return e;
}
function nt() {
  return h.useContext(k);
}
function W() {
  try {
    const { Platform: e } = require("react-native");
    return e.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}
function H() {
  let e = null;
  const t = W(), n = T().then((i) => {
    e = i;
  }).catch(() => {
  });
  return { adapter: {
    getContext: () => e || {
      platform: t,
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
    getGeolocation: w,
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
function Q(e) {
  const t = e.collectors ?? ["screenViews", "lifecycle"], n = [];
  return t.includes("screenViews") && e.navigationRef && n.push(
    F({ navigationRef: e.navigationRef })
  ), t.includes("touch") && n.push(U()), t.includes("lifecycle") && n.push(G()), n;
}
function rt(e) {
  const { adapter: t } = H(), n = Q(e), r = new A(
    {
      ...e,
      collectors: [],
      // We handle collectors externally
      platform: t
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
  X as TrackablePressable,
  A as Tracker,
  j as TrackerProvider,
  z as clearMobileSessionId,
  E as createConsentManager,
  rt as createExpoTracker,
  x as createHttpTransport,
  G as createLifecycleCollector,
  F as createScreenViewCollector,
  U as createTouchCollector,
  Y as createTrackablePressable,
  N as defaultConsentManager,
  T as getMobileContext,
  K as getMobileContextWithGeo,
  w as getMobileGeolocation,
  _ as getMobileSessionId,
  tt as isBrowserContext,
  Z as isMobileContext,
  $ as resetMobileContextCache,
  R as trackPress,
  J as useTrackPress,
  et as useTracker,
  nt as useTrackerOptional
};
//# sourceMappingURL=expo.es.js.map
