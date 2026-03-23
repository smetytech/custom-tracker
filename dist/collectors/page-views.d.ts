import type { TrackerPublicAPI } from '../types';
export interface PageViewCollectorOptions {
    trackOnLoad?: boolean;
    trackHashChanges?: boolean;
}
export declare class PageViewCollector {
    name: "pageViews";
    private tracker;
    private trackOnLoad;
    private trackHashChanges;
    private originalPushState;
    private originalReplaceState;
    private handlePopState;
    private handleHashChange;
    private handleLoad;
    constructor(options?: PageViewCollectorOptions);
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
    private patchHistory;
    private unpatchHistory;
    private trackPageView;
}
export declare function createPageViewCollector(options?: PageViewCollectorOptions): PageViewCollector;
//# sourceMappingURL=page-views.d.ts.map