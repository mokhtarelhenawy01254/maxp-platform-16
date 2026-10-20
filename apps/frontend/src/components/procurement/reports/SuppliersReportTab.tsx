import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { SupplierReportRow } from './reportTypes';

interface SuppliersReportTabProps {
  data: SupplierReportRow[];
  loading: boolean;
}

export const SuppliersReportTab: React.FC<SuppliersReportTabProps> = ({ data, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />;
  }

  const totalOrders = data.reduce((sum, r) => sum + (r.totalOrders || 0), 0);
  const totalOrderAmount = data.reduce((sum, r) => sum + (Number(r.totalOrderAmount) || 0), 0);
  const totalInvoices = data.reduce((sum, r) => sum + (r.totalInvoices || 0), 0);
  const totalInvoiceAmount = data.reduce((sum, r) => sum + (Number(r.totalInvoiceAmount) || 0), 0);
  const totalPayments = data.reduce((sum, r) => sum + (r.totalPayments || 0), 0);
  const totalPaidAmount = data.reduce((sum, r) => sum + (Number(r.totalPaidAmount) || 0), 0);
  const totalBalance = data.reduce((sum, r) => sum + (Number(r.currentBalance) || 0), 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-start font-semibold">المورد</TableHead>
              <TableHead className="text-start font-semibold">التواصل</TableHead>
              <TableHead className="text-center font-semibold">الأوامر</TableHead>
              <TableHead className="text-end font-semibold">إجمالي الأوامر</TableHead>
              <TableHead className="text-center font-semibold">الفواتير</TableHead>
              <TableHead className="text-end font-semibold">إجمالي الفواتير</TableHead>
              <TableHead className="text-center font-semibold">السدادات</TableHead>
              <TableHead className="text-end font-semibold">إجمالي المسدد</TableHead>
              <TableHead className="text-end font-semibold">الرصيد الحالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات موردين مطابقة للفترة المحددة
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.supplierId}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/procurement/suppliers/${row.supplierId}`)}
                >
                  <TableCell className="font-medium text-primary text-start">
                    {row.supplierName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground text-start">
                    <div>{row.contactPerson || '—'}</div>
                    <div className="font-mono text-[11px]">{row.phone || ''}</div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs">
                    {row.totalOrders}
                  </TableCell>
                  <TableCell className="text-end tabular-nums text-xs font-medium">
                    {formatCurrency(row.totalOrderAmount || 0)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs">
                    {row.totalInvoices}
                  </TableCell>
                  <TableCell className="text-end tabular-nums text-xs font-medium">
                    {formatCurrency(row.totalInvoiceAmount || 0)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs">
                    {row.totalPayments}
                  </TableCell>
                  <TableCell className="text-end tabular-nums text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.totalPaidAmount || 0)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-bold">
                    <span className={Number(row.currentBalance) > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                      {formatCurrency(row.currentBalance || 0)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter className="bg-muted/30 border-t border-border/60">
              <TableRow className="font-bold text-xs">
                <TableCell colSpan={2} className="text-start">
                  الإجمالي العام ({data.length} مورد):
                </TableCell>
                <TableCell className="text-center tabular-nums">{totalOrders}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(totalOrderAmount)}</TableCell>
                <TableCell className="text-center tabular-nums">{totalInvoices}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(totalInvoiceAmount)}</TableCell>
                <TableCell className="text-center tabular-nums">{totalPayments}</TableCell>
                <TableCell className="text-end tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaidAmount)}</TableCell>
                <TableCell className="text-end tabular-nums">{formatCurrency(totalBalance)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
};
