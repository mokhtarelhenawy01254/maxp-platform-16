import React, { useState } from 'react';
import { PackageCheck, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductionOrder } from '../../manufacturingApi';
import { ReceiveGoodsModal } from '../modals/ReceiveGoodsModal';

interface OrderGoodsReceiptsTabProps {
  order: ProductionOrder;
  onRefresh: () => void;
}

export const OrderGoodsReceiptsTab: React.FC<OrderGoodsReceiptsTabProps> = ({ order, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  const receipts = order.goodsReceipts || [];
  const totalReceivedGood = Number(order.producedQuantity) || 0;
  const totalScrapped = Number(order.scrappedQuantity) || 0;

  const toggleExpand = (id: string) => {
    setExpandedReceiptId(expandedReceiptId === id ? null : id);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-foreground">أذون استلام الإنتاج التام (Finished Goods Receipts - FGR)</h3>
          <p className="text-[11px] text-muted-foreground">
            إثبات استلام القطع التامة في مستودع البضاعة الجاهزة وحساب متوسط التكلفة المرجح
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
            إجمالي المستلم السليم:{' '}
            <span className="font-mono font-bold text-sm tabular-nums">
              {totalReceivedGood}
            </span>{' '}
            / {order.plannedQuantity} قطعة (هالك: {totalScrapped})
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل استلام إنتاج تام</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {receipts.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-card border border-border/70 text-muted-foreground">
            لم يتم تسجيل أي أذون استلام إنتاج تام لهذا الأمر بعد. يمكنك تسجيل الاستلام مع تقدم خطوط الإنتاج وفحص الجودة.
          </div>
        ) : (
          receipts.map((receipt) => {
            const isExpanded = expandedReceiptId === receipt.id;
            const items = receipt.items || [];
            return (
              <div key={receipt.id} className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
                <div
                  onClick={() => toggleExpand(receipt.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">{receipt.receiptNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {receipt.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(receipt.date || receipt.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-muted-foreground block font-sans">الكمية المستلمة:</span>
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">
                        {receipt.totalQuantity}
                      </span>{' '}
                      <span className="text-[10px] font-sans text-muted-foreground">قطعة (تكلفة: {Number(receipt.unitCost).toFixed(2)} ج.م/ق)</span>
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
                            <th className="p-2 font-semibold">المقاس</th>
                            <th className="p-2 font-semibold">اللون</th>
                            <th className="p-2 font-semibold text-center text-emerald-600">الكمية السليمة</th>
                            <th className="p-2 font-semibold text-center text-amber-600">الكمية الهالكة</th>
                            <th className="p-2 font-semibold">تكلفة القطعة</th>
                            <th className="p-2 font-semibold">إجمالي القيمة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 text-center text-muted-foreground">
                                لا توجد تفاصيل بنود في هذا الإذن
                              </td>
                            </tr>
                          ) : (
                            items.map((it) => (
                              <tr key={it.id} className="hover:bg-muted/20 transition">
                                <td className="p-2 font-mono font-bold text-foreground">{it.size || '—'}</td>
                                <td className="p-2 text-foreground">{it.color || '—'}</td>
                                <td className="p-2 text-center font-mono font-bold text-emerald-600 tabular-nums">{it.goodQuantity}</td>
                                <td className="p-2 text-center font-mono font-bold text-amber-600 tabular-nums">{it.scrapQuantity}</td>
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

      <ReceiveGoodsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={order}
        onSuccess={onRefresh}
      />
    </div>
  );
};
