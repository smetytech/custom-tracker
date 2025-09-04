class s {
  /**
   * Initializes the tracker.
   * @param {object} config - The configuration object for the tracker.
   * @param {string} config.accessKey - Your unique API key. Required.
   * @param {string} [config.apiEndpoint="https://api.your-service.com/events"] - The endpoint to send tracking data to.
   */
  constructor(e) {
    if (!e || !e.accessKey) {
      console.error("Tracker Error: An accessKey is required in the configuration object.");
      return;
    }
    this.accessKey = e.accessKey, this.apiEndpoint = e.apiEndpoint || "https://api.your-service.com/events", this.isTracking = !1, this.handleGlobalClick = this.handleGlobalClick.bind(this), this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }
  /**
   * Handles all clicks on the document, looking for elements with 'data-track' attributes.
   * @param {MouseEvent} e - The click event.
   * @private
   */
  handleGlobalClick(e) {
    const i = e.target.closest("[data-track-event]");
    if (i) {
      const t = { ...i.dataset }, n = t.trackEvent;
      delete t.trackEvent, this.sendEvent(n, t);
    }
  }
  /**
   * Tracks when a user leaves or returns to the page.
   * @private
   */
  handleVisibilityChange() {
    document.visibilityState === "hidden" ? this.sendEvent("page_hidden", { duration_ms: Math.round(performance.now()) }) : document.visibilityState === "visible" && this.sendEvent("page_visible");
  }
  /**
   * Manually track a custom event.
   * Useful for events not tied to clicks, like form submissions or video plays.
   * @param {string} eventName - The name of the event (e.g., 'user_signup', 'form_submitted').
   * @param {object} [data={}] - An object with any additional data to track.
   */
  track(e, i = {}) {
    if (!e) {
      console.error("Tracker Error: An eventName is required for manual tracking.");
      return;
    }
    this.sendEvent(e, i);
  }
  /**
   * Sends the event data to the defined API endpoint.
   * @param {string} eventName - The name of the event being sent.
   * @param {object} payload - The data associated with the event.
   * @private
   */
  async sendEvent(e, i) {
    const t = {
      event: e,
      properties: {
        ...i,
        // Enrich the event with useful, standard information
        url: window.location.href,
        path: window.location.pathname,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      accessKey: this.accessKey
      // Sending the key for server-side validation
    };
    if (console.log("Tracking Event:", t), typeof navigator.sendBeacon == "function") {
      const n = new Blob([JSON.stringify(t)], { type: "application/json" });
      navigator.sendBeacon(this.apiEndpoint, n);
    } else
      try {
        await fetch(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // It's common to send a key as a bearer token for auth
            Authorization: `Bearer ${this.accessKey}`
          },
          body: JSON.stringify(t),
          keepalive: !0
          // Helps ensure the request completes on page navigation
        });
      } catch (n) {
        console.error("Tracker API Error:", n);
      }
  }
  /**
   * Starts all global event listeners.
   */
  start() {
    if (this.isTracking) {
      console.warn("Tracker is already running.");
      return;
    }
    console.log("Analytics tracking started."), document.addEventListener("click", this.handleGlobalClick, { capture: !0 }), document.addEventListener("visibilitychange", this.handleVisibilityChange), this.isTracking = !0, this.sendEvent("page_view");
  }
  /**
   * Removes all global event listeners.
   */
  stop() {
    this.isTracking && (console.log("Analytics tracking stopped."), document.removeEventListener("click", this.handleGlobalClick, { capture: !0 }), document.removeEventListener("visibilitychange", this.handleVisibilityChange), this.isTracking = !1);
  }
}
export {
  s as default
};
