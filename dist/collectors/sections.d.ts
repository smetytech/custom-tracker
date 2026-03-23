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
     * @default 1000
     */
    minDwellTime?: number;
    /**
     * If true, a section can fire multiple times per page (e.g., if the user
     * scrolls away and comes back). By default each section fires only once.
     * @default false
     */
    allowReentry?: boolean;
}
export declare class SectionCollector {
    name: "sections";
    private tracker;
    private observer;
    private mutationObserver;
    private sections;
    private attribute;
    private threshold;
    private minDwellTime;
    private allowReentry;
    private originalPushState;
    private handlePopState;
    constructor(options?: SectionCollectorOptions);
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
    private observeExistingSections;
    private observeElement;
    private unobserveElement;
    private handleMutations;
    private handleIntersections;
    private recordSectionView;
    /**
     * Flush any sections that are currently visible (e.g., on stop() or page unload).
     */
    private flushVisibleSections;
    /**
     * Reset tracking state on SPA navigation so sections on the new page
     * are tracked fresh.
     */
    private resetOnNavigation;
    private setupNavigationListener;
    private teardownNavigationListener;
}
export declare function createSectionCollector(options?: SectionCollectorOptions): SectionCollector;
//# sourceMappingURL=sections.d.ts.map