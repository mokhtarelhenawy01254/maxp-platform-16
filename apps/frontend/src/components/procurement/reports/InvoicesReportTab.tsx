import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { formatCurrency } from '../../../utils/currency';
import { formatShortDate } from '../../../utils/dateFormat';
import { InvoiceReportRow } from './reportTypes';

interface InvoicesReportTabProps {
  invoices: InvoiceReportRow[];
  summary: {
    totalInvoices: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    byStatus?: Record<string, { count: number; amount: number; paid: number; pending: number }>;
  } | null;
  loading: boolean;
}

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'معلقة', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PARTIALLY_PAID: { label: 'مدفوعة جزئياً', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  PAID: { label: 'مدفوعة بالكامل', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  CANCELLED: { label: 'ملغاة', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export const InvoicesReportTab: React.FC<InvoicesReportTabProps> = ({ invoices, summary, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />;
  }

  const totalAmount = summary?.totalAmount ?? invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = summary?.totalPaid ?? invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalPending = summary?.totalPending ?? invoices.reduce((sum, inv) => sum + (Number(inv.remainingAmount) || 0), 0);
  const totalCount = summary?.totalInvoices ?? invoices.length;

  return (
    <div className="space-y-4">
      {summary?.byStatus && Object.keys(summary.byStatus).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(summary.byStatus).map(([st, val]) => {
            const cfg = statusMap[st] || { label: st, className: 'bg-muted text-muted-foreground' };
            return (
              <div
                key={st}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card text-xs"
              >
                <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                <span className="font-bold tabular-nums">{val.count}</span>
                <span className="text-muted-foreground">({formatCurrency(val.amount || 0)})</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start font-semibold">رقم الفاتورة</TableHead>
                <TableHead className="text-start font-semibold">المورد</TableHead>
                <TableHead className="text-start font-semibold">تاريخ الفاتورة</TableHead>
                <TableHead className="text-start font-semibold">تاريخ الاستحقاق</TableHead>
                <TableHead className="text-end font-semibold">الإجمالي</TableHead>
                <TableHead className="text-end font-semibold">المدفوع</TableHead>
                <TableHead className="text-end font-semibold">المتبقي</TableHead>
                <TableHead className="text-center font-semibold">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير شراء مطابقة للفترة المحددة
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const cfg = statusMap[inv.status] || { label: inv.status, className: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => navigate(`/procurement/purchase-invoices/${inv.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary text-start">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell className="font-medium text-start">
                        {inv.supplier?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground text-start">
                        {formatShortDate(inv.invoiceDate, 'ar')}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground text-start">
                        {formatShortDate(inv.dueDate, 'ar')}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-semibold">
                        {formatCurrency(inv.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inv.paidAmount || 0)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-bold text-rose-500">
                        {formatCurrency(inv.remainingAmount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {invoices.length > 0 && (
              <TableFooter className="bg-muted/30 border-t border-border/60">
                <TableRow className="font-bold text-xs">
                  <TableCell colSpan={4} className="text-start">
                    الإجمالي العام ({totalCount} فاتورة):
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{formatCurrency(totalAmount)}</TableCell>
                  <TableCell className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</TableCell>
                  <TableCell className="text-end tabular-nums text-rose-500">{formatCurrency(totalPending)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};
