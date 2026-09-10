const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

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

  getRefreshToken(): string | null {
    return readToken(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (token) {
      writeToken(REFRESH_TOKEN_KEY, token);
    }
  },

  clearTokens(): void {
    clearToken(ACCESS_TOKEN_KEY);
    clearToken(LEGACY_ACCESS_TOKEN_KEY);
    clearToken(REFRESH_TOKEN_KEY);
  },
};

export default tokenManager;
