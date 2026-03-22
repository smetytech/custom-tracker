import type { BrowserContext } from "../types";

function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "unknown";
  }
}

function getConnectionDetails(): BrowserContext["connection"] {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };

  if (!nav.connection) {
    return null;
  }

  return {
    effectiveType: nav.connection.effectiveType ?? "unknown",
    downlink: nav.connection.downlink ?? null,
    rtt: nav.connection.rtt ?? null,
    saveData: nav.connection.saveData ?? null,
  };
}

function getMemoryDetails(): BrowserContext["memory"] {
  const performanceWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  };

  if (!performanceWithMemory.memory) {
    return null;
  }

  return {
    usedJSHeapSize: performanceWithMemory.memory.usedJSHeapSize ?? null,
    totalJSHeapSize: performanceWithMemory.memory.totalJSHeapSize ?? null,
    jsHeapSizeLimit: performanceWithMemory.memory.jsHeapSizeLimit ?? null,
  };
}

function getUtmParams(): BrowserContext["utm"] {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    source: searchParams.get("utm_source"),
    medium: searchParams.get("utm_medium"),
    campaign: searchParams.get("utm_campaign"),
    term: searchParams.get("utm_term"),
    content: searchParams.get("utm_content"),
  };
}

let cachedGeolocation: BrowserContext["geolocation"] = null;
let geolocationPromise: Promise<BrowserContext["geolocation"]> | null = null;

async function getGeolocation(): Promise<BrowserContext["geolocation"]> {
  if (cachedGeolocation !== null) {
    return cachedGeolocation;
  }

  if (geolocationPromise) {
    return geolocationPromise;
  }

  geolocationPromise = new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        cachedGeolocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        resolve(cachedGeolocation);
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      },
    );
  });

  return geolocationPromise;
}

export function getBrowserContext(): BrowserContext {
  return {
    url: window.location.href,
    path: window.location.pathname,
    query: window.location.search || null,
    referrer: document.referrer || null,
    language: navigator.language,
    languages: [...navigator.languages],
    timeZone: getTimeZone(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      orientation: window.screen.orientation?.type ?? null,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    connection: getConnectionDetails(),
    memory: getMemoryDetails(),
    utm: getUtmParams(),
    geolocation: cachedGeolocation,
  };
}

export async function getBrowserContextWithGeo(): Promise<BrowserContext> {
  await getGeolocation();
  return getBrowserContext();
}

export function getPageContext(): Pick<
  BrowserContext,
  "url" | "path" | "query" | "utm"
> {
  return {
    url: window.location.href,
    path: window.location.pathname,
    query: window.location.search || null,
    utm: getUtmParams(),
  };
}

export { getGeolocation };
