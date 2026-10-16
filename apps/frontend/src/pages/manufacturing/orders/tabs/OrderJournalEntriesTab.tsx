import React, { useState, useEffect } from 'react';
import { Landmark, FileText, CheckCircle2, RotateCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductionOrder, manufacturingApi } from '../../manufacturingApi';

interface OrderJournalEntriesTabProps {
  order: ProductionOrder;
}

export const OrderJournalEntriesTab: React.FC<OrderJournalEntriesTabProps> = ({ order }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const res = await manufacturingApi.getOrderJournalEntries(order.orderNumber);
      setEntries(res);
    } catch (err) {
      console.error('Failed to load order journal entries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [order.orderNumber]);

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">القيود المحاسبية المرتبطة بأمر التشغيل (WIP Journal Entries)</h3>
          <p className="text-[11px] text-muted-foreground">
            القيود المزدوجة المرحلة آلياً إلى حساب الإنتاج تحت التشغيل (حساب 110402) واستلام الإنتاج التام
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {entries.length} قيود مسجلة
          </span>
          <button
            onClick={loadEntries}
            className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition"
            title="تحديث القيود"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <RotateCw className="w-4 h-4 animate-spin text-primary" />
          <span>جارٍ فحص القيود المحاسبية المرتبطة...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-card border border-border/70 text-muted-foreground">
          لا توجد قيود يومية مسجلة بعد لهذا الأمر. القيود تنشأ عند صرف الخامات، تسجيل أجور التشغيل، وإقفال واستلام التام (عند تفعيل الترحيل التلقائي).
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">{entry.entryNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {entry.status === 'POSTED' ? 'مرحل' : entry.status}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                        {entry.sourceType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.narration}</p>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[10px] text-muted-foreground block font-sans">التاريخ:</span>
                  <span className="text-xs text-foreground font-medium">
                    {new Date(entry.date).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {/* Journal Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/10 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5 font-semibold">رقم الحساب</th>
                      <th className="p-2.5 font-semibold">اسم الحساب</th>
                      <th className="p-2.5 font-semibold">البيان</th>
                      <th className="p-2.5 font-semibold text-emerald-600 font-bold">مدين (Debit)</th>
                      <th className="p-2.5 font-semibold text-rose-600 font-bold">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(entry.lines || []).map((line: any, idx: number) => {
                      const debit = Number(line.debit) || 0;
                      const credit = Number(line.credit) || 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/20 transition">
                          <td className="p-2.5 font-mono text-muted-foreground">{line.account?.code || '—'}</td>
                          <td className="p-2.5 font-medium text-foreground">{line.account?.name || line.accountId}</td>
                          <td className="p-2.5 text-muted-foreground">{line.narration || '—'}</td>
                          <td className="p-2.5 font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {debit > 0 ? `${debit.toFixed(2)} ج.م` : '—'}
                          </td>
                          <td className="p-2.5 font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            {credit > 0 ? `${credit.toFixed(2)} ج.م` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
