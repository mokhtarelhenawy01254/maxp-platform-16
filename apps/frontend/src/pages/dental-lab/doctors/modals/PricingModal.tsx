import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BadgePercent, Loader2, X as XMarkIcon } from "lucide-react";
import {
  type DentalLabDoctor,
  type DentalWorkType,
  fetchWorkTypes,
  fetchDoctorPricing,
  saveDoctorPricing,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  fmtMoney,
} from "../../shared";

interface PricingModalProps {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onSaved: () => void;
}

export function PricingModal({ doctor, onClose, onSaved }: PricingModalProps) {
  const { t } = useTranslation();
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [wts, existing] = await Promise.all([
          fetchWorkTypes(),
          fetchDoctorPricing(doctor.id).catch(() => ({})),
        ]);
        setWorkTypes(wts.filter((w) => w.isActive));
        const map: Record<string, string> = {};
        for (const w of wts) {
          map[w.id] = existing[w.id] != null ? String(existing[w.id]) : "";
        }
        setPrices(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
      } finally {
        setLoading(false);
      }
    })();
  }, [doctor.id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const clean: Record<string, number> = {};
      for (const [id, v] of Object.entries(prices)) {
        if (v.trim() !== "") clean[id] = Number(v);
      }
      await saveDoctorPricing(doctor.id, clean);
      toast.success(t("dentalLab.doctors.pricing.saved"));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm font-mono tabular-nums`;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3"
      onClick={() => !saving && onClose()}
    >
      <div className={MODAL_CONTENT_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">
            {t("dentalLab.doctors.pricing.title")}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {doctor.name} — {t("dentalLab.doctors.pricing.hint")}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {workTypes.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 border dark:border-gray-700 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-gray-400 font-mono tabular-nums">
                    {t("dentalLab.doctors.pricing.defaultPrice")}: {fmtMoney(w.price)}
                  </p>
                </div>
                <input
                  className={`${inputCls} w-28`}
                  type="number"
                  placeholder={t("dentalLab.doctors.pricing.emptyDefault")}
                  value={prices[w.id] ?? ""}
                  onChange={(e) =>
                    setPrices((prev) => ({ ...prev, [w.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BadgePercent className="w-4 h-4" />
            )}
            {saving
              ? t("dentalLab.common.saving")
              : t("dentalLab.doctors.pricing.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PricingModal;
