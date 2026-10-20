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
import { formatCurrency, formatProcurementDate } from '../../../lib/formatCurrency';
import { PaymentReportRow } from './reportTypes';

interface PaymentsReportTabProps {
  payments: PaymentReportRow[];
  summary: {
    totalPayments: number;
    totalAmount: number;
    byMethod?: Record<string, { count: number; amount: number }>;
  } | null;
  loading: boolean;
}

const methodMap: Record<string, string> = {
  CASH: 'نقدي',
  BANK_TRANSFER: 'تحويل بنكي',
  CHECK: 'شيك',
  VODAFONE_CASH: 'محفظة إلكترونية',
};

export const PaymentsReportTab: React.FC<PaymentsReportTabProps> = ({ payments, summary, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />;
  }

  const totalAmount = summary?.totalAmount ?? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCount = summary?.totalPayments ?? payments.length;

  return (
    <div className="space-y-4">
      {summary?.byMethod && Object.keys(summary.byMethod).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(summary.byMethod).map(([m, val]) => (
            <div
              key={m}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card text-xs"
            >
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {methodMap[m] || m}
              </Badge>
              <span className="font-bold tabular-nums">{val.count}</span>
              <span className="text-muted-foreground">({formatCurrency(val.amount || 0)})</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start font-semibold">رقم الدفعة</TableHead>
                <TableHead className="text-start font-semibold">المورد</TableHead>
                <TableHead className="text-start font-semibold">الفاتورة المسددة</TableHead>
                <TableHead className="text-start font-semibold">تاريخ الدفع</TableHead>
                <TableHead className="text-center font-semibold">طريقة الدفع</TableHead>
                <TableHead className="text-start font-semibold">المرجع</TableHead>
                <TableHead className="text-end font-semibold">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد مدفوعات مسجلة مطابقة للفترة المحددة
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => {
                      if (p.supplier?.id) {
                        navigate(`/procurement/suppliers/${p.supplier.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary text-start">
                      {p.paymentNumber}
                    </TableCell>
                    <TableCell className="font-medium text-start">
                      {p.supplier?.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground text-start">
                      {p.purchaseInvoice?.invoiceNumber || 'سداد مباشر / على الحساب'}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground text-start">
                      {formatProcurementDate(p.paymentDate, 'ar')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {methodMap[p.paymentMethod] || p.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground text-start">
                      {p.referenceNumber || '—'}
                    </TableCell>
                    <TableCell className="text-end tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {payments.length > 0 && (
              <TableFooter className="bg-muted/30 border-t border-border/60">
                <TableRow className="font-bold text-xs">
                  <TableCell colSpan={6} className="text-start">
                    الإجمالي العام ({totalCount} سداد):
                  </TableCell>
                  <TableCell className="text-end font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalAmount)}
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
