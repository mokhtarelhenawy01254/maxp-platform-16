import React from "react";
import { Edit, Percent } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

export const getPartnerStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "PENDING":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "REJECTED":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border/60";
  }
};

interface PlatformPartnersTableProps {
  partners: any[];
  formatPrice: (val: number) => string;
  onEditRank: (partner: any) => void;
  onEditRate: (partner: any) => void;
}

export function PlatformPartnersTable({
  partners,
  formatPrice,
  onEditRank,
  onEditRate,
}: PlatformPartnersTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30 text-[11px] font-mono">
          <TableRow className="border-b border-border/70 hover:bg-transparent">
            <TableHead className="font-medium text-muted-foreground">الشريك</TableHead>
            <TableHead className="font-medium text-muted-foreground">اللقب والمستوى</TableHead>
            <TableHead className="font-medium text-muted-foreground">إجمالي الأرباح</TableHead>
            <TableHead className="font-medium text-muted-foreground">الرصيد المتاح</TableHead>
            <TableHead className="font-medium text-muted-foreground">الحالة</TableHead>
            <TableHead className="text-center font-medium text-muted-foreground w-16">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-12 text-center text-muted-foreground text-xs font-mono">
                لا يوجد شركاء مسجلون حالياً
              </TableCell>
            </TableRow>
          ) : (
            partners.map((partner) => (
              <TableRow key={partner.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors text-xs">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7 bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                      <AvatarFallback>
                        {partner.user?.firstName?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {partner.user?.firstName} {partner.user?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {partner.partnerCode || partner.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-foreground border border-border/40 font-mono">
                    {partner.title || "PARTNER"}
                  </span>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {partner.customCommissionRate != null
                      ? `نسبة مخصصة: ${partner.customCommissionRate}%`
                      : "النسبة العامة للمنصة"}
                  </div>
                </TableCell>

                <TableCell className="font-mono tabular-nums text-xs font-semibold">
                  {formatPrice(partner.totalEarnings || 0)}
                </TableCell>

                <TableCell className="font-mono tabular-nums text-xs font-semibold text-primary">
                  {formatPrice(partner.pendingEarnings || 0)}
                </TableCell>

                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${getPartnerStatusBadge(partner.status)}`}>
                    {partner.status || "ACTIVE"}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded text-muted-foreground hover:text-foreground"
                      title="تعديل الرتبة"
                      onClick={() => onEditRank(partner)}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded text-muted-foreground hover:text-foreground"
                      title="نسبة عمولة مخصصة"
                      onClick={() => onEditRate(partner)}
                    >
                      <Percent className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
