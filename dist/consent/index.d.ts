import type { ConsentConfig } from '../types';
export interface ConsentManager {
    canTrack(): boolean | Promise<boolean>;
    onUpdate(callback: (granted: boolean) => void): void;
    clearCallbacks(): void;
}
export declare function createConsentManager(config?: ConsentConfig): ConsentManager;
export declare const defaultConsentManager: ConsentManager;
//# sourceMappingURL=index.d.ts.map