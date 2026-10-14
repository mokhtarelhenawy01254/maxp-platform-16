import { Preferences } from "@capacitor/preferences";
import { isCapacitorNative } from "../config/environment";

const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

// Preload & restore native persistent tokens into localStorage/sessionStorage
let isNativeRestored = false;
export const restoreNativeTokens = async (): Promise<void> => {
  if (isNativeRestored || typeof window === "undefined" || !isCapacitorNative()) return;
  try {
    const [accessRes, legacyRes, refreshRes] = await Promise.all([
      Preferences.get({ key: ACCESS_TOKEN_KEY }),
      Preferences.get({ key: LEGACY_ACCESS_TOKEN_KEY }),
      Preferences.get({ key: REFRESH_TOKEN_KEY }),
    ]);

    const activeAccess = accessRes?.value || legacyRes?.value;
    if (activeAccess && !localStorage.getItem(ACCESS_TOKEN_KEY)) {
      localStorage.setItem(ACCESS_TOKEN_KEY, activeAccess);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, activeAccess);
    }

    if (refreshRes?.value && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshRes.value);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshRes.value);
    }
    isNativeRestored = true;
  } catch (err) {
    // Non-blocking fallback if preferences plugin is not ready
  }
};

// Auto-restore on startup
if (typeof window !== "undefined") {
  void restoreNativeTokens();
}

const readToken = (key: string): string | null =>
  sessionStorage.getItem(key) || localStorage.getItem(key);

const writeToken = (key: string, token: string): void => {
  sessionStorage.setItem(key, token);
  localStorage.setItem(key, token);
};

const clearToken = (key: string): void => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const tokenManager = {
  restoreNativeTokens,

  getAccessToken(): string | null {
    const accessToken = readToken(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;

    const legacyToken = readToken(LEGACY_ACCESS_TOKEN_KEY);
    if (legacyToken) writeToken(ACCESS_TOKEN_KEY, legacyToken);
    return legacyToken;
  },

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  },

  getAuthorizationHeaderValue(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  },

  getUser(): any | null {
    try {
      if (typeof window === "undefined") return null;
      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  createAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const authorization = this.getAuthorizationHeaderValue();
    let fingerprint: string | null = null;
    try {
      const { getDeviceFingerprint } = require('./deviceFingerprint');
      fingerprint = getDeviceFingerprint();
    } catch {}

    return {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(fingerprint ? { 'X-Device-Fingerprint': fingerprint } : {}),
      ...additionalHeaders,
    };
  },


  setAccessToken(token: string): void {
    writeToken(ACCESS_TOKEN_KEY, token);
    writeToken(LEGACY_ACCESS_TOKEN_KEY, token);
    if (isCapacitorNative()) {
      try {
        void Preferences.set({ key: ACCESS_TOKEN_KEY, value: token });
        void Preferences.set({ key: LEGACY_ACCESS_TOKEN_KEY, value: token });
      } catch {
        // safe fallback
      }
    }
  },

  getRefreshToken(): string | null {
    return readToken(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (token) {
      writeToken(REFRESH_TOKEN_KEY, token);
      if (isCapacitorNative()) {
        try {
          void Preferences.set({ key: REFRESH_TOKEN_KEY, value: token });
        } catch {
          // safe fallback
        }
      }
    }
  },

  clearTokens(): void {
    clearToken(ACCESS_TOKEN_KEY);
    clearToken(LEGACY_ACCESS_TOKEN_KEY);
    clearToken(REFRESH_TOKEN_KEY);
    if (isCapacitorNative()) {
      try {
        void Preferences.remove({ key: ACCESS_TOKEN_KEY });
        void Preferences.remove({ key: LEGACY_ACCESS_TOKEN_KEY });
        void Preferences.remove({ key: REFRESH_TOKEN_KEY });
      } catch {
        // safe fallback
      }
    }
  },
};

export default tokenManager;

