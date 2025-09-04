# Analytics Tracker Library

A lightweight client-side analytics tracker that auto-captures click events using `data-track-event` attributes and basic page visibility events.

## Build & Bundles

Uses Vite library mode to output:
- `dist/tracker.umd.js` (UMD, minified) – for `<script>` tags / CDN
- `dist/tracker.es.js` (ES Module, minified)

Global name when loaded via `<script>`: `AnalyticsTracker`.

## Usage (CDN via jsDelivr)
The workflow publishes built assets onto a `cdn` branch and creates a version tag.

Latest (auto-updating `cdn` branch):
```html
<script src="https://cdn.jsdelivr.net/gh/OWNER/REPO@cdn/tracker.umd.js"></script>
```

Pinned to package version tag (immutable):
```html
<script src="https://cdn.jsdelivr.net/gh/OWNER/REPO@v1.0.0/tracker.umd.js"></script>
```

Pinned to folder inside `cdn` branch (also immutable once published):
```html
<script src="https://cdn.jsdelivr.net/gh/OWNER/REPO@cdn/v1.0.0/tracker.umd.js"></script>
```

Replace `OWNER/REPO` and version examples accordingly.

Track custom clickable elements:
```html
<button data-track-event="cta_click" data-button-location="hero">Buy Now</button>
```

Manual tracking:
```js
tracker.track('video_play', { id: 'intro' });
```

## Development
Install & build:
```bash
npm ci
npm run build
```
Outputs go to `dist/`.

## CI/CD
GitHub Actions workflow `cdn-publish.yml`:
- Triggers on push to `main` (builds & pushes `dist/` contents to `cdn` branch root and versioned folder)
- Creates version tag `vX.Y.Z` if missing
- Provides three jsDelivr URL styles (latest, tag, versioned folder)

### Optional Secrets (only if you later enable S3 job)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `CDN_BUCKET`

## Release / Versioning
Update `package.json` version then push to `main`. Workflow will:
1. Build assets
2. Copy to `cdn` branch root (latest)
3. Copy to `cdn/v<version>/` folder (immutable snapshot)
4. Create git tag `v<version>` (immutable)
Clear CDN cache by changing the version (jsDelivr uses permanent caching for a given file hash).

## Future Ideas
- Source maps publishing
- Integrity hash file
- Size budget check
- E2E smoke test in a headless browser

---
MIT Licensed
