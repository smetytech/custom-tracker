class m {
  constructor(t) {
    this.endpoint = t.endpoint, this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": t.apiKey,
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
function w(e) {
  return new m(e);
}
function k(e) {
  const t = /* @__PURE__ */ new Set();
  return e != null && e.onUpdate && e.onUpdate((o) => {
    t.forEach((s) => {
      try {
        s(o);
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
    onUpdate: (o) => {
      t.add(o);
    },
    clearCallbacks: () => {
      t.clear();
    }
  };
}
const v = {
  canTrack: () => !0,
  onUpdate: () => {
  },
  clearCallbacks: () => {
  }
}, h = 10, u = 5e3;
class S {
  constructor(t, n) {
    this.eventQueue = [], this.collectors = [], this.isRunning = !1, this.flushTimer = null, this.contextCached = null, this.sessionId = null, this.externalCollectors = [], this.backgroundCleanup = null, this.config = {
      batchSize: h,
      flushInterval: u,
      geolocation: !1,
      ...t
    }, this.externalCollectors = n ?? [], this.platformAdapter = this.config.platform ?? {
      getContext: () => ({}),
      getSessionId: () => "no-session"
    }, this.transport = w({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      useBeacon: !1
    }), this.consentManager = this.config.consent ? k(this.config.consent) : v, this.setupConsentListener();
  }
  setupConsentListener() {
    this.consentManager.onUpdate((t) => {
      t && !this.isRunning ? this.start() : !t && this.isRunning && this.stop();
    });
  }
  track(t, n = {}, i) {
    this.trackEvent(
      {
        type: "custom",
        name: t,
        properties: n,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      i
    );
  }
  trackEvent(t, n) {
    if (!this.isRunning) return;
    const i = this.consentManager.canTrack(), a = (o) => {
      if (!o || !this.isRunning) return;
      let s = { ...t };
      if (this.config.onBeforeSend) {
        const c = this.config.onBeforeSend(s);
        if (!c) return;
        s = { ...c };
      }
      (s.type === "page_view" || s.type === "screen_view") && (this.contextCached = this.platformAdapter.getContext()), s.context = this.contextCached ?? this.platformAdapter.getContext(), s.sessionId = this.sessionId ?? void 0, n && (s.userId = n), this.eventQueue.push(s), this.eventQueue.length >= (this.config.batchSize ?? h) && this.flush();
    };
    i instanceof Promise ? i.then(a).catch(() => {
    }) : a(i);
  }
  start() {
    if (this.isRunning) return;
    const t = this.consentManager.canTrack(), n = (i) => {
      if (!i) return;
      this.isRunning = !0;
      const a = this.platformAdapter.getSessionId();
      a instanceof Promise ? a.then((o) => {
        this.sessionId = o, this.postSessionInit();
      }).catch(() => {
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`, this.postSessionInit();
      }) : (this.sessionId = a, this.postSessionInit());
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
    }, this.config.flushInterval ?? u);
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
function y() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "unknown";
  }
}
function C() {
  const e = navigator;
  return e.connection ? {
    effectiveType: e.connection.effectiveType ?? "unknown",
    downlink: e.connection.downlink ?? null,
    rtt: e.connection.rtt ?? null,
    saveData: e.connection.saveData ?? null
  } : null;
}
function T() {
  const e = performance;
  return e.memory ? {
    usedJSHeapSize: e.memory.usedJSHeapSize ?? null,
    totalJSHeapSize: e.memory.totalJSHeapSize ?? null,
    jsHeapSizeLimit: e.memory.jsHeapSizeLimit ?? null
  } : null;
}
function E() {
  const e = new URLSearchParams(window.location.search);
  return {
    source: e.get("utm_source"),
    medium: e.get("utm_medium"),
    campaign: e.get("utm_campaign"),
    term: e.get("utm_term"),
    content: e.get("utm_content")
  };
}
let r = null, l = null;
async function f() {
  return r !== null ? r : l || (l = new Promise((e) => {
    if (!navigator.geolocation) {
      e(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (t) => {
        r = {
          latitude: t.coords.latitude,
          longitude: t.coords.longitude,
          accuracy: t.coords.accuracy
        }, e(r);
      },
      () => {
        e(null);
      },
      {
        enableHighAccuracy: !1,
        timeout: 5e3,
        maximumAge: 3e5
      }
    );
  }), l);
}
function p() {
  var e;
  return {
    url: window.location.href,
    path: window.location.pathname,
    query: window.location.search || null,
    referrer: document.referrer || null,
    language: navigator.language,
    languages: [...navigator.languages],
    timeZone: y(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      orientation: ((e = window.screen.orientation) == null ? void 0 : e.type) ?? null
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    connection: C(),
    memory: T(),
    utm: E(),
    geolocation: r
  };
}
async function _() {
  return await f(), p();
}
const b = ["[data-track-event]", "[data-track]", "[data-goal]"];
class I {
  constructor(t) {
    this.name = "clicks", this.tracker = null, this.selectors = (t == null ? void 0 : t.selectors) ?? b, this.handleClick = this.handleGlobalClick.bind(this);
  }
  start(t) {
    this.tracker = t, document.addEventListener("click", this.handleClick, { capture: !0 });
  }
  stop() {
    document.removeEventListener("click", this.handleClick, { capture: !0 }), this.tracker = null;
  }
  handleGlobalClick(t) {
    const n = t.target instanceof Element ? t.target.closest(this.selectors.join(", ")) : null;
    if (!n || !this.tracker) return;
    const i = n.dataset, a = i.trackEvent || i.track || i.goal || "click", o = {};
    for (const [s, c] of Object.entries(i))
      ["trackEvent", "track", "goal"].includes(s) || (o[s] = c);
    this.tracker.trackEvent({
      type: "click",
      name: a,
      properties: o,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function L(e) {
  return new I(e);
}
class P {
  constructor(t) {
    this.name = "pageViews", this.tracker = null, this.originalPushState = null, this.originalReplaceState = null, this.trackOnLoad = (t == null ? void 0 : t.trackOnLoad) ?? !0, this.trackHashChanges = (t == null ? void 0 : t.trackHashChanges) ?? !1, this.handlePopState = this.trackPageView.bind(this), this.handleHashChange = this.trackPageView.bind(this), this.handleLoad = this.trackPageView.bind(this);
  }
  start(t) {
    this.tracker = t, this.trackOnLoad && (document.readyState === "complete" ? this.trackPageView() : window.addEventListener("load", this.handleLoad)), this.patchHistory(), window.addEventListener("popstate", this.handlePopState), this.trackHashChanges && window.addEventListener("hashchange", this.handleHashChange);
  }
  stop() {
    this.trackOnLoad && window.removeEventListener("load", this.handleLoad), this.unpatchHistory(), window.removeEventListener("popstate", this.handlePopState), this.trackHashChanges && window.removeEventListener("hashchange", this.handleHashChange), this.tracker = null;
  }
  patchHistory() {
    const t = this;
    this.originalPushState = history.pushState, this.originalReplaceState = history.replaceState, history.pushState = function(n, i, a) {
      t.originalPushState.call(this, n, i, a), t.trackPageView();
    }, history.replaceState = function(n, i, a) {
      t.originalReplaceState.call(this, n, i, a), t.trackPageView();
    };
  }
  unpatchHistory() {
    this.originalPushState && (history.pushState = this.originalPushState), this.originalReplaceState && (history.replaceState = this.originalReplaceState);
  }
  trackPageView() {
    if (!this.tracker) return;
    const t = new URLSearchParams(window.location.search), n = {
      source: t.get("utm_source"),
      medium: t.get("utm_medium"),
      campaign: t.get("utm_campaign"),
      term: t.get("utm_term"),
      content: t.get("utm_content")
    };
    this.tracker.trackEvent({
      type: "page_view",
      name: "page_view",
      properties: {
        url: window.location.href,
        path: window.location.pathname,
        query: window.location.search || null,
        referrer: document.referrer || null,
        title: document.title,
        utm: n
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function H(e) {
  return new P(e);
}
function R(e) {
  const t = e.platform;
  return t === "ios" || t === "android";
}
function D(e) {
  return !R(e);
}
const d = "analytics_session_id";
function g() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
function B() {
  if (typeof sessionStorage > "u")
    return g();
  const e = sessionStorage.getItem(d);
  if (e)
    return e;
  const t = g();
  return sessionStorage.setItem(d, t), t;
}
function x() {
  return {
    getContext: p,
    getSessionId: B,
    getGeolocation: f,
    onBackground: (e) => {
      const t = () => {
        document.visibilityState === "hidden" && e();
      };
      return window.addEventListener("visibilitychange", t), () => window.removeEventListener("visibilitychange", t);
    }
  };
}
function A(e) {
  const t = e.collectors ?? ["pageViews", "clicks"], n = [];
  return t.includes("pageViews") && n.push(H()), t.includes("clicks") && n.push(L()), n;
}
function U(e) {
  const t = {
    ...e,
    platform: e.platform ?? x()
  }, n = A(e);
  return new S(t, n);
}
export {
  S as Tracker,
  L as createClickCollector,
  k as createConsentManager,
  w as createHttpTransport,
  H as createPageViewCollector,
  U as createTracker,
  v as defaultConsentManager,
  p as getBrowserContext,
  _ as getBrowserContextWithGeo,
  f as getGeolocation,
  D as isBrowserContext,
  R as isMobileContext
};
//# sourceMappingURL=tracker.es.js.map
