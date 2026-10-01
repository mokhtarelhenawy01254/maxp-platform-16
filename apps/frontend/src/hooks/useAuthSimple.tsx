import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { getApiUrl } from '../config/environment';
import { tokenManager } from '../utils/tokenManager';
import {
  refreshSessionTokens,
  shouldClearSessionOnRefreshFailure,
} from '../utils/sessionRefresh';
import { repairMojibakeText } from '../utils/textEncoding';
import socketService from '../services/socketService';
import { clearAllSWCaches } from '../utils/swCacheFlush';
import { queryClient } from '../config/queryClient';

interface Company {
  id: string;
  name: string;
  slug: string | null;
  phone?: string | null;
  customDomain?: string | null;
  logo?: string | null;
  currency?: string;
  isActive?: boolean;
  role?: string;
  sidebarLayout?: string;
  activeApps?: string[];
  signupCouponCode?: string | null;
  isDefault?: boolean;
  isCurrent?: boolean;
  businessSpecialty?: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    icon?: string | null;
  } | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  timezone?: string;
  lastLoginAt?: string | null;
  companyId: string | null;
  company: Company | null;
  companies?: Company[];         // قائمة الشركات التي ينتمي إليها المستخدم
  hasMultipleCompanies?: boolean; // هل لديه أكثر من شركة؟
  settings?: string | Record<string, unknown> | null; // JSON string or parsed object (e.g., { defaultPage, sidebarLayout })
  devStats?: {
    xp: number;
    level: number;
  } | null;
  affiliate?: {
    id: string;
    affiliateCode?: string | null;
    status?: string | null;
    commissionType?: string | null;
    commissionRate?: number | null;
    canCreateOrdersForOthers?: boolean | null;
    canViewCustomerData?: boolean | null;
  } | null;
  isDentalTechnician?: boolean;
  dentalRole?: string;
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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials | User, token?: string) => Promise<User | null>;
  register: (data: RegisterData) => Promise<User | null>;
  logout: () => void;
  switchCompany: (companyId: string) => Promise<boolean>; // التبديل بين الشركات
  setDefaultCompany: (companyId: string) => Promise<boolean>; // تعيين الشركة الافتراضية
  refreshUser: () => Promise<User | null>; // تحديث بيانات المستخدم والشركات والتطبيقات
  isSwitchingCompany: boolean; // هل يتم التبديل حالياً؟
}

type AuthContextWindow = typeof globalThis & {
  __MAXP_AUTH_CONTEXT__?: ReturnType<typeof createContext<AuthContextType | undefined>>;
};

// Keep the auth context stable across HMR updates because the app preserves a
// single React root in development. Without this, a hot-reloaded consumer can
// end up reading from a fresh context instance while the provider still holds
// the previous one, which crashes super-admin routes intermittently.
const authContextWindow = globalThis as AuthContextWindow;
const AuthContext =
  authContextWindow.__MAXP_AUTH_CONTEXT__ ??
  createContext<AuthContextType | undefined>(undefined);

