/**
 * AnalyticsTracker: A standalone script for tracking custom data attributes and events.
 * Can be used via a CDN by instantiating `window.AnalyticsTracker`.
 *
 * @version 1.0.0
 */
class AnalyticsTracker {
  /**
   * Initializes the tracker.
   * @param {object} config - The configuration object for the tracker.
   * @param {string} config.accessKey - Your unique API key. Required.
   * @param {string} [config.apiEndpoint="https://api.your-service.com/events"] - The endpoint to send tracking data to.
   */
  constructor(config) {
    // 1. Validate the configuration
    if (!config || !config.accessKey) {
      console.error("Tracker Error: An accessKey is required in the configuration object.");
      // Return early to prevent the tracker from running without a key
      return;
    }

    this.accessKey = config.accessKey;
    this.apiEndpoint = config.apiEndpoint || 'https://api.your-service.com/events';
    this.isTracking = false;

    // 2. Bind 'this' for event handlers to ensure they have the correct context
    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Handles all clicks on the document, looking for elements with 'data-track' attributes.
   * @param {MouseEvent} e - The click event.
   * @private
   */
  handleGlobalClick(e) {
    // Use .closest() to find the nearest element with a trackable attribute
    const targetElement = e.target.closest('[data-track-event]');

    if (targetElement) {
      // The dataset property conveniently collects all `data-*` attributes
      const customData = { ...targetElement.dataset };
      const eventName = customData.trackEvent; // e.g., 'cta_click', 'product_view'
      console.log('Element clicked with tracking data:', customData);
      // Remove the primary event name from the payload to avoid redundancy
      delete customData.trackEvent;

      this.sendEvent(eventName, customData);
    }
  }

  /**
   * Tracks when a user leaves or returns to the page.
   * @private
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.sendEvent('page_hidden', { duration_ms: Math.round(performance.now()) });
    } else if (document.visibilityState === 'visible') {
      this.sendEvent('page_visible');
    }
  }

  /**
   * Manually track a custom event.
   * Useful for events not tied to clicks, like form submissions or video plays.
   * @param {string} eventName - The name of the event (e.g., 'user_signup', 'form_submitted').
   * @param {object} [data={}] - An object with any additional data to track.
   */
  track(eventName, data = {}) {
    if (!eventName) {
      console.error("Tracker Error: An eventName is required for manual tracking.");
      return;
    }
    this.sendEvent(eventName, data);
  }

  /**
   * Sends the event data to the defined API endpoint.
   * @param {string} eventName - The name of the event being sent.
   * @param {object} payload - The data associated with the event.
   * @private
   */
  async sendEvent(eventName, payload) {
    const eventData = {
      event: eventName,
      properties: {
        ...payload,
        // Enrich the event with useful, standard information
        url: window.location.href,
        path: window.location.pathname,
        timestamp: new Date().toISOString()
      },
      accessKey: this.accessKey // Sending the key for server-side validation
    };

    console.log('Tracking Event:', eventData);

    // Use navigator.sendBeacon for reliability on page exit, otherwise use fetch
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
      navigator.sendBeacon(this.apiEndpoint, blob);
    } else {
      try {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // It's common to send a key as a bearer token for auth
            'Authorization': `Bearer ${this.accessKey}`
          },
          body: JSON.stringify(eventData),
          keepalive: true // Helps ensure the request completes on page navigation
        });
      } catch (error) {
        console.error('Tracker API Error:', error);
      }
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
    console.log("Analytics tracking started.");
    // Use capture: true to catch events early in the propagation phase
    document.addEventListener('click', this.handleGlobalClick, { capture: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.isTracking = true;
    // Track the initial page view
    this.sendEvent('page_view');
  }

  /**
   * Removes all global event listeners.
   */
  stop() {
    if (!this.isTracking) {
      return;
    }
    console.log("Analytics tracking stopped.");
    document.removeEventListener('click', this.handleGlobalClick, { capture: true });
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isTracking = false;
  }
}

export default AnalyticsTracker;
