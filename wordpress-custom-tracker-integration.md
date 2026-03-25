# Custom Tracker Integration Guide for WordPress

Yes - you can integrate this custom tracker into a WordPress app.

Your TypeScript snippet is framework-oriented (`$env/static/public`), but the tracker logic itself runs in the browser, so it adapts cleanly to WordPress with a small config layer.

## Recommended Approach

- Load the tracker library with `wp_enqueue_script`
- Pass API key and endpoint from PHP to JavaScript via `wp_add_inline_script` (or `wp_localize_script`)
- Initialize tracker in a small JS file (same logic as your app)
- Gate tracking behind consent from your cookie/CMP plugin

## 1) Add Config Values in WordPress

In `wp-config.php`:

```php
define('CUSTOM_TRACKER_API_KEY', 'your_public_api_key');
define('CUSTOM_TRACKER_ENDPOINT', 'https://your-tracker-endpoint.com');
```

## 2) Create a Tiny Plugin (Recommended)

Create `wp-content/plugins/custom-tracker/custom-tracker.php`:

```php
<?php
/**
 * Plugin Name: Custom Tracker Integration
 * Description: Integrates custom analytics tracker with consent-aware init.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    // 1) Load tracker library (replace URL with your actual tracker bundle URL)
    wp_enqueue_script(
        'custom-tracker-lib',
        'https://your-cdn.com/analytics-tracker.umd.js',
        [],
        null,
        true
    );

    // 2) Load your init file
    wp_enqueue_script(
        'custom-tracker-init',
        plugin_dir_url(__FILE__) . 'assets/tracker-init.js',
        ['custom-tracker-lib'],
        '1.0.0',
        true
    );

    // 3) Pass dynamic config from PHP -> JS
    $config = [
        'apiKey' => defined('CUSTOM_TRACKER_API_KEY') ? CUSTOM_TRACKER_API_KEY : '',
        'endpoint' => defined('CUSTOM_TRACKER_ENDPOINT') ? CUSTOM_TRACKER_ENDPOINT : '',
    ];

    wp_add_inline_script(
        'custom-tracker-init',
        'window.CUSTOM_TRACKER_CONFIG = ' . wp_json_encode($config) . ';',
        'before'
    );
});
```

Create `wp-content/plugins/custom-tracker/assets/tracker-init.js`:

```javascript
(function () {
  if (typeof window === "undefined") return;

  var tracker = null;
  var cfg = window.CUSTOM_TRACKER_CONFIG || {};
  if (!cfg.apiKey || !cfg.endpoint) return;

  function hasConsent() {
    // Replace this with your actual CMP check.
    // Examples:
    // Cookiebot: return window.Cookiebot?.consent?.statistics === true;
    // OneTrust: return (window.OptanonActiveGroups || "").includes("C0002");
    // Complianz/custom: adapt accordingly.
    return true;
  }

  function initTracker() {
    if (tracker) return;

    var attempts = 0;
    var maxAttempts = 50;

    function checkAndInit() {
      var AnalyticsTracker = window.AnalyticsTracker;

      if (!AnalyticsTracker || typeof AnalyticsTracker.createTracker !== "function") {
        attempts++;
        if (attempts >= maxAttempts) return;
        setTimeout(checkAndInit, 100);
        return;
      }

      tracker = AnalyticsTracker.createTracker({
        apiKey: cfg.apiKey,
        endpoint: cfg.endpoint,
        consent: {
          canTrack: function () {
            return hasConsent();
          },
          onUpdate: function (cb) {
            var interval = setInterval(function () {
              cb(hasConsent());
            }, 2000);

            window.addEventListener("beforeunload", function () {
              clearInterval(interval);
            }, { once: true });
          }
        },
        collectors: ["pageViews", "clicks", "sections"],
        geolocation: true
      });

      if (hasConsent()) {
        tracker.start();
      }

      // Optional: expose globally for custom events
      window.CustomTracker = tracker;
    }

    checkAndInit();
  }

  initTracker();
})();
```

Then activate the plugin in WordPress Admin.

## 3) Track Custom Events in Theme/Plugin JS

Anywhere after init:

```javascript
if (window.CustomTracker) {
  window.CustomTracker.track("signup_click", {
    location: "header_cta",
    plan: "pro"
  });
}
```

## 4) Consent Integration Notes

- The only required customization is `hasConsent()`
- If you already use a cookie plugin, map its API to a boolean return value
- Keep analytics blocked until consent is granted where legally required

## 5) Quick Verification Checklist

- Open your site and confirm there are no console errors
- Confirm `window.AnalyticsTracker` exists
- Confirm `window.CustomTracker` exists after page load
- Verify network requests hit your tracker endpoint
- Accept/revoke consent and confirm tracking starts/stops accordingly

---

If needed, add a cookie-plugin specific `hasConsent()` implementation for Cookiebot, Complianz, OneTrust, CookieYes, or your custom CMP.
