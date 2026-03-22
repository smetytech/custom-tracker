class p {
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
    const n = new Blob([JSON.stringify(t)], {
      type: "application/json"
    });
    navigator.sendBeacon(this.endpoint, n);
  }
  async sendWithFetch(t) {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(t),
        keepalive: !0
      });
    } catch (n) {
      console.warn("Analytics tracking failed:", n);
    }
  }
}
function w(e) {
  return new p(e);
}
function k(e) {
  const t = /* @__PURE__ */ new Set();
  return {
    canTrack: () => {
      if (!e)
        return !0;
      try {
        return e.canTrack();
      } catch {
        return !1;
      }
    },
    onUpdate: (r) => {
      t.add(r), e != null && e.onUpdate && e.onUpdate((a) => {
        t.forEach((o) => {
          try {
            o(a);
          } catch {
          }
        });
      });
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
}, y = ["[data-track-event]", "[data-track]", "[data-goal]"];
class S {
  constructor(t) {
    this.name = "clicks", this.tracker = null, this.selectors = (t == null ? void 0 : t.selectors) ?? y, this.handleClick = this.handleGlobalClick.bind(this);
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
    const i = n.dataset, s = i.trackEvent || i.track || i.goal || "click", r = {};
    for (const [a, o] of Object.entries(i))
      ["trackEvent", "track", "goal"].includes(a) || (r[a] = o);
    this.tracker.trackEvent({
      type: "click",
      name: s,
      properties: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function C(e) {
  return new S(e);
}
class T {
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
    this.originalPushState = history.pushState, this.originalReplaceState = history.replaceState, history.pushState = function(n, i, s) {
      t.originalPushState.call(this, n, i, s), t.trackPageView();
    }, history.replaceState = function(n, i, s) {
      t.originalReplaceState.call(this, n, i, s), t.trackPageView();
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
function E(e) {
  return new T(e);
}
function L() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "unknown";
  }
}
function P() {
  const e = navigator;
  return e.connection ? {
    effectiveType: e.connection.effectiveType ?? "unknown",
    downlink: e.connection.downlink ?? null,
    rtt: e.connection.rtt ?? null,
    saveData: e.connection.saveData ?? null
  } : null;
}
function H() {
  const e = performance;
  return e.memory ? {
    usedJSHeapSize: e.memory.usedJSHeapSize ?? null,
    totalJSHeapSize: e.memory.totalJSHeapSize ?? null,
    jsHeapSizeLimit: e.memory.jsHeapSizeLimit ?? null
  } : null;
}
function b() {
  const e = new URLSearchParams(window.location.search);
  return {
    source: e.get("utm_source"),
    medium: e.get("utm_medium"),
    campaign: e.get("utm_campaign"),
    term: e.get("utm_term"),
    content: e.get("utm_content")
  };
}
let c = null, l = null;
async function m() {
  return c !== null ? c : l || (l = new Promise((e) => {
    if (!navigator.geolocation) {
      e(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (t) => {
        c = {
          latitude: t.coords.latitude,
          longitude: t.coords.longitude,
          accuracy: t.coords.accuracy
        }, e(c);
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
function h() {
  var e;
  return {
    url: window.location.href,
    path: window.location.pathname,
    query: window.location.search || null,
    referrer: document.referrer || null,
    language: navigator.language,
    languages: [...navigator.languages],
    timeZone: L(),
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
    connection: P(),
    memory: H(),
    utm: b(),
    geolocation: c
  };
}
async function R() {
  return await m(), h();
}
const u = 10, d = 5e3, g = "analytics_session_id";
function f() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
function I() {
  if (typeof sessionStorage > "u")
    return f();
  const e = sessionStorage.getItem(g);
  if (e)
    return e;
  const t = f();
  return sessionStorage.setItem(g, t), t;
}
class _ {
  constructor(t) {
    this.eventQueue = [], this.collectors = [], this.isRunning = !1, this.flushTimer = null, this.contextCached = null, this.config = {
      batchSize: u,
      flushInterval: d,
      geolocation: !1,
      ...t
    }, this.sessionId = I(), this.transport = w({
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
    const i = this.consentManager.canTrack(), s = (r) => {
      if (!r) return;
      let a = t;
      if (this.config.onBeforeSend) {
        const o = this.config.onBeforeSend(t);
        if (!o) return;
        a = o;
      }
      t.type === "page_view" && (this.contextCached = h()), a.context = this.contextCached ?? h(), a.sessionId = this.sessionId, n && (a.userId = n), this.eventQueue.push(a), this.eventQueue.length >= (this.config.batchSize ?? u) && this.flush();
    };
    i instanceof Promise ? i.then(s).catch(() => {
    }) : s(i);
  }
  start() {
    if (this.isRunning) return;
    const t = this.consentManager.canTrack(), n = (i) => {
      i && (this.isRunning = !0, this.contextCached = h(), this.initializeCollectors(), this.startFlushTimer(), this.setupUnloadHandler(), this.config.geolocation && this.requestGeolocation());
    };
    t instanceof Promise ? t.then(n).catch(() => {
    }) : n(t);
  }
  async requestGeolocation() {
    const t = await m();
    t && this.contextCached && (this.contextCached.geolocation = t);
  }
  stop() {
    this.isRunning && (this.isRunning = !1, this.collectors.forEach((t) => t.stop()), this.collectors = [], this.stopFlushTimer(), this.flush());
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
    const t = this.config.collectors ?? ["pageViews", "clicks"];
    t.includes("pageViews") && this.collectors.push(E()), t.includes("clicks") && this.collectors.push(C()), this.collectors.forEach((n) => n.start(this));
  }
  startFlushTimer() {
    this.stopFlushTimer(), this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval ?? d);
  }
  stopFlushTimer() {
    this.flushTimer && (clearInterval(this.flushTimer), this.flushTimer = null);
  }
  setupUnloadHandler() {
    window.addEventListener("visibilitychange", () => {
      document.visibilityState === "hidden" && this.flush();
    });
  }
}
function U(e) {
  return new _(e);
}
export {
  _ as Tracker,
  C as createClickCollector,
  k as createConsentManager,
  w as createHttpTransport,
  E as createPageViewCollector,
  U as createTracker,
  v as defaultConsentManager,
  h as getBrowserContext,
  R as getBrowserContextWithGeo,
  m as getGeolocation
};
//# sourceMappingURL=tracker.es.js.map
