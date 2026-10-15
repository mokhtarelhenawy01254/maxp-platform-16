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

  const handleSave = async () => {
    if (!storefrontSettings) return;

    setSaving(true);
    try {
      const tokensToSave = {
        ...(storefrontSettings.designTokens || {}),
        themeId: activeStorefrontThemeId,
      };

      await storefrontSettingsService.updateSettings({
        themeId: activeStorefrontThemeId,
        designTokens: tokensToSave,
      });

      setSavedThemeId(activeStorefrontThemeId);
      setSavedTokensSignature(JSON.stringify(tokensToSave));
      setSavedContentSignature(getStorefrontContentSignature(storefrontSettings));
      setSavedPageSignature(getStorefrontPageSignature(storefrontSettings));
      setStorefrontSettings((cur) =>
        cur
          ? {
              ...cur,
              themeId: activeStorefrontThemeId,
              designTokens: tokensToSave,
            }
          : cur,
      );
      toast.success("تم حفظ تعديلات المتجر بنجاح ✨");
    } catch (error) {
      toast.error(getErrorMessage(error, "حدث خطأ أثناء حفظ التعديلات"));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    setLoading(true);
    try {
      const fresh = await storefrontSettingsService.getSettings();
      setStorefrontSettings(fresh.data);
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
      onBack={() => navigate("/settings/store")}
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
