/**
 * Session management for React Native using AsyncStorage.
 * Persists session IDs across app restarts for deeper analysis.
 */

const SESSION_STORAGE_KEY = "@smety_tracker_session_id";

function generateSessionId(): string {
  // React Native supports crypto.randomUUID in newer Hermes versions,
  // but we fall back to timestamp+random for broad compatibility.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create a persistent session ID using AsyncStorage.
 * The session ID persists across app restarts.
 *
 * Dynamically imports AsyncStorage so it remains an optional peer dependency.
 * Falls back to an in-memory session ID if AsyncStorage is not available.
 */
export async function getMobileSessionId(): Promise<string> {
  try {
    const AsyncStorage = await loadAsyncStorage();
    if (!AsyncStorage) {
      return generateSessionId();
    }

    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const newId = generateSessionId();
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  } catch {
    // If AsyncStorage fails for any reason, generate an in-memory ID
    return generateSessionId();
  }
}

/**
 * Clear the stored session ID. Useful for logout or session reset scenarios.
 */
export async function clearMobileSessionId(): Promise<void> {
  try {
    const AsyncStorage = await loadAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Dynamically load AsyncStorage to keep it as an optional peer dependency.
 */
async function loadAsyncStorage(): Promise<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await import("@react-native-async-storage/async-storage");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}
