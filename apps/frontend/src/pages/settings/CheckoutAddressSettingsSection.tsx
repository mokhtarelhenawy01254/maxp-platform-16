import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  MapPinIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { tToast } from "../../utils/i18n-toast";

export interface CheckoutAddressSettings {
  mode?: "hybrid" | "ai_parse" | "dropdown";
  aiEnabled?: boolean;
  model?: string;
  confidenceThreshold?: number;
  showConfirmationToCustomer?: boolean;
  cacheResults?: boolean;
  logRawAddress?: boolean;
  merchantCombobox?: boolean;
}

const DEFAULT_SETTINGS: CheckoutAddressSettings = {
  mode: "hybrid",
  aiEnabled: true,
  model: "gemini-2.5-flash",
  confidenceThreshold: 0.7,
  showConfirmationToCustomer: true,
  cacheResults: true,
  logRawAddress: true,
  merchantCombobox: true,
};

const parseSettings = (
  raw: unknown,
): CheckoutAddressSettings => {
  if (raw && typeof raw === "object") {
    return { ...DEFAULT_SETTINGS, ...(raw as Record<string, unknown>) };
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪Ñ╪»╪«╪º┘ä ╪º┘ä╪╣┘å┘ê╪º┘å ┘ü┘è ╪º┘ä╪┤┘è┘â ╪ú┘ê╪¬ (╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ + ╪º┘ä┘à┘å╪╖┘é╪⌐).
 * ╪¬╪¬╪¡┘â┘à ┘ü┘è ╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¬╪╣╪▒┘ü ╪╣┘ä┘ë ╪º┘ä┘à┘å╪╖┘é╪⌐: ┘å╪╡ ╪¡╪▒ + AI ┘è┘é╪¬╪▒╪¡╪î ╪ú┘ê ┘é┘ê╪º╪ª┘à ┘à┘å╪│╪»┘ä╪⌐.
 */
const CheckoutAddressSettingsSection: React.FC<{
  settings: { checkoutAddressSettings?: unknown };
  onChange: (settings: { checkoutAddressSettings?: CheckoutAddressSettings }) => void;
}> = ({ settings, onChange }) => {
  const [form, setForm] = useState<CheckoutAddressSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setForm(parseSettings(settings.checkoutAddressSettings));
    setLoaded(true);
  }, [settings.checkoutAddressSettings]);

  const update = useCallback(
    (patch: Partial<CheckoutAddressSettings>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch };
        return next;
      });
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result =
        await storefrontSettingsService.updateSettings({
          checkoutAddressSettings: form,
        });
      if (result?.data) {
        onChange({ checkoutAddressSettings: form });
      }
      tToast.success("StoreSettings.success_save_ccce");
    } catch (error) {
      console.error("[CheckoutAddressSettings] Save failed:", error);
      toast.error(
        "╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪º┘ä╪¡┘ü╪╕: " +
          ((error as { message?: string })?.message || "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_SETTINGS });
    void (async () => {
      try {
        const result =
          await storefrontSettingsService.updateSettings({
            checkoutAddressSettings: { ...DEFAULT_SETTINGS },
          });
        if (result?.data) {
          onChange({ checkoutAddressSettings: { ...DEFAULT_SETTINGS } });
        }
        tToast.success("StoreSettings.msg_126b");
      } catch (error) {
        toast.error("╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪º┘ä╪º╪│╪¬╪╣╪º╪»╪⌐: " + ((error as { message?: string })?.message || ""));
      }
    })();
  };

  if (!loaded) {
    return (
      <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const selectClassName =
    "w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const toggleRow = (
    key: keyof CheckoutAddressSettings,
    label: string,
    desc: string,
    disabled = false,
  ) => (
    <label
      className={`flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {desc}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(form[key])}
        disabled={disabled}
        onClick={() => update({ [key]: !form[key] } as Partial<CheckoutAddressSettings>)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          form[key] ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            form[key] ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
            <MapPinIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪╣┘å┘ê╪º┘å (╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ╪╖╪▒┘è┘é╪⌐ ╪Ñ╪»╪«╪º┘ä ╪╣┘å┘ê╪º┘å ╪º┘ä╪╣┘à┘è┘ä ┘ü┘è ╪╡┘ü╪¡╪⌐ ╪º┘ä╪┤┘è┘â ╪ú┘ê╪¬ ┘ê╪º┘ä╪¬╪╣╪▒┘ü ╪╣┘ä┘ë ┘à┘å╪╖┘é╪¬┘ç ╪╣┘ä┘ë
              ╪«╪▒┘è╪╖╪⌐ ╪┤╪▒┘â╪⌐ ╪º┘ä╪┤╪¡┘å.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ╪╖╪▒┘è┘é╪⌐ ╪Ñ╪»╪«╪º┘ä ╪º┘ä╪╣┘å┘ê╪º┘å
          </label>
          <select
            value={form.mode}
            onChange={(e) =>
              update({
                mode: e.target.value as CheckoutAddressSettings["mode"],
              })
            }
            className={selectClassName}
          >
            <option value="hybrid">Hybrid ΓÇö ┘å╪╡ ╪¡╪▒ + AI ┘è┘é╪¬╪▒╪¡ (┘à┘Å┘ê╪╡┘ë ╪¿┘ç)</option>
            <option value="ai_parse">AI ┘â╪º┘à┘ä ╪¿╪»┘ê┘å ╪¬╪ú┘â┘è╪»</option>
            <option value="dropdown">┘é┘ê╪º╪ª┘à ┘à┘å╪│╪»┘ä╪⌐ (╪º┘ä╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hybrid: ╪º┘ä╪╣┘à┘è┘ä ┘è┘â╪¬╪¿ ╪º┘ä╪╣┘å┘ê╪º┘å╪î ┘ê╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘è╪¡╪»╪» ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐
            ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ê┘è╪╣╪▒╪╢┘ç╪º ┘ä┘ä╪¬╪ú┘â┘è╪». Dropdown: ╪º┘ä┘é┘ê╪º╪ª┘à ╪º┘ä╪¬┘é┘ä┘è╪»┘è╪⌐.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 px-4 divide-y divide-gray-100 dark:divide-gray-800">
          {toggleRow(
            "aiEnabled",
            "╪¬┘ü╪╣┘è┘ä ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘ä┘ä╪¬╪╣╪▒┘ü ╪╣┘ä┘ë ╪º┘ä╪╣┘å┘ê╪º┘å",
            "╪º╪│╪¬╪«╪»╪º┘à AI ┘ä╪¬╪¡╪»┘è╪» ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐ ┘à┘å ╪º┘ä╪╣┘å┘ê╪º┘å ╪º┘ä┘à┘â╪¬┘ê╪¿",
          )}
          {toggleRow(
            "showConfirmationToCustomer",
            "╪Ñ╪╕┘ç╪º╪▒ ╪º┘ä┘å╪¬┘è╪¼╪⌐ ┘ä┘ä╪╣┘à┘è┘ä ┘ä┘ä╪¬╪ú┘â┘è╪»",
            "╪╣╪▒╪╢ ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐ ╪º┘ä┘à╪¬╪╣╪▒┘ü ╪╣┘ä┘è┘ç╪º ┘ä┘è╪╣╪¬┘à╪»┘ç╪º ╪º┘ä╪╣┘à┘è┘ä",
            !form.aiEnabled,
          )}
          {toggleRow(
            "merchantCombobox",
            "╪¿╪¡╪½ ╪░┘â┘è ┘ü┘è ┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à",
            "╪¬┘ü╪╣┘è┘ä ╪º┘ä╪¿╪¡╪½ ╪º┘ä┘å╪╡┘è ╪╣┘å ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐ ┘ü┘è ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘è╪»┘ê┘è",
          )}
          {toggleRow(
            "cacheResults",
            "╪¬╪«╪▓┘è┘å ┘å╪¬╪º╪ª╪¼ ╪º┘ä╪¬╪╣╪▒┘ü ┘à╪ñ┘é╪¬╪º┘ï",
            "╪Ñ╪╣╪º╪»╪⌐ ╪º╪│╪¬╪«╪»╪º┘à ┘å╪¬╪º╪ª╪¼ ┘å┘ü╪│ ╪º┘ä╪╣┘å┘ê╪º┘å ╪¿╪»┘ä╪º┘ï ┘à┘å ╪º╪│╪¬╪»╪╣╪º╪í ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘â┘ä ┘à╪▒╪⌐",
            !form.aiEnabled,
          )}
          {toggleRow(
            "logRawAddress",
            "╪¬╪│╪¼┘è┘ä ╪º┘ä╪╣┘å┘ê╪º┘å ╪º┘ä╪«╪º┘à",
            "╪¡┘ü╪╕ ┘å╪╡ ╪º┘ä╪╣┘å┘ê╪º┘å ┘â┘à╪º ┘â╪¬╪¿┘ç ╪º┘ä╪╣┘à┘è┘ä ┘ü┘è ╪│╪¼┘ä ╪º┘ä╪¬╪¡┘ä┘è┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐",
          )}
        </div>

        {form.aiEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ╪º┘ä┘å┘à┘ê╪░╪¼ ╪º┘ä┘à╪│╪¬╪«╪»┘à
              </label>
              <select
                value={form.model}
                onChange={(e) => update({ model: e.target.value })}
                className={selectClassName}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (╪│╪▒┘è╪╣)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (╪»┘é┘è┘é)</option>
                <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ┘å╪│╪¿╪⌐ ╪º┘ä╪½┘é╪⌐ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ ({Math.round((form.confidenceThreshold || 0.7) * 100)}%)
              </label>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={Math.round((form.confidenceThreshold || 0.7) * 100)}
                onChange={(e) =>
                  update({ confidenceThreshold: Number(e.target.value) / 100 })
                }
                className="w-full mt-2 accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>50%</span>
                <span>95%</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ╪º╪│╪¬╪╣╪º╪»╪⌐ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è
          </button>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
          <SparklesIcon className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
          <span>
            ╪╣┘å╪» ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è╪î ┘è┘Å╪¡┘ü╪╕ ╪º┘ä╪╣┘å┘ê╪º┘å ┘â┘à╪º ┘â╪¬╪¿┘ç ╪º┘ä╪╣┘à┘è┘ä ┘ê┘è╪¡┘ê┘ä┘ç
            ╪º┘ä┘å╪╕╪º┘à ╪Ñ┘ä┘ë ┘à╪¡╪º┘ü╪╕╪⌐ + ┘à┘å╪╖┘é╪⌐ ╪╣┘ä┘ë ╪«╪▒┘è╪╖╪⌐ ╪┤╪▒┘â╪⌐ ╪º┘ä╪┤╪¡┘å. ╪Ñ╪░╪º ┘ä┘à ┘è╪¬┘à┘â┘å ┘à┘å
            ╪¬╪¡╪»┘è╪» ╪º┘ä┘à┘å╪╖┘é╪⌐ ╪¿╪»┘é╪⌐╪î ┘è╪▒╪│┘ä ╪│╪ñ╪º┘ä╪º┘ï ┘ä┘ä╪╣┘à┘è┘ä ╪╣╪¿╪▒ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¬╪ú┘â┘è╪».
          </span>
        </div>
      </div>
    </div>
  );
};

export { CheckoutAddressSettingsSection };
