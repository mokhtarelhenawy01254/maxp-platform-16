import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import i18n from "../../i18n";

import {
  StorefrontSettings,
  storefrontSettingsService,
} from "../../services/storefrontSettingsService";
import { DEFAULT_STOREFRONT_THEME_ID, STOREFRONT_THEME_PRESETS } from "../../storefront/themes";
import {
  getStorefrontContentOverridesFromDesignTokens,
  serializeStorefrontContentOverrides,
} from "../../storefront/utils/contentOverrides";
import {
  getStorefrontPageOverridesFromDesignTokens,
  serializeStorefrontPageOverrides,
} from "../../storefront/utils/pageOverrides";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";
import { openUrlInNewTab } from "../../utils/openUrlInNewTab";
import { StorefrontStudioShell } from "../../storefront/studio/StorefrontStudioShell";

const resolveStorefrontThemeId = (settings?: StorefrontSettings | null) => {
  const directThemeId = typeof settings?.themeId === "string" ? settings.themeId.trim() : "";
  const tokenThemeId =
    typeof settings?.designTokens?.themeId === "string"
      ? settings.designTokens.themeId.trim()
      : "";

  return directThemeId || tokenThemeId || DEFAULT_STOREFRONT_THEME_ID;
};

const getStorefrontContentSignature = (settings?: StorefrontSettings | null) =>
  serializeStorefrontContentOverrides(
    getStorefrontContentOverridesFromDesignTokens(settings?.designTokens),
  );

const getStorefrontPageSignature = (settings?: StorefrontSettings | null) =>
  serializeStorefrontPageOverrides(
    getStorefrontPageOverridesFromDesignTokens(settings?.designTokens),
  );

const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybeMessage =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
      "string"
      ? String(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message,
        )
      : "";

  return maybeMessage.trim() || fallback;
};

const StorefrontVisualEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings | null>(null);
  const [savedTokensSignature, setSavedTokensSignature] = useState("{}");
  const [savedThemeId, setSavedThemeId] = useState(DEFAULT_STOREFRONT_THEME_ID);
  const [savedContentSignature, setSavedContentSignature] = useState("{}");
  const [savedPageSignature, setSavedPageSignature] = useState("{}");

  const isInitialMountRef = useRef(true);
  const isInitializingRef = useRef(false);
  const isSavingRef = useRef(false);
  const needsResaveRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storefrontSettingsRef = useRef<StorefrontSettings | null>(null);
  storefrontSettingsRef.current = storefrontSettings;

  const activeThemeIdRef = useRef(DEFAULT_STOREFRONT_THEME_ID);
  const savedTokensSignatureRef = useRef(savedTokensSignature);
  savedTokensSignatureRef.current = savedTokensSignature;

  const savedThemeIdRef = useRef(savedThemeId);
  savedThemeIdRef.current = savedThemeId;

  const loadSettings = useCallback(async (options?: { silent?: boolean }) => {
    if (isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    if (!options?.silent) setLoading(true);

    try {
      const response = await storefrontSettingsService.getSettings();
      const nextSettings = response.data;
      setStorefrontSettings(nextSettings);
      setSavedThemeId(resolveStorefrontThemeId(nextSettings));
      setSavedTokensSignature(JSON.stringify(nextSettings?.designTokens || {}));
      setSavedContentSignature(getStorefrontContentSignature(nextSettings));
      setSavedPageSignature(getStorefrontPageSignature(nextSettings));
    } catch (error) {
      toast.error(getErrorMessage(error, i18n.t("StorefrontVisualEditorPage.unable_load_eddf")));
    } finally {
      setLoading(false);
      isInitializingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      void loadSettings();
    }
  }, [loadSettings]);

  const queryThemeId = searchParams.get("theme")?.trim();
  const activeStorefrontThemeId =
    queryThemeId && STOREFRONT_THEME_PRESETS[queryThemeId]
      ? queryThemeId
      : resolveStorefrontThemeId(storefrontSettings);
  activeThemeIdRef.current = activeStorefrontThemeId;

  const currentTokensSignature = JSON.stringify(storefrontSettings?.designTokens || {});
  const currentContentSignature = getStorefrontContentSignature(storefrontSettings);
  const currentPageSignature = getStorefrontPageSignature(storefrontSettings);
  const hasUnsavedStorefrontTheme = activeStorefrontThemeId !== savedThemeId;
  const hasUnsavedTokens = currentTokensSignature !== savedTokensSignature;
  const hasUnsavedStorefrontContent = currentContentSignature !== savedContentSignature;
  const hasUnsavedStorefrontPages = currentPageSignature !== savedPageSignature;
  const hasPendingChanges =
    hasUnsavedStorefrontTheme || hasUnsavedTokens || hasUnsavedStorefrontContent || hasUnsavedStorefrontPages;

  const storefrontPreviewUrl = useMemo(() => {
    if (!storefrontSettings?.companyId) return null;
    return (
      buildStorefrontPreviewPath("/", {
        companyId: storefrontSettings.companyId,
        companySlug: storefrontSettings.companySlug,
        customDomain: storefrontSettings.customDomain,
        previewTheme: activeStorefrontThemeId,
      }) || null
    );
  }, [
    storefrontSettings?.companyId,
    storefrontSettings?.companySlug,
    storefrontSettings?.customDomain,
    activeStorefrontThemeId,
  ]);

  const performSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (isSavingRef.current) {
        needsResaveRef.current = true;
        return;
      }

      const currentSettings = storefrontSettingsRef.current;
      if (!currentSettings) return;

      const currentThemeId = activeThemeIdRef.current;
      const tokensToSave = {
        ...(currentSettings.designTokens || {}),
        themeId: currentThemeId,
      };

      const payloadSignature = JSON.stringify(tokensToSave);
      if (
        payloadSignature === savedTokensSignatureRef.current &&
        currentThemeId === savedThemeIdRef.current
      ) {
        return;
      }

      isSavingRef.current = true;
      setSaving(true);
      needsResaveRef.current = false;

      try {
        await storefrontSettingsService.updateSettings({
          themeId: currentThemeId,
          designTokens: tokensToSave,
        });

        savedThemeIdRef.current = currentThemeId;
        savedTokensSignatureRef.current = payloadSignature;
        setSavedThemeId(currentThemeId);
        setSavedTokensSignature(payloadSignature);
        setSavedContentSignature(getStorefrontContentSignature(currentSettings));
        setSavedPageSignature(getStorefrontPageSignature(currentSettings));
        setStorefrontSettings((cur) =>
          cur
            ? {
                ...cur,
                themeId: currentThemeId,
                designTokens: tokensToSave,
              }
            : cur,
        );

        if (!options?.silent) {
          toast.success("تم حفظ تعديلات المتجر بنجاح ✨");
        }
      } catch (error) {
        if (!options?.silent) {
          toast.error(getErrorMessage(error, "حدث خطأ أثناء حفظ التعديلات"));
        } else {
          console.error("Storefront editor autosave error:", error);
        }
      } finally {
        isSavingRef.current = false;
        setSaving(false);

        if (needsResaveRef.current) {
          needsResaveRef.current = false;
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = setTimeout(() => {
            autosaveTimerRef.current = null;
            void performSave({ silent: true });
          }, 2500);
        }
      }
    },
    [],
  );

  const flushSave = useCallback(
    async (options?: { silent?: boolean }) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return performSave(options);
    },
    [performSave],
  );

  // Debounced Autosave: Save automatically after ~2.5s of idle time without toast spam
  useEffect(() => {
    if (loading || !storefrontSettings || isInitialMountRef.current) {
      return;
    }

    if (!hasPendingChanges) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void performSave({ silent: true });
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    storefrontSettings?.designTokens,
    activeStorefrontThemeId,
    hasPendingChanges,
    loading,
    performSave,
  ]);

  // Leave guard: warn on refresh/close if pending changes exist in autosave window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges || isSavingRef.current || autosaveTimerRef.current !== null) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [hasPendingChanges]);

  const handleSave = () => flushSave({ silent: false });

  const handleBack = async () => {
    if (hasPendingChanges || autosaveTimerRef.current !== null) {
      await flushSave({ silent: true });
    }
    navigate("/settings/store");
  };

  const handleDiscard = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setLoading(true);
    try {
      const fresh = await storefrontSettingsService.getSettings();
      const freshData = fresh.data;
      setStorefrontSettings(freshData);
      setSavedThemeId(resolveStorefrontThemeId(freshData));
      setSavedTokensSignature(JSON.stringify(freshData?.designTokens || {}));
      setSavedContentSignature(getStorefrontContentSignature(freshData));
      setSavedPageSignature(getStorefrontPageSignature(freshData));
      toast.info("تم إلغاء التعديلات والعودة للنسخة المحفوظة 🔄");
    } catch {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = () => {
    const hasSlugOrDomain = Boolean(
      storefrontSettings?.companySlug?.trim() || storefrontSettings?.customDomain?.trim()
    );

    if (!hasSlugOrDomain) {
      toast.error("يرجى ضبط رابط المتجر (Slug) أو الدومين المخصص أولاً لتفعيل المعاينة");
      return;
    }

    if (!storefrontPreviewUrl) {
      toast.error("تعذر تجهيز رابط معاينة المتجر، يرجى مراجعة إعدادات المتجر");
      return;
    }

    openUrlInNewTab(storefrontPreviewUrl);
  };

  if (loading && !storefrontSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm font-black text-foreground">
            جاري تجهيز استوديو التصميم البصري 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontStudioShell
      themeId={activeStorefrontThemeId}
      companyId={storefrontSettings?.companyId}
      designTokens={(storefrontSettings?.designTokens as Record<string, unknown>) || {}}
      storeName={storefrontSettings?.storeName || "متجري"}
      hasPendingChanges={hasPendingChanges}
      saving={saving}
      previewUrl={storefrontPreviewUrl || undefined}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onBack={handleBack}
      onOpenPreview={handleOpenPreview}
      onChange={(nextDesignTokens) => {
        setStorefrontSettings((cur) =>
          cur
            ? {
                ...cur,
                designTokens: nextDesignTokens,
              }
            : cur,
        );
      }}
    />
  );
};

export default StorefrontVisualEditorPage;
