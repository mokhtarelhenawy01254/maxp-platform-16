import type { Dispatch, SetStateAction } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { FinancialPoliciesState } from '../types';

interface FinancialPostingModesGridProps {
  postings: FinancialPoliciesState['postings'];
  setFinancialPolicies: Dispatch<SetStateAction<FinancialPoliciesState>>;
}

export function FinancialPostingModesGrid({
  postings,
  setFinancialPolicies,
}: FinancialPostingModesGridProps) {
  const updatePosting = (key: keyof FinancialPoliciesState['postings'], value: string) => {
    setFinancialPolicies((prev) => ({
      ...prev,
      postings: { ...prev.postings, [key]: value },
    }));
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-500" />
        أوضاع ترحيل المعاملات (Posting Modes)
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        {/* 1. Case Invoices */}
        <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
          <span className="font-semibold text-xs block">فواتير الحالات (Case Invoices)</span>
          <select
            className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
            value={postings.caseInvoice}
            onChange={(e) => updatePosting('caseInvoice', e.target.value)}
          >
            <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
            <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
            <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">ترحيل إيرادات الحالات المسددة للخزينة</p>
        </div>

        {/* 2. Supplier Payments */}
        <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
          <span className="font-semibold text-xs block">سداد دفعات الموردين (Suppliers)</span>
          <select
            className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
            value={postings.supplierPayment}
            onChange={(e) => updatePosting('supplierPayment', e.target.value)}
          >
            <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
            <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
            <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">خصم مدفوعات الخامات والمشتريات من الخزينة</p>
        </div>

        {/* 3. Technician Payouts */}
        <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
          <span className="font-semibold text-xs block">صرف أجور الفنيين (Technician Payouts)</span>
          <select
            className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
            value={postings.technicianPayout}
            onChange={(e) => updatePosting('technicianPayout', e.target.value)}
          >
            <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
            <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
            <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">تسجيل سداد مستحقات الفني كمصروف خزينة</p>
        </div>

        {/* 4. Case BOM Consumption */}
        <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
          <span className="font-semibold text-xs block">خصم مخزون الوصفة الفنية (BOM)</span>
          <select
            className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
            value={postings.caseBomConsumption}
            onChange={(e) => updatePosting('caseBomConsumption', e.target.value)}
          >
            <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
            <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
            <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">خصم الخامات المستهلكة من المخزن وحساب تكلفتها</p>
        </div>

        {/* 5. Outsource Expenses */}
        <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-muted/10">
          <span className="font-semibold text-xs block">تكلفة التشغيل الخارجي (Outsource)</span>
          <select
            className="w-full text-xs rounded border border-input bg-background px-2.5 py-1.5"
            value={postings.outsourceExpense}
            onChange={(e) => updatePosting('outsourceExpense', e.target.value)}
          >
            <option value="AUTO">ترحيل تلقائي فوري (AUTO)</option>
            <option value="CONFIRM">يتطلب تأكيد المشرف (CONFIRM)</option>
            <option value="MANUAL">يدوي بالكامل (MANUAL)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">ترحيل تكاليف مراكز الميلنج والمعامل الخارجية</p>
        </div>
      </div>
    </div>
  );
}
