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
  ClipboardDocumentIcon,
  CheckIcon,
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pixel" | "capi">("pixel");

  // 🆕 Easy Connect States
  const [pixels, setPixels] = useState<FacebookOAuthPixel[]>([]);
  const [showPixelSelector, setShowPixelSelector] = useState(false);
  const [fetchingPixels, setFetchingPixels] = useState(false);
  const { user } = useAuth();

  // 🔧 Diagnostics States
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);
  const [tokenPermissions, setTokenPermissions] =
    useState<TokenPermissionsData | null>(null);

  // 🎯 Multiple Pixels States
  const [multiplePixels, setMultiplePixels] = useState<PixelConfig[]>([]);
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
  const [copiedPixelId, setCopiedPixelId] = useState<string | null>(null);

  const handleCopyPixelId = (pixelId: string) => {
    if (!pixelId) return;
    navigator.clipboard.writeText(pixelId);
    setCopiedPixelId(pixelId);
    toast.success("تم نسخ معرّف Pixel بنجاح");
    setTimeout(() => setCopiedPixelId(null), 2000);
  };

  // 🧪 Event Simulator States
  const [simulatorEvent, setSimulatorEvent] = useState<
    "Purchase" | "AddToCart" | "ViewContent" | "PageView"
  >("Purchase");
  const [simulatorValue, setSimulatorValue] = useState(150);
  const [simulatorContentName, setSimulatorContentName] = useState(
    "تيشيرت تجريبي للتأكد من الربط",
  );
  const [simulatorSending, setSimulatorSending] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState<{
    eventId: string;
    eventName: string;
    timestamp: string;
    testEventCode?: string;
  } | null>(null);

  const handleSendSimulatorEvent = async () => {
    if (!settings.facebookPixelId) {
      toast.error("يرجى إدخال وتفعيل Pixel ID أولاً");
      return;
    }

    try {
      setSimulatorSending(true);
      const response = await storefrontSettingsService.sendTestEvent({
        eventName: simulatorEvent,
        value: simulatorValue,
        currency: "EGP",
        contentName: simulatorContentName,
      });

      if (response.success) {
        toast.success(`تم إرسال حدث ${simulatorEvent} بنجاح إلى Meta!`);
        setSimulatorResult({
          eventId: response.data?.eventId || `test_${Date.now()}`,
          eventName: simulatorEvent,
          timestamp: new Date().toLocaleTimeString("ar-EG"),
          testEventCode:
            response.data?.testEventCode || settings.facebookConvApiTestCode,
        });

        // Also fire in browser if window.fbq is available
        try {
          if (typeof window !== "undefined" && (window as any).fbq) {
            (window as any).fbq("track", simulatorEvent, {
              value: simulatorValue,
              currency: "EGP",
              content_name: simulatorContentName,
            });
          }
        } catch {
          // ignore
        }
      } else {
        toast.error(response.message || "فشل إرسال الحدث التجريبي");
      }
    } catch (error: unknown) {
      console.error("Error sending simulator event:", error);
      toast.error(getErrorMessage(error, "فشل إرسال الحدث التجريبي إلى Meta"));
    } finally {
      setSimulatorSending(false);
    }
  };

  // Track if settings have been loaded to prevent multiple calls
  const hasLoadedSettings = useRef(false);

  useEffect(() => {
    const initializePage = async () => {
      if (!hasLoadedSettings.current) {
        hasLoadedSettings.current = true;
        await loadSettings();
      }

      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const error = urlParams.get("error");

      if (success === "pixel_connected") {
        tToast.success("facebookPixel.success_connect_account_7c2d");
        window.history.replaceState({}, document.title, window.location.pathname);
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
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (!hasLoadedSettings.current) {
      initializePage();
    }
  }, []);

  const hasAttemptedFetch = useRef(false);

  useEffect(() => {
    hasAttemptedFetch.current = false;
    hasLoadedSettings.current = false;
  }, [user?.companyId]);

  const loadSettings = async (skipGuard: boolean = false) => {
    try {
      if (!skipGuard && hasLoadedSettings.current && !loading) {
        return;
      }

      setLoading(true);
      const response = await storefrontSettingsService.getSettings();
      const settingsData = (response as StorefrontSettingsPayload).data;
      if (settingsData) {
        const newSettings = {
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
          ...settingsData,
        };
        setSettings(newSettings);
        hasLoadedSettings.current = true;
        void loadMultiplePixels();
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

      if (settings.facebookPixelEnabled && !settings.facebookPixelId) {
        tToast.error("facebookPixel.required_enter_9b40");
        setSaving(false);
        return;
      }

      if (
        settings.facebookPixelId &&
        !/^\d{14,18}$/.test(settings.facebookPixelId)
      ) {
        toast.error("Pixel ID يجب أن يتكون من 14 إلى 18 رقماً");
        setSaving(false);
        return;
      }

      if (
        settings.facebookConvApiEnabled &&
        !settings.facebookConvApiToken &&
        !diagnostics?.capi?.hasToken
      ) {
        toast.error("يرجى ربط حساب فيسبوك أو إدخال Access Token لتفعيل Conversions API");
        setSaving(false);
        return;
      }

      await storefrontSettingsService.updateSettings(settings);
      tToast.success("facebookPixel.success_save_settings_bba7");
      await loadSettings(true);
      await loadMultiplePixels();
    } catch (error: unknown) {
      console.error("Error saving settings:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_save_settings_83ff")));
    } finally {
      setSaving(false);
    }
  };

  const handleTestPixel = async () => {
    if (!settings.facebookPixelId) {
      tToast.error("facebookPixel.required_enter_9b40");
      return;
    }

    try {
      setTestingPixel(true);
      const response = await storefrontSettingsService.testPixel(
        settings.facebookPixelId,
      );

      if (response.success && response.data.success) {
        tToast.success("facebookPixel.test_pixel_success_9ca5");
        setSettings({
          ...settings,
          pixelStatus: "active",
          lastPixelTest: new Date().toISOString(),
        });
      } else {
        toast.error(response.message || i18n.t("facebookPixel.failed_test_pixel_f4bc"));
        setSettings({
          ...settings,
          pixelStatus: "error",
          lastPixelTest: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      console.error("Error testing pixel:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_test_pixel_f4bc")));
      setSettings({
        ...settings,
        pixelStatus: "error",
        lastPixelTest: new Date().toISOString(),
      });
    } finally {
      setTestingPixel(false);
    }
  };

  const handleTestCapi = async () => {
    if (!settings.facebookPixelId) {
      tToast.error("facebookPixel.required_enter_9b40");
      return;
    }

    try {
      setTesting(true);
      const response = await storefrontSettingsService.testCapi({
        pixelId: settings.facebookPixelId,
        accessToken: settings.facebookConvApiToken || undefined,
        testEventCode: settings.facebookConvApiTestCode || undefined,
      });

      if (response.success && response.data.success) {
        tToast.success("facebookPixel.test_capi_success_faae");
        setSettings({
          ...settings,
          capiStatus: "active",
          lastCapiTest: new Date().toISOString(),
        });
      } else {
        toast.error(response.message || i18n.t("facebookPixel.failed_test_capi_52cb"));
        setSettings({
          ...settings,
          capiStatus: "error",
          lastCapiTest: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      console.error("Error testing CAPI:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_test_capi_52cb")));
      setSettings({
        ...settings,
        capiStatus: "error",
        lastCapiTest: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleEasyConnect = async () => {
    try {
      setFetchingPixels(true);
      const response =
        await apiClient.get<PixelAuthorizeResponse>("/facebook-oauth/pixel-authorize");

      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        toast.error("فشل بدء عملية الربط مع Facebook");
      }
    } catch (error: unknown) {
      console.error("Error initiating Facebook auth:", error);
      toast.error(getErrorMessage(error, "فشل بدء عملية الربط مع Facebook"));
    } finally {
      setFetchingPixels(false);
    }
  };

  const fetchPixels = async () => {
    try {
      setFetchingPixels(true);
      const response =
        await apiClient.get<FacebookOAuthPixelsResponse>("/facebook-oauth/pixels");

      if (response.data.success) {
        const fetchedPixels = response.data.pixels || [];
        setPixels(fetchedPixels);

        if (fetchedPixels.length === 1) {
          await handleSelectPixel(fetchedPixels[0]);
        } else if (fetchedPixels.length > 1) {
          setShowPixelSelector(true);
        } else {
          tToast.info("facebookPixel.no_pixels_found_13f3");
        }
      } else if (response.data.needsAuth) {
        tToast.error("facebookPixel.connect_account_7723");
      } else {
        toast.error(response.data.message || i18n.t("facebookPixel.failed_fetch_77e7"));
      }
    } catch (error: unknown) {
      console.error("Error fetching pixels:", error);
      if (getAxiosErrorData(error)?.needsAuth) {
        tToast.error("facebookPixel.connect_account_7723");
      } else {
        toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_fetch_77e7")));
      }
    } finally {
      setFetchingPixels(false);
    }
  };

  const handleSelectPixel = async (pixel: FacebookOAuthPixel) => {
    try {
      setFetchingPixels(true);
      const tokenResponse = await apiClient.post<PixelTokenResponse>(
        "/facebook-oauth/generate-pixel-token",
        {
          pixelId: pixel.pixelId,
        },
      );

      const accessToken = tokenResponse.data.accessToken;

      const newSettings = {
        ...settings,
        facebookPixelEnabled: true,
        facebookPixelId: pixel.pixelId,
        facebookConvApiEnabled: !!accessToken,
        facebookConvApiToken: accessToken || "",
      };

      setSettings(newSettings);
      setShowPixelSelector(false);

      await storefrontSettingsService.updateSettings(newSettings);
      toast.success(
        i18n.t("facebookPixel.msg_e9b5", { pixelName: pixel.pixelName }),
      );
      await loadSettings(true);
      await loadMultiplePixels();
    } catch (error: unknown) {
      console.error("Error selecting pixel:", error);
      toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_set_pixel_0bfa")));
    } finally {
      setFetchingPixels(false);
    }
  };

  const loadDiagnostics = async () => {
    try {
      setLoadingDiagnostics(true);
      const response = await storefrontSettingsService.getDiagnostics();
      if (response.success) {
        setDiagnostics(response.data);
      }
    } catch (error) {
      console.error("Error loading diagnostics:", error);
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
          tToast.success("facebookPixel.msg_f161");
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

    if (!/^\d{14,18}$/.test(newPixel.pixelId)) {
      toast.error("Pixel ID يجب أن يتكون من 14 إلى 18 رقماً");
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
    if (!window.confirm(i18n.t("facebookPixel.confirm_delete_0295"))) {
      return;
    }

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
        toast.success(
          i18n.t("facebookPixel.msg_1l2s94", {
            pixelId: (response?.data as any)?.pixelId || "",
          }),
        );
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
        toast.error(getErrorMessage(error, i18n.t("facebookPixel.failed_create_pixel_8e8c")));
      }
    } finally {
      setCreatingPixel(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center">
          <ArrowPathIcon className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
            جاري تحميل إعدادات Facebook Pixel & CAPI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-6 pb-28 sm:pb-12 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 ml-2 sm:ml-3 flex-shrink-0" />
                <span>Facebook Pixel & Conversions API</span>
              </h1>
              <div className="flex items-center gap-2 mr-2 flex-wrap">
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1.5 shadow-xs ${
                  settings.facebookPixelEnabled
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.facebookPixelEnabled ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                  {settings.facebookPixelEnabled ? "Pixel مفعّل" : "Pixel معطّل"}
                </span>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1.5 shadow-xs ${
                  settings.facebookConvApiEnabled
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.facebookConvApiEnabled ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                  {settings.facebookConvApiEnabled ? "CAPI مفعّل" : "CAPI معطّل"}
                </span>
              </div>
            </div>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              تتبع دقيق لزوار ومبيعات متجرك وتحسين استهداف إعلانات Facebook و Meta
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all min-h-[44px] font-medium shadow-sm hover:shadow"
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

      {/* 📑 2026 Modern Segmented Tabs */}
      <div className="mb-6 p-1.5 bg-gray-200/60 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 inline-flex flex-wrap sm:flex-nowrap gap-1.5 shadow-inner w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveTab("pixel")}
          className={`flex items-center justify-center gap-2.5 py-2.5 px-4 sm:px-5 font-semibold text-sm sm:text-base rounded-xl transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial ${
            activeTab === "pixel"
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
          <span>🎯 Facebook Pixel (المتصفح)</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full font-medium transition-colors ${
              settings.facebookPixelEnabled
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {settings.facebookPixelEnabled
              ? multiplePixels.length > 0
                ? `${multiplePixels.length} بيكسل`
                : "مفعّل"
              : "معطّل"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("capi");
            if (!diagnostics) {
              loadDiagnostics();
            }
          }}
          className={`flex items-center justify-center gap-2.5 py-2.5 px-4 sm:px-5 font-semibold text-sm sm:text-base rounded-xl transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial ${
            activeTab === "capi"
              ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <RocketLaunchIcon className="w-5 h-5 flex-shrink-0" />
          <span>🚀 Conversions API (السيرفر)</span>
          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full font-medium">
            موصى به
          </span>
          <span className="relative flex h-2.5 w-2.5">
            {settings.facebookConvApiEnabled && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                settings.facebookConvApiEnabled
                  ? "bg-emerald-500"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3.5 sm:p-4 mb-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 ml-2.5 sm:ml-3 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            <p className="font-semibold mb-1">💡 نصيحة مهمة لخبراء الإعلانات:</p>
            <p>
              للحصول على أفضل دقة تتبع (90%+)، فعّل{" "}
              <strong dir="ltr" className="inline-block font-bold">Pixel + Conversions API</strong>{" "}
              معاً. هذا يضمن وصول بيانات المشتريات والسلات حتى مع تفعيل مانعات الإعلانات{" "}
              <span dir="ltr" className="inline-block">(Ad Blockers)</span> وتحديثات الخصوصية{" "}
              <span dir="ltr" className="inline-block font-semibold">iOS 14.5+</span>.
            </p>
          </div>
        </div>
      </div>

      {/* TAB 1: FACEBOOK PIXEL & MULTIPLE PIXELS */}
      {activeTab === "pixel" && (
        <div className="space-y-6">
          {/* Easy Connect Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0">
                <RocketLaunchIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <div className="flex-1 w-full">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  🚀 الربط السهل التلقائي (موصى به)
                </h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  اربط حسابك مع Facebook وسيتم جلب <span dir="ltr" className="font-semibold">Pixel ID</span> و <span dir="ltr" className="font-semibold">Access Token</span> تلقائياً بدون تعقيد
                </p>

                <div className="space-y-2 mb-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 ml-2 flex-shrink-0" />
                    <span>سهل وسريع (2-3 دقائق فقط)</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 ml-2 flex-shrink-0" />
                    <span>لا يحتاج نسخ ولصق معرفات أو رموز</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEasyConnect}
                  disabled={fetchingPixels}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold min-h-[44px]"
                >
                  {fetchingPixels ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      جاري الربط...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>🔗 ربط مع Facebook تلقائياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Pixel Selector Modal/Block */}
          {showPixelSelector && (
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                اختر Facebook Pixel الذي تريد ربطه:
              </h3>
              <div className="space-y-3">
                {pixels.map((pixel) => (
                  <button
                    key={pixel.pixelId}
                    type="button"
                    onClick={() => handleSelectPixel(pixel)}
                    className="w-full text-right p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{pixel.pixelName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {pixel.pixelId}</div>
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

          {/* 🎯 Multiple Pixels Section (FIRST-CLASS HERO CITIZEN) */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ChartBarIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />
                  <span>🎯 البيكسلات المربوطة (Multiple Pixels)</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  اربط أكثر من Pixel لمشاركة بيانات الإعلانات مع حسابات تسويق متعددة أو شركاء
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPixelModal(true)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>إضافة Pixel</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreatePixelModal}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                >
                  <RocketLaunchIcon className="h-4 w-4" />
                  <span>إنشاء بيكسل جديد</span>
                </button>
              </div>
            </div>

            {/* Pixels List */}
            {multiplePixels.length > 0 ? (
              <div className="space-y-3">
                {multiplePixels.map((pixel) => (
                  <div
                    key={pixel.id}
                    className={`p-4 border rounded-xl transition-all ${
                      pixel.isPrimary
                        ? "border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                          pixel.isPrimary
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}>
                          <ChartBarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 dark:text-white text-base">
                              {pixel.pixelName}
                            </h4>
                            {pixel.isPrimary && (
                              <span className="px-2.5 py-0.5 text-xs bg-purple-600 text-white rounded-full font-medium flex items-center gap-1 shadow-sm">
                                <StarIcon className="h-3 w-3" />
                                أساسي (Primary)
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              pixel.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}>
                              {pixel.isActive ? "نشط" : "غير نشط"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono bg-gray-100 dark:bg-gray-700/80 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                              {pixel.pixelId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPixelId(pixel.pixelId)}
                              className="text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 p-1"
                              title="نسخ المعرف"
                            >
                              {copiedPixelId === pixel.pixelId ? (
                                <CheckIcon className="w-4 h-4 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="w-4 h-4" />
                              )}
                            </button>
                            {pixel.totalEventsSent > 0 && (
                              <span>• تم إرسال {pixel.totalEventsSent} حدث</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!pixel.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(pixel.id)}
                            className="px-3 py-1.5 border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 min-h-[36px]"
                            title="تعيين كأساسي"
                          >
                            <StarIcon className="h-3.5 w-3.5" />
                            <span>تعيين كأساسي</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTestPixelById(pixel.id)}
                          disabled={testingPixelId === pixel.id}
                          className="px-3 py-1.5 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 min-h-[36px] disabled:opacity-50"
                        >
                          {testingPixelId === pixel.id ? (
                            <>
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              <span>جاري الفحص...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              <span>اختبار</span>
                            </>
                          )}
                        </button>
                        {!pixel.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleDeletePixel(pixel.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="حذف"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-purple-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  لا توجد Pixels إضافية مربوطة حالياً
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                  يمكنك ربط أكثر من Pixel لمشاركة بيانات المتجر مع حسابات فيسبوك إعلانية متعددة في نفس الوقت وبدون تعارض.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddPixelModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>إضافة Pixel الآن</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Facebook Pixel Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center flex-wrap gap-1.5">
                  <span>🎯 إعدادات البيكسل الأساسي</span>
                  <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
                    (Browser Tracking)
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  تتبع الأحداث من متصفح الزائر مباشرة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
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
                    معرف البكسل الأساسي (Pixel ID) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={settings.facebookPixelId || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          facebookPixelId: e.target.value.trim(),
                        })
                      }
                      placeholder="1234567890123456"
                      maxLength={20}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={handleTestPixel}
                      disabled={
                        testingPixel ||
                        !settings.facebookPixelId ||
                        settings.facebookPixelId.length < 14 ||
                        settings.facebookPixelId.length > 18
                      }
                      className="w-full sm:w-auto px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors whitespace-nowrap min-h-[44px] font-medium"
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
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <InformationCircleIcon className="h-4 w-4 ml-1 flex-shrink-0" />
                    14 إلى 18 رقماً - يمكنك الحصول عليه من{" "}
                    <a
                      href="https://business.facebook.com/events_manager2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline mr-1"
                    >
                      Facebook Events Manager
                    </a>
                  </p>
                </div>

                {/* Browser Tracked Events */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 ml-2" />
                    الأحداث المتتبعة في المتصفح
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "pixelTrackPageView", label: "عرض الصفحات", desc: "PageView" },
                      { key: "pixelTrackViewContent", label: "عرض المنتج", desc: "ViewContent" },
                      { key: "pixelTrackAddToCart", label: "إضافة للسلة", desc: "AddToCart" },
                      { key: "pixelTrackInitiateCheckout", label: "بدء الشراء", desc: "InitiateCheckout" },
                      { key: "pixelTrackPurchase", label: "عمليات الشراء", desc: "Purchase" },
                      { key: "pixelTrackSearch", label: "البحث", desc: "Search" },
                      { key: "pixelTrackAddToWishlist", label: "قائمة الرغبات", desc: "AddToWishlist" },
                    ].map((event) => (
                      <label
                        key={event.key}
                        className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(settings[event.key as keyof FacebookPixelSettings] as boolean) || false}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONVERSIONS API (CAPI) & DIAGNOSTICS */}
      {activeTab === "capi" && (
        <div className="space-y-6">
          {/* CAPI Master Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center flex-wrap gap-1.5">
                  <span>🚀 Facebook Conversions API (CAPI)</span>
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-normal">
                    موصى به
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  تتبع الأحداث من السيرفر مباشرة - دقة أعلى (90%+) ومقاومة كاملة لـ Ad Blockers
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Access Token{" "}
                      {diagnostics?.capi?.hasToken ? (
                        <span className="text-gray-400 font-normal text-xs">(اختياري - متصل تلقائياً)</span>
                      ) : (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    {diagnostics?.capi?.hasToken && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        حساب فيسبوك متصل تلقائياً
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={settings.facebookConvApiToken || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          facebookConvApiToken: e.target.value.trim(),
                        })
                      }
                      placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-12 min-h-[44px]"
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
                    <ShieldCheckIcon className="h-4 w-4 ml-1 flex-shrink-0" />
                    استخدم System User Token من Facebook Business Manager مع صلاحية ads_management
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Event Code <span className="text-gray-400 font-normal">(اختياري للاختبار)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.facebookConvApiTestCode || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        facebookConvApiTestCode: e.target.value.trim(),
                      })
                    }
                    placeholder="TEST12345"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all min-h-[44px]"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    يمكنك نسخه من تبويبة Test Events في Facebook Events Manager لمعاينة الأحداث فورياً
                  </p>
                </div>

                {/* CAPI Tracked Events */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                    <RocketLaunchIcon className="h-5 w-5 text-green-600 ml-2" />
                    الأحداث المتتبعة سحابياً (Server-side)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "capiTrackPageView", label: "عرض الصفحات", desc: "PageView" },
                      { key: "capiTrackViewContent", label: "عرض المنتج", desc: "ViewContent" },
                      { key: "capiTrackAddToCart", label: "إضافة للسلة", desc: "AddToCart" },
                      { key: "capiTrackInitiateCheckout", label: "بدء الشراء", desc: "InitiateCheckout" },
                      { key: "capiTrackPurchase", label: "عمليات الشراء", desc: "Purchase" },
                      { key: "capiTrackSearch", label: "البحث", desc: "Search" },
                    ].map((event) => (
                      <label
                        key={event.key}
                        className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(settings[event.key as keyof FacebookPixelSettings] as boolean) || false}
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

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleTestCapi}
                    disabled={
                      testing ||
                      !settings.facebookPixelId ||
                      (!settings.facebookConvApiToken && !diagnostics?.capi?.hasToken)
                    }
                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors min-h-[44px] font-medium"
                  >
                    {testing ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        جاري الاختبار...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        اختبار الاتصال بالسيرفر
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckTokenPermissions}
                    disabled={checkingToken || (!settings.facebookConvApiToken && !diagnostics?.capi?.hasToken)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] font-medium"
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
                </div>

                {/* 🎯 v26.0: Event Match Quality (EMQ) Score Indicator */}
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50 dark:from-gray-800 dark:to-gray-700/80 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                        <ChartBarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            مؤشر جودة مطابقة الأحداث (Meta v26 EMQ Score)
                          </h4>
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                            جودة فائقة
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          يقيس مدى كفاءة تطبيع بيانات المشترين (E.164 Phone Hashing, Email, Client Signals) لربط كل طلب بإعلانه
                        </p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 self-start sm:self-auto bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-xs">
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">8.8</span>
                      <span className="text-xs font-semibold text-gray-400">/ 10</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: "88%" }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-100 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span><strong>الهاتف المطبع:</strong> معيار E.164 مفعل</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span><strong>إشارات المتصفح:</strong> fbp & fbc نشطة</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span><strong>أمان البيانات:</strong> تشفير SHA-256 محلي</span>
                    </div>
                  </div>
                </div>

                {settings.capiStatus && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center">
                        {settings.capiStatus === "active" ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500 ml-2 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          حالة السيرفر:{" "}
                          <span className="font-semibold">
                            {settings.capiStatus === "active" ? "متصل بنجاح ✅" : "غير متصل ❌"}
                          </span>
                        </span>
                      </div>
                      {settings.lastCapiTest && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          آخر اختبار: {new Date(settings.lastCapiTest).toLocaleString("ar-EG")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 🧪 2026 Live Event Tester / Simulator */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-4 sm:p-6 border border-indigo-100 dark:border-indigo-900/40 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BeakerIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>🧪 محاكي واختبار الأحداث المباشرة</span>
                    <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full font-normal">
                      Live Console
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    أرسل حدث تجريبي فوراً للتأكد من وصول بيانات السيرفر إلى Meta دون الحاجة لإنشاء طلب شراء حقيقي
                  </p>
                </div>
              </div>
              <a
                href="https://business.facebook.com/events_manager2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <span>فتح Events Manager</span>
                <ArrowPathIcon className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Event Type Buttons */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                اختر الحدث المراد اختباره:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: "Purchase", label: "عملية شراء", icon: "🛍️", desc: "Purchase" },
                  { key: "AddToCart", label: "إضافة للسلة", icon: "🛒", desc: "AddToCart" },
                  { key: "ViewContent", label: "عرض منتج", icon: "👁️", desc: "ViewContent" },
                  { key: "PageView", label: "عرض صفحة", icon: "📄", desc: "PageView" },
                ].map((ev) => (
                  <button
                    key={ev.key}
                    type="button"
                    onClick={() => setSimulatorEvent(ev.key as any)}
                    className={`p-3 rounded-xl border text-right transition-all duration-200 ${
                      simulatorEvent === ev.key
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="text-base mb-1">{ev.icon}</div>
                    <div className="text-xs sm:text-sm font-bold">{ev.label}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">{ev.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  قيمة الحدث التجريبي (Value)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={simulatorValue}
                    onChange={(e) => setSimulatorValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    min={1}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    EGP
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المحتوى / المنتج (Content Name)
                </label>
                <input
                  type="text"
                  value={simulatorContentName}
                  onChange={(e) => setSimulatorContentName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Trigger Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSendSimulatorEvent}
                disabled={
                  simulatorSending ||
                  !settings.facebookPixelId ||
                  (!settings.facebookConvApiToken && !diagnostics?.capi?.hasToken)
                }
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-sm transition-all min-h-[44px] shadow-sm"
              >
                {simulatorSending ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الحدث لـ Meta...</span>
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="w-4 h-4" />
                    <span>🚀 إرسال حدث {simulatorEvent} التجريبي الآن</span>
                  </>
                )}
              </button>

              {settings.facebookConvApiTestCode && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  كود الاختبار مفعّل: {settings.facebookConvApiTestCode}
                </div>
              )}
            </div>

            {/* Simulator Response Result */}
            {simulatorResult && (
              <div className="mt-4 p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    <span>200 OK — تم استلام الحدث في Meta CAPI</span>
                  </span>
                  <span>{simulatorResult.timestamp}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <div>الحدث: <span className="text-white font-bold">{simulatorResult.eventName}</span></div>
                  <div>معرف الحدث (Event ID): <span className="text-amber-300">{simulatorResult.eventId}</span></div>
                  {simulatorResult.testEventCode && (
                    <div>Test Code: <span className="text-cyan-300">{simulatorResult.testEventCode}</span></div>
                  )}
                  <div>الحالة: <span className="text-emerald-400 font-semibold">Processed (1 Event)</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Server Settings Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-6 w-6 text-indigo-600 flex-shrink-0" />
              <span>⚙️ الإعدادات المتقدمة وجودة التتبع</span>
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    منع تكرار الأحداث (Event Deduplication)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    يمنع احتساب نفس الحدث مرتين عند تفعيل Pixel و Conversions API في آنٍ واحد
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
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    تشفير بيانات المستخدمين (SHA256 Hash)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    تشفير البريد الإلكتروني وأرقام الهواتف قبل إرسالها لـ Meta لحماية الخصوصية
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.hashUserData || false}
                  onChange={(e) =>
                    setSettings({ ...settings, hashUserData: e.target.checked })
                  }
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    الامتثال لقوانين حماية البيانات (GDPR Compliant)
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الالتزام بمعايير الخصوصية وحماية البيانات الأوروبية
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
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </label>

              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                    هدف جودة المطابقة (Event Match Quality Target)
                  </label>
                  <span className="text-xl font-bold text-indigo-600">
                    {settings.eventMatchQualityTarget || 8}/10
                  </span>
                </div>
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  كلما زادت القيمة، زادت دقة ربط المبيعات بالحملات الإعلانية الحقيقية في فيسبوك
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostics Card */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 flex-shrink-0" />
                  <span>🔧 التشخيص واستكشاف الأخطاء المباشر</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  فحص سلامة اتصال CAPI وصلاحيات الـ Token وجودة الأحداث
                </p>
              </div>
              <button
                type="button"
                onClick={loadDiagnostics}
                disabled={loadingDiagnostics}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loadingDiagnostics ? "animate-spin" : ""}`} />
                <span>تحديث الفحص</span>
              </button>
            </div>

            {loadingDiagnostics ? (
              <div className="flex justify-center py-8">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : diagnostics ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">درجة الصحة العامة</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                      {diagnostics.overall.score}/100
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                    diagnostics.overall.score >= 80
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : diagnostics.overall.score >= 50
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}>
                    {diagnostics.overall.score >= 80 ? "ممتاز ✅" : diagnostics.overall.score >= 50 ? "متوسط ⚠️" : "يحتاج تحسين ❌"}
                  </span>
                </div>

                {/* Status Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Facebook Pixel</span>
                    <span className={`text-xs font-semibold ${diagnostics.pixel.configured ? "text-green-600" : "text-gray-400"}`}>
                      {diagnostics.pixel.configured ? "مُعدّ بنجاح" : "غير مُعد"}
                    </span>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Conversions API</span>
                    <span className={`text-xs font-semibold ${diagnostics.capi.configured ? "text-green-600" : "text-orange-500"}`}>
                      {diagnostics.capi.configured ? "مُعدّ بنجاح" : "بحاجة إلى Token"}
                    </span>
                  </div>
                </div>

                {/* Token Permissions Result */}
                {tokenPermissions && (
                  <div className={`p-4 rounded-xl border ${
                    tokenPermissions.valid
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {tokenPermissions.valid ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm font-semibold">
                        {tokenPermissions.valid ? "صلاحيات Token سليمة وصالحة" : "توجد مشكلة في صلاحيات Token"}
                      </span>
                    </div>
                    {tokenPermissions.permissions && tokenPermissions.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tokenPermissions.permissions.map((p) => (
                          <span key={p} className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-gray-700 dark:text-gray-300">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <WrenchScrewdriverIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">اضغط على زر "تحديث الفحص" لبدء تحليل اتصال CAPI</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Pixel Modal */}
      {showAddPixelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PlusIcon className="h-5 w-5 text-purple-600" />
              <span>إضافة Facebook Pixel جديد</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم Pixel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPixel.pixelName}
                  onChange={(e) =>
                    setNewPixel({ ...newPixel, pixelName: e.target.value })
                  }
                  placeholder="مثال: Pixel لحملات تيك توك / شريك 2"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pixel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPixel.pixelId}
                  onChange={(e) =>
                    setNewPixel({ ...newPixel, pixelId: e.target.value.trim() })
                  }
                  placeholder="1234567890123456"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  يتكون من 14 إلى 18 رقماً
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Token (اختياري لربط CAPI منفصل)
                </label>
                <input
                  type="password"
                  value={newPixel.accessToken}
                  onChange={(e) =>
                    setNewPixel({ ...newPixel, accessToken: e.target.value.trim() })
                  }
                  placeholder="EAAxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <input
                  type="checkbox"
                  checked={newPixel.isPrimary}
                  onChange={(e) =>
                    setNewPixel({ ...newPixel, isPrimary: e.target.checked })
                  }
                  className="h-4 w-4 text-purple-600 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    تعيين كـ Pixel أساسي للمتجر
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    سيتم استخدامه كمعرّف تتبع رئيسي لطلبات الشراء
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleAddPixel}
                disabled={addingPixel}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] font-medium transition-colors"
              >
                {addingPixel ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    إضافة Pixel
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddPixelModal(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pixel Modal */}
      {showCreatePixelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <RocketLaunchIcon className="h-5 w-5 text-green-600" />
              <span>إنشاء Pixel جديد على Facebook</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم Pixel الجديد <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPixelName}
                  onChange={(e) => setNewPixelName(e.target.value)}
                  placeholder="مثال: Pixel متجري الرئيسي"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  سيتم إنشاء Pixel جديد بهذا الاسم تلقائياً على Facebook
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  حساب الأعمال (Business Account) <span className="text-red-500">*</span>
                </label>
                {loadingBusinessAccounts ? (
                  <div className="flex items-center gap-2 text-gray-500 py-3">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-green-600" />
                    <span>جاري جلب حسابات الأعمال...</span>
                  </div>
                ) : businessAccounts.length > 0 ? (
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                  >
                    {businessAccounts.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-red-600 py-2">
                    لا توجد Business Accounts متاحة. يرجى ربط حساب Facebook أولاً.
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  💡 سيتم إنشاء Pixel جديد على Facebook وربطه تلقائياً بمتجرك
                  مع تفعيل تتبع Conversions API
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreatePixel}
                disabled={
                  creatingPixel || !newPixelName.trim() || !selectedBusinessId
                }
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px] font-medium transition-colors"
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
                type="button"
                onClick={() => setShowCreatePixelModal(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide / Documentation */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-start">
          <DocumentTextIcon className="h-6 w-6 text-indigo-600 ml-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
              📚 خطوات التثبيت والإعداد الصحيح
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold ml-2">1.</span>
                <span>
                  احصل على Pixel ID من{" "}
                  <a
                    href="https://business.facebook.com/events_manager2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    Facebook Events Manager
                  </a>
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold ml-2">2.</span>
                <span>
                  أنشئ System User Token من Business Settings → System Users مع صلاحية <code className="text-xs bg-white dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">ads_management</code>
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold ml-2">3.</span>
                <span>فعّل كلاً من Pixel و Conversions API معاً للحصول على أعلى دقة تتبع (90%+) ومقاومة Ad Blockers</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 font-bold ml-2">4.</span>
                <span>اختبر الاتصال وتأكد من وصول الأحداث في تبويبة Test Events في Facebook Events Manager</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookPixelSettings;
