import React, { useState, useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";

interface FacebookPixelSettings {
  // Pixel Settings
  facebookPixelEnabled: boolean;
  facebookPixelId: string;
  pixelTrackPageView: boolean;
  pixelTrackViewContent: boolean;
  pixelTrackAddToCart: boolean;
  pixelTrackInitiateCheckout: boolean;
  pixelTrackPurchase: boolean;
  pixelTrackSearch: boolean;
  pixelTrackAddToWishlist: boolean;

  // CAPI Settings
  facebookConvApiEnabled: boolean;
  facebookConvApiToken: string;
  facebookConvApiTestCode: string;
  capiTrackPageView: boolean;
  capiTrackViewContent: boolean;
  capiTrackAddToCart: boolean;
  capiTrackInitiateCheckout: boolean;
  capiTrackPurchase: boolean;
  capiTrackSearch: boolean;

  // Advanced
  eventDeduplicationEnabled: boolean;
  eventMatchQualityTarget: number;
  gdprCompliant: boolean;
  hashUserData: boolean;

  // Status
  pixelStatus?: string;
  capiStatus?: string;
  lastPixelTest?: string;
  lastCapiTest?: string;
}

interface PixelConfig {
  id: string;
  pixelId: string;
  pixelName: string;
  accessToken?: string;
  isActive: boolean;
  isPrimary: boolean;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  trackSearch: boolean;
  trackAddToWishlist: boolean;
  trackLead: boolean;
  trackCompleteRegistration: boolean;
  lastTestAt?: string;
  lastTestResult?: string;
  totalEventsSent: number;
  errorCount: number;
  lastError?: string;
  tokenStatus?: string;
  eventMatchQuality?: number;
}

interface DiagnosticsData {
  timestamp: string;
  overall: {
    status: string;
    score: number;
    issues: Array<{ type: string; code: string; message: string }>;
    recommendations: Array<{ priority: string; message: string }>;
  };
  pixel: {
    configured: boolean;
    status: string;
    pixelId: string | null;
    lastTest: string | null;
    issues: Array<{ type: string; code: string; message: string }>;
  };
  capi: {
    configured: boolean;
    status: string;
    hasToken: boolean;
    tokenStatus: string;
    lastTest: string | null;
    issues: Array<{ type: string; code: string; message: string }>;
  };
  events: {
    pixelEvents: string[];
    capiEvents: string[];
    deduplicationEnabled: boolean;
  };
  multiplePixels: {
    enabled: boolean;
    count: number;
    pixels: PixelConfig[];
  };
}

interface FacebookOAuthPixel {
  pixelId: string;
  pixelName: string;
  businessId?: string;
  businessName?: string;
}

interface TokenPermissionIssue {
  type: "error" | "warning" | string;
  message: string;
}

interface TokenPermissionsData {
  valid: boolean;
  permissions?: string[];
  expiresAt?: string;
  issues?: TokenPermissionIssue[];
}

interface FacebookOAuthPixelsResponse {
  success: boolean;
  pixels: FacebookOAuthPixel[];
  needsAuth?: boolean;
  noBusinesses?: boolean;
  missingPermissions?: string[];
  message?: string;
}

interface PixelAuthorizeResponse {
  authUrl: string;
}

interface PixelTokenResponse {
  success: boolean;
  accessToken?: string;
}

interface ServiceErrorData {
  message?: string;
  needsAuth?: boolean;
  missingPermissions?: string[];
}

interface StorefrontSettingsPayload {
  data?: Partial<FacebookPixelSettings>;
}

const getAxiosErrorData = (error: unknown): ServiceErrorData | undefined =>
  isAxiosError<ServiceErrorData>(error) ? error.response?.data : undefined;

const getErrorMessage = (error: unknown, fallback: string): string => {
  const errorData = getAxiosErrorData(error);
  if (errorData?.message) {
    return errorData.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const FacebookPixelSettings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<FacebookPixelSettings>>({
    facebookPixelEnabled: false,
    facebookConvApiEnabled: false,
    eventDeduplicationEnabled: true,
    eventMatchQualityTarget: 8,
    gdprCompliant: true,
    hashUserData: true,
    pixelTrackPageView: true,
    pixelTrackViewContent: true,
    pixelTrackAddToCart: true,
    pixelTrackInitiateCheckout: true,
    pixelTrackPurchase: true,
    pixelTrackSearch: true,
    capiTrackPageView: true,
    capiTrackViewContent: true,
    capiTrackAddToCart: true,
    capiTrackInitiateCheckout: true,
    capiTrackPurchase: true,
    capiTrackSearch: true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingPixel, setTestingPixel] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🆕 Easy Connect States
  const [pixels, setPixels] = useState<FacebookOAuthPixel[]>([]);
  const [showPixelSelector, setShowPixelSelector] = useState(false);
  const [fetchingPixels, setFetchingPixels] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const { user } = useAuth();

  // 🔧 Diagnostics States
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);
  const [tokenPermissions, setTokenPermissions] =
    useState<TokenPermissionsData | null>(null);

  // 🎯 Multiple Pixels States
  const [multiplePixels, setMultiplePixels] = useState<PixelConfig[]>([]);
  const [showMultiplePixels, setShowMultiplePixels] = useState(false);
  const [showAddPixelModal, setShowAddPixelModal] = useState(false);
  const [newPixel, setNewPixel] = useState({
    pixelId: "",
    pixelName: "",
    accessToken: "",
    isPrimary: false,
    trackPageView: true,
    trackViewContent: true,
    trackAddToCart: true,
    trackInitiateCheckout: true,
    trackPurchase: true,
    trackSearch: true,
    trackAddToWishlist: false,
    trackLead: false,
    trackCompleteRegistration: false,
  });
  const [addingPixel, setAddingPixel] = useState(false);
  const [testingPixelId, setTestingPixelId] = useState<string | null>(null);

  // 🆕 Create Pixel States
  const [showCreatePixelModal, setShowCreatePixelModal] = useState(false);
  const [creatingPixel, setCreatingPixel] = useState(false);
  const [newPixelName, setNewPixelName] = useState("");
  const [businessAccounts, setBusinessAccounts] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [loadingBusinessAccounts, setLoadingBusinessAccounts] = useState(false);

  // Track if settings have been loaded to prevent multiple calls
  const hasLoadedSettings = useRef(false);

  // Load settings on mount
  useEffect(() => {
    const initializePage = async () => {
      // Only load settings if not already loaded
      if (!hasLoadedSettings.current) {
        hasLoadedSettings.current = true;
        await loadSettings();
      }

      // معالجة query parameters بعد إعادة التوجيه من Facebook OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const error = urlParams.get("error");

      if (success === "pixel_connected") {
        tToast.success("facebookPixel.success_connect_account_7c2d");
        // تنظيف URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        // جلب Pixels بعد الربط الناجح
        setTimeout(() => {
          fetchPixels();
        }, 1000);
      } else if (error) {
        let errorMessage = "فشل الربط مع Facebook";
        switch (error) {
          case "facebook_oauth_access_denied":
            errorMessage = "تم رفض طلب الوصول. يرجى المحاولة مرة أخرى";
            break;
          case "missing_code_or_state":
            errorMessage = "خطأ في بيانات الترخيص. يرجى المحاولة مرة أخرى";
            break;
          case "invalid_state":
            errorMessage = "تم انتهاء صلاحية الطلب. يرجى المحاولة مرة أخرى";
            break;
          case "state_expired":
            errorMessage = "انتهت صلاحية الطلب. يرجى المحاولة مرة أخرى";
            break;
          case "callback_failed":
            errorMessage = "فشل استكمال الربط. يرجى المحاولة مرة أخرى";
            break;
        }
        toast.error(errorMessage);
        // تنظيف URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    };

    // Only initialize if settings haven't been loaded yet
    if (!hasLoadedSettings.current) {
      initializePage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch pixels when settings are loaded (if token exists)
  // Use useRef to track if we've already attempted to fetch pixels
  const hasAttemptedFetch = useRef(false);

  // Reset hasAttemptedFetch and hasLoadedSettings when companyId changes
  useEffect(() => {
    hasAttemptedFetch.current = false;
    hasLoadedSettings.current = false;
  }, [user?.companyId]);

  // ❌ تم إلغاء الـ auto-fetch - البيانات محفوظة في قاعدة البيانات
  // المستخدم يمكنه الربط يدوياً عبر زر "ربط سهل مع Facebook" إذا أراد
  // useEffect(() => {
  //   if (!loading && !fetchingPixels && !showPixelSelector && !showManualSetup && !hasAttemptedFetch.current && user?.companyId) {
  //     hasAttemptedFetch.current = true;
  //     const timer = setTimeout(() => {
  //       fetchPixels();
  //     }, 1500);
  //     return () => clearTimeout(timer);
  //   }
  //   return undefined;
  // }, [loading, fetchingPixels, showPixelSelector, showManualSetup, user?.companyId]);

  const loadSettings = async (skipGuard: boolean = false) => {
    try {
      // Prevent multiple simultaneous calls unless explicitly allowed
      if (!skipGuard && hasLoadedSettings.current && !loading) {
        return;
      }

      setLoading(true);
      const response = await storefrontSettingsService.getSettings();
      console.log("📥 Raw response:", response);
      const settingsData = (response as StorefrontSettingsPayload).data;
      console.log("📥 Settings data:", settingsData);
      if (settingsData) {
        // Important: settingsData should override default values
        const newSettings = {
          // Default values first
          facebookPixelEnabled: false,
          facebookConvApiEnabled: false,
          eventDeduplicationEnabled: true,
          eventMatchQualityTarget: 8,
          gdprCompliant: true,
          hashUserData: true,
          pixelTrackPageView: true,
          pixelTrackViewContent: true,
          pixelTrackAddToCart: true,
          pixelTrackInitiateCheckout: true,
          pixelTrackPurchase: true,
          pixelTrackSearch: true,
          pixelTrackAddToWishlist: false,
          capiTrackPageView: true,
          capiTrackViewContent: true,
          capiTrackAddToCart: true,
          capiTrackInitiateCheckout: true,
          capiTrackPurchase: true,
          capiTrackSearch: true,
          // Then override with actual data from server
          ...settingsData,
        };
        console.log("✅ Settings loaded:", settingsData);
        console.log("🔄 Merged settings:", newSettings);
        console.log("📊 Pixel ID:", newSettings.facebookPixelId);
        console.log("📊 Pixel Enabled:", newSettings.facebookPixelEnabled);
        setSettings(newSettings);
        hasLoadedSettings.current = true;
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      tToast.error("facebookPixel.failed_load_settings_11f2");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validation
      if (settings.facebookPixelEnabled && !settings.facebookPixelId) {
        tToast.error("facebookPixel.required_enter_9b40");
        setSaving(false);
        return;
      }

      if (
        settings.facebookPixelId &&
        !/^\d{16}$/.test(settings.facebookPixelId)
      ) {
        tToast.error("facebookPixel.msg_1bac");
        setSaving(false);
        return;
      }

      if (settings.facebookConvApiEnabled && !settings.facebookConvApiToken) {
        tToast.error("facebookPixel.required_enter_3a76");
        setSaving(false);
        return;
      }

      console.log("💾 Saving settings:", settings);

      // Save settings
      const response = await storefrontSettingsService.updateSettings(settings);
      console.log("✅ Save response:", response);

      tToast.success("facebookPixel.success_save_settings_09ef");

      // Reload to get updated data (skip guard to force reload)
      await loadSettings(true);
    } catch (error) {
      tToast.error("facebookPixel.failed_save_settings_0771");
      console.error("❌ Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPixel = async () => {
    try {
      setTestingPixel(true);

      // Test Pixel
      const response = await storefrontSettingsService.testFacebookPixel();

      if (response.success) {
        tToast.success("facebookPixel.msg_d7b6");
        await loadSettings(true); // Reload to get updated status
      } else {
        toast.error(
          `❌ فشل الاختبار: ${response.message || "Pixel ID غير صحيح"}`,
        );
      }
    } catch (error: unknown) {
      toast.error(`❌ خطأ: ${getErrorMessage(error, i18n.t("facebookPixel.msg_134e"))}`);
    } finally {
      setTestingPixel(false);
    }
  };

  const handleTestCapi = async () => {
    try {
      setTesting(true);

      // Test CAPI connection
      const response = await storefrontSettingsService.testFacebookCapi();

      if (response.success) {
        tToast.success("facebookPixel.msg_931c");
        await loadSettings(true); // Reload to get updated status
      } else {
        toast.error(i18n.t("facebookPixel.msg_vcygkc", { message: message }));
      }
    } catch (error: unknown) {
      toast.error(`❌ خطأ: ${getErrorMessage(error, i18n.t("facebookPixel.msg_dbf2"))}`);
    } finally {
      setTesting(false);
    }
  };

  // 🆕 Easy Connect Functions (منفصل عن نظام الصفحات)
  const handleEasyConnect = async () => {
    try {
      setFetchingPixels(true);

      // اذهب مباشرة لـ OAuth (مثل صفحة الإعدادات/التكامل)
      const authResponse = await apiClient.get<PixelAuthorizeResponse>(
        "/facebook-oauth/pixel-authorize",
        {
          params: {
            companyId: user?.companyId,
            returnOrigin: window.location.origin,
          },
        },
      );
      window.location.href = authResponse.data.authUrl;
    } catch (error: unknown) {
      console.error("Error in easy connect:", error);
      tToast.error("facebookPixel.msg_0877");
      setFetchingPixels(false);
    }
  };

  const fetchPixels = async (autoRedirect: boolean = false) => {
    try {
      setFetchingPixels(true);
      const response = await apiClient.get<FacebookOAuthPixelsResponse>(
        "/facebook-oauth/pixels",
        {
          params: { companyId: user?.companyId },
        },
      );

      if (response.data.success && response.data.pixels.length > 0) {
        setPixels(response.data.pixels);
        setShowPixelSelector(true);
        toast.success(i18n.t("facebookPixel.msg_s5gii5", { length: length }));
      } else if (response.data.needsAuth || response.data.noBusinesses) {
        // Need to authenticate - لكن فقط إذا طلب المستخدم ذلك
        if (autoRedirect) {
          if (response.data.noBusinesses) {
            toast.error(
              "⚠️ لم يتم العثور على Businesses. قد تكون مسجل بحساب آخر.",
              {
                duration: 4000,
              },
            );
            setTimeout(() => {
              handleEasyConnect();
            }, 1000);
          } else if (response.data.missingPermissions) {
            const missingPerms = response.data.missingPermissions.join(" و ");
            toast.error(`⚠️ الصلاحيات المطلوبة غير متوفرة: ${missingPerms}`, {
              duration: 6000,
            });
            setTimeout(() => {
              handleEasyConnect();
            }, 1500);
          } else {
            toast.success(
              response.data.message || "يرجى الربط مع Facebook...",
              {
                duration: 3000,
              },
            );
            const authResponse = await apiClient.get<PixelAuthorizeResponse>(
              "/facebook-oauth/pixel-authorize",
              {
                params: {
                  companyId: user?.companyId,
                  returnOrigin: window.location.origin,
                },
              },
            );
            window.location.href = authResponse.data.authUrl;
          }
        } else {
          // لا تحويل تلقائي - فقط أظهر رسالة
          console.log("📌 No Facebook connection - user can connect manually");
        }
      } else {
        // لا توجد Pixels - لا تفعل شيء تلقائياً
        console.log("📌 No Pixels found - user can add manually");
      }
    } catch (error: unknown) {
      console.error("Error fetching pixels:", error);
      const errorData = getAxiosErrorData(error);

      // إذا كان الخطأ يحتاج re-auth، فقط أظهر رسالة (لا تحويل تلقائي)
      if (
        errorData?.needsAuth ||
        errorData?.missingPermissions
      ) {
        if (autoRedirect) {
          const missingPerms = errorData?.missingPermissions;
          if (missingPerms && missingPerms.length > 0) {
            const missingPermsText = missingPerms.join(" و ");
            toast.error(
              `⚠️ الصلاحيات المطلوبة غير متوفرة: ${missingPermsText}`,
              {
                duration: 4000,
              },
            );
          }
          setTimeout(() => {
            handleEasyConnect();
          }, 1000);
        } else {
          console.log("📌 Auth needed - user can connect manually");
        }
      } else {
        // خطأ آخر - لا تفعل شيء
        console.log(
          "📌 Error fetching pixels:",
          getErrorMessage(error, "Unknown error"),
        );
      }
    } finally {
      setFetchingPixels(false);
    }
  };

  const handleSelectPixel = async (pixel: FacebookOAuthPixel) => {
    try {
      const loadingToast = tToast.loading("facebookPixel.loading_connect_d006");

      // Generate access token
      let accessToken = "";
      try {
        const tokenResponse = await apiClient.post<PixelTokenResponse>(
          "/facebook-oauth/generate-pixel-token",
          { pixelId: pixel.pixelId, businessId: pixel.businessId },
          { params: { companyId: user?.companyId } },
        );

        if (tokenResponse.data.success) {
          accessToken = tokenResponse.data.accessToken;
        }
      } catch (_tokenError) {
        console.warn("Could not generate token automatically");
      }

      // Update settings
      const newSettings = {
        ...settings,
        facebookPixelId: pixel.pixelId,
        facebookPixelEnabled: true,
        facebookConvApiEnabled: !!accessToken,
        facebookConvApiToken:
          accessToken || settings.facebookConvApiToken || "",
      };

      await storefrontSettingsService.updateSettings(newSettings);
      setSettings(newSettings);
      setShowPixelSelector(false);

      toast.dismiss(loadingToast);
      tToast.success("facebookPixel.success_connect_3ac1");

      await loadSettings(true);
    } catch (error: unknown) {
      console.error("Error selecting pixel:", error);
      tToast.error("facebookPixel.failed_connect_4859");
    }
  };

  // 🔧 Diagnostics Functions
  const loadDiagnostics = async () => {
    try {
      setLoadingDiagnostics(true);
      const response = await storefrontSettingsService.getPixelDiagnostics();
      if (response.success) {
        setDiagnostics(response.data);
      }
    } catch (error) {
      console.error("Error loading diagnostics:", error);
      tToast.error("facebookPixel.failed_load_ed28");
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const handleCheckTokenPermissions = async () => {
    try {
      setCheckingToken(true);
      const response = await storefrontSettingsService.checkTokenPermissions();
      if (response.success) {
        setTokenPermissions(response.data);
        if (response.data.valid) {
          tToast.success("facebookPixel.msg_75da");
        } else {
          tToast.error("facebookPixel.msg_49a8");
        }
      }
    } catch (error: unknown) {
      console.error("Error checking token:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_check_1804")));
    } finally {
      setCheckingToken(false);
    }
  };

  // 🎯 Multiple Pixels Functions
  const loadMultiplePixels = async () => {
    try {
      const response = await storefrontSettingsService.getPixels();
      if (response.success) {
        setMultiplePixels(response.data.pixels || []);
      }
    } catch (error) {
      console.error("Error loading pixels:", error);
    }
  };

  const handleAddPixel = async () => {
    if (!newPixel.pixelId || !newPixel.pixelName) {
      tToast.error("facebookPixel.required_enter_5012");
      return;
    }

    if (!/^\d{16}$/.test(newPixel.pixelId)) {
      tToast.error("facebookPixel.msg_1bac");
      return;
    }

    try {
      setAddingPixel(true);
      const response = await storefrontSettingsService.addPixel(newPixel);
      if (response.success) {
        tToast.success("facebookPixel.msg_293c");
        setShowAddPixelModal(false);
        setNewPixel({
          pixelId: "",
          pixelName: "",
          accessToken: "",
          isPrimary: false,
          trackPageView: true,
          trackViewContent: true,
          trackAddToCart: true,
          trackInitiateCheckout: true,
          trackPurchase: true,
          trackSearch: true,
          trackAddToWishlist: false,
          trackLead: false,
          trackCompleteRegistration: false,
        });
        await loadMultiplePixels();
      }
    } catch (error: unknown) {
      console.error("Error adding pixel:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.msg_395b")));
    } finally {
      setAddingPixel(false);
    }
  };

  const handleDeletePixel = async (pixelId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا Pixel؟")) return;

    try {
      const response = await storefrontSettingsService.deletePixel(pixelId);
      if (response.success) {
        tToast.success("facebookPixel.success_delete_df0b");
        await loadMultiplePixels();
      }
    } catch (error: unknown) {
      console.error("Error deleting pixel:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_delete_f091")));
    }
  };

  const handleTestPixelById = async (pixelId: string) => {
    try {
      setTestingPixelId(pixelId);
      const response = await storefrontSettingsService.testPixelById(pixelId);
      if (response.success && response.data.success) {
        tToast.success("facebookPixel.test_success_59dc");
      } else {
        tToast.error("facebookPixel.failed_test_e3c7");
      }
      await loadMultiplePixels();
    } catch (error: unknown) {
      console.error("Error testing pixel:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_test_1971")));
    } finally {
      setTestingPixelId(null);
    }
  };

  const handleSetPrimary = async (pixelId: string) => {
    try {
      const response = await storefrontSettingsService.updatePixel(pixelId, {
        isPrimary: true,
      });
      if (response.success) {
        tToast.success("facebookPixel.success_assign_65dc");
        await loadMultiplePixels();
        await loadSettings(true);
      }
    } catch (error: unknown) {
      console.error("Error setting primary:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_assign_d2eb")));
    }
  };

  // 🆕 Create Pixel Functions
  const loadBusinessAccounts = async () => {
    try {
      setLoadingBusinessAccounts(true);
      const response = await storefrontSettingsService.getBusinessAccounts();
      if (response.success) {
        setBusinessAccounts(response.data.businesses || []);
        if (response.data.businesses?.length > 0) {
          setSelectedBusinessId(response.data.businesses[0].id);
        }
      }
    } catch (error: unknown) {
      console.error("Error loading business accounts:", error);
      if (getAxiosErrorData(error)?.needsAuth) {
        tToast.error("facebookPixel.connect_account_7723");
      } else {
        tToast.error("facebookPixel.failed_fetch_e086");
      }
    } finally {
      setLoadingBusinessAccounts(false);
    }
  };

  const handleOpenCreatePixelModal = async () => {
    setShowCreatePixelModal(true);
    setNewPixelName("");
    await loadBusinessAccounts();
  };

  const handleCreatePixel = async () => {
    if (!newPixelName.trim()) {
      tToast.error("facebookPixel.required_enter_name_c004");
      return;
    }

    if (!selectedBusinessId) {
      tToast.error("facebookPixel.required_select_6f4d");
      return;
    }

    try {
      setCreatingPixel(true);
      const response = await storefrontSettingsService.createFacebookPixel(
        newPixelName,
        selectedBusinessId,
      );
      if (response.success) {
        toast.success(i18n.t("facebookPixel.msg_1l2s94", { pixelId: pixelId }));
        setShowCreatePixelModal(false);
        setNewPixelName("");
        await loadMultiplePixels();
        await loadSettings(true);
      }
    } catch (error: unknown) {
      console.error("Error creating pixel:", error);
      if (getAxiosErrorData(error)?.needsAuth) {
        tToast.error("facebookPixel.connect_account_7723");
      } else {
        toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_create_23a9")));
      }
    } finally {
      setCreatingPixel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            جاري تحميل الإعدادات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 ml-3" />
              Facebook Pixel & Conversions API
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              تتبع دقيق لزوار متجرك وتحسين أداء إعلانات Facebook
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  حفظ الإعدادات
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 ml-3 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">💡 نصيحة مهمة:</p>
            <p>
              للحصول على أفضل دقة في التتبع (90%+)، فعّل{" "}
              <strong>Pixel + Conversions API معاً</strong>. هذا يضمن تتبع
              الأحداث حتى مع Ad Blockers و iOS 14.5+
            </p>
          </div>
        </div>
      </div>

      {/* 🆕 Easy Connect Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <RocketLaunchIcon className="h-12 w-12 text-blue-600" />
          </div>
          <div className="mr-4 flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              🚀 الطريقة السهلة (موصى بها)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              اربط حسابك مع Facebook وسيتم جلب Pixel ID و Access Token تلقائياً
            </p>

            <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                <span>سهل وسريع (2-3 دقائق فقط)</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                <span>لا يحتاج نسخ ولصق</span>
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                <span>Access Token يُنشأ تلقائياً</span>
              </div>
            </div>

            <button
              onClick={handleEasyConnect}
              disabled={fetchingPixels}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {fetchingPixels ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  جاري الربط...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  🔗 ربط مع Facebook تلقائياً
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pixel Selector */}
      {showPixelSelector && (
        <div className="bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            اختر Facebook Pixel:
          </h3>
          <div className="space-y-3">
            {pixels.map((pixel) => (
              <button
                key={pixel.pixelId}
                onClick={() => handleSelectPixel(pixel)}
                className="w-full text-right p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {pixel.pixelName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  ID: {pixel.pixelId}
                </div>
                {pixel.businessName && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Business: {pixel.businessName}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            أو
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Facebook Pixel Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                🎯 Facebook Pixel
                <span className="mr-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Browser Tracking)
                </span>
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                تتبع الأحداث من متصفح المستخدم
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.facebookPixelEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    facebookPixelEnabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="mr-3 text-sm font-medium text-gray-900 dark:text-white">
                تفعيل
              </span>
            </label>
          </div>

          {settings.facebookPixelEnabled && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  معرف البكسل (Pixel ID) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.facebookPixelId || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        facebookPixelId: e.target.value,
                      })
                    }
                    placeholder="1234567890123456"
                    maxLength={16}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleTestPixel}
                    disabled={
                      testingPixel ||
                      !settings.facebookPixelId ||
                      settings.facebookPixelId.length !== 16
                    }
                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    {testingPixel ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        جاري الاختبار...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        اختبار Pixel
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <InformationCircleIcon className="h-4 w-4 ml-1" />
                  16 رقم - يمكنك الحصول عليه من Facebook Events Manager
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 ml-2" />
                  الأحداث المتتبعة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: "pixelTrackPageView",
                      label: "عرض الصفحات",
                      desc: "PageView",
                    },
                    {
                      key: "pixelTrackViewContent",
                      label: "عرض المنتج",
                      desc: "ViewContent",
                    },
                    {
                      key: "pixelTrackAddToCart",
                      label: "إضافة للسلة",
                      desc: "AddToCart",
                    },
                    {
                      key: "pixelTrackInitiateCheckout",
                      label: "بدء الشراء",
                      desc: "InitiateCheckout",
                    },
                    {
                      key: "pixelTrackPurchase",
                      label: "عمليات الشراء",
                      desc: "Purchase",
                    },
                    { key: "pixelTrackSearch", label: "البحث", desc: "Search" },
                  ].map((event) => (
                    <label
                      key={event.key}
                      className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={
                          (settings[
                            event.key as keyof FacebookPixelSettings
                          ] as boolean) || false
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [event.key]: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ml-3 mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {event.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {settings.pixelStatus === "active" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                    ) : settings.pixelStatus === "error" ? (
                      <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                    ) : (
                      <InformationCircleIcon className="h-5 w-5 text-yellow-500 ml-2" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      الحالة:{" "}
                      <span className="font-semibold">
                        {settings.pixelStatus === "active"
                          ? "نشط ✅"
                          : settings.pixelStatus === "error"
                            ? "خطأ ❌"
                            : "غير مُكوّن ⚠️"}
                      </span>
                    </span>
                  </div>
                  {settings.lastPixelTest && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      آخر اختبار:{" "}
                      {new Date(settings.lastPixelTest).toLocaleString("ar-EG")}
                    </span>
                  )}
                </div>
                  {settings.pixelStatus === "not_configured" && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      💡 أدخل Pixel ID واضغط على &quot;اختبار Pixel&quot; للتحقق من صحته
                    </p>
                  )}
                {settings.pixelStatus === "error" && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    ⚠️ Pixel ID غير صحيح - يرجى التحقق من الرقم وإعادة المحاولة
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Facebook Conversions API Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                🚀 Facebook Conversions API
                <span className="mr-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  موصى به
                </span>
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                تتبع الأحداث من السيرفر - دقة أعلى (90%+)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.facebookConvApiEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    facebookConvApiEnabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              <span className="mr-3 text-sm font-medium text-gray-900 dark:text-white">
                تفعيل
              </span>
            </label>
          </div>

          {settings.facebookConvApiEnabled && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={settings.facebookConvApiToken || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        facebookConvApiToken: e.target.value,
                      })
                    }
                    placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 ml-1" />
                  استخدم System User Token من Facebook Business Manager
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Event Code{" "}
                  <span className="text-gray-400">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={settings.facebookConvApiTestCode || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      facebookConvApiTestCode: e.target.value,
                    })
                  }
                  placeholder="TEST12345"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  للاختبار فقط - احذفه قبل النشر للإنتاج
                </p>
              </div>

              <div className="border-t pt-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 text-green-600 ml-2" />
                  الأحداث المتتبعة (Server-side)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: "capiTrackPageView",
                      label: "عرض الصفحات",
                      desc: "PageView",
                    },
                    {
                      key: "capiTrackViewContent",
                      label: "عرض المنتج",
                      desc: "ViewContent",
                    },
                    {
                      key: "capiTrackAddToCart",
                      label: "إضافة للسلة",
                      desc: "AddToCart",
                    },
                    {
                      key: "capiTrackInitiateCheckout",
                      label: "بدء الشراء",
                      desc: "InitiateCheckout",
                    },
                    {
                      key: "capiTrackPurchase",
                      label: "عمليات الشراء",
                      desc: "Purchase",
                    },
                    { key: "capiTrackSearch", label: "البحث", desc: "Search" },
                  ].map((event) => (
                    <label
                      key={event.key}
                      className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={
                          (settings[
                            event.key as keyof FacebookPixelSettings
                          ] as boolean) || false
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            [event.key]: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded ml-3 mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {event.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTestCapi}
                  disabled={
                    testing ||
                    !settings.facebookPixelId ||
                    !settings.facebookConvApiToken
                  }
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {testing ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      جاري الاختبار...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      اختبار الاتصال
                    </>
                  )}
                </button>
              </div>

              {settings.capiStatus && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {settings.capiStatus === "active" ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        الحالة:{" "}
                        <span className="font-semibold">
                          {settings.capiStatus === "active"
                            ? "نشط ✅"
                            : "خطأ ❌"}
                        </span>
                      </span>
                    </div>
                    {settings.lastCapiTest && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        آخر اختبار:{" "}
                        {new Date(settings.lastCapiTest).toLocaleString(
                          "ar-EG",
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-right"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              ⚙️ إعدادات متقدمة
            </h2>
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    منع تكرار الأحداث (Deduplication)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    يمنع حساب نفس الحدث مرتين من Pixel و CAPI
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.eventDeduplicationEnabled || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      eventDeduplicationEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    GDPR Compliant
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الالتزام بقوانين حماية البيانات الأوروبية
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.gdprCompliant || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gdprCompliant: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    تشفير بيانات المستخدم (Hash)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    تشفير البريد والهاتف قبل الإرسال (SHA256)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.hashUserData || false}
                  onChange={(e) =>
                    setSettings({ ...settings, hashUserData: e.target.checked })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Event Match Quality Target
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.eventMatchQualityTarget || 8}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        eventMatchQualityTarget: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-indigo-600 w-12 text-center">
                    {settings.eventMatchQualityTarget}/10
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  الهدف: {settings.eventMatchQualityTarget}/10 - كلما زاد الرقم،
                  زادت دقة التتبع
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 🔧 Diagnostics & Troubleshooting Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <button
            onClick={() => {
              setShowDiagnostics(!showDiagnostics);
              if (!showDiagnostics && !diagnostics) {
                loadDiagnostics();
              }
            }}
            className="w-full flex items-center justify-between text-right"
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 ml-2" />
              🔧 التشخيص واستكشاف الأخطاء
            </h2>
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${showDiagnostics ? "rotate-180" : ""}`}
            />
          </button>

          {showDiagnostics && (
            <div className="mt-6 space-y-4">
              {loadingDiagnostics ? (
                <div className="flex justify-center py-8">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : diagnostics ? (
                <>
                  {/* Overall Score */}
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      diagnostics.overall.status === "excellent"
                        ? "bg-green-50 border-green-300"
                        : diagnostics.overall.status === "good"
                          ? "bg-blue-50 border-blue-300"
                          : diagnostics.overall.status === "fair"
                            ? "bg-yellow-50 border-yellow-300"
                            : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          النتيجة الإجمالية
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {diagnostics.overall.status === "excellent"
                            ? "🌟 ممتاز"
                            : diagnostics.overall.status === "good"
                              ? "✅ جيد"
                              : diagnostics.overall.status === "fair"
                                ? "⚠️ مقبول"
                                : "❌ يحتاج تحسين"}
                        </p>
                      </div>
                      <div className="text-4xl font-bold text-indigo-600">
                        {diagnostics.overall.score}/100
                      </div>
                    </div>
                  </div>

                  {/* Pixel Status */}
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        🎯 Facebook Pixel
                      </h4>
                      {diagnostics.pixel.configured ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          مُكوّن
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          غير مُكوّن
                        </span>
                      )}
                    </div>
                    {diagnostics.pixel.pixelId && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Pixel ID: {diagnostics.pixel.pixelId}
                      </p>
                    )}
                    {diagnostics.pixel.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {diagnostics.pixel.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-2 rounded ${
                              issue.type === "error"
                                ? "bg-red-50 text-red-700"
                                : issue.type === "warning"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {issue.type === "error"
                              ? "❌"
                              : issue.type === "warning"
                                ? "⚠️"
                                : "ℹ️"}{" "}
                            {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CAPI Status */}
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        🚀 Conversions API
                      </h4>
                      {diagnostics.capi.configured ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          مُكوّن
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          غير مُكوّن
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Token:{" "}
                      {diagnostics.capi.hasToken ? "✅ موجود" : "❌ مفقود"}
                    </p>
                    {diagnostics.capi.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {diagnostics.capi.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-2 rounded ${
                              issue.type === "error"
                                ? "bg-red-50 text-red-700"
                                : issue.type === "warning"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {issue.type === "error"
                              ? "❌"
                              : issue.type === "warning"
                                ? "⚠️"
                                : "ℹ️"}{" "}
                            {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Events */}
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      📊 الأحداث المفعلة
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Pixel Events:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {diagnostics.events.pixelEvents.map((event, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          CAPI Events:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {diagnostics.events.capiEvents.map((event, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Deduplication:{" "}
                      {diagnostics.events.deduplicationEnabled
                        ? "✅ مفعل"
                        : "❌ غير مفعل"}
                    </p>
                  </div>

                  {/* Recommendations */}
                  {diagnostics.overall.recommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                        💡 التوصيات
                      </h4>
                      <ul className="space-y-1">
                        {diagnostics.overall.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-blue-800 dark:text-blue-200 flex items-start"
                          >
                            <span
                              className={`ml-2 ${rec.priority === "high" ? "text-red-600" : "text-yellow-600"}`}
                            >
                              {rec.priority === "high" ? "🔴" : "🟡"}
                            </span>
                            {rec.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Token Check Button */}
                  {settings.facebookConvApiToken && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleCheckTokenPermissions}
                        disabled={checkingToken}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {checkingToken ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            جاري الفحص...
                          </>
                        ) : (
                          <>
                            <BeakerIcon className="h-4 w-4" />
                            فحص صلاحيات Token
                          </>
                        )}
                      </button>
                      <button
                        onClick={loadDiagnostics}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        تحديث التشخيص
                      </button>
                    </div>
                  )}

                  {/* Token Permissions Result */}
                  {tokenPermissions && (
                    <div
                      className={`p-4 rounded-lg ${tokenPermissions.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                    >
                      <h4 className="font-medium mb-2">
                        {tokenPermissions.valid
                          ? "✅ Token صالح"
                          : "❌ Token غير صالح"}
                      </h4>
                      {tokenPermissions.permissions?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            الصلاحيات:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tokenPermissions.permissions.map(
                              (perm: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {perm}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {tokenPermissions.expiresAt && (
                        <p className="text-xs text-gray-600">
                          ينتهي في:{" "}
                          {new Date(
                            tokenPermissions.expiresAt,
                          ).toLocaleDateString("ar-EG")}
                        </p>
                      )}
                      {tokenPermissions.issues?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {tokenPermissions.issues.map(
                            (issue: TokenPermissionIssue, idx: number) => (
                              <div
                                key={idx}
                                className={`text-xs p-2 rounded ${
                                  issue.type === "error"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {issue.message}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <WrenchScrewdriverIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>اضغط لتحميل التشخيص</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🎯 Multiple Pixels Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <button
            onClick={() => {
              setShowMultiplePixels(!showMultiplePixels);
              if (!showMultiplePixels && multiplePixels.length === 0) {
                loadMultiplePixels();
              }
            }}
            className="w-full flex items-center justify-between text-right"
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-purple-600 ml-2" />
              🎯 إدارة Pixels متعددة
            </h2>
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${showMultiplePixels ? "rotate-180" : ""}`}
            />
          </button>

          {showMultiplePixels && (
            <div className="mt-6 space-y-4">
              {/* Add/Create Pixel Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAddPixelModal(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600"
                >
                  <PlusIcon className="h-5 w-5" />
                  إضافة Pixel موجود
                </button>
                <button
                  onClick={handleOpenCreatePixelModal}
                  className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-green-600"
                >
                  <RocketLaunchIcon className="h-5 w-5" />
                  إنشاء Pixel جديد على Facebook
                </button>
              </div>

              {/* Pixels List */}
              {multiplePixels.length > 0 ? (
                <div className="space-y-3">
                  {multiplePixels.map((pixel) => (
                    <div
                      key={pixel.id}
                      className={`p-4 border rounded-lg ${pixel.isPrimary ? "border-purple-300 bg-purple-50" : "border-gray-200"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {pixel.pixelName}
                          </h4>
                          {pixel.isPrimary && (
                            <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full flex items-center gap-1">
                              <StarIcon className="h-3 w-3" />
                              أساسي
                            </span>
                          )}
                          {pixel.isActive ? (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              نشط
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              غير نشط
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!pixel.isPrimary && (
                            <button
                              onClick={() => handleSetPrimary(pixel.id)}
                              className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                              title="تعيين كأساسي"
                            >
                              <StarIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleTestPixelById(pixel.id)}
                            disabled={testingPixelId === pixel.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                            title="اختبار"
                          >
                            {testingPixelId === pixel.id ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <BeakerIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePixel(pixel.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                            title="حذف"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ID: {pixel.pixelId}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pixel.trackPageView && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                            PageView
                          </span>
                        )}
                        {pixel.trackViewContent && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                            ViewContent
                          </span>
                        )}
                        {pixel.trackAddToCart && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                            AddToCart
                          </span>
                        )}
                        {pixel.trackPurchase && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                            Purchase
                          </span>
                        )}
                      </div>
                      {pixel.lastTestResult && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          آخر اختبار:{" "}
                          {pixel.lastTestResult === "success"
                            ? "✅ ناجح"
                            : "❌ فشل"}
                          {pixel.lastTestAt &&
                            ` - ${new Date(pixel.lastTestAt).toLocaleDateString("ar-EG")}`}
                        </p>
                      )}
                      {pixel.errorCount > 0 && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          {pixel.errorCount} أخطاء
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>لا توجد Pixels إضافية</p>
                  <p className="text-sm">
                    أضف Pixels متعددة لتتبع أحداث مختلفة
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Pixel Modal */}
        {showAddPixelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                إضافة Pixel جديد
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم Pixel
                  </label>
                  <input
                    type="text"
                    value={newPixel.pixelName}
                    onChange={(e) =>
                      setNewPixel({ ...newPixel, pixelName: e.target.value })
                    }
                    placeholder="مثال: Pixel للمبيعات"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pixel ID
                  </label>
                  <input
                    type="text"
                    value={newPixel.pixelId}
                    onChange={(e) =>
                      setNewPixel({ ...newPixel, pixelId: e.target.value })
                    }
                    placeholder="1234567890123456"
                    maxLength={16}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Access Token (اختياري)
                  </label>
                  <input
                    type="password"
                    value={newPixel.accessToken}
                    onChange={(e) =>
                      setNewPixel({ ...newPixel, accessToken: e.target.value })
                    }
                    placeholder="EAAxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPixel.isPrimary}
                    onChange={(e) =>
                      setNewPixel({ ...newPixel, isPrimary: e.target.checked })
                    }
                    className="h-4 w-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    تعيين كـ Pixel أساسي
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPixel}
                  disabled={addingPixel}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingPixel ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      إضافة
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddPixelModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Pixel Modal */}
        {showCreatePixelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <RocketLaunchIcon className="h-5 w-5 text-green-600" />
                إنشاء Pixel جديد على Facebook
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم Pixel
                  </label>
                  <input
                    type="text"
                    value={newPixelName}
                    onChange={(e) => setNewPixelName(e.target.value)}
                    placeholder="مثال: Pixel متجري الرئيسي"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    سيتم إنشاء Pixel جديد بهذا الاسم على Facebook
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Account
                  </label>
                  {loadingBusinessAccounts ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري التحميل...
                    </div>
                  ) : businessAccounts.length > 0 ? (
                    <select
                      value={selectedBusinessId}
                      onChange={(e) => setSelectedBusinessId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    >
                      {businessAccounts.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-red-600 py-2">
                      لا توجد Business Accounts. يرجى ربط حساب Facebook أولاً.
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 سيتم إنشاء Pixel جديد على Facebook وربطه تلقائياً بمتجرك
                    مع تفعيل Conversions API
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreatePixel}
                  disabled={
                    creatingPixel || !newPixelName.trim() || !selectedBusinessId
                  }
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingPixel ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-4 w-4" />
                      إنشاء Pixel
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCreatePixelModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documentation */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-6">
          <div className="flex items-start">
            <DocumentTextIcon className="h-6 w-6 text-indigo-600 ml-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                📚 دليل الإعداد
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-indigo-600 ml-2">1.</span>
                  <span>
                    احصل على Pixel ID من{" "}
                    <a
                      href="https://business.facebook.com/events_manager2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Facebook Events Manager
                    </a>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 ml-2">2.</span>
                  <span>
                    أنشئ System User Token من Business Settings → System Users
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 ml-2">3.</span>
                  <span>فعّل Pixel و CAPI معاً للحصول على أفضل دقة</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 ml-2">4.</span>
                  <span>اختبر الاتصال وتحقق من Events Manager</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookPixelSettings;
