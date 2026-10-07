import { apiClient } from "./apiClient";
import { tokenManager } from "../utils/tokenManager";
// Temporary types until we fix shared imports
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  timezone?: string;
  partnerCode?: string;
  promoCode?: string;
  businessSpecialtyId?: string;
  businessSpecialtySlug?: string;
  landingBundle?: string;
  utm?: Record<string, string>;
}

interface AuthResponse {
  success: boolean;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Authentication Service
 *
 * Handles all authentication-related API calls and token management
 */

class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials,
    );
    return response.data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  }

  async validateSignupCoupon(promoCode: string): Promise<any> {
    const response = await apiClient.post("/auth/signup-coupon/validate", {
      promoCode,
    });
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout API call failed:", error);
    }
  }

  /**
   * Refresh access token
   */
  // ponytail: refresh token is httpOnly cookie, sent automatically with credentials:'include'
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/refresh");

    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me", {
      _skipErrorToast: true,
    });
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>("/auth/profile", data);
    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await apiClient.post("/auth/change-password", data);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    password: string;
  }): Promise<void> {
    await apiClient.post("/auth/reset-password", data);
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post("/auth/verify-email", { token });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    await apiClient.post("/auth/resend-verification");
  }

  // Token management methods

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    tokenManager.setAccessToken(accessToken);
    tokenManager.setRefreshToken(refreshToken);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return tokenManager.getAccessToken();
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return tokenManager.getRefreshToken();
  }

  /**
   * Remove all tokens
   */
  removeTokens(): void {
    tokenManager.clearTokens();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const tokenData = this.getTokenData();
      if (!tokenData) return false;

      // Check if token is expired
      const now = Date.now() / 1000;
      return tokenData.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Get token data (decoded JWT payload)
   */
  getTokenData(): any | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Get user ID from token
   */
  getUserId(): string | null {
    const tokenData = this.getTokenData();
    return tokenData?.userId || null;
  }

  /**
   * Get user role from token
   */
  getUserRole(): string | null {
    const tokenData = this.getTokenData();
    return tokenData?.role || null;
  }

  /**
   * Get company ID from token
   */
  getCompanyId(): string | null {
    const tokenData = this.getTokenData();
    return tokenData?.companyId || null;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const tokenData = this.getTokenData();
    const permissions = tokenData?.permissions || [];
    return permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }
}

export const authService = new AuthService();
