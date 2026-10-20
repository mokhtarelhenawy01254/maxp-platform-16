import type { Dispatch, SetStateAction } from 'react';
import { Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { TreasuryAccount, FinancialPoliciesState } from '../types';

interface FinancialDefaultTreasuryCardProps {
  treasuries: TreasuryAccount[];
  defaultTreasuryId: string;
  setFinancialPolicies: Dispatch<SetStateAction<FinancialPoliciesState>>;
}

export function FinancialDefaultTreasuryCard({
  treasuries,
  defaultTreasuryId,
  setFinancialPolicies,
}: FinancialDefaultTreasuryCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        الخزينة الافتراضية للمعاملات
      </h3>
      <div className="max-w-md">
        <Label className="text-xs">اختر الخزينة / الحساب البنكي الافتراضي</Label>
        <select
          className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-2 font-mono"
          value={defaultTreasuryId}
          onChange={(e) =>
            setFinancialPolicies((prev) => ({ ...prev, defaultTreasuryId: e.target.value }))
          }
        >
          <option value="">خزينة المعمل الافتراضية</option>
          {treasuries.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({Number(acc.balance || 0).toLocaleString()} ج.م)
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground mt-1 block">
          الحساب الذي تُرحل إليه تحصيلات الحالات وتُخصم منه مصروفات التشغيل
        </span>
      </div>
    </div>
  );
}
