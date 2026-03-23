/**
 * Mobile context collector using Expo SDK packages.
 *
 * Collects device info, locale/timezone, screen dimensions, and geolocation.
 * All Expo SDK imports are dynamic so they remain optional peer dependencies.
 * If a package is not installed, that section gracefully returns null/defaults.
 */
import type { MobileContext } from "../../types";
/**
 * Request geolocation using expo-location.
 * Handles permission requests automatically.
 */
export declare function getMobileGeolocation(): Promise<MobileContext["geolocation"]>;
/**
 * Get the full mobile context snapshot.
 * Static device/locale info is cached; screen dimensions are always fresh.
 */
export declare function getMobileContext(): Promise<MobileContext>;
/**
 * Get the full mobile context with geolocation (requests permission if needed).
 */
export declare function getMobileContextWithGeo(): Promise<MobileContext>;
/**
 * Reset the cached context. Useful for testing.
 */
export declare function resetMobileContextCache(): void;
//# sourceMappingURL=context.d.ts.map