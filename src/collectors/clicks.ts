import type { TrackerPublicAPI } from '../types';

export interface ClickCollectorOptions {
  selectors?: string[];
}

const DEFAULT_SELECTORS = ['[data-track-event]', '[data-track]', '[data-goal]'];

export class ClickCollector {
  name = 'clicks' as const;
  private tracker: TrackerPublicAPI | null = null;
  private handleClick: (e: MouseEvent) => void;
  private selectors: string[];

  constructor(options?: ClickCollectorOptions) {
    this.selectors = options?.selectors ?? DEFAULT_SELECTORS;
    this.handleClick = this.handleGlobalClick.bind(this);
  }

  start(tracker: TrackerPublicAPI): void {
    this.tracker = tracker;
    document.addEventListener('click', this.handleClick, { capture: true });
  }

  stop(): void {
    document.removeEventListener('click', this.handleClick, { capture: true });
    this.tracker = null;
  }

  private handleGlobalClick(e: MouseEvent): void {
    const targetElement = e.target instanceof Element
      ? e.target.closest(this.selectors.join(', '))
      : null;

    if (!targetElement || !this.tracker) return;

    const dataset = (targetElement as HTMLElement).dataset;
    const eventName = dataset.trackEvent || dataset.track || dataset.goal || 'click';

    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dataset)) {
      if (!['trackEvent', 'track', 'goal'].includes(key)) {
        properties[key] = value;
      }
    }

    this.tracker.trackEvent({
      type: 'click',
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
    });
  }
}

export function createClickCollector(options?: ClickCollectorOptions): ClickCollector {
  return new ClickCollector(options);
}