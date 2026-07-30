import { X as XMarkIcon } from 'lucide-react';
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
;
import { companyAwareApi } from "../../../services/companyAwareApi";

interface AssetFormProps {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
  usePortal?: boolean;
}

const AssetForm: React.FC<AssetFormProps> = ({
  initialData,
  onClose,
  onSuccess,
  usePortal = true,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    code: "",
    serialNumber: "",
    model: "",
    brand: "",
    status: "AVAILABLE",
    condition: "NEW",
    purchaseDate: "",
    purchaseValue: "",
    location: "",
    notes: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyMonths: "",
    warrantyProvider: "",
    supplierName: "",
    supplierMobile: "",
    supplierAddress: "",
    assignedToId: "",
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchEmployees();
    if (initialData) {
      setFormData({
        name: (initialData.name as string) || "",
        categoryId: (initialData.categoryId as string) || "",
        code: (initialData.code as string) || "",
        serialNumber: (initialData.serialNumber as string) || "",
        model: (initialData.model as string) || "",
        brand: (initialData.brand as string) || "",
        status: (initialData.status as string) || "AVAILABLE",
        condition: (initialData.condition as string) || "NEW",
        purchaseDate: (initialData as any).purchaseDate
          ? new Date((initialData as any).purchaseDate)
            .toISOString()
            .split("T")[0]
          : "",
        purchaseValue: (initialData as any).purchaseValue || "",
        location: (initialData as any).location || "",
        notes: (initialData as any).notes || "",
        warrantyStartDate: (initialData as any).warrantyStartDate
          ? new Date((initialData as any).warrantyStartDate)
            .toISOString()
            .split("T")[0]
          : "",
        warrantyEndDate: (initialData as any).warrantyEndDate
          ? new Date((initialData as any).warrantyEndDate)
            .toISOString()
            .split("T")[0]
          : "",
        warrantyMonths: (initialData.warrantyMonths as string) || "",
        warrantyProvider: (initialData.warrantyProvider as string) || "",
        supplierName: (initialData.supplierName as string) || "",
        supplierMobile: (initialData.supplierMobile as string) || "",
        supplierAddress: (initialData.supplierAddress as string) || "",
        assignedToId: (initialData.assignedToId as string) || "",
      });
    }
  }, [initialData]);

  const fetchCategories = async () => {
    try {
      const response = await companyAwareApi.get("/hr/assets/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await companyAwareApi.get("/procurement/suppliers");
      if (response.data.suppliers) {
        setSuppliers(response.data.suppliers);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await companyAwareApi.get("/hr/employees");
      if (response.data.success) {
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
      const payload = {
        ...formData,
        purchaseValue: formData.purchaseValue
          ? Number(formData.purchaseValue)
          : null,
        warrantyMonths: formData.warrantyMonths
          ? parseInt(formData.warrantyMonths.toString(), 10)
          : null,
        purchaseDate: formData.purchaseDate || null,
        warrantyStartDate: formData.warrantyStartDate || null,
        warrantyEndDate: formData.warrantyEndDate || null,
        assignedToId: formData.assignedToId || null,
      };

      if (initialData) {
        await companyAwareApi.put(`/hr/assets/${initialData.id}`, payload);
      } else {
        await companyAwareApi.post("/hr/assets", payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!usePortal) return;
    if (typeof document === "undefined") return;
    // Prevent background scroll while the modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [usePortal]);

  if (usePortal && typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 transition-opacity"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 transform transition-all flex flex-col max-h-[90vh]"
      >
        {/* Sticky Header */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10 sticky top-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData ? "تعديل بيانات الأصل" : "إضافة أصل جديد"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="إغلاق نموذج الأصل"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form id="asset-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-lg inline-flex items-center justify-center mr-2 ml-2">1</span>
                البيانات الأساسية للأصل
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    اسم الأصل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    التصنيف
                  </label>
                  <select
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                  >
                    <option value="">اختر التصنيف</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    كود الأصل (Tag ID)
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الرقم التسلسلي (S/N)
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الموديل
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الماركة (Brand)
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Status & Location */}
            <div className="bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-lg inline-flex items-center justify-center mr-2 ml-2">2</span>
                الحالة والموقع
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الحالة الفيزيائية
                  </label>
                  <select
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value })
                    }
                  >
                    <option value="NEW">جديد</option>
                    <option value="GOOD">جيد</option>
                    <option value="FAIR">مقبول</option>
                    <option value="POOR">سيء</option>
                    <option value="DAMAGED">تالف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    الموقع الحالي
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="مثال: المكتب الرئيسي"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    تخصيص لموظف (اختياري)
                  </label>
                  <select
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.assignedToId}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedToId: e.target.value })
                    }
                    disabled={loadingEmployees}
                  >
                    <option value="">
                      {loadingEmployees
                        ? "جاري تحميل الموظفين..."
                        : "--- غير مخصص لموظف حالياً ---"}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} (
                        {emp.employeeNumber || "بدون رقم"})
                      </option>
                    ))}
                  </select>
                  {!loadingEmployees && employees.length === 0 && (
                    <p className="mt-1 text-xs text-amber-500">
                      ⚠️ لم يتم العثور على موظفين في سجلات النظام
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Financial & Warranty */}
            <div className="bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-lg inline-flex items-center justify-center mr-2 ml-2">3</span>
                البيانات المالية والضمان
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    اسم المورد
                  </label>
                  <select
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.supplierName}
                    onChange={(e) => {
                      const selected = suppliers.find(
                        (s) => s.name === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        supplierName: e.target.value,
                        supplierMobile: selected?.mobile || "",
                        supplierAddress: selected?.address || "",
                      });
                    }}
                  >
                    <option value="">اختر المورد...</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.name}>
                        {s.name} {s.mobile ? ` | 📱 ${s.mobile}` : ""}
                      </option>
                    ))}
                  </select>
                  {formData.supplierName && (
                    <div className="mt-2 flex space-x-4 space-x-reverse text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {formData.supplierMobile && (
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">📱 {formData.supplierMobile}</span>
                      )}
                      {formData.supplierAddress && (
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">📍 {formData.supplierAddress}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      تاريخ الشراء
                    </label>
                    <input
                      type="date"
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                      value={formData.purchaseDate}
                      onChange={(e) =>
                        setFormData({ ...formData, purchaseDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      قيمة الشراء
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                      value={formData.purchaseValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchaseValue: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    تاريخ انتهاء الضمان
                  </label>
                  <input
                    type="date"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.warrantyEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warrantyEndDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    مدة الضمان (بالأشهر)
                  </label>
                  <input
                    type="number"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    value={formData.warrantyMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warrantyMonths: e.target.value,
                      })
                    }
                    placeholder="مثال: 12"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ملاحظات إضافية
              </label>
              <textarea
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm py-3 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition resize-none"
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="أضف أي تفاصيل أو ملاحظات أخرى هنا..."
              />
            </div>

          </form>
        </div>

        {/* Fixed Footer */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="asset-form"
            disabled={loading}
            className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors inline-flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري الحفظ...
              </>
            ) : (
              "حفظ الأصل"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (usePortal) {
    return createPortal(modal, document.body);
  }

  return modal;
};

export default AssetForm;
