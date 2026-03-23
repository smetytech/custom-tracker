class w {
  constructor(t) {
    this.endpoint = t.endpoint, this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": t.apiKey,
      ...t.headers
    }, this.useBeacon = t.useBeacon ?? !1;
  }
  async send(t) {
    if (t.length === 0) return;
    const e = { events: t };
    if (this.useBeacon && typeof navigator.sendBeacon == "function") {
      this.sendWithBeacon(e);
      return;
    }
    await this.sendWithFetch(e);
  }
  sendWithBeacon(t) {
    if (typeof Blob > "u" || typeof (navigator == null ? void 0 : navigator.sendBeacon) != "function") {
      this.sendWithFetch(t);
      return;
    }
    const e = new Blob([JSON.stringify(t)], {
      type: "application/json"
    });
    navigator.sendBeacon(this.endpoint, e);
  }
  async sendWithFetch(t) {
    try {
      const e = typeof navigator < "u" && navigator.product === "ReactNative";
      await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(t),
        ...e ? {} : { keepalive: !0 }
      });
    } catch (e) {
      console.warn("Analytics tracking failed:", e);
    }
  }
}
function v(n) {
  return new w(n);
}
function S(n) {
  const t = /* @__PURE__ */ new Set();
  return n != null && n.onUpdate && n.onUpdate((r) => {
    t.forEach((a) => {
      try {
        a(r);
      } catch {
      }
    });
  }), {
    canTrack: () => {
      if (!n)
        return !0;
      try {
        return n.canTrack();
      } catch {
        return !1;
      }
    },
    onUpdate: (r) => {
      t.add(r);
    },
    clearCallbacks: () => {
      t.clear();
    }
  };
}
const k = {
  canTrack: () => !0,
  onUpdate: () => {
  },
  clearCallbacks: () => {
  }
}, h = 10, u = 5e3;
class y {
  constructor(t, e) {
    this.eventQueue = [], this.collectors = [], this.isRunning = !1, this.flushTimer = null, this.contextCached = null, this.sessionId = null, this.externalCollectors = [], this.backgroundCleanup = null, this.config = {
      batchSize: h,
      flushInterval: u,
      geolocation: !1,
      ...t
    }, this.externalCollectors = e ?? [], this.platformAdapter = this.config.platform ?? {
      getContext: () => ({}),
      getSessionId: () => "no-session"
    }, this.transport = v({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      useBeacon: !1
    }), this.consentManager = this.config.consent ? S(this.config.consent) : k, this.setupConsentListener();
  }
  setupConsentListener() {
    this.consentManager.onUpdate((t) => {
      t && !this.isRunning ? this.start() : !t && this.isRunning && this.stop();
    });
  }
  track(t, e = {}, i) {
    this.trackEvent(
      {
        type: "custom",
        name: t,
        properties: e,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      i
    );
  }
  trackEvent(t, e) {
    if (!this.isRunning) return;
    const i = this.consentManager.canTrack(), s = (r) => {
      if (!r || !this.isRunning) return;
      let a = { ...t };
      if (this.config.onBeforeSend) {
        const o = this.config.onBeforeSend(a);
        if (!o) return;
        a = { ...o };
      }
      (a.type === "page_view" || a.type === "screen_view") && (this.contextCached = this.platformAdapter.getContext()), a.context = this.contextCached ?? this.platformAdapter.getContext(), a.sessionId = this.sessionId ?? void 0, e && (a.userId = e), this.eventQueue.push(a), this.eventQueue.length >= (this.config.batchSize ?? h) && this.flush();
    };
    i instanceof Promise ? i.then(s).catch(() => {
    }) : s(i);
  }
  start() {
    if (this.isRunning) return;
    const t = this.consentManager.canTrack(), e = (i) => {
      if (!i) return;
      this.isRunning = !0;
      const s = this.platformAdapter.getSessionId();
      s instanceof Promise ? s.then((r) => {
        this.sessionId = r, this.postSessionInit();
      }).catch(() => {
        this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`, this.postSessionInit();
      }) : (this.sessionId = s, this.postSessionInit());
    };
    t instanceof Promise ? t.then(e).catch(() => {
    }) : e(t);
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
    const t = this.contextCached, e = await this.platformAdapter.getGeolocation();
    e && t && t === this.contextCached && (t.geolocation = e);
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
    } catch (e) {
      this.config.onError && t[0] && this.config.onError(e, t[0]);
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
function b() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "unknown";
  }
}
function E() {
  const n = navigator;
  return n.connection ? {
    effectiveType: n.connection.effectiveType ?? "unknown",
    downlink: n.connection.downlink ?? null,
    rtt: n.connection.rtt ?? null,
    saveData: n.connection.saveData ?? null
  } : null;
}
function C() {
  const n = performance;
  return n.memory ? {
    usedJSHeapSize: n.memory.usedJSHeapSize ?? null,
    totalJSHeapSize: n.memory.totalJSHeapSize ?? null,
    jsHeapSizeLimit: n.memory.jsHeapSizeLimit ?? null
  } : null;
}
function T() {
  const n = new URLSearchParams(window.location.search);
  return {
    source: n.get("utm_source"),
    medium: n.get("utm_medium"),
    campaign: n.get("utm_campaign"),
    term: n.get("utm_term"),
    content: n.get("utm_content")
  };
}
let c = null, l = null;
async function g() {
  return c !== null ? c : l || (l = new Promise((n) => {
    if (!navigator.geolocation) {
      n(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (t) => {
        c = {
          latitude: t.coords.latitude,
          longitude: t.coords.longitude,
          accuracy: t.coords.accuracy
        }, n(c);
      },
      () => {
        n(null);
      },
      {
        enableHighAccuracy: !1,
        timeout: 5e3,
        maximumAge: 3e5
      }
    );
  }), l);
}
function m() {
  var n;
  return {
    url: window.location.href,
    path: window.location.pathname,
    query: window.location.search || null,
    referrer: document.referrer || null,
    language: navigator.language,
    languages: [...navigator.languages],
    timeZone: b(),
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
      orientation: ((n = window.screen.orientation) == null ? void 0 : n.type) ?? null
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    connection: E(),
    memory: C(),
    utm: T(),
    geolocation: c
  };
}
async function M() {
  return await g(), m();
}
const L = ["[data-track-event]", "[data-track]", "[data-goal]"];
class A {
  constructor(t) {
    this.name = "clicks", this.tracker = null, this.selectors = (t == null ? void 0 : t.selectors) ?? L, this.handleClick = this.handleGlobalClick.bind(this);
  }
  start(t) {
    this.tracker = t, document.addEventListener("click", this.handleClick, { capture: !0 });
  }
  stop() {
    document.removeEventListener("click", this.handleClick, { capture: !0 }), this.tracker = null;
  }
  handleGlobalClick(t) {
    const e = t.target instanceof Element ? t.target.closest(this.selectors.join(", ")) : null;
    if (!e || !this.tracker) return;
    const i = e.dataset, s = i.trackEvent || i.track || i.goal || "click", r = {};
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
function P(n) {
  return new A(n);
}
class I {
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
    this.originalPushState = history.pushState, this.originalReplaceState = history.replaceState, history.pushState = function(e, i, s) {
      t.originalPushState.call(this, e, i, s), t.trackPageView();
    }, history.replaceState = function(e, i, s) {
      t.originalReplaceState.call(this, e, i, s), t.trackPageView();
    };
  }
  unpatchHistory() {
    this.originalPushState && (history.pushState = this.originalPushState), this.originalReplaceState && (history.replaceState = this.originalReplaceState);
  }
  trackPageView() {
    if (!this.tracker) return;
    const t = new URLSearchParams(window.location.search), e = {
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
        utm: e
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function R(n) {
  return new I(n);
}
const H = "data-track-section", O = 0.5, _ = 1e3;
class D {
  constructor(t) {
    this.name = "sections", this.tracker = null, this.observer = null, this.mutationObserver = null, this.sections = /* @__PURE__ */ new Map(), this.originalPushState = null, this.handlePopState = null, this.attribute = (t == null ? void 0 : t.attribute) ?? H, this.threshold = (t == null ? void 0 : t.threshold) ?? O, this.minDwellTime = (t == null ? void 0 : t.minDwellTime) ?? _, this.allowReentry = (t == null ? void 0 : t.allowReentry) ?? !1;
  }
  start(t) {
    this.tracker = t, this.observer = new IntersectionObserver(
      (e) => this.handleIntersections(e),
      { threshold: this.threshold }
    ), this.observeExistingSections(), this.mutationObserver = new MutationObserver((e) => {
      this.handleMutations(e);
    }), this.mutationObserver.observe(document.body, {
      childList: !0,
      subtree: !0
    }), this.setupNavigationListener();
  }
  stop() {
    this.flushVisibleSections(), this.observer && (this.observer.disconnect(), this.observer = null), this.mutationObserver && (this.mutationObserver.disconnect(), this.mutationObserver = null), this.teardownNavigationListener(), this.sections.clear(), this.tracker = null;
  }
  observeExistingSections() {
    document.querySelectorAll(`[${this.attribute}]`).forEach((e) => this.observeElement(e));
  }
  observeElement(t) {
    !this.observer || this.sections.has(t) || (this.sections.set(t, { enteredAt: null, fired: !1 }), this.observer.observe(t));
  }
  unobserveElement(t) {
    if (!this.observer) return;
    const e = this.sections.get(t);
    (e == null ? void 0 : e.enteredAt) !== null && this.recordSectionView(t, e), this.observer.unobserve(t), this.sections.delete(t);
  }
  handleMutations(t) {
    for (const e of t) {
      for (const i of e.addedNodes)
        i instanceof Element && (i.hasAttribute(this.attribute) && this.observeElement(i), i.querySelectorAll(`[${this.attribute}]`).forEach((r) => this.observeElement(r)));
      for (const i of e.removedNodes)
        i instanceof Element && (i.hasAttribute(this.attribute) && this.unobserveElement(i), i.querySelectorAll(`[${this.attribute}]`).forEach((r) => this.unobserveElement(r)));
    }
  }
  handleIntersections(t) {
    for (const e of t) {
      const i = this.sections.get(e.target);
      i && (e.isIntersecting ? i.enteredAt === null && (!i.fired || this.allowReentry) && (i.enteredAt = Date.now()) : i.enteredAt !== null && this.recordSectionView(e.target, i));
    }
  }
  recordSectionView(t, e) {
    if (!this.tracker || e.enteredAt === null) return;
    const i = Date.now() - e.enteredAt;
    if (e.enteredAt = null, i < this.minDwellTime) return;
    e.fired = !0;
    const s = t.getAttribute(this.attribute) || "unnamed", r = {
      section: s,
      dwellTime: i,
      url: window.location.href,
      path: window.location.pathname
    }, a = t.dataset;
    for (const [o, p] of Object.entries(a))
      o !== "trackSection" && (r[o] = p);
    this.tracker.trackEvent({
      type: "section_view",
      name: s,
      properties: r,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Flush any sections that are currently visible (e.g., on stop() or page unload).
   */
  flushVisibleSections() {
    for (const [t, e] of this.sections)
      e.enteredAt !== null && this.recordSectionView(t, e);
  }
  /**
   * Reset tracking state on SPA navigation so sections on the new page
   * are tracked fresh.
   */
  resetOnNavigation() {
    this.flushVisibleSections();
    for (const [, t] of this.sections)
      t.enteredAt = null, t.fired = !1;
  }
  setupNavigationListener() {
    const t = this;
    this.originalPushState = history.pushState, history.pushState = function(e, i, s) {
      t.originalPushState.call(this, e, i, s), t.resetOnNavigation();
    }, this.handlePopState = () => this.resetOnNavigation(), window.addEventListener("popstate", this.handlePopState);
  }
  teardownNavigationListener() {
    this.originalPushState && (history.pushState = this.originalPushState, this.originalPushState = null), this.handlePopState && (window.removeEventListener("popstate", this.handlePopState), this.handlePopState = null);
  }
}
function B(n) {
  return new D(n);
}
function x(n) {
  const t = n.platform;
  return t === "ios" || t === "android";
}
function F(n) {
  return !x(n);
}
const d = "analytics_session_id";
function f() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
function U() {
  if (typeof sessionStorage > "u")
    return f();
  const n = sessionStorage.getItem(d);
  if (n)
    return n;
  const t = f();
  return sessionStorage.setItem(d, t), t;
}
function V() {
  return {
    getContext: m,
    getSessionId: U,
    getGeolocation: g,
    onBackground: (n) => {
      const t = () => {
        document.visibilityState === "hidden" && n();
      };
      return window.addEventListener("visibilitychange", t), () => window.removeEventListener("visibilitychange", t);
    }
  };
}
function N(n) {
  const t = n.collectors ?? ["pageViews", "clicks"], e = [];
  return t.includes("pageViews") && e.push(R()), t.includes("clicks") && e.push(P()), t.includes("sections") && e.push(B()), e;
}
function G(n) {
  const t = {
    ...n,
    platform: n.platform ?? V()
  }, e = N(n);
  return new y(t, e);
}
export {
  y as Tracker,
  P as createClickCollector,
  S as createConsentManager,
  v as createHttpTransport,
  R as createPageViewCollector,
  B as createSectionCollector,
  G as createTracker,
  k as defaultConsentManager,
  m as getBrowserContext,
  M as getBrowserContextWithGeo,
  g as getGeolocation,
  F as isBrowserContext,
  x as isMobileContext
};
//# sourceMappingURL=tracker.es.js.map
