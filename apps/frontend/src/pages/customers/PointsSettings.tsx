import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Save,
  Coins,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface PointsSettingsData {
  pointsPerAmount: number;
  pointsPerPurchase: number;
  pointsPerReferral: number;
  redemptionRate: number;
  minimumPoints: number;
  maxPointsPerTransaction: number;
  expiryMonths: number;
}

const DEFAULT_POINTS_SETTINGS: PointsSettingsData = {
  pointsPerAmount: 1,
  pointsPerPurchase: 1,
  pointsPerReferral: 10,
  redemptionRate: 100,
  minimumPoints: 100,
  maxPointsPerTransaction: 0,
  expiryMonths: 12,
};

const PointsSettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PointsSettingsData>(DEFAULT_POINTS_SETTINGS);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/hr/customer-loyalty/points/settings");
      const data: Partial<PointsSettingsData> = res?.data?.data || {};
      setSettings({ ...DEFAULT_POINTS_SETTINGS, ...data });
    } catch (error) {
      console.error("Error fetching points settings:", error);
      toast.error("╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¼┘ä╪¿ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘å┘é╪º╪╖");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    const numericFields: (keyof PointsSettingsData)[] = [
      "pointsPerAmount",
      "pointsPerPurchase",
      "pointsPerReferral",
      "redemptionRate",
      "minimumPoints",
      "maxPointsPerTransaction",
      "expiryMonths",
    ];

    for (const field of numericFields) {
      if (!Number.isFinite(settings[field]) || settings[field] < 0) {
        toast.error("┘à┘å ┘ü╪╢┘ä┘â ╪ú╪»╪«┘ä ┘é┘è┘à╪º┘ï ╪╡╪¡┘è╪¡╪⌐ (╪ú╪▒┘é╪º┘à ┘à┘ê╪¼╪¿╪⌐) ┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘å┘é╪º╪╖");
        return;
      }
    }

    try {
      setIsSaving(true);
      await apiClient.put("/hr/customer-loyalty/points/settings", settings);
      toast.success("╪¬┘à ╪¬╪¡╪»┘è╪½ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘å┘é╪º╪╖ ┘ü┘è ╪¼┘à┘è╪╣ ╪ú┘å╪╕┘à╪⌐ ╪º┘ä┘ê┘ä╪º╪í ╪¿┘å╪¼╪º╪¡");
    } catch (error: any) {
      console.error("Error saving points settings:", error);
      toast.error(error?.response?.data?.error || "╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¡┘ü╪╕ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘å┘é╪º╪╖");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof PointsSettingsData, value: number) => {
    setSettings({ ...settings, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const inputCls =
    "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘å┘é╪º╪╖
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪º┘à╪⌐ ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ╪º┘ä╪┤╪▒┘â╪⌐ ΓÇö ╪¬┘Å╪╖╪¿┘Ä┘æ┘é ╪╣┘ä┘ë ╪¼┘à┘è╪╣ ╪ú┘å╪╕┘à╪⌐ ╪º┘ä┘ê┘ä╪º╪í
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          ╪¡┘ü╪╕ ╪º┘ä╪¬╪║┘è┘è╪▒╪º╪¬
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ┘é┘ê╪º╪╣╪» ┘â╪│╪¿ ┘ê╪º╪│╪¬╪¿╪»╪º┘ä ╪º┘ä┘å┘é╪º╪╖
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ╪º┘ä╪¬╪¡┘â┘à ┘ü┘è ╪ó┘ä┘è╪⌐ ╪º╪¡╪¬╪│╪º╪¿ ╪º┘ä┘å┘é╪º╪╖ ┘ê┘à╪╣╪»┘ä╪º╪¬ ╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ┘â┘ä ╪╣┘à┘ä┘è╪⌐ ╪┤╪▒╪º╪í ╪¿┘à╪¿┘ä╪║ (╪╣┘à┘ä╪⌐)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.pointsPerAmount}
              onChange={(e) => updateField("pointsPerAmount", Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">┘à╪½╪º┘ä: 1 ╪¬╪╣┘å┘è ┘â┘ä 1 ╪╣┘à┘ä╪⌐.</p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ╪¬╪│╪º┘ê┘è (┘å┘é╪º╪╖)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.pointsPerPurchase}
              onChange={(e) => updateField("pointsPerPurchase", Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘à┘â╪¬╪│╪¿╪⌐ ┘à┘é╪º╪¿┘ä ╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä╪│╪º╪¿┘é.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘à┘â╪¬╪│╪¿╪⌐ ┘ä┘â┘ä ╪Ñ╪¡╪º┘ä╪⌐ ┘å╪º╪¼╪¡╪⌐
            </label>
            <input
              type="number"
              min="0"
              value={settings.pointsPerReferral}
              onChange={(e) => updateField("pointsPerReferral", Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ┘à╪╣╪»┘ä ╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä (1 ╪╣┘à┘ä╪⌐ = ┘â┘à ┘å┘é╪╖╪⌐╪ƒ)
            </label>
            <input
              type="number"
              min="0"
              value={settings.redemptionRate}
              onChange={(e) => updateField("redemptionRate", Number(e.target.value))}
              placeholder="┘à╪½╪º┘ä: 100 = ┘â┘ä 100 ┘å┘é╪╖╪⌐ ╪¬╪«╪╡┘à 1 ╪╣┘à┘ä╪⌐"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              ┘à╪½╪º┘ä: 100 ┘è╪╣╪º╪»┘ä ╪ú┘å ┘â┘ä 100 ┘å┘é╪╖╪⌐ ╪¬╪«╪╡┘à 1 ╪╣┘à┘ä╪⌐.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ╪º┘ä╪¡╪» ╪º┘ä╪ú╪»┘å┘ë ┘ä┘ä┘å┘é╪º╪╖ ┘ä╪¿╪»╪í ╪º┘ä╪º╪│╪¬╪¿╪»╪º┘ä
            </label>
            <input
              type="number"
              min="0"
              value={settings.minimumPoints}
              onChange={(e) => updateField("minimumPoints", Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ╪ú┘é╪╡┘ë ┘å┘é╪º╪╖ ╪¿╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘ê╪º╪¡╪»
            </label>
            <input
              type="number"
              min="0"
              value={settings.maxPointsPerTransaction}
              onChange={(e) => updateField("maxPointsPerTransaction", Number(e.target.value))}
              placeholder="0 = ╪¿╪»┘ê┘å ╪¡╪»"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              ╪º╪¬╪▒┘â┘ç 0 ╪Ñ╪░╪º ┘â┘å╪¬ ┘ä╪º ╪¬╪▒┘è╪» ┘ê╪╢╪╣ ╪¡╪» ╪ú┘é╪╡┘ë.
            </p>
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘å┘é╪º╪╖ (╪¿╪º┘ä╪ú╪┤┘ç╪▒)
            </label>
            <input
              type="number"
              min="0"
              value={settings.expiryMonths}
              onChange={(e) => updateField("expiryMonths", Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          <strong>┘à┘ä╪º╪¡╪╕╪⌐:</strong> ┘ç╪░┘ç ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪╣╪º┘à╪⌐ ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ╪º┘ä╪┤╪▒┘â╪⌐. ╪ú┘è ╪¬╪╣╪»┘è┘ä
          ┘ç┘å╪º ┘è┘Å╪╖╪¿┘Ä┘æ┘é ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘ä┘ë <strong>╪¼┘à┘è╪╣ ╪ú┘å╪╕┘à╪⌐ ╪º┘ä┘ê┘ä╪º╪í</strong> ╪º┘ä┘à┘ê╪¼┘ê╪»╪⌐
          (╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬╪î ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è╪î ┘ê╪║┘è╪▒┘ç╪º).
        </p>
      </div>
    </div>
  );
};

export default PointsSettingsPage;