authContextWindow.__MAXP_AUTH_CONTEXT__ = AuthContext;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize user from localStorage to prevent redirect "blips" on refresh
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.warn('⚠️ [useAuthSimple] Failed to parse user from localStorage:', e);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const authStateVersionRef = useRef(0);
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const debugLog = useCallback((...args: unknown[]) => {
    if (isDev) console.debug(...args);
  }, [isDev]);
  const warnLog = useCallback((...args: unknown[]) => {
    if (isDev) console.warn(...args);
  }, [isDev]);
  const errorLog = useCallback((...args: unknown[]) => {
    if (isDev) console.error(...args);
  }, [isDev]);
  const bumpAuthStateVersion = () => {
    authStateVersionRef.current += 1;
  };

  const AUTH_TRANSITION_GRACE_MS = 5000;

  const isAuthTransitioning = useCallback(() => {
    try {
      const raw = localStorage.getItem('authTransitionUntil');
      if (!raw) return false;

      const until = Number(raw);
      if (!Number.isFinite(until)) {
        localStorage.removeItem('authTransitionUntil');
        return false;
      }

      if (Date.now() < until) {
        return true;
      }

      localStorage.removeItem('authTransitionUntil');
      return false;
    } catch {
      return false;
    }
  }, []);

  const hasToken = !!tokenManager.getAccessToken();
  const isAuthenticated = !!user || hasToken;

  const clearStoredAuth = useCallback(() => {
    tokenManager.clearTokens();
    localStorage.removeItem('user');
    localStorage.removeItem('dentalRole');
    sessionStorage.removeItem('dentalRole');
    localStorage.removeItem('maxp-default-page');
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const authStateVersion = authStateVersionRef.current;
      const isStale = () => authStateVersion !== authStateVersionRef.current;
      debugLog('🔍 [AuthProvider] Starting auth check...');

      // Keep track of the user we started with (from localStorage)
      let currentInitialUser: User | null = null;
      try {
        const savedUser = localStorage.getItem('user');
        currentInitialUser = savedUser ? JSON.parse(savedUser) : null;
      } catch {
        currentInitialUser = null;
      }

      let finalUser: User | null = currentInitialUser;

      try {
        let token = tokenManager.getAccessToken();
        debugLog('🔍 [AuthProvider] Token exists:', !!token);

        if (token) {
          let mePath = '/auth/me';

          const attemptSessionRecovery = async () => {
            const refreshResult = await refreshSessionTokens();

            if (refreshResult.ok) {
              debugLog('🔄 [AuthProvider] Session refresh succeeded during auth check');
              return refreshResult;
            }

            if (shouldClearSessionOnRefreshFailure(refreshResult)) {
              warnLog('⚠️ [AuthProvider] Session refresh failed with auth error, clearing tokens', refreshResult);
              clearStoredAuth();
              setUser(null);
              finalUser = null;
            } else {
              warnLog('⏳ [AuthProvider] Session refresh failed temporarily, preserving existing user state', refreshResult);
              finalUser = currentInitialUser;
              setUser(currentInitialUser);
            }

            return refreshResult;
          };

          const requestCurrentUser = async (activeToken: string) =>
            fetch(`${getApiUrl()}${mePath}?t=${Date.now()}`, {
              headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include',
            });

          try {
            const parts = token.split('.');
            const payloadBase64 = parts[1];
            if (payloadBase64) {
              const payloadJson = JSON.parse(atob(payloadBase64));
              
              if (payloadJson?.exp && payloadJson.exp < Date.now() / 1000) {
                debugLog('🔍 [AuthProvider] Token is expired locally, attempting session refresh');
                const refreshResult = await attemptSessionRecovery();
                if (!refreshResult.ok) {
                  setIsLoading(false);
                  return;
                }
                token = refreshResult.accessToken;
              }

              if (payloadJson?.role === 'CUSTOMER') {
                mePath = '/public/customers/me';
              }
            }
          } catch (decodeError) {
            debugLog('⚠️ [AuthProvider] Failed to decode access token payload during auth check', decodeError);
          }

          debugLog(`🔍 [AuthProvider] Making ${mePath} request...`);
          let response = await requestCurrentUser(token);

          debugLog('🔍 [AuthProvider] Response status:', response.status);

          if (response.status === 403 || response.status === 401) {
            if (isAuthTransitioning()) {
              warnLog('⏳ [AuthProvider] Ignoring transient 401/403 during auth/company switch transition');
              finalUser = currentInitialUser;
              setUser(currentInitialUser);
            } else {
              const refreshResult = await attemptSessionRecovery();
              if (!refreshResult.ok) {
                return;
              }

              response = await requestCurrentUser(refreshResult.accessToken);
              debugLog('🔍 [AuthProvider] Retried auth check after refresh, status:', response.status);
            }
          }

          if (response.ok || response.status === 304) {
            const data = await response.json();
            debugLog('🔍 [AuthProvider] Response received');

            if (data.success) {
              // debugLog('✅ [AuthProvider] Authenticated user loaded');
              // API might return user in data.data or data.data.user
              debugLog('🔍 [AuthProvider] Data received:', data);
              const userObj = data.data?.user || data.data;
              debugLog('🔍 [AuthProvider] Parsed userObj:', userObj);
              finalUser = userObj;
              setUser(userObj);
              localStorage.setItem('user', JSON.stringify(userObj));
            } else {
              warnLog('⚠️ [AuthProvider] API returned success:false, clearing tokens');
              clearStoredAuth();
              setUser(null);
              finalUser = null;
            }
          } else if (response.status === 403 || response.status === 401) {
            warnLog('⚠️ [AuthProvider] Token still unauthorized after refresh/auth check, clearing tokens');
            warnLog('⚠️ [AuthProvider] Response status:', response.status);
            clearStoredAuth();
            setUser(null);
            finalUser = null;
            debugLog('🔐 [AuthProvider] Token invalid, cleared');
          } else {
            warnLog('⚠️ [AuthProvider] Auth check failed with status:', response.status);

            if (response.status >= 400 && response.status < 500) {
              warnLog('⚠️ [AuthProvider] Client error (4xx), clearing tokens');
              clearStoredAuth();
              setUser(null);
              finalUser = null;
            } else {
              warnLog('⚠️ [AuthProvider] Server error (5xx), keeping existing session if any');
              finalUser = currentInitialUser;
            }
          }
        } else {
          debugLog('🔐 [AuthProvider] No token found');
          // If no token, we definitely shouldn't have a user
          if (currentInitialUser) {
            localStorage.removeItem('user');
            setUser(null);
            finalUser = null;
          }
        }
      } catch (error: unknown) {
        // Network errors or other issues - log
        const errorMessage =
          error instanceof Error ? error.message : String(error ?? '');
        errorLog('❌ [AuthProvider] Auth check failed:', errorMessage || error);

        // Don't clear tokens on network errors - might be temporary
        if (errorMessage.includes('401')) {
          warnLog('⚠️ [AuthProvider] 401 error detected, clearing tokens');
          clearStoredAuth();
          setUser(null);
          finalUser = null;
        } else {
          warnLog('⚠️ [AuthProvider] Network error - keeping existing session if any');
          finalUser = currentInitialUser;
        }
      } finally {
        if (isStale()) {
          debugLog('🔍 [AuthProvider] Check aborted - stale state');
        } else {
          const isNowAuthenticated = !!finalUser;
          debugLog('🔍 [AuthProvider] Auth check complete. Authenticated:', isNowAuthenticated);

          setUser(finalUser || null);
          setIsLoading(false);
        }
      }
    };

    checkAuth();
  }, [clearStoredAuth, debugLog, errorLog, isAuthTransitioning, warnLog]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isAuthTransitioning()) {
        warnLog('⏳ [AuthProvider] Ignoring auth:unauthorized during auth/company switch transition');
        return;
      }

      bumpAuthStateVersion();
      clearStoredAuth();
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearStoredAuth, isAuthTransitioning, warnLog]);

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: User | null }>).detail;
      const nextUser = detail?.user;

      if (!nextUser) {
        return;
      }

      setUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
    };

    window.addEventListener('auth:user-updated', handleUserUpdated as EventListener);
    return () =>
      window.removeEventListener(
        'auth:user-updated',
        handleUserUpdated as EventListener,
      );
  }, []);

  const login = async (credentials: LoginCredentials | User, token?: string) => {
    debugLog('🔍 [AuthProvider] Starting login...');
    try {
      // If user and token are provided directly (for Super Admin)
      if (token && typeof credentials === 'object' && 'id' in credentials) {
        debugLog('🔍 [AuthProvider] Direct login with token');
        bumpAuthStateVersion();
        tokenManager.setAccessToken(token);
        const userData = credentials as User;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsLoading(false);
        return userData;
      }

      // Normal login flow
      const loginCredentials = credentials as LoginCredentials;
      debugLog('🔍 [AuthProvider] Normal login flow');

      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: loginCredentials.email,
          password: loginCredentials.password
        })
      });

      debugLog('🔍 [AuthProvider] Login response status:', response.status);

      // Handle network errors
      if (!response.ok) {
        let errorMessage = 'فشل في تسجيل الدخول';
        try {
          const errorData = await response.json();
          errorMessage = repairMojibakeText(
            errorData.message || errorData.error,
            errorMessage,
          );
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `خطأ في الاتصال (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      debugLog('🔍 [AuthProvider] Login response received');

      if (data.success) {
        // Store tokens
        debugLog('✅ [AuthProvider] Login successful, storing token');
        bumpAuthStateVersion();
        tokenManager.setAccessToken(data.data.token);
        if (data.data.refreshToken) {
          tokenManager.setRefreshToken(data.data.refreshToken);
        }

        // Set user data
        debugLog('✅ [AuthProvider] Setting user data');
        let userData = data.data.user;

        // Hydrate from /auth/me to ensure context-aware fields & activeApps are 100% fresh and matching checkAuth
        try {
          const authToken = tokenManager.getAccessToken();
          const meResponse = await fetch(`${getApiUrl()}/auth/me`, {
            method: 'GET',
            headers: authToken
              ? {
                  Authorization: `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                }
              : {
                  'Content-Type': 'application/json',
                },
            credentials: 'include',
          });

          if (meResponse.ok) {
            const meResult = await meResponse.json();
            const meUser = meResult?.data?.user || meResult?.data;
            if (meResult?.success && meUser) {
              userData = { ...userData, ...meUser };
            }
          }
        } catch (meError) {
          console.warn('⚠️ [AuthProvider] Failed to hydrate login user from /auth/me:', meError);
        }

        try {
          queryClient.clear();
        } catch (qcError) {
          console.warn('⚠️ [AuthProvider] Failed to clear queryClient cache:', qcError);
        }

        setUser(userData);

        // Store user data in localStorage for Socket.IO connection
        localStorage.setItem('user', JSON.stringify(userData));
        if (!userData?.isDentalTechnician && userData?.dentalRole !== 'TECHNICIAN') {
          localStorage.removeItem('dentalRole');
          sessionStorage.removeItem('dentalRole');
        }
        setIsLoading(false);

        // 🔌 Reconnect socket with new authentication token
        // socketService.disconnect();
        // socketService.connect();
        debugLog('🔌 [AUTH] Socket reconnected with new token');

        // Return user data for immediate use
        return userData;
      } else {
        throw new Error(
          repairMojibakeText(data.message, 'فشل في تسجيل الدخول'),
        );
      }
    } catch (error: unknown) {
      const rawErrorMessage =
        error instanceof Error ? error.message : String(error ?? '');
      const errorMessage = repairMojibakeText(
        rawErrorMessage,
        'فشل في تسجيل الدخول',
      );
      errorLog('❌ [AuthProvider] Login error:', errorMessage || error);
      // Provide better error message for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('فشل الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.');
      }
      if (error instanceof Error && error.message !== errorMessage) {
        throw new Error(errorMessage);
      }
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const specificError = result.errors?.[0];
        throw new Error(
          specificError
            ? repairMojibakeText(specificError, 'فشل في إنشاء الحساب')
            : repairMojibakeText(result.message, 'فشل في إنشاء الحساب'),
        );
      }

      // 🧹 Purge any lingering technician/session role artifacts before establishing new account
      localStorage.removeItem('dentalRole');
      sessionStorage.removeItem('dentalRole');
      localStorage.removeItem('maxp-default-page');

      // Store token and user data
      bumpAuthStateVersion();
      tokenManager.setAccessToken(result.data.token);
      if (result.data.refreshToken) {
        tokenManager.setRefreshToken(result.data.refreshToken);
      }

      let userData = result.data.user;

      try {
        const token = tokenManager.getAccessToken();
        const meResponse = await fetch(`${getApiUrl()}/auth/me`, {
          method: 'GET',
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              }
            : {
                'Content-Type': 'application/json',
              },
          credentials: 'include',
        });

        if (meResponse.ok) {
          const meResult = await meResponse.json();
          const meUser = meResult?.data?.user || meResult?.data;
          if (meResult?.success && meUser) {
            userData = { ...userData, ...meUser };
          }
        }
      } catch (meError) {
        console.warn('⚠️ [AuthProvider] Failed to hydrate register user from /auth/me:', meError);
      }

      try {
        queryClient.clear();
      } catch (qcError) {
        console.warn('⚠️ [AuthProvider] Failed to clear queryClient cache:', qcError);
      }

      setUser(userData);

      // Store user data in localStorage for Socket.IO connection
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error: unknown) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (token) {
        // Call logout API
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      errorLog('Logout error:', error);
    } finally {
      // Always clear storage and user state
      bumpAuthStateVersion();
      tokenManager.clearTokens();
      localStorage.removeItem('user');
      localStorage.removeItem('superAuth');
      localStorage.removeItem('superUser');
      localStorage.removeItem('dentalRole');
      sessionStorage.removeItem('dentalRole');
      localStorage.removeItem('maxp-default-page');
      try {
        queryClient.clear();
      } catch (qcError) {
        console.warn('⚠️ [AuthProvider] Failed to clear queryClient cache on logout:', qcError);
      }
      setUser(null);

      // 🔌 Disconnect socket to force fresh connection on next login
      socketService.disconnect();
      debugLog('🔌 [AUTH] Socket disconnected on logout');

      // 🧹 Clear Service Worker Caches to prevent data leakage between sessions
      void clearAllSWCaches();
    }
  };

  // التبديل إلى شركة أخرى
  const switchCompany = async (companyId: string): Promise<boolean> => {
    debugLog('🔄 [AuthProvider] Switching to company:', companyId);

    try {
      bumpAuthStateVersion();
      setIsSwitchingCompany(true);
      const token = tokenManager.getAccessToken();

      if (!token) {
        errorLog('❌ [AuthProvider] No token for company switch');
        return false;
      }

      const response = await fetch(`${getApiUrl()}/auth/switch-company/${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        debugLog('✅ [AuthProvider] Company switch successful');

        localStorage.setItem('authTransitionUntil', String(Date.now() + AUTH_TRANSITION_GRACE_MS));

        // Store new tokens
        tokenManager.setAccessToken(data.data.token);
        if (data.data.refreshToken) {
          tokenManager.setRefreshToken(data.data.refreshToken);
        }

        let switchedUser: User | null = null;

        try {
          const switchedToken = tokenManager.getAccessToken();
          const meResponse = await fetch(`${getApiUrl()}/auth/me?t=${Date.now()}`, {
            headers: switchedToken
              ? {
                  Authorization: `Bearer ${switchedToken}`,
                  'Content-Type': 'application/json',
                }
              : {
                  'Content-Type': 'application/json',
                },
            credentials: 'include',
            cache: 'no-store',
          });

          if (meResponse.ok) {
            const meResult = await meResponse.json();
            const hydratedUser = meResult?.data?.user || meResult?.data || null;
            if (hydratedUser) {
              switchedUser = hydratedUser;
            }
          }
        } catch (meError) {
          warnLog('⚠️ [AuthProvider] Failed to hydrate switched company user from /auth/me:', meError);
        }

        if (!switchedUser && user) {
          const fallbackCompanies =
            data.data.companies ||
            user.companies?.map((company) => ({
              ...company,
              isCurrent: company.id === companyId,
            })) ||
            [];

          switchedUser = {
            ...user,
            companyId,
            role: data.data.role,
            company: data.data.company,
            companies: fallbackCompanies,
            hasMultipleCompanies:
              data.data.hasMultipleCompanies ??
              fallbackCompanies.length > 1,
          };
        }

        if (switchedUser) {
          setUser(switchedUser);
          localStorage.setItem('user', JSON.stringify(switchedUser));
        }
        setIsLoading(false);

        // Store company switch timestamp to force consumers to refresh scoped data
        localStorage.setItem('companySwitchTimestamp', Date.now().toString());

        // Let React/context consumers update first, then soft-refresh the route state
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('company:switched', {
            detail: {
              companyId,
              timestamp: Date.now(),
            },
          }));
        }, 50);

        return true;
      } else {
        errorLog('❌ [AuthProvider] Company switch failed:', data?.message);
        return false;
      }
    } catch (error) {
      errorLog('❌ [AuthProvider] Company switch error:', error);
      return false;
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const setDefaultCompany = async (companyId: string): Promise<boolean> => {
    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch(`${getApiUrl()}/auth/set-default-company/${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // تحديث حالة المستخدم محلياً لتعكس الشركة الافتراضية الجديدة
        if (user && user.companies) {
          const updatedCompanies = user.companies.map(c => ({
            ...c,
            isDefault: c.id === companyId
          }));
          
          const updatedUser = {
            ...user,
            companyId: companyId, // تحديث الشركة الأساسية أيضاً
            companies: updatedCompanies
          };

          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return true;
      } else {
        errorLog('❌ [AuthProvider] Set default company failed:', data?.message);
        return false;
      }
    } catch (error) {
      errorLog('❌ [AuthProvider] Set default company error:', error);
      return false;
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) return null;

      let mePath = '/auth/me';
      try {
        const parts = token.split('.');
        const payloadBase64 = parts[1];
        if (payloadBase64) {
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson?.role === 'CUSTOMER') {
            mePath = '/public/customers/me';
          }
        }
      } catch (e) {
        // ignore decode error
      }

      const response = await fetch(`${getApiUrl()}${mePath}?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (response.ok || response.status === 304) {
        const data = await response.json();
        if (data.success) {
          const userObj = data.data?.user || data.data;
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
          return userObj;
        }
      }
      return null;
    } catch (e) {
      warnLog('⚠️ [AuthProvider] Failed to refresh user profile:', e);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    switchCompany,
    setDefaultCompany,
    refreshUser,
    isSwitchingCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOptionalAuth = (): AuthContextType | undefined =>
  useContext(AuthContext);
