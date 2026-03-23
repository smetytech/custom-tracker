/**
 * Ambient type declarations for optional peer dependencies.
 * These provide minimal type information so TypeScript can compile
 * the Expo modules even when the actual packages aren't installed.
 */

declare module "expo-device" {
  export const deviceName: string | null;
  export const brand: string | null;
  export const modelName: string | null;
  export const osName: string | null;
  export const osVersion: string | null;
  export const isDevice: boolean;
}

declare module "expo-application" {
  export const nativeApplicationVersion: string | null;
  export const nativeBuildVersion: string | null;
}

declare module "expo-localization" {
  interface Locale {
    languageTag: string;
    [key: string]: unknown;
  }
  interface Calendar {
    timeZone: string | null;
    [key: string]: unknown;
  }
  export function getLocales(): Locale[];
  export function getCalendars(): Calendar[];
}

declare module "expo-location" {
  export enum Accuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6,
  }

  interface PermissionResponse {
    status: string;
  }

  interface LocationObject {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  }

  interface LocationOptions {
    accuracy?: Accuracy | number;
  }

  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(options?: LocationOptions): Promise<LocationObject>;
}

declare module "@react-native-async-storage/async-storage" {
  interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}
