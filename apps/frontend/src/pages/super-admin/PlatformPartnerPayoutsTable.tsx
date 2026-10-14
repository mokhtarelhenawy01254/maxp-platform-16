import React from "react";
import { Edit, Landmark } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { getPartnerStatusBadge } from "./PlatformPartnersTable";

interface PlatformPartnerPayoutsTableProps {
  payouts: any[];
  formatPrice: (val: number) => string;
  onEditPayout: (payout: any) => void;
}

export function PlatformPartnerPayoutsTable({
  payouts,
  formatPrice,
  onEditPayout,
}: PlatformPartnerPayoutsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30 text-[11px] font-mono">
          <TableRow className="border-b border-border/70 hover:bg-transparent">
            <TableHead className="font-medium text-muted-foreground">الشريك</TableHead>
            <TableHead className="font-medium text-muted-foreground">المبلغ المطلوب</TableHead>
            <TableHead className="font-medium text-muted-foreground">طريقة التحويل والبيانات</TableHead>
            <TableHead className="font-medium text-muted-foreground">تاريخ الطلب</TableHead>
            <TableHead className="font-medium text-muted-foreground">الحالة</TableHead>
            <TableHead className="text-center font-medium text-muted-foreground w-16">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-12 text-center text-muted-foreground text-xs font-mono">
                لا توجد طلبات سحب حالياً
              </TableCell>
            </TableRow>
          ) : (
            payouts.map((payout) => (
              <TableRow key={payout.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors text-xs">
                <TableCell>
                  <p className="text-xs font-semibold text-foreground">
                    {payout.partner?.user?.firstName} {payout.partner?.user?.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {payout.partner?.partnerCode}
                  </p>
                </TableCell>

                <TableCell className="font-mono tabular-nums text-xs font-bold text-destructive">
                  {formatPrice(payout.amount || 0)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Landmark className="size-3.5 text-muted-foreground" />
                    <span>{payout.method}</span>
                    {payout.accountNumber && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ({payout.accountNumber})
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-mono text-[11px] text-muted-foreground">
                  {new Date(payout.createdAt || Date.now()).toLocaleDateString("ar-EG")}
                </TableCell>

                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${getPartnerStatusBadge(payout.status)}`}>
                    {payout.status}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  {payout.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded text-muted-foreground hover:text-foreground"
                      title="معالجة طلب السحب"
                      onClick={() => onEditPayout(payout)}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
