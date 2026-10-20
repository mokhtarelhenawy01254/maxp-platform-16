import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
import { AgingReportData, AgingInvoice } from './reportTypes';

interface AgingReportTabProps {
  data: AgingReportData | null;
  loading: boolean;
}

export const AgingReportTab: React.FC<AgingReportTabProps> = ({ data, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/60 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-border/50 rounded-xl bg-card">
        لا تتوفر بيانات لأعمار الديون حالياً
      </div>
    );
  }

  const buckets = [
    { key: 'current', label: 'غير متأخر (جارٍ)', data: data.current, color: 'text-emerald-600 dark:text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { key: 'days30', label: '1 - 30 يوم', data: data.days30, color: 'text-blue-600 dark:text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { key: 'days60', label: '31 - 60 يوم', data: data.days60, color: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    { key: 'days90', label: '61 - 90 يوم', data: data.days90, color: 'text-orange-600 dark:text-orange-400', badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    { key: 'over90', label: '+90 يوم', data: data.over90, color: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  ];

  // Flatten all invoices for detailed view
  const allInvoices: Array<AgingInvoice & { bucketLabel: string; badgeClass: string }> = [];
  buckets.forEach((b) => {
    (b.data?.invoices || []).forEach((inv) => {
      allInvoices.push({
        ...inv,
        bucketLabel: b.label,
        badgeClass: b.badgeClass,
      });
    });
  });

  const totalOutstanding = buckets.reduce((sum, b) => sum + (Number(b.data?.amount) || 0), 0);
  const totalCount = buckets.reduce((sum, b) => sum + (Number(b.data?.count) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Bucket Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b) => (
          <Card key={b.key} className="border border-border/60">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
              <div className={`text-lg font-bold tabular-nums ${b.color}`}>
                {(Number(b.data?.amount) || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {b.data?.count || 0} فاتورة
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Itemized Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-right font-semibold">رقم الفاتورة</TableHead>
                <TableHead className="text-right font-semibold">المورد</TableHead>
                <TableHead className="text-right font-semibold">تاريخ الاستحقاق</TableHead>
                <TableHead className="text-center font-semibold">أيام التأخير</TableHead>
                <TableHead className="text-center font-semibold">الفئة</TableHead>
                <TableHead className="text-left font-semibold">المبلغ المتبقي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير معلقة مستحقة الدفع حالياً. كافة الذمم مسددة بالكامل.
                  </TableCell>
                </TableRow>
              ) : (
                allInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/procurement/purchase-invoices/${inv.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="font-medium">{inv.supplierName || '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ar-EG') : '—'}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-xs">
                      {inv.daysPastDue > 0 ? (
                        <span className="text-rose-500 font-medium">+{inv.daysPastDue} يوم</span>
                      ) : (
                        <span className="text-emerald-500">متبقي {Math.abs(inv.daysPastDue)} يوم</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${inv.badgeClass}`}>
                        {inv.bucketLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left font-bold tabular-nums">
                      {(Number(inv.remainingAmount) || 0).toLocaleString()} ج.م
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {allInvoices.length > 0 && (
              <TableFooter className="bg-muted/30 border-t border-border/60">
                <TableRow className="font-bold">
                  <TableCell colSpan={5} className="text-right">
                    إجمالي الديون المعلقة ({totalCount} فاتورة):
                  </TableCell>
                  <TableCell className="text-left font-bold tabular-nums text-rose-500">
                    {totalOutstanding.toLocaleString()} ج.م
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};
