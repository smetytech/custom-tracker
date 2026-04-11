import type { TrackerPublicAPI } from '../types';

export interface SectionCollectorOptions {
  /**
   * CSS attribute used to identify trackable sections.
   * Elements should have this attribute with a section name as the value.
   * @default "data-track-section"
   */
  attribute?: string;

  /**
   * How much of the section must be visible to count as "seen" (0–1).
   * @default 0.5
   */
  threshold?: number;

  /**
   * Minimum dwell time in milliseconds before a section_view is recorded.
   * Filters out fast scroll-throughs that aren't real engagement.
   * @default 175
   */
  minDwellTime?: number;

  /**
   * If true, a section can fire multiple times per page (e.g., if the user
   * scrolls away and comes back). By default each section fires only once.
   * @default false
   */
  allowReentry?: boolean;
}

interface SectionState {
  enteredAt: number | null;
  fired: boolean;
}

const DEFAULT_ATTRIBUTE = 'data-track-section';
const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MIN_DWELL_TIME = 175;

export class SectionCollector {
  name = 'sections' as const;

  private tracker: TrackerPublicAPI | null = null;
  private observer: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private sections: Map<Element, SectionState> = new Map();
  private attribute: string;
  private threshold: number;
  private minDwellTime: number;
  private allowReentry: boolean;

  // For SPA navigation: listen to pushState/popstate to reset tracking
  private originalPushState: typeof history.pushState | null = null;
  private handlePopState: (() => void) | null = null;

  constructor(options?: SectionCollectorOptions) {
    this.attribute = options?.attribute ?? DEFAULT_ATTRIBUTE;
    this.threshold = options?.threshold ?? DEFAULT_THRESHOLD;
    this.minDwellTime = options?.minDwellTime ?? DEFAULT_MIN_DWELL_TIME;
    this.allowReentry = options?.allowReentry ?? false;
  }

  start(tracker: TrackerPublicAPI): void {
    this.tracker = tracker;

    // Set up Intersection Observer
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersections(entries),
      { threshold: this.threshold },
    );

    // Observe all existing sections
    this.observeExistingSections();

    // Watch for dynamically added sections (e.g., lazy-loaded content)
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // SPA navigation: reset seen sections on route change
    this.setupNavigationListener();
  }

  stop(): void {
    // Flush any sections currently in viewport
    this.flushVisibleSections();

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.teardownNavigationListener();
    this.sections.clear();
    this.tracker = null;
  }

  private observeExistingSections(): void {
    const elements = document.querySelectorAll(`[${this.attribute}]`);
    elements.forEach((el) => this.observeElement(el));
  }

  private observeElement(el: Element): void {
    if (!this.observer || this.sections.has(el)) return;
    this.sections.set(el, { enteredAt: null, fired: false });
    this.observer.observe(el);
  }

  private unobserveElement(el: Element): void {
    if (!this.observer) return;
    // Flush dwell time if currently visible
    const state = this.sections.get(el);
    if (state?.enteredAt !== null) {
      this.recordSectionView(el, state!);
    }
    this.observer.unobserve(el);
    this.sections.delete(el);
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      // New nodes added
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          if (node.hasAttribute(this.attribute)) {
            this.observeElement(node);
          }
          // Check children of the added node
          const children = node.querySelectorAll(`[${this.attribute}]`);
          children.forEach((child) => this.observeElement(child));
        }
      }
      // Nodes removed — flush and clean up
      for (const node of mutation.removedNodes) {
        if (node instanceof Element) {
          if (node.hasAttribute(this.attribute)) {
            this.unobserveElement(node);
          }
          const children = node.querySelectorAll(`[${this.attribute}]`);
          children.forEach((child) => this.unobserveElement(child));
        }
      }
    }
  }

  private handleIntersections(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const state = this.sections.get(entry.target);
      if (!state) continue;

      if (entry.isIntersecting) {
        // Section entered viewport
        if (state.enteredAt === null && (!state.fired || this.allowReentry)) {
          state.enteredAt = Date.now();
        }
      } else {
        // Section left viewport — record dwell time
        if (state.enteredAt !== null) {
          this.recordSectionView(entry.target, state);
        }
      }
    }
  }

  private recordSectionView(element: Element, state: SectionState): void {
    if (!this.tracker || state.enteredAt === null) return;

    const dwellTime = Date.now() - state.enteredAt;
    state.enteredAt = null;

    // Filter out quick scroll-throughs
    if (dwellTime < this.minDwellTime) return;

    state.fired = true;

    const sectionName = element.getAttribute(this.attribute) || 'unnamed';

    // Collect additional data- properties from the element
    const properties: Record<string, unknown> = {
      section: sectionName,
      dwellTime,
      url: window.location.href,
      path: window.location.pathname,
    };

    const dataset = (element as HTMLElement).dataset;
    for (const [key, value] of Object.entries(dataset)) {
      // Skip the section name attribute itself (camelCased: "trackSection")
      if (key === 'trackSection') continue;
      properties[key] = value;
    }

    this.tracker.trackEvent({
      type: 'section_view',
      name: sectionName,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Flush any sections that are currently visible (e.g., on stop() or page unload).
   */
  private flushVisibleSections(): void {
    for (const [element, state] of this.sections) {
      if (state.enteredAt !== null) {
        this.recordSectionView(element, state);
      }
    }
  }

  /**
   * Reset tracking state on SPA navigation so sections on the new page
   * are tracked fresh.
   */
  private resetOnNavigation(): void {
    // Flush any currently visible sections before reset
    this.flushVisibleSections();

    // Reset all section states but keep observing
    for (const [, state] of this.sections) {
      state.enteredAt = null;
      state.fired = false;
    }
  }

  private setupNavigationListener(): void {
    const self = this;

    // Patch pushState for SPA frameworks
    this.originalPushState = history.pushState;
    history.pushState = function (data: unknown, unused: string, url?: string | URL): void {
      self.originalPushState!.call(this, data, unused, url);
      self.resetOnNavigation();
    };

    // Listen for back/forward
    this.handlePopState = () => this.resetOnNavigation();
    window.addEventListener('popstate', this.handlePopState);
  }

  private teardownNavigationListener(): void {
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }

    if (this.handlePopState) {
      window.removeEventListener('popstate', this.handlePopState);
      this.handlePopState = null;
    }
  }
}

export function createSectionCollector(options?: SectionCollectorOptions): SectionCollector {
  return new SectionCollector(options);
}
