import React, { useState, useEffect, useRef, useMemo } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { storefrontSettingsService } from "../../../services/storefrontSettingsService";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  FacebookPixelSettings,
  PixelConfig,
  DiagnosticsData,
  TokenPermissionsData,
  SimulatorEventType,
  SimulatorResult,
  FacebookOAuthPixel,
} from "./types";
import { PixelHeaderBar } from "./components/PixelHeaderBar";
import { ConnectionCredentialsPanel } from "./components/ConnectionCredentialsPanel";
import { TrackingMatrixTable } from "./components/TrackingMatrixTable";
import { MultiplePixelsManager } from "./components/MultiplePixelsManager";
import { RealtimeSimulatorTerminal } from "./components/RealtimeSimulatorTerminal";
import { AdvancedPrivacyDrawer } from "./components/AdvancedPrivacyDrawer";
import { DiagnosticsTelemetryCard } from "./components/DiagnosticsTelemetryCard";
import { PixelSlideOver } from "./components/PixelSlideOver";
import { OAuthPixelSelectorSlideOver } from "./components/OAuthPixelSelectorSlideOver";
import { StickySaveBar } from "./components/StickySaveBar";

interface FacebookOAuthPixelsResponse {
  success: boolean;
  pixels: FacebookOAuthPixel[];
  needsAuth?: boolean;
  message?: string;
}

interface PixelTokenResponse {
  success: boolean;
  accessToken?: string;
}

const DEFAULT_SETTINGS: FacebookPixelSettings = {
  facebookPixelEnabled: false,
  facebookPixelId: "",
  pixelTrackPageView: true,
  pixelTrackViewContent: true,
  pixelTrackAddToCart: true,
  pixelTrackInitiateCheckout: true,
  pixelTrackPurchase: true,
  pixelTrackSearch: true,
  pixelTrackAddToWishlist: false,

  facebookConvApiEnabled: false,
  facebookConvApiToken: "",
  facebookConvApiTestCode: "",
  capiTrackPageView: true,
  capiTrackViewContent: true,
  capiTrackAddToCart: true,
  capiTrackInitiateCheckout: true,
  capiTrackPurchase: true,
  capiTrackSearch: true,

  eventDeduplicationEnabled: true,
  eventMatchQualityTarget: 8,
  gdprCompliant: true,
  hashUserData: true,
};

