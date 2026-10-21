import React from "react";
import {
  Users, Search, FileDown, Send, CheckCircle2, Ban, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CustomerList, ListMember, rfmTierMeta } from "./types";
import { criteriaSummary, formatDate } from "./criteriaUtils";
import { PER_PAGE } from "./useCustomerListsController";

interface CustomerListMembersDrawerProps {
  detailList: CustomerList | null;
  onClose: () => void;
  members: ListMember[];
  membersLoading: boolean;
  membersPage: number;
  membersTotal: number;
  memberSearch: string;
  onMemberSearchChange: (val: string) => void;
  onMemberPageChange: (page: number) => void;
  onExportCsv: () => void;
  onWhatsAppSend: (list: CustomerList) => void;
}

export const CustomerListMembersDrawer: React.FC<CustomerListMembersDrawerProps> = ({
  detailList,
  onClose,
  members,
  membersLoading,
  membersPage,
  membersTotal,
  memberSearch,
  onMemberSearchChange,
  onMemberPageChange,
  onExportCsv,
  onWhatsAppSend,
}) => {
  return (
    <Sheet open={!!detailList} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-[color:var(--shell-control-border)] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{detailList?.name}</SheetTitle>
              <SheetDescription className="truncate">
                {criteriaSummary(detailList?.criteria)} • {membersTotal.toLocaleString("ar-EG")} عميل
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                value={memberSearch}
                onChange={(e) => onMemberSearchChange(e.target.value)}
                placeholder="ابحث في الأعضاء..."
                className="h-10 rounded-full border-[color:var(--shell-control-border)] pr-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={onExportCsv}
              disabled={!members.length}
            >
              <FileDown className="size-4" /> تصدير CSV
            </Button>
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[color:var(--shell-control-border)] px-6 py-12 text-center">
              <Users className="size-8 text-[color:var(--color-muted-foreground)] opacity-40" />
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                لا يوجد عملاء في هذه القائمة
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--shell-control-border)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الإنفاق</TableHead>
                    <TableHead className="text-right">القيمة</TableHead>
                    <TableHead className="text-right">آخر نشاط</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-xs font-semibold text-[color:var(--color-primary)]">
                            {(m.name || "?").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            {m.email ? (
                              <p className="truncate text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                                {m.email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-sm tabular-nums font-mono">
                        {m.phone || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-sm font-medium tabular-nums font-mono">
                        {(m.totalSpent ?? 0).toLocaleString("ar-EG")}
                        <span className="mr-1 text-xs text-[color:var(--color-muted-foreground)]">ج.م</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const tier = rfmTierMeta(m.rfmTier);
                            return (
                              <span
                                className={cn(
                                  "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  tier.cls,
                                )}
                              >
                                <Star className="size-3" />
                                {tier.label}
                                {typeof m.rfmScore === "number" ? ` • ${m.rfmScore}` : ""}
                              </span>
                            );
                          })()}
                          {(m.ordersCount ?? 0) > 0 ? (
                            <span className="text-[10px] tabular-nums font-mono text-[color:var(--color-muted-foreground)]">
                              {m.ordersCount} طلب
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[color:var(--color-muted-foreground)]">
                        {formatDate(m.lastActivity)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            m.status === "active"
                              ? "bg-[color:color-mix(in_srgb,var(--color-success)_15%,var(--color-card))] text-[color:var(--color-success)]"
                              : "bg-[color:color-mix(in_srgb,var(--color-muted)_100%,transparent)] text-[color:var(--color-muted-foreground)]",
                          )}
                        >
                          {m.status === "active" ? <CheckCircle2 className="size-3" /> : <Ban className="size-3" />}
                          {m.status === "active" ? "نشط" : "غير نشط"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {membersTotal > PER_PAGE && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs tabular-nums font-mono text-[color:var(--color-muted-foreground)]">
                الصفحة {membersPage} من {Math.ceil(membersTotal / PER_PAGE)}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={membersPage <= 1}
                  onClick={() => onMemberPageChange(membersPage - 1)}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={membersPage * PER_PAGE >= membersTotal}
                  onClick={() => onMemberPageChange(membersPage + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-[color:var(--shell-control-border)] pt-3">
          <Button
            className="w-full rounded-full"
            onClick={() => detailList && onWhatsAppSend(detailList)}
          >
            <Send className="size-4" /> إرسال عبر واتساب ({membersTotal.toLocaleString("ar-EG")} عميل)
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
