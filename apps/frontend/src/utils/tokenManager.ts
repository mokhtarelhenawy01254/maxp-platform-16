const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_ACCESS_TOKEN_KEY = "token";

// ponytail: refreshToken now lives in httpOnly cookie (set by backend), not localStorage
// Access token stays in sessionStorage (tab-scoped, cleared on close)
// This prevents XSS from stealing long-lived refresh tokens

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

  createAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const authorization = this.getAuthorizationHeaderValue();
    return {
      ...(authorization ? { Authorization: authorization } : {}),
      ...additionalHeaders,
    };
  },

  setAccessToken(token: string): void {
    writeToken(ACCESS_TOKEN_KEY, token);
    writeToken(LEGACY_ACCESS_TOKEN_KEY, token);
  },

  // ponytail: refresh token is httpOnly cookie now, no client-side storage needed
  getRefreshToken(): string | null {
    return null;
  },

  setRefreshToken(_token: string): void {
    // no-op: refresh token is set as httpOnly cookie by backend
  },

  clearTokens(): void {
    clearToken(ACCESS_TOKEN_KEY);
    clearToken(LEGACY_ACCESS_TOKEN_KEY);
  },
};

export default tokenManager;
