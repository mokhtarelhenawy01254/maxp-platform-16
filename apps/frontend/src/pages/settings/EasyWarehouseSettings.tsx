import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import easyWarehouseService from "../../services/easyWarehouseService";

const EasyWarehouseSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await easyWarehouseService.getSettings();
        setEnabled(res.data?.easyWarehouseMode === true);
      } catch (error: any) {
        toast.error(error?.message || "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await easyWarehouseService.updateSettings(enabled);
      setEnabled(res.data?.easyWarehouseMode === true);
      toast.success(res.data?.easyWarehouseMode ? "╪¬┘à ╪¬┘ü╪╣┘è┘ä ╪º┘ä┘ê╪╢╪╣ ╪º┘ä╪│┘ç┘ä" : "╪¬┘à ╪Ñ┘è┘é╪º┘ü ╪º┘ä┘ê╪╢╪╣ ╪º┘ä╪│┘ç┘ä");
    } catch (error: any) {
      toast.error(error?.message || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">┘ê╪╢╪╣ ╪º┘ä┘à╪│╪¬┘ê╪»╪╣ ╪º┘ä╪│┘ç┘ä</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ╪º╪│╪¬┘è╪▒╪º╪» ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è┘ï╪º ╪╣┘å╪» ╪Ñ┘å╪┤╪º╪í ╪╖┘ä╪¿ ┘ä┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ┘ü┘è ╪º┘ä┘â╪¬╪º┘ä┘ê╪¼.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">╪¬┘ü╪╣┘è┘ä ╪º╪│╪¬┘è╪▒╪º╪» ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è┘ï╪º</h3>
            <p className="text-xs text-gray-500">
              ╪╣┘å╪» ╪º┘ä╪¬┘ü╪╣┘è┘ä╪î ╪ú┘è ╪╖┘ä╪¿ ┘è╪¡╪¬┘ê┘è ┘à┘å╪¬╪¼┘ï╪º ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ┘ü┘è ┘â╪¬╪º┘ä┘ê╪¼┘â ╪│┘è┘Å┘å╪┤╪ú ╪¬┘ä┘é╪º╪ª┘è┘ï╪º ╪¿╪│╪╣╪▒ ╪º┘ä╪╖┘ä╪¿.
            </p>
          </div>
          <button
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EasyWarehouseSettings;
