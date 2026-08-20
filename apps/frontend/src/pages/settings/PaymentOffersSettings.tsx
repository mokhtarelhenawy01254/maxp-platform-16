import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDirection } from "../../i18n";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { Switch } from "../../components/ui/switch";

const CARD_CLS =
  "bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 shadow-sm";
const LABEL_CLS =
  "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5";
const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";
const PRIMARY_BTN_CLS =
  "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-600/20";

type WalletDiscountState = {
  discountEnabled: boolean;
  discountPercent: number;
  showDiscountBadge: boolean;
};

type WalletPaymentSettingsShape = {
  enabled?: boolean;
  walletNumber?: string;
  recipientName?: string;
  instructions?: string;
  discountEnabled?: boolean;
  discountPercent?: number;
  showDiscountBadge?: boolean;
};

const parseWalletSettings = (raw: unknown): WalletPaymentSettingsShape => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as WalletPaymentSettingsShape;
    } catch {
      return {};
    }
  }
  return raw as WalletPaymentSettingsShape;
};

const PaymentOffersSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WalletDiscountState>({
    discountEnabled: false,
    discountPercent: 0,
    showDiscountBadge: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await storefrontSettingsService.getSettings();
        const parsed = parseWalletSettings(
          (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
        );
        if (!active) return;
        setForm({
          discountEnabled: parsed?.discountEnabled === true,
          discountPercent: Number(parsed?.discountPercent || 0),
          showDiscountBadge: parsed?.showDiscountBadge !== false,
        });
      } catch {
        toast.error("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪▒┘ê╪╢ ╪º┘ä╪»┘ü╪╣");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = (key: keyof WalletDiscountState, value: boolean | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await storefrontSettingsService.getSettings();
      const existing = parseWalletSettings(
        (data as { walletPaymentSettings?: unknown })?.walletPaymentSettings,
      );
      const result = await storefrontSettingsService.updateSettings({
        walletPaymentSettings: {
          ...existing,
          discountEnabled: form.discountEnabled,
          discountPercent: form.discountPercent,
          showDiscountBadge: form.showDiscountBadge,
        },
      } as Parameters<typeof storefrontSettingsService.updateSettings>[0]);
      if (result?.data) {
        toast.success("╪¬┘à ╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪▒┘ê╪╢ ╪º┘ä╪»┘ü╪╣ ╪¿┘å╪¼╪º╪¡");
      }
    } catch (error) {
      toast.error("╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪º┘ä╪¡┘ü╪╕: " + ((error as { message?: string })?.message || "╪«╪╖╪ú ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="╪▒╪¼┘ê╪╣"
          >
            <ArrowLeftIcon className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              ╪╣╪▒┘ê╪╢ ╪º┘ä╪»┘ü╪╣
            </h2>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              ╪«╪╡┘ê┘à╪º╪¬ ╪¬┘Å╪╖╪¿┘æ┘é ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘ä┘ë ╪º┘ä╪»┘ü╪╣ ╪¿╪º┘ä╪¿╪╖╪º┘é╪⌐ ╪ú┘ê ╪¿╪º┘ä┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐ ┘ü┘è ┘à╪¬╪¼╪▒┘â ╪¿╪º┘ä┘â╪º┘à┘ä.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={CARD_CLS}>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪¼╪º╪▒┘ì ╪¬╪¡┘à┘è┘ä ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪▒┘ê╪╢ ╪º┘ä╪»┘ü╪╣...</p>
        </div>
      ) : (
        <div className={CARD_CLS}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ╪«╪╡┘à ╪º┘ä╪»┘ü╪╣ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ≡ƒÄü
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  ┘ä┘ê ╪º┘ä╪╣┘à┘è┘ä ╪»┘ü╪╣ ╪¿╪º┘ä╪¿╪╖╪º┘é╪⌐ ╪ú┘ê ╪¿╪º┘ä┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐╪î ┘è╪¡╪╡┘ä ╪╣┘ä┘ë ╪«╪╡┘à ╪╣┘ä┘ë ┘é┘è┘à╪⌐ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬. ┘ü╪╣┘æ┘ä ╪º┘ä╪«╪╡┘à ┘ê╪¡╪»╪» ┘å╪│╪¿╪¬┘ç ╪¿╪º┘ä╪ú╪│┘ü┘ä.
                </p>
              </div>
              <Switch
                checked={form.discountEnabled}
                onCheckedChange={(checked) => update("discountEnabled", checked)}
              />
            </div>

            {form.discountEnabled ? (
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>
                    ┘å╪│╪¿╪⌐ ╪º┘ä╪«╪╡┘à (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.discountPercent || ""}
                    onChange={(e) =>
                      update(
                        "discountPercent",
                        Math.min(100, Math.max(0, Number(e.target.value))),
                      )
                    }
                    className={INPUT_CLS}
                    dir="ltr"
                    placeholder="┘à╪½╪º┘ä: 10"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ┘è┘Å╪¡╪│╪¿ ╪º┘ä╪«╪╡┘à ╪╣┘ä┘ë ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ (┘é╪¿┘ä ╪º┘ä╪┤╪¡┘å). ┘à╪½╪º┘ä: ┘ä┘ê ┘â╪¬╪¿╪¬ 10╪î ╪º┘ä╪╣┘à┘è┘ä ┘è╪¡╪╡┘ä ╪╣┘ä┘ë ╪«╪╡┘à 10%.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3.5 py-3 dark:bg-gray-900">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ╪Ñ╪╕┘ç╪º╪▒ ╪º┘ä╪«╪╡┘à ┘ä┘ä╪╣┘à┘è┘ä
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      ┘è╪╕┘ç╪▒ ╪¿╪¼╪º┘å╪¿ ╪╖╪▒┘é ╪º┘ä╪»┘ü╪╣ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐ ┘ê┘ü┘è ┘à┘ä╪«╪╡ ╪º┘ä╪┤┘è┘â ╪ú┘ê╪¬.
                    </p>
                  </div>
                  <Switch
                    checked={form.showDiscountBadge}
                    onCheckedChange={(checked) => update("showDiscountBadge", checked)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={PRIMARY_BTN_CLS}
            >
              {saving ? "╪¼╪º╪▒┘ì ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪▒┘ê╪╢ ╪º┘ä╪»┘ü╪╣"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOffersSettings;
