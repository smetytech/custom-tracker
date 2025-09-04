class r {
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
    this.accessKey = e.accessKey, this.apiEndpoint = e.apiEndpoint || "https://api.your-service.com/events", this.isTracking = !1, this.handleGlobalClick = this.handleGlobalClick.bind(this);
  }
  /**
   * Handles all clicks on the document, looking for elements with 'data-track' attributes.
   * @param {MouseEvent} e - The click event.
   * @private
   */
  handleGlobalClick(e) {
    const n = e.target.closest("[data-track-event]");
    if (!n) return;
    const t = { ...n.dataset }, a = t.trackEvent || t.track || t.goal || "click";
    delete t.trackEvent, delete t.track, delete t.goal, console.log("Element clicked with tracking data:", { event: a, ...t }), this.sendEvent(a, t);
  }
  /**
   * Manually track a custom event.
   * Useful for events not tied to clicks, like form submissions or video plays.
   * @param {string} eventName - The name of the event (e.g., 'user_signup', 'form_submitted').
   * @param {object} [data={}] - An object with any additional data to track.
   */
  track(e, n = {}) {
    if (!e) {
      console.error("Tracker Error: An eventName is required for manual tracking.");
      return;
    }
    this.sendEvent(e, n);
  }
  /**
   * Sends the event data to the defined API endpoint.
   * @param {string} eventName - The name of the event being sent.
   * @param {object} payload - The data associated with the event.
   * @private
   */
  async sendEvent(e, n) {
    const t = {
      event: e,
      properties: {
        ...n,
        // Enrich the event with useful, standard information
        url: window.location.href,
        path: window.location.pathname,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      accessKey: this.accessKey
      // Sending the key for server-side validation
    };
    if (console.log("Tracking Event:", t), typeof navigator.sendBeacon == "function") {
      const a = new Blob([JSON.stringify(t)], { type: "application/json" });
      navigator.sendBeacon(this.apiEndpoint, a);
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
    console.log("Analytics tracking started."), document.addEventListener("click", this.handleGlobalClick, { capture: !0 }), this.isTracking = !0;
  }
  /**
   * Removes all global event listeners.
   */
  stop() {
    this.isTracking && (console.log("Analytics tracking stopped."), document.removeEventListener("click", this.handleGlobalClick, { capture: !0 }), this.isTracking = !1);
  }
}
export {
  r as default
};
