/**
 * Supplementary global type declarations for the React Native runtime.
 *
 * The Expo tsconfig does NOT include the DOM lib. Most web-like globals
 * (fetch, Blob, console, crypto, timers, URL, URLSearchParams) are already
 * provided by @types/node v25+. This file only declares the small set of
 * properties that @types/node's Navigator interface doesn't include but
 * our shared code (transports/http.ts) references.
 */

// Extend the Navigator interface provided by @types/node
declare global {
  interface Navigator {
    /** Available in browsers; absent in React Native — guarded at runtime. */
    sendBeacon?: (url: string, data?: Blob | string) => boolean;
    /** Set to "ReactNative" in the RN runtime; used for keepalive guard. */
    product?: string;
  }
}

export {};
