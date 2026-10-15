import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { FileText, Inbox } from "lucide-react";

interface OrderItem {
  id: string;
  customerName: string;
  date: string;
  total: number;
  paymentMethod: string;
  lastUpdated: string;
}

interface Props {
  orders: OrderItem[];
  statusName: string;
  formatDate: (date: string) => string;
  formatCurrency: (val: number) => string;
}

export const StatusAnalysisTable: React.FC<Props> = ({
  orders,
  statusName,
  formatDate,
  formatCurrency,
}) => {
  return (
    <Card className="bg-card border-border/70 shadow-xs overflow-hidden">
      <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border/60 bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>سجل الطلبات المرتبطة بالحالة ({statusName})</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground font-mono tabular-nums">
            إجمالي {orders.length} طلب
          </span>
        </CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
            <tr>
              <th className="px-4 sm:px-6 py-3">رقم الطلب</th>
              <th className="px-4 sm:px-6 py-3">العميل</th>
              <th className="px-4 sm:px-6 py-3">تاريخ الإنشاء</th>
              <th className="px-4 sm:px-6 py-3">إجمالي القيمة</th>
              <th className="px-4 sm:px-6 py-3">طريقة الدفع</th>
              <th className="px-4 sm:px-6 py-3">آخر تحديث</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-foreground">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Inbox className="h-9 w-9 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-medium">لا توجد طلبات مسجلة لهذه الحالة بالفترة المحددة</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 sm:px-6 py-3 font-mono font-medium text-primary">
                    #{order.id}
                  </td>
                  <td className="px-4 sm:px-6 py-3 font-medium">
                    {order.customerName}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground font-mono tabular-nums">
                    {formatDate(order.date)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 font-bold font-mono tabular-nums text-foreground">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/70 font-mono">
                      {order.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground font-mono tabular-nums">
                    {formatDate(order.lastUpdated)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
