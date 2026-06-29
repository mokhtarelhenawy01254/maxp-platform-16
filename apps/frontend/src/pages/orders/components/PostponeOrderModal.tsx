import React, { useState } from "react";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";

interface PostponeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    scheduledDeliveryDate: string;
    scheduledNotes: string;
    autoTransitionEnabled: boolean;
  }) => Promise<void>;
  initialDate?: string;
  initialNotes?: string;
  initialAutoTransition?: boolean;
  loading?: boolean;
}

const PostponeOrderModal: React.FC<PostponeOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate = "",
  initialNotes = "",
  initialAutoTransition = true,
  loading = false,
}) => {
  const [scheduledDeliveryDate, setScheduledDeliveryDate] =
    useState(initialDate);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState("");
  const [scheduledNotes, setScheduledNotes] = useState(initialNotes);
  const [autoTransitionEnabled, setAutoTransitionEnabled] = useState(
    initialAutoTransition,
  );

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleConfirm = async () => {
    if (!scheduledDeliveryDate) return;

    const dateTime = scheduledDeliveryTime
      ? `${scheduledDeliveryDate}T${scheduledDeliveryTime}:00`
      : `${scheduledDeliveryDate}T00:00:00`;

    await onConfirm({
      scheduledDeliveryDate: dateTime,
      scheduledNotes,
      autoTransitionEnabled,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block align-middle bg-white dark:bg-gray-800 rounded-2xl p-6 text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
          <div className="relative z-10">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <CalendarDaysIcon className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                تأجيل الطلب
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                حدد موعد التسليم الجديد للطلب
              </p>

              <div className="mt-6 space-y-4 text-right">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ التسليم *
                  </label>
                  <div className="relative">
                    <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={scheduledDeliveryDate}
                      onChange={(e) =>
                        setScheduledDeliveryDate(e.target.value)
                      }
                      min={getMinDate()}
                      className="block w-full pr-10 pl-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 rounded-xl dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    وقت التسليم (اختياري)
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      value={scheduledDeliveryTime}
                      onChange={(e) =>
                        setScheduledDeliveryTime(e.target.value)
                      }
                      className="block w-full pr-10 pl-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 rounded-xl dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ملاحظات التأجيل
                  </label>
                  <textarea
                    value={scheduledNotes}
                    onChange={(e) => setScheduledNotes(e.target.value)}
                    rows={3}
                    className="block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 rounded-xl dark:bg-gray-700 dark:text-gray-100"
                    placeholder="سبب التأجيل..."
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <input
                    type="checkbox"
                    id="autoTransition"
                    checked={autoTransitionEnabled}
                    onChange={(e) =>
                      setAutoTransitionEnabled(e.target.checked)
                    }
                    className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor="autoTransition"
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    تحويل تلقائي إلى مؤكد عند حلول الموعد
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 transition-all disabled:opacity-50"
              onClick={handleConfirm}
              disabled={loading || !scheduledDeliveryDate}
            >
              {loading ? "جاري التأجيل..." : "تأجيل الطلب"}
            </button>
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-xl bg-white dark:bg-gray-700 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostponeOrderModal;