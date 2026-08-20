import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { Loader2, Zap, CheckCircle, Settings2 } from "lucide-react";

interface AutoDiscountSettingsProps {
  onSaved?: (data?: any) => void;
  activeSystem?: string | null;
  activated?: boolean;
}

/**
 * ╪Ñ╪╣╪»╪º╪»╪º╪¬ ┘å╪╕╪º┘à "╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è":
 * ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à % ╪╣┘ä┘ë ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä╪¼╪º┘è╪î ╪╡┘ä╪º╪¡┘è╪¬┘ç ╪ú┘è╪º┘à╪î ┘ê┘è╪¬╪¡┘ê┘ä ┘ä┘â╪º╪┤ ╪¿╪º┘â ╪╣┘å╪» ╪º┘ä╪º┘å╪¬┘ç╪º╪í.
 * ≡ƒåò ╪º┘ä╪¬┘ü╪╣┘è┘ä ┘à╪│╪¬┘é┘ä ╪╣┘å ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ (┘à┘à┘â┘å ╪º┘ä╪º╪¬┘å┘è┘å ┘è╪┤╪¬╪║┘ä┘ê╪º ┘à╪╣ ╪¿╪╣╪╢).
 */
const AutoDiscountSettings: React.FC<AutoDiscountSettingsProps> = ({ onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [comboSaving, setComboSaving] = useState(false);
  const [comboMsg, setComboMsg] = useState("");
  const [comboErr, setComboErr] = useState("");
  const [cfg, setCfg] = useState({
    autoDiscountEnabled: false,
    enabled: true,
    discountPercent: 10,
    validityDays: 3,
    convertExpiredToCashback: true,
    redeemPointsEnabled: true,
    discountCombination: 'ADDITIVE',
    maxTotalDiscountPercent: 20,
    loyaltyActivatedAt: undefined as string | undefined,
  });

  const load = async () => {
    try {
      const res = await apiClient.get("/hr/customer-loyalty/loyalty-config");
      const d = res.data?.data || {};
      const ad = d.autoDiscount || {};
      setCfg((prev) => ({
        ...prev,
        autoDiscountEnabled: ad.enabled === true,
        discountPercent: ad.discountPercent ?? prev.discountPercent,
        validityDays: ad.validityDays ?? prev.validityDays,
        convertExpiredToCashback: ad.convertExpiredToCashback !== false,
        redeemPointsEnabled: ad.redeemPointsEnabled !== false,
        discountCombination: ad.discountCombination || prev.discountCombination,
        maxTotalDiscountPercent:
          ad.maxTotalDiscountPercent !== undefined && ad.maxTotalDiscountPercent !== null
            ? Number(ad.maxTotalDiscountPercent)
            : prev.maxTotalDiscountPercent,
        enabled: true,
      }));
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveActivation = async (enabled: boolean) => {
    if (!enabled && !window.confirm("┘ç┘ä ╪¬╪▒┘è╪» ╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è╪ƒ")) return;
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    try {
      const res = await apiClient.put("/hr/customer-loyalty/loyalty-config", {
        autoDiscountEnabled: enabled,
        enabled: true,
        discountPercent: cfg.discountPercent,
        validityDays: cfg.validityDays,
        convertExpiredToCashback: cfg.convertExpiredToCashback,
        redeemPointsEnabled: cfg.redeemPointsEnabled,
        discountCombination: cfg.discountCombination,
        maxTotalDiscountPercent: cfg.maxTotalDiscountPercent,
      });
      const ad = (res.data?.data || {}).autoDiscount || {};
      setCfg((prev) => ({
        ...prev,
        autoDiscountEnabled: ad.enabled === true,
        discountPercent: ad.discountPercent ?? prev.discountPercent,
        validityDays: ad.validityDays ?? prev.validityDays,
        convertExpiredToCashback: ad.convertExpiredToCashback !== false,
        redeemPointsEnabled: ad.redeemPointsEnabled !== false,
        discountCombination: ad.discountCombination || prev.discountCombination,
        maxTotalDiscountPercent:
          ad.maxTotalDiscountPercent !== undefined ? Number(ad.maxTotalDiscountPercent) : prev.maxTotalDiscountPercent,
      }));
      setSavedMsg(enabled ? "╪¬┘à ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è Γ£ô" : "╪¬┘à ╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è Γ£ô");
      onSaved?.(res.data?.data);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || (enabled ? "┘ü╪┤┘ä ╪º┘ä╪¬┘ü╪╣┘è┘ä" : "┘ü╪┤┘ä ╪Ñ┘è┘é╪º┘ü ╪º┘ä╪¬┘ü╪╣┘è┘ä"));
    } finally {
      setSaving(false);
    }
  };

  const saveCombo = async () => {
    setComboSaving(true);
    setComboMsg("");
    setComboErr("");
    try {
      const res = await apiClient.put("/hr/customer-loyalty/loyalty-config", {
        autoDiscountEnabled: cfg.autoDiscountEnabled,
        enabled: true,
        discountPercent: cfg.discountPercent,
        validityDays: cfg.validityDays,
        convertExpiredToCashback: cfg.convertExpiredToCashback,
        redeemPointsEnabled: cfg.redeemPointsEnabled,
        discountCombination: cfg.discountCombination,
        maxTotalDiscountPercent: cfg.maxTotalDiscountPercent,
      });
      const ad = (res.data?.data || {}).autoDiscount || {};
      setCfg((prev) => ({
        ...prev,
        discountCombination: ad.discountCombination || prev.discountCombination,
        maxTotalDiscountPercent:
          ad.maxTotalDiscountPercent !== undefined ? Number(ad.maxTotalDiscountPercent) : prev.maxTotalDiscountPercent,
      }));
      setComboMsg("╪¬┘à ╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪»┘à╪¼ Γ£ô");
      onSaved?.(res.data?.data);
    } catch (e: any) {
      setComboErr(e?.response?.data?.error || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪»┘à╪¼");
    } finally {
      setComboSaving(false);
    }
  };

  const set = (k: string, v: any) => setCfg((prev) => ({ ...prev, [k]: v }));

  const inputCls =
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

  const isActivated = cfg.autoDiscountEnabled === true;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ╪¿╪╣╪» ┘â┘ä ╪ú┘ê╪▒╪»╪▒ ┘à╪│┘ä┘æ┘à ╪º┘ä╪╣┘à┘è┘ä ╪¿┘è╪º╪«╪» ╪«╪╡┘à % ╪╣┘ä┘ë ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä╪¼╪º┘è╪î ┘ê┘ä┘ê ╪«┘ä╪╡╪¬ ╪º┘ä┘à╪»╪⌐ ┘à┘å ╪║┘è╪▒ ╪º╪│╪¬╪«╪»╪º┘à ╪¿┘è╪¬╪¡┘ê┘ä ┘â╪º╪┤ ╪¿╪º┘â ┘ü┘è ┘à╪¡┘ü╪╕╪¬┘ç.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isActivated} onChange={(e) => saveActivation(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">┘å╪│╪¿╪⌐ ╪º┘ä╪«╪╡┘à %</label>
                <input type="number" min="0" max="100" value={cfg.discountPercent} onChange={(e) => set("discountPercent", Number(e.target.value))} className={inputCls + " mt-1"} />
              </div>
              <div>
                <label className="text-xs text-gray-500">┘à╪»╪⌐ ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐ (╪ú┘è╪º┘à)</label>
                <input type="number" min="1" value={cfg.validityDays} onChange={(e) => set("validityDays", Number(e.target.value))} className={inputCls + " mt-1"} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">╪¬╪º╪▒┘è╪« ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à</label>
                <input
                  type="date"
                  value={cfg.loyaltyActivatedAt ? cfg.loyaltyActivatedAt.slice(0, 10) : ""}
                  onChange={(e) => set("loyaltyActivatedAt", e.target.value ? new Date(e.target.value + "T00:00:00").toISOString() : null)}
                  className={inputCls + " mt-1"}
                />
                <p className="text-[10px] text-gray-400 mt-1">╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘ä┘è ╪º╪¬╪│┘ä┘à╪¬ ┘é╪¿┘ä ╪º┘ä╪¬╪º╪▒┘è╪« ╪»┘ç ┘à╪┤ ╪¿╪¬╪º╪«╪» ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à ┘ê╪¿╪¬╪¬┘ê╪╡┘ü "┘é╪¿┘ä ╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à".</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={Boolean(cfg.convertExpiredToCashback)} onChange={(e) => set("convertExpiredToCashback", e.target.checked)} className="h-4 w-4 accent-amber-500 mt-0.5" />
                <span>
                  ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘à┘å╪¬┘ç┘è ┘ä┘â╪º╪┤ ╪¿╪º┘â
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘ä┘è ╪«┘ä╪╡╪¬ ┘à╪»╪¬┘ç ┘à┘å ╪║┘è╪▒ ╪º╪│╪¬╪«╪»╪º┘à ╪¿┘è╪¬╪¡┘ê┘æ┘ä ┘ä╪▒╪╡┘è╪» ┘â╪º╪┤ ╪¿╪º┘â ┘ü┘è ┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪╣┘à┘è┘ä.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={Boolean(cfg.redeemPointsEnabled)} onChange={(e) => set("redeemPointsEnabled", e.target.checked)} className="h-4 w-4 accent-amber-500 mt-0.5" />
                <span>
                  ╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘å┘é╪º╪╖ ╪¿╪º┘ä╪«╪╡┘à
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">╪º┘ä╪╣┘à┘è┘ä ┘è┘é╪»╪▒ ┘è╪│╪¬╪¿╪»┘ä ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘ä┘è ╪¼┘à╪╣┘ç╪º ╪¿╪«╪╡┘à ╪╣┘ä┘ë ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä╪¼╪º┘è.</span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
              {savedMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{savedMsg}</span>}
              {errorMsg && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{errorMsg}</span>}
              <button
                onClick={() => saveActivation(!isActivated)}
                disabled={saving}
                title={isActivated ? "╪º╪╢╪║╪╖ ┘ä╪Ñ┘è┘é╪º┘ü ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è" : "╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è"}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActivated
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60"
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isActivated ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {isActivated ? "╪¬┘à ╪º┘ä╪¬┘ü╪╣┘è┘ä" : "╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à"}
              </button>
            </div>
            {isActivated && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">
                ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à┘ü╪╣┘æ┘ä ΓÇö ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪¿╪¬╪¬╪¡┘ü╪╕ ╪ú┘ê╪¬┘ê┘à╪º╪¬┘è┘â┘è╪º┘ï ╪╣┘å╪» ╪ú┘è ╪¬╪╣╪»┘è┘ä╪î ┘ê╪¿╪º╪»╪¼ "╪«╪╡┘à ┘à╪¬╪º╪¡" ╪¿┘è╪╕┘ç╪▒ ┘ä┘ä╪╣┘à┘ä╪º╪í.
              </p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">┘à┘ä╪º╪¡╪╕╪⌐:</p>
            <p>┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à╪│╪¬┘é┘ä ΓÇö ┘à┘à┘â┘å ┘è╪┤╪¬╪║┘ä ┘à╪╣ ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘ü┘è ┘å┘ü╪│ ╪º┘ä┘ê┘é╪¬. ┘à┘å ┘é╪│┘à "╪»┘à╪¼ ╪º┘ä╪«╪╡┘à" ╪¬╪¡╪¬ ┘è┘à┘â┘å┘â ╪¬╪¡╪»┘è╪» ╪Ñ╪▓╪º┘è ╪º┘ä╪º╪¬┘å┘è┘å ┘è╪¬╪╖╪¿┘æ┘é┘ê╪º ┘à╪╣ ╪¿╪╣╪╢ (╪¼┘à╪╣ / ╪ú╪╣┘ä┘ë ╪«╪╡┘à / ┘à╪▒┘â┘æ╪¿) ┘ê╪¬╪¡╪╖ ╪¡╪» ╪ú┘é╪╡┘ë ┘ä╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪«╪╡┘à.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4 border-t-2 border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-indigo-500" />
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">╪»┘à╪¼ ╪º┘ä╪«╪╡┘à (╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ + ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è)</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ┘ä┘ê ╪º┘ä╪º╪¬┘å┘è┘å ┘à┘ü╪╣┘æ┘ä┘è┘å ┘à╪╣ ╪¿╪╣╪╢╪î ╪º╪«╪¬╪▒ ╪Ñ╪▓╪º┘è ┘è╪¬╪╖╪¿┘æ┘é┘ê╪º ╪╣┘ä┘ë ╪º┘ä╪ú┘ê╪▒╪»╪▒╪î ┘ê╪¡╪╖ ╪¡╪» ╪ú┘é╪╡┘ë ┘ä╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪«╪╡┘à ╪╣╪┤╪º┘å ╪¬╪¡┘à┘è ┘ç╪º┘à╪┤ ╪º┘ä╪▒╪¿╪¡.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">┘ê╪╢╪╣ ╪»┘à╪¼ ╪º┘ä╪«╪╡┘à</label>
                <select
                  value={cfg.discountCombination}
                  onChange={(e) => set("discountCombination", e.target.value)}
                  className={inputCls + " mt-1"}
                >
                  <option value="ADDITIVE">╪¼┘à╪╣ ╪º┘ä┘å╪│╪¿ (╪º┘ä╪º╪¬┘å┘è┘å ┘à╪╣ ╪¿╪╣╪╢)</option>
                  <option value="BEST">╪ú╪╣┘ä┘ë ╪«╪╡┘à ╪¿╪│</option>
                  <option value="COMPOUND">┘à╪▒┘â┘æ╪¿ (╪«╪╡┘à ╪╣┘ä┘ë ╪º┘ä┘à╪¬╪¿┘é┘è)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">╪¡╪» ╪ú┘é╪╡┘ë ┘ä╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪«╪╡┘à % (0 = ╪¿╪»┘ê┘å ╪¡╪»)</label>
                <input
                  type="number" min="0" max="100"
                  value={cfg.maxTotalDiscountPercent}
                  onChange={(e) => set("maxTotalDiscountPercent", Number(e.target.value))}
                  className={inputCls + " mt-1"}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {comboMsg && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{comboMsg}</span>}
              {comboErr && <span className="text-sm text-red-600 dark:text-red-400 font-medium">{comboErr}</span>}
              <button
                onClick={saveCombo}
                disabled={comboSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {comboSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                ╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪»┘à╪¼
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AutoDiscountSettings;