export const FacebookPixelCockpit: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FacebookPixelSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<FacebookPixelSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Testing & Action Loading States
  const [isTestingPixel, setIsTestingPixel] = useState(false);
  const [isTestingCapi, setIsTestingCapi] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);
  const [isSendingSimulatorEvent, setIsSendingSimulatorEvent] = useState(false);

  // Diagnostics, Telemetry & Multiple Pixels
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [tokenPermissions, setTokenPermissions] = useState<TokenPermissionsData | null>(null);
  const [multiplePixels, setMultiplePixels] = useState<PixelConfig[]>([]);
  const [testingPixelId, setTestingPixelId] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<SimulatorResult[]>([]);

  // Slide-over Drawers
  const [slideOverState, setSlideOverState] = useState<{
    isOpen: boolean;
    mode: "add" | "create";
  }>({ isOpen: false, mode: "add" });
  const [businessAccounts, setBusinessAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [isSubmittingDrawer, setIsSubmittingDrawer] = useState(false);

  // OAuth Pixel Selector Drawer
  const [oauthPixels, setOauthPixels] = useState<FacebookOAuthPixel[]>([]);
  const [isOAuthSelectorOpen, setIsOAuthSelectorOpen] = useState(false);
  const [isFetchingOAuthPixels, setIsFetchingOAuthPixels] = useState(false);
  const [isSelectingOAuthPixel, setIsSelectingOAuthPixel] = useState(false);

  const hasLoaded = useRef(false);

  // Detect dirty changes
  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadAllData();
      handleOAuthCallback();
    }
  }, [user?.companyId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [settingsRes, pixelsRes] = await Promise.allSettled([
        storefrontSettingsService.getSettings(),
        storefrontSettingsService.getPixels(),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value?.data) {
        const loaded = { ...DEFAULT_SETTINGS, ...settingsRes.value.data };
        setSettings(loaded);
        setOriginalSettings(loaded);
      }

      if (pixelsRes.status === "fulfilled" && pixelsRes.value?.success) {
        setMultiplePixels(pixelsRes.value.data?.pixels || []);
      }

      // Non-blocking load of diagnostics
      loadDiagnosticsSilently();
    } catch (error) {
      console.error("Failed to load pixel settings:", error);
      toast.error("فشل في تحميل إعدادات التتبع والبيكسل");
    } finally {
      setLoading(false);
    }
  };

  const loadDiagnosticsSilently = async () => {
    try {
      setIsRefreshingDiagnostics(true);
      const response = await storefrontSettingsService.getPixelDiagnostics();
      if (response?.success) {
        setDiagnostics(response.data);
      }
    } catch (error) {
      console.error("Diagnostics load error:", error);
    } finally {
      setIsRefreshingDiagnostics(false);
    }
  };

  const handleOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const error = urlParams.get("error");

    if (success === "pixel_connected") {
      toast.success("تم ربط حساب Facebook بنجاح!");
      window.history.replaceState({}, document.title, window.location.pathname);
      loadAllData();
      setTimeout(() => {
        fetchFacebookOAuthPixels(true);
      }, 800);
    } else if (error) {
      toast.error("فشل في استكمال الربط مع Facebook. يرجى المحاولة مجدداً.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const fetchFacebookOAuthPixels = async (autoOpen = true) => {
    try {
      setIsFetchingOAuthPixels(true);
      const response = await apiClient.get<FacebookOAuthPixelsResponse>("/facebook-oauth/pixels");
      if (response.data.success) {
        const list = response.data.pixels || [];
        setOauthPixels(list);

        if (list.length === 1) {
          await handleSelectOAuthPixel(list[0]);
        } else if (list.length > 1) {
          if (autoOpen) setIsOAuthSelectorOpen(true);
        } else {
          toast.info("لم يتم العثور على أية Pixels في حساب Business Manager المرتبط");
        }
      } else if (response.data.needsAuth) {
        toast.error("يرجى ربط حسابك مع Facebook أولاً");
      } else {
        toast.error(response.data.message || "فشل جلب البيكسلات من فيسبوك");
      }
    } catch (err) {
      console.error("Error fetching OAuth pixels:", err);
      toast.error("تعذر جلب بيكسلات الحساب من Meta");
    } finally {
      setIsFetchingOAuthPixels(false);
    }
  };

  const handleSelectOAuthPixel = async (pixel: FacebookOAuthPixel) => {
    try {
      setIsSelectingOAuthPixel(true);
      const tokenRes = await apiClient.post<PixelTokenResponse>(
        "/facebook-oauth/generate-pixel-token",
        { pixelId: pixel.pixelId }
      );
      const accessToken = tokenRes.data.accessToken;

      const newSettings: FacebookPixelSettings = {
        ...settings,
        facebookPixelEnabled: true,
        facebookPixelId: pixel.pixelId,
        facebookConvApiEnabled: Boolean(accessToken),
        facebookConvApiToken: accessToken || settings.facebookConvApiToken,
      };

      setSettings(newSettings);
      setOriginalSettings(newSettings);
      setIsOAuthSelectorOpen(false);

      await storefrontSettingsService.updateSettings(newSettings);
      toast.success(`تم ربط البيكسل ${pixel.pixelName} وتوليد CAPI Token بنجاح!`);
      loadDiagnosticsSilently();
    } catch (err) {
      console.error("Error selecting OAuth pixel:", err);
      toast.error("فشل تعيين وتفويض البيكسل المختار");
    } finally {
      setIsSelectingOAuthPixel(false);
    }
  };

  const updateSettingsPartial = (updated: Partial<FacebookPixelSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  const handleSave = async () => {
    if (settings.facebookPixelEnabled && !settings.facebookPixelId) {
      toast.error("يرجى إدخال معرّف Pixel ID قبل الحفظ");
      return;
    }

    if (
      settings.facebookPixelId &&
      !/^\d{14,18}$/.test(settings.facebookPixelId)
    ) {
      toast.error("Pixel ID يجب أن يتكون من 14 إلى 18 رقماً");
      return;
    }

    try {
      setSaving(true);
      await storefrontSettingsService.updateSettings(settings);
      setOriginalSettings(settings);
      toast.success("تم حفظ إعدادات Facebook Pixel & CAPI بنجاح");
      loadDiagnosticsSilently();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    toast.info("تم التراجع عن التعديلات غير المحفوظة");
  };

  const handleTestPixel = async () => {
    if (!settings.facebookPixelId) return;
    try {
      setIsTestingPixel(true);
      const response = await storefrontSettingsService.testPixel(settings.facebookPixelId);
      if (response?.success && response?.data?.success) {
        toast.success("Pixel متصل وسليم في متصفح الويب");
        setSettings((prev) => ({ ...prev, pixelStatus: "active" }));
      } else {
        toast.error(response?.message || "فشل اختبار البيكسل في المتصفح");
      }
    } catch (err) {
      toast.error("تعذر اختبار اتصال البيكسل");
    } finally {
      setIsTestingPixel(false);
    }
  };

  const handleTestCapi = async () => {
    if (!settings.facebookPixelId) return;
    try {
      setIsTestingCapi(true);
      const response = await storefrontSettingsService.testCapi({
        pixelId: settings.facebookPixelId,
        accessToken: settings.facebookConvApiToken || undefined,
        testEventCode: settings.facebookConvApiTestCode || undefined,
      });
      if (response?.success && response?.data?.success) {
        toast.success("تم إرسال حدث اختباري بنجاح إلى Conversions API");
        setSettings((prev) => ({ ...prev, capiStatus: "active" }));
      } else {
        toast.error(response?.message || "فشل اختبار CAPI");
      }
    } catch (err) {
      toast.error("تعذر اختبار اتصال السيرفر مع Meta");
    } finally {
      setIsTestingCapi(false);
    }
  };

  const handleCheckPermissions = async () => {
    try {
      setIsCheckingPermissions(true);
      const response = await storefrontSettingsService.checkTokenPermissions();
      if (response?.success) {
        setTokenPermissions(response.data);
        if (response.data.valid) {
          toast.success("صلاحيات الـ Access Token ممتازة وصالحة لـ Meta v26.0");
        } else {
          toast.error("الـ Access Token يفتقر لصلاحيات Ads Management المطلوبة");
        }
      }
    } catch (err) {
      toast.error("فشل فحص صلاحيات التوكن");
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleEasyConnect = async () => {
    try {
      setIsConnectingOAuth(true);
      const response = await apiClient.get<{ authUrl: string }>("/facebook-oauth/pixel-authorize");
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        toast.error("فشل بدء التفويض التلقائي مع فيسبوك");
      }
    } catch (err) {
      toast.error("تعذر بدء الاتصال بفيسبوك");
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleSendSimulatorEvent = async (params: {
    eventName: SimulatorEventType;
    value: number;
    contentName: string;
  }): Promise<SimulatorResult | null> => {
    try {
      setIsSendingSimulatorEvent(true);
      const response = await storefrontSettingsService.sendTestEvent({
        eventName: params.eventName,
        value: params.value,
        currency: "EGP",
        contentName: params.contentName,
      });

      if (response?.success) {
        const newResult: SimulatorResult = {
          eventId: response.data?.eventId || `evt_${Date.now()}`,
          eventName: params.eventName,
          timestamp: new Date().toLocaleTimeString("ar-EG"),
          testEventCode: response.data?.testEventCode || settings.facebookConvApiTestCode,
          status: "success",
        };
        toast.success(`تم استلام حدث ${params.eventName} في Meta CAPI بنجاح!`);
        setRecentEvents((prev) => [newResult, ...prev.slice(0, 4)]);
        return newResult;
      } else {
        toast.error(response?.message || "فشل إرسال الحدث التجريبي");
        return null;
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء إرسال الحدث التجريبي");
      return null;
    } finally {
      setIsSendingSimulatorEvent(false);
    }
  };

  // Multiple Pixels actions
  const handleSetPrimaryPixel = async (pixelId: string) => {
    try {
      const response = await storefrontSettingsService.updatePixel(pixelId, { isPrimary: true });
      if (response?.success) {
        toast.success("تم تعيين البيكسل كأساسي للمتجر");
        const refreshed = await storefrontSettingsService.getPixels();
        if (refreshed?.success) setMultiplePixels(refreshed.data.pixels || []);
      }
    } catch {
      toast.error("فشل تعيين البيكسل كأساسي");
    }
  };

  const handleDeletePixel = async (pixelId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البيكسل؟")) return;
    try {
      const response = await storefrontSettingsService.deletePixel(pixelId);
      if (response?.success) {
        toast.success("تم حذف البيكسل");
        const refreshed = await storefrontSettingsService.getPixels();
        if (refreshed?.success) setMultiplePixels(refreshed.data.pixels || []);
      }
    } catch {
      toast.error("فشل حذف البيكسل");
    }
  };

  const handleTestPixelById = async (pixelId: string) => {
    try {
      setTestingPixelId(pixelId);
      const response = await storefrontSettingsService.testPixelById(pixelId);
      if (response?.success) {
        toast.success("تم فحص البيكسل بنجاح");
      } else {
        toast.error("فشل فحص البيكسل");
      }
    } catch {
      toast.error("تعذر فحص البيكسل");
    } finally {
      setTestingPixelId(null);
    }
  };

  const handleOpenAddDrawer = () => {
    setSlideOverState({ isOpen: true, mode: "add" });
  };

  const handleOpenCreateDrawer = async () => {
    setSlideOverState({ isOpen: true, mode: "create" });
    try {
      setIsLoadingBusinesses(true);
      const response = await storefrontSettingsService.getBusinessAccounts();
      if (response?.success) {
        setBusinessAccounts(response.data?.businesses || []);
      }
    } catch {
      toast.error("فشل جلب حسابات الأعمال من فيسبوك");
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const handleAddPixelSubmit = async (data: {
    pixelName: string;
    pixelId: string;
    accessToken?: string;
    isPrimary: boolean;
  }) => {
    try {
      setIsSubmittingDrawer(true);
      const response = await storefrontSettingsService.addPixel(data);
      if (response?.success) {
        toast.success("تمت إضافة البيكسل بنجاح");
        setSlideOverState({ isOpen: false, mode: "add" });
        const refreshed = await storefrontSettingsService.getPixels();
        if (refreshed?.success) setMultiplePixels(refreshed.data.pixels || []);
      }
    } catch {
      toast.error("فشل إضافة البيكسل");
    } finally {
      setIsSubmittingDrawer(false);
    }
  };

  const handleCreatePixelSubmit = async (pixelName: string, businessId: string) => {
    try {
      setIsSubmittingDrawer(true);
      const response = await storefrontSettingsService.createFacebookPixel(pixelName, businessId);
      if (response?.success) {
        toast.success("تم إنشاء وربط البيكسل الجديد على فيسبوك بنجاح");
        setSlideOverState({ isOpen: false, mode: "create" });
        const refreshed = await storefrontSettingsService.getPixels();
        if (refreshed?.success) setMultiplePixels(refreshed.data.pixels || []);
      }
    } catch {
      toast.error("فشل إنشاء البيكسل في فيسبوك");
    } finally {
      setIsSubmittingDrawer(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            جاري مزامنة بيانات وقمرة Facebook Pixel & CAPI v26.0…
          </p>
        </div>
      </div>
    );
  }

  const isPixelActive = Boolean(settings.facebookPixelEnabled && settings.facebookPixelId);
  const isCapiActive = Boolean(
    settings.facebookConvApiEnabled &&
      (settings.facebookConvApiToken || diagnostics?.capi?.hasToken)
  );

  return (
    <div className="w-full min-h-screen bg-gray-50/50 dark:bg-gray-950 flex flex-col antialiased">
      {/* 1. Header Bar with Telemetry */}
      <PixelHeaderBar
        isPixelActive={isPixelActive}
        isCapiActive={isCapiActive}
        isSaving={saving}
        isDirty={isDirty}
        onSave={handleSave}
        onRefreshDiagnostics={loadDiagnosticsSilently}
        isRefreshing={isRefreshingDiagnostics}
      />

      {/* 2. Main High-Density Cockpit Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        {/* Credentials & Access Panel */}
        <ConnectionCredentialsPanel
          settings={settings}
          onChange={updateSettingsPartial}
          onTestPixel={handleTestPixel}
          onTestCapi={handleTestCapi}
          onEasyConnect={handleEasyConnect}
          onCheckPermissions={handleCheckPermissions}
          onFetchOAuthPixels={() => fetchFacebookOAuthPixels(true)}
          isTestingPixel={isTestingPixel}
          isTestingCapi={isTestingCapi}
          isConnectingOAuth={isConnectingOAuth}
          isCheckingPermissions={isCheckingPermissions}
          isFetchingOAuthPixels={isFetchingOAuthPixels}
          hasCapiTokenFromOAuth={Boolean(diagnostics?.capi?.hasToken)}
        />

        {/* Unified Hybrid Tracking Matrix */}
        <TrackingMatrixTable
          settings={settings}
          onChange={updateSettingsPartial}
        />

        {/* Live Simulator & Event Console */}
        <RealtimeSimulatorTerminal
          pixelId={settings.facebookPixelId}
          hasCapiToken={Boolean(settings.facebookConvApiToken || diagnostics?.capi?.hasToken)}
          testCode={settings.facebookConvApiTestCode || ""}
          onUpdateTestCode={(code) => updateSettingsPartial({ facebookConvApiTestCode: code })}
          onSendEvent={handleSendSimulatorEvent}
          isSending={isSendingSimulatorEvent}
          recentEvents={recentEvents}
        />

        {/* Multiple Pixels Section */}
        <MultiplePixelsManager
          pixels={multiplePixels}
          onOpenAddModal={handleOpenAddDrawer}
          onOpenCreateModal={handleOpenCreateDrawer}
          onSetPrimary={handleSetPrimaryPixel}
          onDeletePixel={handleDeletePixel}
          onTestPixelById={handleTestPixelById}
          testingPixelId={testingPixelId}
        />

        {/* Advanced Privacy & Data Normalization */}
        <AdvancedPrivacyDrawer
          settings={settings}
          onChange={updateSettingsPartial}
        />

        {/* Diagnostics & Permissions Card */}
        <DiagnosticsTelemetryCard
          diagnostics={diagnostics}
          tokenPermissions={tokenPermissions}
          onCheckPermissions={handleCheckPermissions}
          isCheckingToken={isCheckingPermissions}
        />
      </main>

      {/* Slide-over Drawer for Add/Create Pixel */}
      <PixelSlideOver
        isOpen={slideOverState.isOpen}
        mode={slideOverState.mode}
        onClose={() => setSlideOverState((prev) => ({ ...prev, isOpen: false }))}
        onAddPixel={handleAddPixelSubmit}
        onCreatePixel={handleCreatePixelSubmit}
        businessAccounts={businessAccounts}
        isLoadingBusinesses={isLoadingBusinesses}
        isSubmitting={isSubmittingDrawer}
      />

      {/* Slide-over Drawer for Selecting from Facebook OAuth Pixels */}
      <OAuthPixelSelectorSlideOver
        isOpen={isOAuthSelectorOpen}
        onClose={() => setIsOAuthSelectorOpen(false)}
        pixels={oauthPixels}
        isLoading={isFetchingOAuthPixels}
        onSelectPixel={handleSelectOAuthPixel}
        isSelecting={isSelectingOAuthPixel}
        selectedPixelId={settings.facebookPixelId}
      />

      {/* Floating Sticky Save Bar on Mobile/Desktop when isDirty */}
      <StickySaveBar
        isDirty={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
};

export default FacebookPixelCockpit;
