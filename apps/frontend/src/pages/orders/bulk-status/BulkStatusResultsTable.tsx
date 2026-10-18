import React from "react";
import { FileText, Search, CheckCircle2, XCircle } from "lucide-react";
import type { BulkStatusResultRow } from "../../../services/bulkStatusUpdateService";
import { Card, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

interface BulkStatusResultsTableProps {
  results: BulkStatusResultRow[];
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
}

export const BulkStatusResultsTable: React.FC<BulkStatusResultsTableProps> = ({
  results,
  filterQuery,
  onFilterQueryChange,
}) => {
  const filteredResults = results.filter(
    (r) =>
      r.orderNumber.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (r.error && r.error.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <Card className="bg-card border-border/70 shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>سجل تفاصيل معالجة الطلبات</span>
        </CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => onFilterQueryChange(e.target.value)}
            placeholder="بحث برقم الطلب..."
            className="w-full pr-8 pl-3 py-1 text-xs bg-background border border-border/70 rounded-md text-foreground focus:outline-hidden"
          />
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
            <tr>
              <th className="px-4 sm:px-6 py-3">رقم الطلب</th>
              <th className="px-4 sm:px-6 py-3">الحالة المطلوبة</th>
              <th className="px-4 sm:px-6 py-3">حالة العملية</th>
              <th className="px-4 sm:px-6 py-3">ملاحظات / سبب الخطأ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-foreground">
            {filteredResults.map((r, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 sm:px-6 py-3 font-mono font-medium text-primary">
                  #{r.orderNumber}
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 sm:px-6 py-3">
                  {r.success ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> تم التحديث
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                      <XCircle className="h-3.5 w-3.5" /> فشل التحديث
                    </span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-3 text-muted-foreground text-[11px]">
                  {r.error || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default BulkStatusResultsTable;
