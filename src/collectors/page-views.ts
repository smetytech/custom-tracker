import type { TrackerPublicAPI } from '../types';

export interface PageViewCollectorOptions {
  trackOnLoad?: boolean;
  trackHashChanges?: boolean;
}

export class PageViewCollector {
  name = 'pageViews' as const;
  private tracker: TrackerPublicAPI | null = null;
  private trackOnLoad: boolean;
  private trackHashChanges: boolean;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private handlePopState: () => void;
  private handleHashChange: () => void;
  private handleLoad: () => void;

  constructor(options?: PageViewCollectorOptions) {
    this.trackOnLoad = options?.trackOnLoad ?? true;
    this.trackHashChanges = options?.trackHashChanges ?? false;
    this.handlePopState = this.trackPageView.bind(this);
    this.handleHashChange = this.trackPageView.bind(this);
    this.handleLoad = this.trackPageView.bind(this);
  }

  start(tracker: TrackerPublicAPI): void {
    this.tracker = tracker;

    if (this.trackOnLoad) {
      if (document.readyState === 'complete') {
        this.trackPageView();
      } else {
        window.addEventListener('load', this.handleLoad);
      }
    }

    this.patchHistory();
    window.addEventListener('popstate', this.handlePopState);

    if (this.trackHashChanges) {
      window.addEventListener('hashchange', this.handleHashChange);
    }
  }

  stop(): void {
    if (this.trackOnLoad) {
      window.removeEventListener('load', this.handleLoad);
    }

    this.unpatchHistory();
    window.removeEventListener('popstate', this.handlePopState);

    if (this.trackHashChanges) {
      window.removeEventListener('hashchange', this.handleHashChange);
    }

    this.tracker = null;
  }

  private patchHistory(): void {
    const self = this;

    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    history.pushState = function (data: unknown, unused: string, url?: string | URL): void {
      self.originalPushState!.call(this, data, unused, url);
      self.trackPageView();
    };

    history.replaceState = function (data: unknown, unused: string, url?: string | URL): void {
      self.originalReplaceState!.call(this, data, unused, url);
      self.trackPageView();
    };
  }

  private unpatchHistory(): void {
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
  }

  private trackPageView(): void {
    if (!this.tracker) return;

    const searchParams = new URLSearchParams(window.location.search);
    const utm = {
      source: searchParams.get('utm_source'),
      medium: searchParams.get('utm_medium'),
      campaign: searchParams.get('utm_campaign'),
      term: searchParams.get('utm_term'),
      content: searchParams.get('utm_content'),
    };

    this.tracker.trackEvent({
      type: 'page_view',
      name: 'page_view',
      properties: {
        url: window.location.href,
        path: window.location.pathname,
        query: window.location.search || null,
        referrer: document.referrer || null,
        title: document.title,
        utm,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export function createPageViewCollector(options?: PageViewCollectorOptions): PageViewCollector {
  return new PageViewCollector(options);
}