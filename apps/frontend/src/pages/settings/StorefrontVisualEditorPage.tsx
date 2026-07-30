import { ArrowLeft as ArrowLeftIcon, RefreshCw as ArrowPathIcon, ExternalLink as ArrowTopRightOnSquareIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Circle as PaintBrushIcon } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
;
import { toast } from "sonner";

import {
  StorefrontSettings,
  storefrontSettingsService,
} from "../../services/storefrontSettingsService";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";
import StorefrontVisualEditor from "../../components/store/StorefrontVisualEditor";
import { DEFAULT_STOREFRONT_THEME_ID, STOREFRONT_THEME_PRESETS } from "../../storefront/themes";
import {
  buildStorefrontHomeContentOverrides,
  getStorefrontContentOverridesFromDesignTokens,
  getStorefrontHomeContentDraft,
  serializeStorefrontContentOverrides,
  upsertStorefrontContentOverridesInDesignTokens,
} from "../../storefront/utils/contentOverrides";
import {
  getStorefrontPageOverridesFromDesignTokens,
  serializeStorefrontPageOverrides,
} from "../../storefront/utils/pageOverrides";
import { validateStorefrontPageOverrides } from "../../storefront/utils/pageOverrideValidation";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";
import { useCategories } from "../../storefront/hooks/useCategories";
import { useProducts } from "../../storefront/hooks/useProducts";
import { openUrlInNewTab } from "../../utils/openUrlInNewTab";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showHeroImagePicker, setShowHeroImagePicker] = useState(false);
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings | null>(null);
  const [savedThemeId, setSavedThemeId] = useState(DEFAULT_STOREFRONT_THEME_ID);
  const [savedContentSignature, setSavedContentSignature] = useState("{}");
  const [savedPageSignature, setSavedPageSignature] = useState("{}");

  // 🔍 Diagnostic Logging & Ref Guard
  const renderCountRef = useRef(0);
  const isInitialMountRef = useRef(true);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      renderCountRef.current += 1;
      console.debug(`🔄 [VisualEditorPage] Render #${renderCountRef.current}`, {
        loading,
        hasSettings: !!storefrontSettings,
        activeThemeId: resolveStorefrontThemeId(storefrontSettings),
      });
    }
  });

  const loadSettings = useCallback(async (options?: { silent?: boolean }) => {
    if (isInitializingRef.current) {
      console.debug('⏳ [VisualEditorPage] Already initializing, skipping...');
      return;
    }
    
    isInitializingRef.current = true;
    if (!options?.silent) {
      setLoading(true);
    }

    console.debug('🚀 [VisualEditorPage] Loading storefront settings...');
    try {
      const response = await storefrontSettingsService.getSettings();
      const nextSettings = response.data;
      setStorefrontSettings(nextSettings);
      setSavedThemeId(resolveStorefrontThemeId(nextSettings));
      setSavedContentSignature(getStorefrontContentSignature(nextSettings));
      setSavedPageSignature(getStorefrontPageSignature(nextSettings));
      console.debug('✅ [VisualEditorPage] Settings loaded successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, "تعذر تحميل إعدادات المتجر"));
      console.error("❌ [VisualEditorPage] Error loading storefront editor settings:", error);
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

  const activeStorefrontThemeId = resolveStorefrontThemeId(storefrontSettings);
  const currentThemeName =
    STOREFRONT_THEME_PRESETS[activeStorefrontThemeId]?.name || activeStorefrontThemeId;
  const currentContentSignature = getStorefrontContentSignature(storefrontSettings);
  const currentPageSignature = getStorefrontPageSignature(storefrontSettings);
  const hasUnsavedStorefrontTheme = activeStorefrontThemeId !== savedThemeId;
  const hasUnsavedStorefrontContent = currentContentSignature !== savedContentSignature;
  const hasUnsavedStorefrontPages = currentPageSignature !== savedPageSignature;
  const hasPendingChanges =
    hasUnsavedStorefrontTheme || hasUnsavedStorefrontContent || hasUnsavedStorefrontPages;
  const previewNeedsSaveFirst = hasUnsavedStorefrontContent || hasUnsavedStorefrontPages;

  const productsParams = useMemo(() => ({ limit: 200 }), []);

  const { categories: storefrontCategories, isLoading: categoriesLoading } = useCategories(
    storefrontSettings?.companyId,
  );
  const { products: storefrontProducts, isLoading: productsLoading } = useProducts(
    productsParams,
    storefrontSettings?.companyId,
  );

  const availableStorefrontCategories = useMemo(
    () =>
      [...storefrontCategories]
        .map((category) => ({
          id: String(category.id || category.slug || "").trim(),
          name: String(category.name || category.slug || category.id || "").trim(),
          slug: String(category.slug || category.id || category.name || "").trim(),
          image:
            typeof category.image === "string" && category.image.trim()
              ? category.image.trim()
              : undefined,
          description:
            typeof category.description === "string" && category.description.trim()
              ? category.description.trim()
              : undefined,
        }))
        .filter((category) => category.id && category.name),
    [storefrontCategories],
  );

  const availableStorefrontProducts = useMemo(
    () =>
      [...storefrontProducts]
        .map((product) => ({
          id: String(product.id || product.slug || "").trim(),
          name: String(product.name || product.slug || product.id || "").trim(),
          slug: String(product.slug || product.id || product.name || "").trim(),
          categoryId:
            typeof product.categoryId === "string" && product.categoryId.trim()
              ? product.categoryId.trim()
              : typeof product.category?.id === "string" && product.category.id.trim()
                ? product.category.id.trim()
                : undefined,
          categoryName:
            typeof product.category?.name === "string" && product.category.name.trim()
              ? product.category.name.trim()
              : undefined,
        }))
        .filter((product) => product.id && product.name && product.slug),
    [storefrontProducts],
  );

  const storefrontPageOverrides = useMemo(
    () => getStorefrontPageOverridesFromDesignTokens(storefrontSettings?.designTokens),
    [storefrontSettings?.designTokens],
  );

  const storefrontPageValidation = useMemo(
    () =>
      validateStorefrontPageOverrides({
        overrides: storefrontPageOverrides,
        categories: availableStorefrontCategories,
        products: availableStorefrontProducts,
      }),
    [
      availableStorefrontCategories,
      availableStorefrontProducts,
      storefrontPageOverrides,
    ],
  );

  const hasBlockingValidationErrors = storefrontPageValidation.errorCount > 0;
  const validationPreview = storefrontPageValidation.issues.slice(0, 6);

  const previewThemeId = hasUnsavedStorefrontTheme ? activeStorefrontThemeId : "";
  const previewAdminOrigin = window.location.origin;
  const storefrontPreviewTarget = useMemo(
    () => ({
      companyId: storefrontSettings?.companyId || null,
      companySlug: storefrontSettings?.companySlug || null,
      customDomain: storefrontSettings?.customDomain || null,
      previewAdminOrigin,
    }),
    [
      previewAdminOrigin,
      storefrontSettings?.companyId,
      storefrontSettings?.companySlug,
      storefrontSettings?.customDomain,
    ],
  );
  const storefrontPreviewUrl = storefrontSettings?.companyId
    ? buildStorefrontPreviewPath("/", {
        ...storefrontPreviewTarget,
        previewTheme: previewThemeId,
        previewSource: previewThemeId ? "settings" : undefined,
      })
    : "";
  const canOpenPreview = Boolean(storefrontPreviewUrl) && !previewNeedsSaveFirst;

  const handleSave = async () => {
    if (!storefrontSettings) {
      return;
    }

    if (hasBlockingValidationErrors) {
      toast.error(
        `لا يمكن الحفظ قبل معالجة ${storefrontPageValidation.errorCount} خطأ في الأقسام.`,
      );
      return;
    }

    try {
      setSaving(true);
      const themeId = resolveStorefrontThemeId(storefrontSettings);
      const response = await storefrontSettingsService.updateSettings({
        ...storefrontSettings,
        themeId,
        designTokens: {
          ...(storefrontSettings.designTokens || {}),
          themeId,
        },
      });
      const nextSettings = response.data || storefrontSettings;

      setStorefrontSettings(nextSettings);
      setSavedThemeId(resolveStorefrontThemeId(nextSettings));
      setSavedContentSignature(getStorefrontContentSignature(nextSettings));
      setSavedPageSignature(getStorefrontPageSignature(nextSettings));
      toast.success("تم حفظ تعديلات الصفحة الرئيسية");
    } catch (error) {
      toast.error(getErrorMessage(error, "فشل حفظ تعديلات الصفحة الرئيسية"));
      console.error("Error saving storefront editor settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    if (hasPendingChanges && !window.confirm("سيتم تجاهل التعديلات غير المحفوظة. هل نكمل؟")) {
      return;
    }

    await loadSettings({ silent: true });
    toast.success("تمت إعادة تحميل آخر نسخة محفوظة");
  };

  const handleReset = async () => {
    if (!window.confirm("هل تريد إعادة الصفحة الرئيسية وإعدادات المتجر إلى القيم الافتراضية؟")) {
      return;
    }

    try {
      setResetting(true);
      const response = await storefrontSettingsService.resetSettings();
      const nextSettings = response.data;

      setStorefrontSettings(nextSettings);
      setSavedThemeId(resolveStorefrontThemeId(nextSettings));
      setSavedContentSignature(getStorefrontContentSignature(nextSettings));
      setSavedPageSignature(getStorefrontPageSignature(nextSettings));
      toast.success("تمت إعادة تعيين إعدادات المتجر");
    } catch (error) {
      toast.error(getErrorMessage(error, "فشل إعادة تعيين إعدادات المتجر"));
      console.error("Error resetting storefront settings:", error);
    } finally {
      setResetting(false);
    }
  };

  const handleOpenPreview = () => {
    if (!canOpenPreview || !storefrontPreviewUrl) {
      return;
    }

    if (!openUrlInNewTab(storefrontPreviewUrl)) {
      toast.error(
        "المتصفح منع فتح تبويب المعاينة. اسمح بالنوافذ المنبثقة ثم جرّب مرة أخرى.",
      );
    }
  };

  const handleSelectHeroImage = (imageUrl: string) => {
    setStorefrontSettings((current) => {
      if (!current) {
        return current;
      }

      const currentDraft = getStorefrontHomeContentDraft(current.designTokens);

      return {
        ...current,
        designTokens: upsertStorefrontContentOverridesInDesignTokens(
          current.designTokens,
          buildStorefrontHomeContentOverrides({
            ...currentDraft,
            hero: {
              ...currentDraft.hero,
              backgroundImage: imageUrl,
            },
          }),
        ),
      };
    });
  };

  if (loading && !storefrontSettings) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            جاري تجهيز محرر الصفحة الرئيسية...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7f8ff_55%,#eef4ff_100%)] shadow-sm dark:border-gray-800 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.96)_0%,rgba(15,23,42,0.92)_55%,rgba(30,41,59,0.92)_100%)]">
        <div className="flex flex-col gap-5 p-6 lg:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate("/settings/store")}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                العودة إلى إعدادات المتجر
              </button>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
                  <PaintBrushIcon className="h-4 w-4" />
                  المحرر المرئي المستقل
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  تعديل الصفحة الرئيسية مباشرة
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  نفس فكرة الشاشة التي طلبتها: إعدادات على الجانبين ومعاينة مباشرة في المنتصف،
                  مع حفظ من نفس الصفحة بدل التنقل داخل التابات.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || resetting || !hasPendingChanges || hasBlockingValidationErrors}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  saving || resetting || !hasPendingChanges || hasBlockingValidationErrors
                    ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    : "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                }`}
              >
                <CheckCircleIcon className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>

              <button
                type="button"
                onClick={handleReload}
                disabled={saving || resetting}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <ArrowPathIcon className="h-4 w-4" />
                استرجاع آخر نسخة
              </button>

              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={!canOpenPreview}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  canOpenPreview
                    ? "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                    : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
                }`}
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                فتح المعاينة
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={saving || resetting}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <ExclamationTriangleIcon className="h-4 w-4" />
                {resetting ? "جاري الإعادة..." : "إعادة تعيين"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">اسم المتجر</div>
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {storefrontSettings?.storeName || "Storefront"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">القالب الحالي</div>
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {currentThemeName}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">حالة التعديل</div>
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {hasBlockingValidationErrors
                  ? "يوجد أخطاء تمنع الحفظ"
                  : hasPendingChanges
                    ? "توجد تغييرات غير محفوظة"
                    : "كل شيء محفوظ"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">المعاينة</div>
              <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {!storefrontPreviewUrl
                  ? "غير متاحة"
                  : previewNeedsSaveFirst
                    ? "تحتاج حفظ أولًا"
                    : "جاهزة الآن"}
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              hasBlockingValidationErrors
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                : previewNeedsSaveFirst
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
            }`}
          >
            {hasBlockingValidationErrors
              ? `يوجد ${storefrontPageValidation.errorCount} أخطاء يجب معالجتها داخل الأقسام قبل الحفظ.`
              : previewNeedsSaveFirst
                ? "المعاينة النهائية لن تعكس تغييرات المحتوى أو ترتيب الأقسام إلا بعد الحفظ."
                : "النسخة الحالية صالحة للحفظ والمعاينة من نفس الصفحة."}
          </div>
        </div>
      </div>

      {storefrontPageValidation.issues.length > 0 ? (
        <div
          className={`rounded-3xl border p-5 ${
            hasBlockingValidationErrors
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
              : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                مراجعة قبل الحفظ
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                هذه الملاحظات مبنية على التصنيفات والمنتجات الحالية في المتجر.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {storefrontPageValidation.errorCount > 0 ? (
                <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  Errors: {storefrontPageValidation.errorCount}
                </span>
              ) : null}
              {storefrontPageValidation.warningCount > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Warnings: {storefrontPageValidation.warningCount}
                </span>
              ) : null}
              {categoriesLoading || productsLoading ? (
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  جاري تحديث بيانات التحقق...
                </span>
              ) : null}
              </div>
          </div>

          <div className="mt-4 space-y-2">
            {validationPreview.map((issue, index) => (
              <div
                key={`${issue.pageKey}-${issue.sectionType}-${issue.fieldKey}-${issue.itemIndex ?? "section"}-${index}`}
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  issue.severity === "error"
                    ? "border-red-200 bg-red-100/80 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                    : "border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                }`}
              >
                [{issue.pageKey}] {issue.message}
              </div>
            ))}

            {storefrontPageValidation.issues.length > validationPreview.length ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                + {storefrontPageValidation.issues.length - validationPreview.length} ملاحظات إضافية
                داخل المحرر.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {storefrontSettings ? (
        <StorefrontVisualEditor
          themeId={activeStorefrontThemeId}
          designTokens={storefrontSettings.designTokens}
          storeName={storefrontSettings.storeName}
          validationIssues={storefrontPageValidation.issues}
          onOpenHeroImagePicker={() => setShowHeroImagePicker(true)}
          onChange={(nextDesignTokens) => {
            setStorefrontSettings((current) =>
              current
                ? {
                    ...current,
                    designTokens: nextDesignTokens,
                  }
                : current,
            );
          }}
        />
      ) : null}

      <StorefrontImagePickerModal
        isOpen={showHeroImagePicker}
        onClose={() => setShowHeroImagePicker(false)}
        onSelectImage={handleSelectHeroImage}
        selectedUrl={getStorefrontHomeContentDraft(storefrontSettings?.designTokens).hero.backgroundImage}
      />
    </div>
  );
};

export default StorefrontVisualEditorPage;
