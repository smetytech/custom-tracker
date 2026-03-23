/**
 * Session management for React Native using AsyncStorage.
 * Persists session IDs across app restarts for deeper analysis.
 */
/**
 * Get or create a persistent session ID using AsyncStorage.
 * The session ID persists across app restarts.
 *
 * Dynamically imports AsyncStorage so it remains an optional peer dependency.
 * Falls back to an in-memory session ID if AsyncStorage is not available.
 */
export declare function getMobileSessionId(): Promise<string>;
/**
 * Clear the stored session ID. Useful for logout or session reset scenarios.
 */
export declare function clearMobileSessionId(): Promise<void>;
//# sourceMappingURL=storage.d.ts.map