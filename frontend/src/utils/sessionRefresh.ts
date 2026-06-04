import { getApiUrl } from "../config/environment";
import { tokenManager } from "./tokenManager";

export type SessionRefreshResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      reason: "missing_refresh_token" | "auth_failure" | "transient_failure";
      status?: number;
      message?: string;
    };

type FetchImpl = typeof fetch;

const parseResponseJson = async (
  response: Response,
): Promise<Record<string, unknown> | null> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const shouldClearSessionOnRefreshFailure = (
  result: SessionRefreshResult,
): boolean =>
  !result.ok &&
  (result.reason === "missing_refresh_token" || result.reason === "auth_failure");

export const refreshSessionTokens = async (
  fetchImpl: FetchImpl = fetch,
): Promise<SessionRefreshResult> => {
  const refreshToken = tokenManager.getRefreshToken();

  if (!refreshToken) {
    return {
      ok: false,
      reason: "missing_refresh_token",
      message: "No refresh token available",
    };
  }

  try {
    const response = await fetchImpl(`${getApiUrl()}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });

    const payload = await parseResponseJson(response);

    if (response.ok && payload?.accessToken) {
      const nextRefreshToken = payload?.refreshToken || refreshToken;
      tokenManager.setAccessToken(payload.accessToken);
      tokenManager.setRefreshToken(nextRefreshToken);

      return {
        ok: true,
        accessToken: payload.accessToken,
        refreshToken: nextRefreshToken,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        reason: "auth_failure",
        status: response.status,
        message: payload?.message || "Refresh rejected",
      };
    }

    return {
      ok: false,
      reason: "transient_failure",
      status: response.status,
      message: payload?.message || "Refresh temporarily unavailable",
    };
  } catch (error: unknown) {
    return {
      ok: false,
      reason: "transient_failure",
      message: error instanceof Error ? error.message : "Refresh request failed",
    };
  }
};
