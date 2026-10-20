import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FinancialPostingItem } from '../types';

interface FinancialPendingPostingsTableProps {
  pendingPostings: FinancialPostingItem[];
  actionBusyId: string | null;
  onConfirm: (id: string) => void;
  onVoid: (id: string) => void;
}

export function FinancialPendingPostingsTable({
  pendingPostings,
  actionBusyId,
  onConfirm,
  onVoid,
}: FinancialPendingPostingsTableProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold">الحركات المالية المعلقة بانتظار التأكيد (Pending Postings)</h3>
        </div>
        <Badge variant="outline" className="tabular-nums font-mono text-xs">
          {pendingPostings.length} حركة معلقة
        </Badge>
      </div>

      {pendingPostings.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          لا توجد حركات مالية معلقة بانتظار الاعتماد حالياً
        </p>
      ) : (
        <div className="border border-border/40 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/30">
              <tr>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">نوع الحركة</th>
                <th className="p-2.5">الجهة / الطرف</th>
                <th className="p-2.5">الاتجاه</th>
                <th className="p-2.5">المبلغ</th>
                <th className="p-2.5">البيان</th>
                <th className="p-2.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {pendingPostings.map((p) => (
                <tr key={p.id} className="hover:bg-muted/10">
                  <td className="p-2.5 tabular-nums font-mono">
                    {new Date(p.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="p-2.5">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {p.sourceType}
                    </Badge>
                  </td>
                  <td className="p-2.5 font-medium">{p.partyName || '—'}</td>
                  <td className="p-2.5">
                    {p.direction === 'INCOME' ? (
                      <span className="text-emerald-500 inline-flex items-center gap-1 font-bold">
                        <ArrowDownLeft className="size-3" /> وارد
                      </span>
                    ) : (
                      <span className="text-rose-500 inline-flex items-center gap-1 font-bold">
                        <ArrowUpRight className="size-3" /> منصرف
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 font-bold tabular-nums font-mono">
                    {Number(p.amount || 0).toLocaleString()} ج.م
                  </td>
                  <td className="p-2.5 max-w-xs truncate text-muted-foreground">{p.notes || '—'}</td>
                  <td className="p-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 gap-1"
                        disabled={actionBusyId === p.id}
                        onClick={() => onConfirm(p.id)}
                      >
                        <CheckCircle2 className="size-3" /> تأكيد الترحيل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        disabled={actionBusyId === p.id}
                        onClick={() => onVoid(p.id)}
                      >
                        <XCircle className="size-3" /> إلغاء
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
