import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Gift,
  Loader2,
  PackageCheck,
  PanelTop,
  Percent,
  Plus,
  RotateCcw,
  Sparkles,
  Truck,
  ExternalLink,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import {
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsStatusAlert,
  SettingsStatusMessage,
} from "./components/SettingsPagePrimitives";
import {
  getApiErrorMessage,
  getNumericValue,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";

type SaveState = "idle" | "saving" | "saved";

type FreeShippingSettings = {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
};

type FlatShippingSettings = {
  flatShippingEnabled: boolean;
  flatShippingFee: number;
};

const MAX_THRESHOLD = 100000;
const MAX_FEE = 10000;
const AMOUNT_TOKEN = "{amount}";

/* سويتش بمقاس مريح: تجاوز مقاس shadcn الافتراضي داخل هذه الصفحة فقط (Tailwind v4 important) */
const SWITCH_SIZE_CLASS =
  "h-6! w-11! [&_[data-slot=switch-thumb]]:size-5! data-checked:[&_[data-slot=switch-thumb]]:translate-x-full! rtl:data-checked:[&_[data-slot=switch-thumb]]:-translate-x-full!";

const formatAmount = (value: number): string =>
  Number(value || 0).toLocaleString("en-US");

/* حالات القسم: أيقونة + عنوان + مؤشر حالة + سويتش في نفس الصف */
function PromoSection({
  icon: Icon,
  title,
  description,
  accentClassName,
  isOn,
  pill,
  switchChecked,
  onSwitchChange,
  switchLabel,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  accentClassName: { sectionBorder: string; iconActive: string };
  isOn: boolean;
  pill: React.ReactNode;
  switchChecked: boolean;
  onSwitchChange: (checked: boolean) => void;
  switchLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border bg-white/80 p-5 shadow-sm transition-colors dark:bg-slate-900/70 dark:shadow-none",
        isOn ? accentClassName.sectionBorder : "border-slate-200/70 dark:border-slate-800",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition-colors",
            isOn
              ? accentClassName.iconActive
              : "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">{title}</h2>
          {pill}
        </div>
        <div className="ms-auto flex items-center gap-3">
          <Switch
            checked={switchChecked}
            onCheckedChange={onSwitchChange}
            aria-label={switchLabel}
            className={SWITCH_SIZE_CLASS}
          />
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-5 space-y-4 text-slate-900 dark:text-slate-100">{children}</div>
    </section>
  );
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
  warn = false,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  warn?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        active
          ? warn
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? (warn ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-400",
        )}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

const PromotionSettings: React.FC = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<SettingsStatusMessage | null>(null);

  const [freeShippingSettings, setFreeShippingSettings] =
    useState<FreeShippingSettings>({
      freeShippingEnabled: false,
      freeShippingThreshold: 0,
      freeShippingMessage: t("promotionSettings.defaultFreeMessage"),
    });
  const [flatShippingSettings, setFlatShippingSettings] =
    useState<FlatShippingSettings>({ flatShippingEnabled: false, flatShippingFee: 0 });
  const [hideUtilityBar, setHideUtilityBar] = useState(false);

  const [thresholdError, setThresholdError] = useState(false);
  const [feeError, setFeeError] = useState(false);

  const loadedRef = useRef(false);
  const saveTimersRef = useRef<{ save?: number; idle?: number }>({});
  const stateRef = useRef({ freeShippingSettings, flatShippingSettings });
  stateRef.current = { freeShippingSettings, flatShippingSettings };

  /* ---------- الحفظ التلقائي الموحّد (نفس الـ API الحالي بدون تغيير في الباك إند) ---------- */
  const scheduleIdle = useCallback(() => {
    clearTimeout(saveTimersRef.current.idle);
    saveTimersRef.current.idle = window.setTimeout(
      () => setSaveState("idle"),
      2600,
    );
  }, []);

  const flushSettings = useCallback(async () => {
    try {
      const { freeShippingSettings: free, flatShippingSettings: flat } =
        stateRef.current;
      await apiClient.post("/promotion-settings", { ...free, ...flat });
      setSaveState("saved");
      scheduleIdle();
    } catch (error) {
      setSaveState("idle");
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.settingsSaveFailed")),
      });
    }
  }, [scheduleIdle, t]);

  const queueSave = useCallback(() => {
    if (!loadedRef.current) return;
    setSaveState("saving");
    clearTimeout(saveTimersRef.current.save);
    saveTimersRef.current.save = window.setTimeout(() => {
      void flushSettings();
    }, 650);
  }, [flushSettings]);

  useEffect(
    () => () => {
      clearTimeout(saveTimersRef.current.save);
      clearTimeout(saveTimersRef.current.idle);
    },
    [],
  );

  /* ---------- التحميل ---------- */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsResult, sfResult] = await Promise.allSettled([
        apiClient.get("/promotion-settings"),
        storefrontSettingsService.getSettings(undefined, { allowFallback: false }),
      ]);

      if (settingsResult.status === "rejected") {
        throw settingsResult.reason;
      }

      const envelope = settingsResult.value.data as {
        success?: boolean;
        data?: {
          freeShippingEnabled?: boolean;
          freeShippingThreshold?: number | string;
          freeShippingMessage?: string;
          flatShippingEnabled?: boolean;
          flatShippingFee?: number | string;
        };
      };
      if (envelope.success) {
        const data = envelope.data || {};
        const storedMessage =
          typeof data.freeShippingMessage === "string" &&
          data.freeShippingMessage.trim()
            ? data.freeShippingMessage
            : t("promotionSettings.defaultFreeMessage");
        setFreeShippingSettings({
          freeShippingEnabled: Boolean(data.freeShippingEnabled),
          freeShippingThreshold: getNumericValue(data.freeShippingThreshold),
          freeShippingMessage: storedMessage,
        });
        setFlatShippingSettings({
          flatShippingEnabled: Boolean(data.flatShippingEnabled),
          flatShippingFee: getNumericValue(data.flatShippingFee),
        });
      }

      if (sfResult.status === "fulfilled") {
        const sfData = sfResult.value.data as { hideUtilityBar?: boolean };
        setHideUtilityBar(sfData?.hideUtilityBar === true);
      }
      // رفض نداء إخفاء الشريط غير مانع — الميزة اختيارية
      loadedRef.current = true;
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.loadFailed")),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /* ---------- معالجات الحقول ---------- */
  const updateFree = useCallback(
    (patch: Partial<FreeShippingSettings>) => {
      setFreeShippingSettings((current) => ({ ...current, ...patch }));
      queueSave();
    },
    [queueSave],
  );

  const updateFlat = useCallback(
    (patch: Partial<FlatShippingSettings>) => {
      setFlatShippingSettings((current) => ({ ...current, ...patch }));
      queueSave();
    },
    [queueSave],
  );

  const handleToggleUtilityBar = useCallback(
    async (value: boolean) => {
      setHideUtilityBar(value);
      setSaveState("saving");
      try {
        await storefrontSettingsService.updateSettings({ hideUtilityBar: value });
        setSaveState("saved");
        scheduleIdle();
      } catch {
        setHideUtilityBar(!value);
        setSaveState("idle");
        setMessage({
          type: "error",
          text: t("promotionSettings.settingsSaveFailed"),
        });
      }
    },
    [scheduleIdle, t],
  );

  const insertAmountToken = useCallback(() => {
    const el = document.getElementById(
      "freeShippingMessage",
    ) as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + AMOUNT_TOKEN + el.value.slice(end);
    updateFree({ freeShippingMessage: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + AMOUNT_TOKEN.length, start + AMOUNT_TOKEN.length);
    });
  }, [updateFree]);

  const handleReset = useCallback(async () => {
    try {
      const response = await apiClient.post("/promotion-settings/reset", {});
      const envelope = response.data as { success?: boolean };
      if (envelope.success) {
        await loadSettings();
        setSaveState("saved");
        scheduleIdle();
        setMessage({
          type: "success",
          text: t("promotionSettings.settingsReset"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.settingsResetFailed")),
      });
    }
  }, [loadSettings, scheduleIdle, t]);

  /* ---------- المعاينة ---------- */
  const { freeShippingMessage, freeShippingThreshold, freeShippingEnabled } =
    freeShippingSettings;
  const preview = useMemo(() => {
    if (!freeShippingEnabled) {
      return { live: false, text: t("promotionSettings.previewOff") };
    }
    if (!(freeShippingThreshold > 0)) {
      return { live: false, text: t("promotionSettings.previewZero") };
    }
    const formatted = formatAmount(freeShippingThreshold);
    return {
      live: true,
      text: freeShippingMessage.split(AMOUNT_TOKEN).join(formatted),
    };
  }, [freeShippingEnabled, freeShippingMessage, freeShippingThreshold, t]);

  /* ---------- الأدوات المرتبطة ---------- */
  const relatedTools = [
    {
      to: "/settings/volume-discounts",
      icon: Percent,
      label: t("promotionSettings.relatedVolume"),
      desc: t("promotionSettings.relatedVolumeDesc"),
    },
    {
      to: "/settings/delivery-options",
      icon: PackageCheck,
      label: t("promotionSettings.relatedDelivery"),
      desc: t("promotionSettings.relatedDeliveryDesc"),
    },
    {
      to: "/settings/recommendations",
      icon: Sparkles,
      label: t("promotionSettings.relatedRecommend"),
      desc: t("promotionSettings.relatedRecommendDesc"),
    },
  ];

  const msgHelpParts = t("promotionSettings.freeShippingMessageDesc").split(
    AMOUNT_TOKEN,
  );

  if (loading) {
    return (
      <SettingsLoadingState
        title={t("promotionSettings.loadingTitle")}
        description={t("promotionSettings.loadingDescription")}
      />
    );
  }

  const lockedFieldsClass = "bg-slate-50/50 cursor-not-allowed";

  return (
    <>
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel={t("promotionSettings.badgeLabel")}
        title={t("promotionSettings.pageTitle")}
        description={t("promotionSettings.pageDescription")}
        action={
          <div
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
              saveState === "saving" &&
                "border-amber-200 bg-amber-50 text-amber-800",
              saveState === "saved" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800",
              saveState === "idle" && "border-slate-200 bg-white/85 text-slate-500",
            )}
          >
            {saveState === "saving" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            {saveState === "saving"
              ? t("promotionSettings.saveSaving")
              : saveState === "saved"
                ? t("promotionSettings.saveSaved")
                : t("promotionSettings.saveIdle")}
          </div>
        }
        summaryItems={[
          {
            label: t("promotionSettings.freeShipping"),
            value: freeShippingEnabled
              ? t("promotionSettings.pillActive")
              : t("promotionSettings.pillInactive"),
          },
          {
            label: t("promotionSettings.flatShippingTitle"),
            value: flatShippingSettings.flatShippingEnabled
              ? `${formatAmount(flatShippingSettings.flatShippingFee)} ${t("promotionSettings.currency")}`
              : t("promotionSettings.pillInactive"),
            valueDir: "ltr",
          },
        ]}
      />

      <div className="space-y-6 px-6 py-6">
        <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />

        {/* أدوات مرتبطة: روابط حقيقية مش تابات */}
        <nav
          aria-label={t("promotionSettings.relatedToolsLabel")}
          className="flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 xl:grid-cols-4"
        >
          {relatedTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className="group flex min-w-[240px] shrink-0 items-start gap-2.5 rounded-2xl border border-slate-200/70 bg-white/85 px-3.5 py-3 transition hover:-translate-y-px hover:border-slate-300 hover:shadow-sm sm:min-w-0 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70 transition group-hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:group-hover:bg-slate-700">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-950 dark:text-slate-100">
                    {tool.label}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{tool.desc}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* الشحن المجاني */}
        <PromoSection
          icon={Gift}
          title={t("promotionSettings.freeShipping")}
          description={t("promotionSettings.freeShippingDesc")}
          isOn={freeShippingEnabled}
          accentClassName={{
            sectionBorder: "border-emerald-200/80",
            iconActive: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
          }}
          pill={
            <StatusPill
              active={freeShippingEnabled}
              activeLabel={t("promotionSettings.pillActive")}
              inactiveLabel={t("promotionSettings.pillInactive")}
            />
          }
          switchChecked={freeShippingEnabled}
          onSwitchChange={(checked) => updateFree({ freeShippingEnabled: checked })}
          switchLabel={t("promotionSettings.freeShippingTitle")}
        >
          <fieldset
            disabled={!freeShippingEnabled}
            className={cn("grid gap-4 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)]")}
          >
            <div className="space-y-2">
              <Label htmlFor="freeShippingThreshold" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                {t("promotionSettings.freeShippingThreshold")}
              </Label>
              <div className="relative">
                <Input
                  id="freeShippingThreshold"
                  type="number"
                  min={0}
                  max={MAX_THRESHOLD}
                  inputMode="numeric"
                  value={freeShippingSettings.freeShippingThreshold}
                  onChange={(event) => {
                    const next = getNumericValue(event.target.value);
                    setThresholdError(next > MAX_THRESHOLD);
                    updateFree({ freeShippingThreshold: next });
                  }}
                  onBlur={() => {
                    if (freeShippingSettings.freeShippingThreshold > MAX_THRESHOLD) {
                      setThresholdError(false);
                      updateFree({ freeShippingThreshold: MAX_THRESHOLD });
                    }
                  }}
                  aria-invalid={thresholdError}
                  aria-describedby="freeShippingThresholdHint freeShippingThresholdError"
                  className={cn(
                    "h-11 rounded-xl bg-white/90 font-semibold tabular-nums ltr:pr-14 rtl:pl-14 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100",
                    !freeShippingEnabled && lockedFieldsClass,
                    thresholdError && "border-rose-300 focus-visible:ring-rose-200",
                  )}
                />
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 ltr:right-3 rtl:left-3 dark:bg-slate-800 dark:text-slate-300">
                  {t("promotionSettings.currency")}
                </span>
              </div>
              <p
                id="freeShippingThresholdHint"
                className="text-xs leading-5 text-slate-500 dark:text-slate-400"
              >
                {t("promotionSettings.freeShippingThresholdDesc")}
              </p>
              {thresholdError ? (
                <p
                  id="freeShippingThresholdError"
                  className="text-xs font-bold text-rose-700 dark:text-rose-400"
                >
                  {t("promotionSettings.thresholdMaxError")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeShippingMessage" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                {t("promotionSettings.freeShippingMessage")}
              </Label>
              <Textarea
                id="freeShippingMessage"
                rows={3}
                value={freeShippingSettings.freeShippingMessage}
                onChange={(event) =>
                  updateFree({ freeShippingMessage: event.target.value })
                }
                className={cn(
                  "min-h-[104px] rounded-xl border-slate-200 bg-white/90 text-sm font-semibold leading-7 text-slate-950 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100",
                  !freeShippingEnabled && lockedFieldsClass,
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertAmountToken}
                  className="rounded-lg border-dashed text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus className="size-3.5" />
                  {t("promotionSettings.insertToken")}
                </Button>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {msgHelpParts[0]}
                  <code className="mx-1 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" dir="ltr">
                    {AMOUNT_TOKEN}
                  </code>
                  {msgHelpParts[1]}
                </p>
              </div>
            </div>
          </fieldset>

          {/* المعاينة بشكل شريط المتجر */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("promotionSettings.previewTitle")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("promotionSettings.previewNote")}</p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors",
                preview.live
                  ? "border-slate-950 bg-slate-950 text-white dark:border-slate-800 dark:bg-slate-900"
                  : "border-dashed border-slate-300 bg-slate-50/80 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400",
              )}
            >
              <Truck className="size-4 shrink-0" />
              <p className="flex-1 text-sm font-semibold leading-6" dir="auto">
                {preview.text}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  preview.live ? "bg-white/15 text-slate-200" : "bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {t("promotionSettings.storeBadge")}
              </span>
            </div>
          </div>

          {/* تنبيه وتأكيد التزامن مع أداة شريط الشحن المجاني */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className={cn("flex size-2 rounded-full", freeShippingEnabled ? "bg-emerald-600 animate-pulse" : "bg-slate-400")} />
              <span className="font-semibold leading-5">
                {freeShippingEnabled
                  ? "شريط الشحن المجاني مفعّل ومتزامن تلقائيًا على المتجر (الرئيسية، صفحة المنتج، السلة، وإتمام الطلب) بنفس الحد."
                  : "تفعيل الشحن المجاني هنا يُشغّل شريط الشحن المجاني تلقائيًا على المتجر ويزامن الحد المالي في كل الصفحات."}
              </span>
            </div>
            <Link
              to="/settings/store/tools/freeShippingBar"
              className="inline-flex items-center gap-1.5 font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              <span>تخصيص أداة شريط الشحن المجاني</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </PromoSection>

        {/* إخفاء الشريط العلوي */}
        <PromoSection
          icon={PanelTop}
          title={t("promotionSettings.hideTopBarTitle")}
          description={t("promotionSettings.hideTopBarDesc")}
          isOn={hideUtilityBar}
          accentClassName={{
            sectionBorder: "border-amber-200/80",
            iconActive: "bg-amber-50 text-amber-700 ring-amber-200/70",
          }}
          pill={
            <StatusPill
              active={hideUtilityBar}
              activeLabel={t("promotionSettings.pillHidden")}
              inactiveLabel={t("promotionSettings.pillVisible")}
              warn
            />
          }
          switchChecked={hideUtilityBar}
          onSwitchChange={(checked) => void handleToggleUtilityBar(checked)}
          switchLabel={t("promotionSettings.hideTopBarTitle")}
        />

        {/* سعر الشحن الموحّد */}
        <PromoSection
          icon={PackageCheck}
          title={t("promotionSettings.flatShippingTitle")}
          description={t("promotionSettings.flatShippingDesc")}
          isOn={flatShippingSettings.flatShippingEnabled}
          accentClassName={{
            sectionBorder: "border-sky-200/80",
            iconActive: "bg-sky-50 text-sky-700 ring-sky-200/70",
          }}
          pill={
            <StatusPill
              active={flatShippingSettings.flatShippingEnabled}
              activeLabel={t("promotionSettings.pillActive")}
              inactiveLabel={t("promotionSettings.pillInactive")}
            />
          }
          switchChecked={flatShippingSettings.flatShippingEnabled}
          onSwitchChange={(checked) => updateFlat({ flatShippingEnabled: checked })}
          switchLabel={t("promotionSettings.flatShippingEnabledLabel")}
        >
          <fieldset
            disabled={!flatShippingSettings.flatShippingEnabled}
            className={cn("grid gap-4 lg:grid-cols-[minmax(0,264px)_minmax(0,1fr)]")}
          >
            <div className="space-y-2">
              <Label htmlFor="flatShippingFee" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                {t("promotionSettings.flatShippingFee")}
              </Label>
              <div className="relative">
                <Input
                  id="flatShippingFee"
                  type="number"
                  min={0}
                  max={MAX_FEE}
                  inputMode="numeric"
                  value={flatShippingSettings.flatShippingFee}
                  onChange={(event) => {
                    const next = getNumericValue(event.target.value);
                    setFeeError(next > MAX_FEE);
                    updateFlat({ flatShippingFee: next });
                  }}
                  onBlur={() => {
                    if (flatShippingSettings.flatShippingFee > MAX_FEE) {
                      setFeeError(false);
                      updateFlat({ flatShippingFee: MAX_FEE });
                    }
                  }}
                  aria-invalid={feeError}
                  aria-describedby="flatShippingFeeHint flatShippingFeeError"
                  className={cn(
                    "h-11 rounded-xl bg-white/90 font-semibold tabular-nums ltr:pr-14 rtl:pl-14 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100",
                    !flatShippingSettings.flatShippingEnabled && lockedFieldsClass,
                    feeError && "border-rose-300 focus-visible:ring-rose-200",
                  )}
                />
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 ltr:right-3 rtl:left-3 dark:bg-slate-800 dark:text-slate-300">
                  {t("promotionSettings.currency")}
                </span>
              </div>
              <p id="flatShippingFeeHint" className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("promotionSettings.flatShippingFeeDesc")}
              </p>
              {feeError ? (
                <p id="flatShippingFeeError" className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  {t("promotionSettings.feeMaxError")}
                </p>
              ) : null}
            </div>

            <details className="group rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-950 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-4 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" />
                {t("promotionSettings.flatShippingWhenToUse")}
              </summary>
              <ul className="mt-2 space-y-1.5">
                <li className="flex gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  <Check className="mt-1 size-4 shrink-0 text-sky-700 dark:text-sky-400" />
                  {t("promotionSettings.flatShippingUseCase1")}
                </li>
                <li className="flex gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  <Check className="mt-1 size-4 shrink-0 text-sky-700 dark:text-sky-400" />
                  {t("promotionSettings.flatShippingUseCase2")}
                </li>
              </ul>
            </details>
          </fieldset>
        </PromoSection>

        {/* إعادة التعيين */}
        <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-white/80 p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/70">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-500/30">
            <RotateCcw className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
              {t("promotionSettings.resetTitle")}
            </p>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t("promotionSettings.resetDesc")}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/50",
              )}
            >
              <RotateCcw className="size-4" />
              {t("promotionSettings.resetAction")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("promotionSettings.resetModalTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("promotionSettings.resetModalBody")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("promotionSettings.resetModalCancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleReset()}
                  className="bg-rose-700 text-white hover:bg-rose-800"
                >
                  {t("promotionSettings.resetModalConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SettingsPageShell>

    {/* مؤشر حفظ عائم: بيبان أينما كان المستخدم في الصفحة وقت الحفظ */}
    {saveState !== "idle" ? (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-bold shadow-lg transition-colors",
          saveState === "saving"
            ? "border-amber-200 bg-amber-50/95 text-amber-800"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-800",
        )}
      >
        <span className="flex items-center gap-2">
          {saveState === "saving" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {saveState === "saving"
            ? t("promotionSettings.saveSaving")
            : t("promotionSettings.saveSaved")}
        </span>
      </div>
    ) : null}
    </>
  );
};

export default PromotionSettings;
