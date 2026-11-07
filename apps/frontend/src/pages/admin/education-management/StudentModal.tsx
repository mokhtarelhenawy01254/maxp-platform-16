import React, { useState, useEffect, useRef } from "react";
import { X, Search, User, Loader2 } from "lucide-react";
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

  const initialCustomer =
    student?.customer ||
    customers.find((c) => c.id === (student?.customerId || form.customerId)) ||
    null;

  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    firstName: string;
    lastName?: string;
    phone?: string;
  } | null>(initialCustomer);

  const [customerSearch, setCustomerSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSelfGuardian, setIsSelfGuardian] = useState(false);
  const [isManualGuardian, setIsManualGuardian] = useState(false);
  const [manualGuardian, setManualGuardian] = useState({ name: "", phone: "" });
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce customer search when typing (single source of search trigger)
  useEffect(() => {
    const query = customerSearch.trim();
    if (query.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      onCustomerSearch(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, onCustomerSearch]);

  const handleSelectCustomer = (c: Customer) => {
    setForm((prev) => ({ ...prev, customerId: c.id }));
    setSelectedCustomer(c);
    setCustomerSearch("");
    setShowResults(false);
  };

  const handleClearCustomer = () => {
    setForm((prev) => ({ ...prev, customerId: "" }));
    setSelectedCustomer(null);
    setCustomerSearch("");
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || saving) return;
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (isSelfGuardian) {
        payload.isSelfGuardian = true;
        payload.customerId = "";
      } else if (isManualGuardian && manualGuardian.name.trim()) {
        payload.guardianName = manualGuardian.name.trim();
        payload.guardianPhone = manualGuardian.phone.trim();
        payload.customerId = "";
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

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
                placeholder="مثال: سفيان"
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
                placeholder="مثال: أحمد"
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
                placeholder="01xxxxxxxxx"
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
              placeholder="مثال: الصف الأول الإعدادي"
            />
          </div>
          <div className="space-y-2" ref={searchContainerRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                ولي الأمر (العميل) *
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  className="rounded text-primary focus:ring-primary"
                  checked={isSelfGuardian}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSelfGuardian(checked);
                    if (checked) {
                      setIsManualGuardian(false);
                      handleClearCustomer();
                    }
                  }}
                />
                <span>الطالب هو ولي أمر نفسه (بالغ/مباشر)</span>
              </label>
            </div>

            {isSelfGuardian ? (
              <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary flex items-center gap-2">
                <User className="w-4 h-4 shrink-0" />
                <span>سيتم تسجيل الطالب كولي أمر نفسه تلقائياً برقم هاتفه.</span>
              </div>
            ) : selectedCustomer ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {selectedCustomer.firstName} {selectedCustomer.lastName || ""}
                    </div>
                    {selectedCustomer.phone && (
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {selectedCustomer.phone}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  title="تغيير ولي الأمر"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>تغيير</span>
                </button>
              </div>
            ) : isManualGuardian ? (
              <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">إدخال ولي أمر جديد:</span>
                  <button
                    type="button"
                    onClick={() => setIsManualGuardian(false)}
                    className="text-muted-foreground hover:text-foreground text-[11px]"
                  >
                    العودة للبحث
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={INPUT_CLS}
                    placeholder="اسم ولي الأمر *"
                    value={manualGuardian.name}
                    onChange={(e) => setManualGuardian({ ...manualGuardian, name: e.target.value })}
                  />
                  <input
                    className={INPUT_CLS}
                    placeholder="هاتف ولي الأمر"
                    value={manualGuardian.phone}
                    onChange={(e) => setManualGuardian({ ...manualGuardian, phone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="relative space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    className={INPUT_CLS + " pr-9 pl-8"}
                    placeholder="ابحث عن ولي أمر بالاسم أو الهاتف..."
                    value={customerSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerSearch(val);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch("");
                        setShowResults(false);
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setManualGuardian({ name: customerSearch, phone: "" });
                      setIsManualGuardian(true);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    + إدخال ولي أمر جديد يدوياً
                  </button>
                </div>

                {showResults && customerSearch.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-border/60">
                    {customerSearch.trim().length < 2 ? (
                      <div className="px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                        اكتب حرفين أو أكثر للبحث...
                      </div>
                    ) : customerResults.length > 0 ? (
                      customerResults.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2.5 hover:bg-muted/60 cursor-pointer text-xs flex items-center justify-between transition-colors"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {c.firstName} {c.lastName || ""}
                            </span>
                            {c.phone && (
                              <span className="text-muted-foreground mr-2 font-mono text-[11px]">
                                ({c.phone})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-primary font-medium">
                            اختيار
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center text-xs space-y-1.5">
                        <p className="text-muted-foreground">لا يوجد ولي أمر مطابق للبحث "{customerSearch}"</p>
                        <button
                          type="button"
                          onClick={() => {
                            setManualGuardian({ name: customerSearch, phone: "" });
                            setIsManualGuardian(true);
                            setShowResults(false);
                          }}
                          className="text-xs text-primary font-semibold hover:underline block mx-auto"
                        >
                          + إضافة "{customerSearch}" كولي أمر جديد
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
              placeholder="أي ملاحظات إضافية عن الطالب..."
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
            onClick={handleSubmit}
            disabled={!form.firstName.trim() || saving}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? "جارٍ الحفظ..." : "حفظ"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
