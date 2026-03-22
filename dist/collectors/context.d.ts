import type { BrowserContext } from "../types";
declare function getGeolocation(): Promise<BrowserContext["geolocation"]>;
export declare function getBrowserContext(): BrowserContext;
export declare function getBrowserContextWithGeo(): Promise<BrowserContext>;
export declare function getPageContext(): Pick<BrowserContext, "url" | "path" | "query" | "utm">;
export { getGeolocation };
//# sourceMappingURL=context.d.ts.map