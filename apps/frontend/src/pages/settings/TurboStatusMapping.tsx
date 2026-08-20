import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface StatusMapping {
  [turboStatus: string]: {
    orderStatus: string | null;
  };
}

interface TurboStatusInfo {
  labelAr: string;
  labelEn: string;
}

interface OrderStatusOption {
  code: string;
  name: string;
}

const TURBO_STATUS_LIST: { key: string; labelAr: string; labelEn: string }[] = [
  { key: "turbo_saved", labelAr: "╪¬┘à ╪º┘ä╪¡┘ü╪╕ (╪¿╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪Ñ╪▒╪│╪º┘ä)", labelEn: "Saved (Pending Send)" },
  { key: "turbo_sent", labelAr: "┘à╪▒╪│┘ä╪⌐ ┘ä╪¬╪▒╪¿┘ê", labelEn: "Sent to Turbo" },
  { key: "processing", labelAr: "┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░ ╪¿╪º┘ä┘ü╪▒╪╣", labelEn: "Branch Processing" },
  { key: "out_for_delivery", labelAr: "┘à╪│┘ä┘à╪⌐ ┘ä┘ä┘à┘å╪»┘ê╪¿", labelEn: "Out for Delivery" },
  { key: "delivered", labelAr: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", labelEn: "Delivered" },
  { key: "remitted", labelAr: "╪¬┘à ╪º┘ä╪¬┘ê╪▒┘è╪» ┘ê╪º┘ä╪¬╪¡╪╡┘è┘ä", labelEn: "Remitted" },
  { key: "returned_to_company", labelAr: "┘à╪▒╪¬╪¼╪╣╪º╪¬ ╪¿╪º┘ä╪┤╪▒┘â╪⌐", labelEn: "Returned to Company" },
  { key: "returned_received", labelAr: "┘à╪▒╪¬╪¼╪╣╪º╪¬ ┘ê╪╡┘ä╪¬┘å┘è", labelEn: "Returned Received" },
  { key: "returned_to_customer", labelAr: "┘à╪▒╪¬╪¼╪╣╪⌐ ┘ä┘ä╪╣┘à┘è┘ä", labelEn: "Returned to Customer" },
  { key: "returned_resent", labelAr: "┘à╪╣╪º╪» ╪Ñ╪▒╪│╪º┘ä┘ç╪º", labelEn: "Returned Resent" },
  { key: "returned_missing", labelAr: "┘à╪▒╪¬╪¼╪╣ ┘à┘ü┘é┘ê╪»", labelEn: "Returned Missing" },
  { key: "returned_destroyed", labelAr: "┘à╪▒╪¬╪¼╪╣ ┘à╪╣╪»┘ê┘à", labelEn: "Returned Destroyed" },
  { key: "cancelled", labelAr: "┘à┘ä╪║┘è", labelEn: "Cancelled" },
  { key: "delayed", labelAr: "┘à╪ñ╪¼┘ä╪⌐", labelEn: "Delayed" },
  { key: "incomplete", labelAr: "╪║┘è╪▒ ┘à┘â╪¬┘à┘ä╪⌐", labelEn: "Incomplete" },
  { key: "archived", labelAr: "┘à╪ñ╪▒╪┤┘ü╪⌐", labelEn: "Archived" },
];

const TURBO_STATUS_GROUP_MAP: Record<string, { labelAr: string; keys: string[] }> = {
  "┘é┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐": {
    labelAr: "┘é┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐",
    keys: ["turbo_saved", "turbo_sent", "processing"],
  },
  "╪º┘ä╪¬┘ê╪╡┘è┘ä": {
    labelAr: "╪º┘ä╪¬┘ê╪╡┘è┘ä",
    keys: ["out_for_delivery", "delivered", "remitted", "delayed"],
  },
  "╪º┘ä┘à╪▒╪¬╪¼╪╣╪º╪¬": {
    labelAr: "╪º┘ä┘à╪▒╪¬╪¼╪╣╪º╪¬",
    keys: [
      "returned_to_company",
      "returned_received",
      "returned_to_customer",
      "returned_resent",
      "returned_missing",
      "returned_destroyed",
    ],
  },
  "╪¡╪º┘ä╪º╪¬ ╪ú╪«╪▒┘ë": {
    labelAr: "╪¡╪º┘ä╪º╪¬ ╪ú╪«╪▒┘ë",
    keys: ["cancelled", "incomplete", "archived"],
  },
};

const TurboStatusMapping: React.FC = () => {
  const { t: tVal, i18n } = useTranslation();
  const t = tVal as (key: string, options?: Record<string, unknown>) => string;
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapping, setMapping] = useState<StatusMapping>({});
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusOption[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [mappingRes, statusesRes] = await Promise.all([
        apiClient.get("/settings/turbo-status-mapping"),
        apiClient.get("/order-status"),
      ]);

      if (mappingRes.data?.success) {
        setMapping(mappingRes.data.data.mapping || {});
      }

      if (statusesRes.data?.success && Array.isArray(statusesRes.data.data)) {
        setOrderStatuses(statusesRes.data.data);
      }
    } catch (error: unknown) {
      console.error("Error loading data:", error);
      tToast.error("TurboStatusMapping.failed_load_4efb");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMappingChange = (turboKey: string, orderStatus: string) => {
    setMapping((prev) => ({
      ...prev,
      [turboKey]: { orderStatus: orderStatus || null },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/settings/turbo-status-mapping", {
        mapping,
      });
      if (response.data?.success) {
        tToast.success("TurboStatusMapping.success_save_7f59");
      }
    } catch (error: unknown) {
      console.error("Error saving mapping:", error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return true; // Always enable save button when data is loaded
  };

  const getStatusName = (code: string | null) => {
    if (!code) return "";
    const found = orderStatuses.find((s) => s.code === code);
    if (found?.name) return found.name;
    const statusKey = `orders.${code.toLowerCase()}`;
    const translated = t(statusKey);
    return translated !== statusKey ? translated : code;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/settings/turbo")}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 ml-2" />
          ╪º┘ä╪╣┘ê╪»╪⌐ ┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ Turbo
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          ╪▒╪¿╪╖ ╪¡╪º┘ä╪º╪¬ Turbo ╪¿╪¡╪º┘ä╪º╪¬ ╪º┘ä┘å╪╕╪º┘à
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          ╪¡╪»╪» ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ ┘ü┘è ╪º┘ä┘å╪╕╪º┘à ┘ä┘â┘ä ╪¡╪º┘ä╪⌐ ┘à┘å ╪¡╪º┘ä╪º╪¬ Turbo Express. ╪╣┘å╪» ┘ê╪╡┘ê┘ä ╪¬╪¡╪»┘è╪½ ┘à┘å Turbo╪î ╪│┘è╪¬┘à ╪¬╪¡┘ê┘è┘ä ╪º┘ä╪╖┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ä┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐.
        </p>
      </div>

      {/* Mapping Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ╪¡╪º┘ä╪º╪¬ Turbo Express
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ╪º╪«╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘é╪º╪¿┘ä╪⌐ ┘ü┘è ╪º┘ä┘å╪╕╪º┘à ┘ä┘â┘ä ╪¡╪º┘ä╪⌐ Turbo
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {Object.entries(TURBO_STATUS_GROUP_MAP).map(([groupName, group]) => (
            <div key={groupName} className="mb-8 last:mb-0">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1 uppercase tracking-wide">
                {group.labelAr}
              </h3>
              <div className="space-y-2">
                {group.keys.map((turboKey) => {
                  const info = TURBO_STATUS_LIST.find((s) => s.key === turboKey);
                  const currentMapping = mapping[turboKey];
                  const selectedStatus = currentMapping?.orderStatus || "";

                  return (
                    <div
                      key={turboKey}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {isRtl ? info?.labelAr : info?.labelEn}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                          {turboKey}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {selectedStatus && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                            ΓåÉ
                          </span>
                        )}
                        <select
                          value={selectedStatus}
                          onChange={(e) => handleMappingChange(turboKey, e.target.value)}
                          className="w-56 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          <option value="">-- ┘ä╪º ┘è┘ê╪¼╪» ╪¬╪║┘è┘è╪▒ --</option>
                          {orderStatuses
                            .filter((s) => s.code !== "TRASH")
                            .map((s) => (
                              <option key={s.code} value={s.code}>
                                {getStatusName(s.code)}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">┘à┘ä╪º╪¡╪╕╪⌐ ┘à┘ç┘à╪⌐</p>
            <p>
              {`╪Ñ╪░╪º ╪¬╪▒┘â╪¬ ╪º┘ä╪¡╪º┘ä╪⌐ "┘ä╪º ┘è┘ê╪¼╪» ╪¬╪║┘è┘è╪▒"╪î ┘ä┘å ┘è╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘ü┘è ╪º┘ä┘å╪╕╪º┘à ╪╣┘å╪» ┘ê╪╡┘ê┘ä ┘ç╪░╪º ╪º┘ä╪¬╪¡╪»┘è╪½ ┘à┘å Turbo.`}
              <br />
              {`╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪¬┘è ┘è╪¬┘à ╪¬╪│┘ä┘è┘à┘ç╪º (Delivered) ╪│╪¬╪¡╪»╪» ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪¡╪º┘ä╪⌐ ╪º┘ä╪»┘ü╪╣ ╪╣┘ä┘ë ╪ú┘å┘ç╪º "┘à┘â╪¬┘à┘ä".`}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕...
            </span>
          ) : (
            "╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"
          )}
        </button>
      </div>
    </div>
  );
};

export default TurboStatusMapping;
