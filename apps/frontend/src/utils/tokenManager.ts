/**
 * Token Manager
 *
 * Handles token persistence with per-tab isolation using sessionStorage
 * and global persistence using localStorage.
 */

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
  /**
   * Get the best available access token.
   * Prioritizes the canonical key and self-heals legacy storage when needed.
   */
  getAccessToken(): string | null {
    const accessToken = readToken(ACCESS_TOKEN_KEY);
    if (accessToken) {
      return accessToken;
    }

    const legacyToken = readToken(LEGACY_ACCESS_TOKEN_KEY);
    if (legacyToken) {
      writeToken(ACCESS_TOKEN_KEY, legacyToken);
    }

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



  /**
   * Set access token.
   * Keeps the legacy key mirrored temporarily while older screens are migrated.
   */
  setAccessToken(token: string): void {
    writeToken(ACCESS_TOKEN_KEY, token);
    writeToken(LEGACY_ACCESS_TOKEN_KEY, token);
  },

  /**
   * Get refresh token.
   * Refresh tokens are usually global, so we prioritize localStorage.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Set refresh token globally.
   */
  setRefreshToken(token: string): void {
    writeToken(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Clear all tokens from all storage types.
   */
  clearTokens(): void {
    clearToken(ACCESS_TOKEN_KEY);
    clearToken(LEGACY_ACCESS_TOKEN_KEY);
    clearToken(REFRESH_TOKEN_KEY);
  },
};

export default tokenManager;
