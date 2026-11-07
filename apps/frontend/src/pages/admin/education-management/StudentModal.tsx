import React, { useState } from "react";
import { X } from "lucide-react";
import type { EducationStudent, Customer } from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";

export interface StudentModalProps {
  student?: Partial<EducationStudent> | null;
  customers: Customer[];
  customerResults: Customer[];
  onCustomerSearch: (q: string) => void;
  onClose: () => void;
  onSave: (d: Partial<EducationStudent>) => Promise<void>;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  student,
  customers,
  customerResults,
  onCustomerSearch,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "male",
    grade: "",
    notes: "",
    customerId: "",
    ...student,
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const selectedCustomer =
    customers.find((c) => c.id === form.customerId) ||
    customerResults.find((c) => c.id === form.customerId);

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {student?.id ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                الاسم الأول *
              </label>
              <input
                className={INPUT_CLS}
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                الاسم الأخير
              </label>
              <input
                className={INPUT_CLS}
                value={form.lastName || ""}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الهاتف</label>
              <input
                className={INPUT_CLS}
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الجنس</label>
              <select
                className={INPUT_CLS}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المرحلة / الصف
            </label>
            <input
              className={INPUT_CLS}
              value={form.grade || ""}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              ولي الأمر (العميل) *
            </label>
            <input
              className={INPUT_CLS}
              placeholder="ابحث عن ولي أمر بالاسم أو الهاتف..."
              value={
                customerSearch ||
                (selectedCustomer
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : "")
              }
              onChange={(e) => {
                onCustomerSearch(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
            />
            {showResults && customerResults.length > 0 && (
              <div className="border border-border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card shadow-lg divide-y divide-border/60">
                {customerResults.map((c) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 hover:bg-muted/40 cursor-pointer text-xs"
                    onClick={() => {
                      setForm({ ...form, customerId: c.id });
                      setCustomerSearch("");
                      setShowResults(false);
                    }}
                  >
                    <span className="font-medium text-foreground">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="text-muted-foreground mr-2 font-mono">
                      ({c.phone})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              ملاحظات
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!form.firstName || !form.customerId}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};
