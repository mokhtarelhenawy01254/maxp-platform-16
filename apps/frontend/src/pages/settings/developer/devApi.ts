/**
 * Tiny fetch helper for the Developer Hub endpoints (`/api/v1/developer/*`).
 * Uses the platform token manager so auth behaves exactly like the rest of
 * the dashboard.
 */
import { getApiUrl } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";

export interface DevFetchError extends Error {
  status?: number;
}

export const devFetch = async <T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const baseHeaders = tokenManager.createAuthHeaders({});

  const response = await fetch(`${getApiUrl()}/developer${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      (data && (data.message || data.error)) || `HTTP ${response.status}`,
    ) as DevFetchError;
    error.status = response.status;
    throw error;
  }

  return data as T;
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
