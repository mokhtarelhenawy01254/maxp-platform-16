import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ShoppingBag,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useDateFormat } from "../../hooks/useDateFormat";

interface CustomerJourney {
  id: string;
  status: string;
  currentStep: number;
  nextSendAt?: string | null;
  lastSentAt?: string | null;
  flow?: { name?: string } | null;
  order?: { orderNumber?: string } | null;
}

const CustomerJourneyTab: React.FC<{ customerId: string }> = ({ customerId }) => {
  const { formatDate } = useDateFormat();
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(
        `/whatsapp-automation/journeys?customerId=${customerId}`,
      );
      setJourneys(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      console.error("Error loading customer journeys:", e);
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusBadge = (status: string) => {
    if (status === "ACTIVE")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Send className="h-3 w-3" /> نشطة
        </span>
      );
    if (status === "COMPLETED")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <CheckCircle2 className="h-3 w-3" /> اكتملت
        </span>
      );
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        ملغاة
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-500" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            رحلة العميل (Customer Journey)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <Link
            to="/whatsapp/customer-journey"
            className="inline-flex items-center gap-1 px-3 py-2 bg-fuchsia-600 text-white rounded-lg text-sm hover:bg-fuchsia-700"
          >
            إدارة الرحلات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" />
        </div>
      ) : journeys.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            هذا العميل مش مسجّل في أي رحلة حالياً
          </p>
          <Link
            to="/whatsapp/customer-journey"
            className="inline-block mt-3 text-sm text-fuchsia-600 hover:underline"
          >
            تصفح الرحلات وإضافة العميل
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-wrap gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {j.flow?.name || "رحلة بدون اسم"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {statusBadge(j.status)}
                    {j.order?.orderNumber && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <ShoppingBag className="h-3 w-3" /> # {j.order.orderNumber}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      الخطوة {j.currentStep} •{" "}
                      {j.nextSendAt
                        ? `الإرسال القادم ${formatDate(j.nextSendAt)}`
                        : "بلا موعد"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerJourneyTab;