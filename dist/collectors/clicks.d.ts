import type { TrackerPublicAPI } from '../types';
export interface ClickCollectorOptions {
    selectors?: string[];
}
export declare class ClickCollector {
    name: "clicks";
    private tracker;
    private handleClick;
    private selectors;
    constructor(options?: ClickCollectorOptions);
    start(tracker: TrackerPublicAPI): void;
    stop(): void;
    private handleGlobalClick;
}
export declare function createClickCollector(options?: ClickCollectorOptions): ClickCollector;
//# sourceMappingURL=clicks.d.ts.map