import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../../services/companyAwareApi";

interface AssetAssignmentModalProps {
  asset: any;
  type: "assign" | "return";
  onClose: () => void;
  onSuccess: () => void;
  usePortal?: boolean;
}

const AssetAssignmentModal: React.FC<AssetAssignmentModalProps> = ({
  asset,
  type,
  onClose,
  onSuccess,
  usePortal = true,
}) => {
  const [formData, setFormData] = useState({
    employeeId: "",
    assignedAt: new Date().toISOString().split("T")[0],
    returnedAt: new Date().toISOString().split("T")[0],
    returnCondition: asset.condition || "GOOD",
    notes: "",
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState("");

  // قفل سكرول الصفحة أثناء فتح المودال
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    if (type === "assign") {
      fetchEmployees();
    }
  }, [type]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      // Need an endpoint to fetch active employees
      // Using existing /hr/employees endpoint
      const response = await companyAwareApi.get("/hr/employees");
      if (response.data.success) {
        // Backend returns strictly { employees: [], pagination: {} }
        setEmployees(response.data.employees || response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (type === "assign") {
        await companyAwareApi.post("/hr/assets/assign", {
          assetId: asset.id,
          employeeId: formData.employeeId,
          assignedAt: formData.assignedAt,
          notes: formData.notes,
        });
      } else {
        await companyAwareApi.post("/hr/assets/return", {
          assetId: asset.id,
          returnedAt: formData.returnedAt,
          returnCondition: formData.returnCondition,
          notes: formData.notes,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تنفيذ العملية");
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center px-4 py-8 sm:py-12 bg-black/60 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 text-right rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-indigo-600 to-violet-500" />
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">
              {type === "assign" ? "نموذج تسليم عهدة" : "نموذج استرجاع عهدة"}
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {asset?.name || "الأصل"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
            aria-label="إغلاق النموذج"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="px-8 py-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-4 text-sm font-bold flex items-center gap-3"
            >
              <span className="text-lg">⚠️</span>
              {error}
            </motion.div>
          )}

          {type === "assign" && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 px-5 py-4 text-xs font-medium flex items-start gap-3">
              <span className="text-lg">💡</span>
              <span>
                لم يتم العثور على موظفين؟ تأكد من إضافة الموظفين في نظام الموارد البشرية أولاً.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mr-1">
                  الموظف {type === "assign" && <span className="text-red-500">*</span>}
                </label>
                {type === "assign" ? (
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium"
                    disabled={loadingEmployees}
                  >
                    <option value="">
                      {loadingEmployees ? "جاري التحميل..." : "اختر الموظف"}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeNumber || "بدون رقم"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white px-4 py-3 text-sm font-bold">
                    عهدة لدى: {asset?.currentHolder?.firstName}{" "}
                    {asset?.currentHolder?.lastName}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mr-1">
                  {type === "assign" ? "تاريخ التسليم" : "تاريخ الاسترجاع"}
                </label>
                <input
                  type="date"
                  required
                  className="block w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm py-3 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium"
                  value={type === "assign" ? formData.assignedAt : formData.returnedAt}
                  onChange={(e) =>
                    type === "assign"
                      ? setFormData({ ...formData, assignedAt: e.target.value })
                      : setFormData({ ...formData, returnedAt: e.target.value })
                  }
                />
              </div>
            </div>

            {type === "return" && (
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mr-1">
                  حالة الأصل عند الاسترجاع
                </label>
                <select
                  className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium"
                  value={formData.returnCondition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      returnCondition: e.target.value,
                    })
                  }
                >
                  <option value="NEW">جديد</option>
                  <option value="GOOD">جيد</option>
                  <option value="FAIR">مقبول</option>
                  <option value="POOR">سيء</option>
                  <option value="DAMAGED">تالف</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mr-1">
                ملاحظات
              </label>
              <textarea
                className="block w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm py-3 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium min-h-[110px] resize-none"
                placeholder="أضف ملاحظاتك هنا..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700/50">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-2xl font-black text-sm border-2 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto inline-flex justify-center items-center px-10 py-3.5 rounded-2xl text-white font-black text-sm transition-all shadow-lg active:scale-95 ${
                  type === "assign"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-600/20 hover:shadow-indigo-600/40"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20 hover:shadow-orange-500/40"
                } disabled:opacity-50`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    جاري الحفظ...
                  </div>
                ) : type === "assign" ? (
                  "تأكيد التسليم"
                ) : (
                  "تأكيد الاسترجاع"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (usePortal && typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  return modal;
};

export default AssetAssignmentModal;
