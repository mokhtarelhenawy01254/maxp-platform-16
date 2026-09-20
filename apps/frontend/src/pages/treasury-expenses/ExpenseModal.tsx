import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Calendar, Building2, Tag, FileText, CheckCircle2, Repeat } from "lucide-react";
import { TreasuryAccount, ExpenseCategory, createExpense, formatMoney } from "./shared";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: TreasuryAccount[];
  categories: ExpenseCategory[];
}

export default function ExpenseModal({ isOpen, onClose, onSuccess, accounts, categories }: ExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [treasuryAccountId, setTreasuryAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<"OPEX" | "CAPEX">("OPEX");
  const [beneficiary, setBeneficiary] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"MONTHLY" | "WEEKLY" | "YEARLY">("MONTHLY");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !treasuryAccountId) {
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      setTreasuryAccountId(defaultAcc.id);
    }
  }, [accounts, treasuryAccountId]);

  // Sync type if user picks a category that has type CAPEX
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setCategoryId(selectedId);
    const cat = categories.find((c) => c.id === selectedId);
    if (cat) {
      setType(cat.type);
    }
  };

  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => a.id === treasuryAccountId);
  const parsedAmount = parseFloat(amount) || 0;
  const currentBalance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const isOverdraft = parsedAmount > currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedAmount <= 0 || !treasuryAccountId) {
      setError("يرجى إدخال اسم النفقة والمبلغ واختيار الخزينة المصروف منها");
      return;
    }

    if (isOverdraft) {
      setError("لا يمكن إتمام الصرف، رصيد الخزينة غير كافٍ. يرجى اختيار خزينة أخرى أو تغذية الرصيد.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createExpense({
        title: title.trim(),
        amount: parsedAmount,
        treasuryAccountId,
        categoryId: categoryId || undefined,
        type,
        beneficiary: beneficiary.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        paymentDate: paymentDate || undefined,
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "فشل تسجيل النفقة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden transition-all my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">تسجيل نفقة / مصروف جديد</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">خصم فوري مباشر من الخزينة مع توثيق القيد المالي</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">اسم النفقة / البيان *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: فاتورة كهرباء المقر، راتب أحمد، لابتوب..."
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">المبلغ (ج.م) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono font-medium bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Treasury Account Selection & Overdraft Guard */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                الخزينة المصروف منها *
              </label>
              {selectedAccount && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium ${
                  isOverdraft
                    ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}>
                  المتاح: {formatMoney(currentBalance, selectedAccount.currency)}
                </span>
              )}
            </div>

            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — رصيد: {Number(acc.balance).toLocaleString()} {acc.currency}
                </option>
              ))}
            </select>

            {isOverdraft && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                تحذير: المبلغ المطلوب ({formatMoney(parsedAmount)}) يتجاوز رصيد الخزينة المتاح!
              </p>
            )}
          </div>

          {/* Category & Classification (OPEX vs CAPEX) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                التصنيف
              </label>
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              >
                <option value="">بدون تصنيف (عام)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type === "CAPEX" ? "أصل رأسمالي" : "تشغيلي"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">النوع المحاسبي</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("OPEX")}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                    type === "OPEX"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  تشغيلي (OPEX)
                </button>
                <button
                  type="button"
                  onClick={() => setType("CAPEX")}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                    type === "CAPEX"
                      ? "bg-purple-600 text-white border-transparent shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  أصل رأسمالي (CAPEX)
                </button>
              </div>
            </div>
          </div>

          {/* Beneficiary, Invoice & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">الجهة / المستفيد</label>
              <input
                type="text"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="اسم الموظف أو الشركة"
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <FileText className="w-3 h-3 text-zinc-400" />
                رقم الفاتورة / الإيصال
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-12345"
                className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                تاريخ الصرف
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Recurring Expense Checkbox */}
          <div className="p-3 bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
              />
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-zinc-500" />
                هذه نفقة دورية متكررة (مثل إيجار، مرتبات، اشتراك سنوي)
              </span>
            </label>

            {isRecurring && (
              <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-3">
                <span className="text-xs text-zinc-500">التكرار:</span>
                <select
                  value={recurringInterval}
                  onChange={(e: any) => setRecurringInterval(e.target.value)}
                  className="px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                >
                  <option value="MONTHLY">شهرياً (Monthly)</option>
                  <option value="WEEKLY">أسبوعياً (Weekly)</option>
                  <option value="YEARLY">سنوياً (Yearly)</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || isOverdraft || parsedAmount <= 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>جاري الحفظ والخصم...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأكيد الصرف والخصم</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
