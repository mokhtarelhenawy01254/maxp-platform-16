jest.mock("../../config/environment", () => ({
  getApiUrl: () => "http://localhost:3007/api/v1",
}));

jest.mock("../tokenManager", () => ({
  tokenManager: {
    getRefreshToken: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
  },
}));

import {
  refreshSessionTokens,
  shouldClearSessionOnRefreshFailure,
} from "../sessionRefresh";
import { tokenManager } from "../tokenManager";

const mockedTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

describe("sessionRefresh helpers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedTokenManager.getRefreshToken.mockReturnValue("refresh-token");
  });

  it("persists renewed tokens when refresh succeeds", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      }),
    });

    const result = await refreshSessionTokens(fetchMock as typeof fetch);

    expect(result).toEqual({
      ok: true,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    expect(mockedTokenManager.setAccessToken).toHaveBeenCalledWith("new-access-token");
    expect(mockedTokenManager.setRefreshToken).toHaveBeenCalledWith("new-refresh-token");
  });

  it("treats 401 refresh rejection as an auth failure that should clear the session", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        message: "Invalid refresh token",
      }),
    });

    const result = await refreshSessionTokens(fetchMock as typeof fetch);

    expect(result).toEqual({
      ok: false,
      reason: "auth_failure",
      status: 401,
      message: "Invalid refresh token",
    });
    expect(shouldClearSessionOnRefreshFailure(result)).toBe(true);
  });

  it("treats 503 refresh rejection as transient and preserves the session", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({
        message: "Authentication service temporarily unavailable",
      }),
    });

    const result = await refreshSessionTokens(fetchMock as typeof fetch);

    expect(result).toEqual({
      ok: false,
      reason: "transient_failure",
      status: 503,
      message: "Authentication service temporarily unavailable",
    });
    expect(shouldClearSessionOnRefreshFailure(result)).toBe(false);
  });
});
