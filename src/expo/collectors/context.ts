/**
 * Mobile context collector using Expo SDK packages.
 *
 * Collects device info, locale/timezone, screen dimensions, and geolocation.
 * All Expo SDK imports are dynamic so they remain optional peer dependencies.
 * If a package is not installed, that section gracefully returns null/defaults.
 */

import type { MobileContext } from "../../types";

// Cached values that don't change during app lifecycle
let cachedStaticContext: Partial<MobileContext> | null = null;
let cachedGeolocation: MobileContext["geolocation"] = null;
let geolocationFetched = false;

/**
 * Collect device info via expo-device.
 */
async function getDeviceInfo(): Promise<{
  deviceName: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  isDevice: boolean;
}> {
  try {
    const Device = await import("expo-device");
    return {
      deviceName: Device.deviceName ?? null,
      deviceBrand: Device.brand ?? null,
      deviceModel: Device.modelName ?? null,
      osName: Device.osName ?? null,
      osVersion: Device.osVersion ?? null,
      isDevice: Device.isDevice ?? false,
    };
  } catch {
    return {
      deviceName: null,
      deviceBrand: null,
      deviceModel: null,
      osName: null,
      osVersion: null,
      isDevice: true,
    };
  }
}

/**
 * Collect app version info via expo-application.
 */
async function getAppInfo(): Promise<{
  appVersion: string | null;
  buildNumber: string | null;
}> {
  try {
    const Application = await import("expo-application");
    return {
      appVersion: Application.nativeApplicationVersion ?? null,
      buildNumber: Application.nativeBuildVersion ?? null,
    };
  } catch {
    return {
      appVersion: null,
      buildNumber: null,
    };
  }
}

/**
 * Collect locale and timezone via expo-localization.
 */
async function getLocaleInfo(): Promise<{
  locale: string;
  locales: string[];
  timeZone: string;
}> {
  try {
    const Localization = await import("expo-localization");
    const locales = Localization.getLocales?.() ?? [];
    const calendars = Localization.getCalendars?.() ?? [];

    return {
      locale: locales[0]?.languageTag ?? "en",
      locales: locales.map((l: { languageTag: string }) => l.languageTag),
      timeZone: calendars[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown",
    };
  } catch {
    try {
      return {
        locale: "en",
        locales: ["en"],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch {
      return {
        locale: "en",
        locales: ["en"],
        timeZone: "unknown",
      };
    }
  }
}

/**
 * Collect screen dimensions using React Native's Dimensions API.
 */
function getScreenInfo(): MobileContext["screen"] {
  try {
    // Dynamic require for React Native - this is always available in an RN environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Dimensions, PixelRatio } = require("react-native") as {
      Dimensions: { get: (dim: string) => { width: number; height: number } };
      PixelRatio: { get: () => number; getFontScale: () => number };
    };

    const screen = Dimensions.get("screen");
    return {
      width: screen.width,
      height: screen.height,
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale(),
    };
  } catch {
    return {
      width: 0,
      height: 0,
      pixelRatio: 1,
      fontScale: 1,
    };
  }
}

/**
 * Get platform string. Uses React Native's Platform API.
 */
function getPlatform(): "ios" | "android" {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require("react-native") as {
      Platform: { OS: string };
    };
    return Platform.OS === "ios" ? "ios" : "android";
  } catch {
    return "android";
  }
}

/**
 * Request geolocation using expo-location.
 * Handles permission requests automatically.
 */
export async function getMobileGeolocation(): Promise<MobileContext["geolocation"]> {
  // FIX #8: Use explicit sentinel to distinguish "not yet fetched" from "fetched and null"
  if (geolocationFetched) {
    return cachedGeolocation;
  }

  try {
    const Location = await import("expo-location");

    // Request foreground permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      geolocationFetched = true;
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy?.Balanced ?? 3,
    });

    cachedGeolocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    geolocationFetched = true;
    return cachedGeolocation;
  } catch {
    geolocationFetched = true;
    return null;
  }
}

/**
 * Build the static parts of MobileContext (everything except geolocation).
 * These values are cached since they don't change during the app lifecycle.
 */
async function getStaticContext(): Promise<Partial<MobileContext>> {
  if (cachedStaticContext) {
    return cachedStaticContext;
  }

  const [deviceInfo, appInfo, localeInfo] = await Promise.all([
    getDeviceInfo(),
    getAppInfo(),
    getLocaleInfo(),
  ]);

  cachedStaticContext = {
    platform: getPlatform(),
    ...deviceInfo,
    ...appInfo,
    ...localeInfo,
    screen: getScreenInfo(),
  };

  return cachedStaticContext;
}

/**
 * Get the full mobile context snapshot.
 * Static device/locale info is cached; screen dimensions are always fresh.
 */
export async function getMobileContext(): Promise<MobileContext> {
  const staticCtx = await getStaticContext();

  return {
    platform: staticCtx.platform ?? getPlatform(),
    deviceName: staticCtx.deviceName ?? null,
    deviceBrand: staticCtx.deviceBrand ?? null,
    deviceModel: staticCtx.deviceModel ?? null,
    osName: staticCtx.osName ?? null,
    osVersion: staticCtx.osVersion ?? null,
    appVersion: staticCtx.appVersion ?? null,
    buildNumber: staticCtx.buildNumber ?? null,
    locale: staticCtx.locale ?? "en",
    locales: staticCtx.locales ?? ["en"],
    timeZone: staticCtx.timeZone ?? "unknown",
    isDevice: staticCtx.isDevice ?? true,
    screen: getScreenInfo(), // Always get fresh screen info (orientation changes)
    geolocation: cachedGeolocation,
  };
}

/**
 * Get the full mobile context with geolocation (requests permission if needed).
 */
export async function getMobileContextWithGeo(): Promise<MobileContext> {
  await getMobileGeolocation();
  return getMobileContext();
}

/**
 * Reset the cached context. Useful for testing.
 */
export function resetMobileContextCache(): void {
  cachedStaticContext = null;
  cachedGeolocation = null;
  geolocationFetched = false;
}
