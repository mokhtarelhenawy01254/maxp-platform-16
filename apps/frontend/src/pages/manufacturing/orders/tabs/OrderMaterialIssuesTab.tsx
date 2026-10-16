import React, { useState } from 'react';
import { PackageMinus, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductionOrder } from '../../manufacturingApi';
import { IssueMaterialsModal } from '../modals/IssueMaterialsModal';

interface OrderMaterialIssuesTabProps {
  order: ProductionOrder;
  onRefresh: () => void;
  onShowWarnings?: (warnings: any[]) => void;
}

export const OrderMaterialIssuesTab: React.FC<OrderMaterialIssuesTabProps> = ({
  order,
  onRefresh,
  onShowWarnings,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const issues = order.materialIssues || [];
  const totalCost = Number(order.actualMaterialCost) || issues.reduce((sum, i) => sum + (Number(i.totalCost) || 0), 0);

  const toggleExpand = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">أذون صرف خامات ومستلزمات الإنتاج (Material Issue Vouchers)</h3>
          <p className="text-[11px] text-muted-foreground">
            حركات الصرف المخصومة من مستودعات الخامات والمحملة على حساب الإنتاج تحت التشغيل (WIP)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium text-xs">
            إجمالي تكلفة الخامات المصروفة:{' '}
            <span className="font-mono font-bold text-sm tabular-nums">
              {totalCost.toFixed(2)}
            </span>{' '}
            <span className="text-[10px] font-sans">ج.م</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إذن صرف يدوي</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {issues.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-card border border-border/70 text-muted-foreground">
            لم يتم تسجيل أي أذون صرف خامات لهذا الأمر بعد. يمكنك الصرف التلقائي عند بدء التشغيل أو الصرف اليدوي.
          </div>
        ) : (
          issues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const items = issue.items || [];
            return (
              <div key={issue.id} className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
                <div
                  onClick={() => toggleExpand(issue.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">{issue.issueNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {issue.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(issue.date || issue.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-muted-foreground block font-sans">قيمة الإذن:</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {Number(issue.totalCost).toFixed(2)}
                      </span>{' '}
                      <span className="text-[10px] font-sans text-muted-foreground">ج.م</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3.5 bg-muted/10 border-t border-border/60">
                    <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                          <tr>
                            <th className="p-2 font-semibold">الخامة المصروفة</th>
                            <th className="p-2 font-semibold text-center">الكمية</th>
                            <th className="p-2 font-semibold">الوحدة</th>
                            <th className="p-2 font-semibold">سعر الوحدة</th>
                            <th className="p-2 font-semibold">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-3 text-center text-muted-foreground">
                                لا توجد تفاصيل بنود في هذا الإذن
                              </td>
                            </tr>
                          ) : (
                            items.map((it) => (
                              <tr key={it.id} className="hover:bg-muted/20 transition">
                                <td className="p-2 font-medium text-foreground">{it.rawMaterialName || it.rawMaterialId}</td>
                                <td className="p-2 text-center font-mono font-bold text-foreground tabular-nums">{it.quantity}</td>
                                <td className="p-2 font-mono text-muted-foreground">{it.unit}</td>
                                <td className="p-2 font-mono text-muted-foreground tabular-nums">{Number(it.unitCost).toFixed(2)} ج.م</td>
                                <td className="p-2 font-mono font-bold text-foreground tabular-nums">{Number(it.totalCost).toFixed(2)} ج.م</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <IssueMaterialsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={order}
        onSuccess={(warnings) => {
          onRefresh();
          if (warnings && warnings.length > 0 && onShowWarnings) {
            onShowWarnings(warnings);
          }
        }}
      />
    </div>
  );
};
