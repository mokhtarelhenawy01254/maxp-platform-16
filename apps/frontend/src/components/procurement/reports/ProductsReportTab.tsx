import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ProductReportRow } from './reportTypes';

interface ProductsReportTabProps {
  products: ProductReportRow[];
  loading: boolean;
}

export const ProductsReportTab: React.FC<ProductsReportTabProps> = ({ products, loading }) => {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  if (loading) {
    return <div className="h-64 bg-muted/40 animate-pulse rounded-xl" />;
  }

  const totalQuantity = products.reduce((sum, p) => sum + (Number(p.totalQuantity) || 0), 0);
  const totalAmount = products.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const toggleExpand = (key: string) => {
    setExpandedProduct(expandedProduct === key ? null : key);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="text-start font-semibold">المنتج / الصنف</TableHead>
              <TableHead className="text-center font-semibold">عدد الطلبيات</TableHead>
              <TableHead className="text-center font-semibold">إجمالي الكمية</TableHead>
              <TableHead className="text-end font-semibold">متوسط السعر</TableHead>
              <TableHead className="text-end font-semibold">إجمالي المشتريات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا توجد مشتريات مسجلة للأصناف في الفترة المحددة
                </TableCell>
              </TableRow>
            ) : (
              products.map((prod, idx) => {
                const key = prod.productId || prod.productName || String(idx);
                const isExpanded = expandedProduct === key;
                const avgPrice = prod.totalQuantity > 0 ? (Number(prod.totalAmount) / Number(prod.totalQuantity)) : 0;
                return (
                  <React.Fragment key={key}>
                    <TableRow className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        {prod.orders && prod.orders.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 p-0"
                            onClick={() => toggleExpand(key)}
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-start">
                        {prod.productName || 'منتج غير مسمى'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs">
                        {prod.orders?.length || 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-semibold">
                        {(Number(prod.totalQuantity) || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-xs text-muted-foreground">
                        {formatCurrency(avgPrice)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums font-bold">
                        {formatCurrency(prod.totalAmount || 0)}
                      </TableCell>
                    </TableRow>

                    {isExpanded && prod.orders && prod.orders.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-3">
                          <div className="rounded-lg border border-border/50 bg-background/80 p-3 space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">
                              تفاصيل أوامر التوريد للمنتج:
                            </div>
                            <div className="divide-y divide-border/30 text-xs">
                              {prod.orders.map((ord, oIdx) => (
                                <div key={oIdx} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-primary font-medium">{ord.orderNumber}</span>
                                    <span className="text-muted-foreground">({ord.supplierName})</span>
                                    <span className="text-muted-foreground text-[11px] tabular-nums">
                                      {formatShortDate(ord.orderDate, 'ar')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 tabular-nums">
                                    <span>الكمية: <strong>{ord.quantity}</strong></span>
                                    <span>السعر: <strong>{formatCurrency(ord.unitPrice || 0)}</strong></span>
                                    <span className="font-semibold text-primary">
                                      {formatCurrency(ord.totalPrice || 0)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
          {products.length > 0 && (
            <TableFooter className="bg-muted/30 border-t border-border/60">
              <TableRow className="font-bold text-xs">
                <TableCell colSpan={3} className="text-start">
                  الإجمالي العام ({products.length} صنف):
                </TableCell>
                <TableCell className="text-center tabular-nums font-bold">
                  {totalQuantity.toLocaleString()}
                </TableCell>
                <TableCell />
                <TableCell className="text-end font-bold tabular-nums">
                  {formatCurrency(totalAmount)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
};
