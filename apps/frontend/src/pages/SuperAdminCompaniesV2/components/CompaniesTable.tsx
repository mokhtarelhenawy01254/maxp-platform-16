import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper, getExpandedRowModel } from "@tanstack/react-table";
import {
  Mail, Facebook, Eye, LogIn, MoreHorizontal, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, Trash2, Pencil, Users, UserPlus, ArrowLeftRight,
  Building2, RefreshCw, BadgeCheck, ChevronDown, ChevronUp, Phone,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Checkbox } from "../../../components/ui/checkbox";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { Separator } from "../../../components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { getCount, getPlanMeta, formatDate } from "../utils";
import type { Company, QuickStats } from "../types";

const columnHelper = createColumnHelper<Company>();

interface CompaniesTableProps {
  companies: Company[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  isAllVisibleSelected: boolean;
  isSomeVisibleSelected: boolean;
  loading: boolean;
  onOpenDetails: (company: Company) => void;
  onOpenIntervention: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onOpenUsers: (company: Company) => void;
  onOpenFollowUp: (company: Company) => void;
  onOpenFacebookPages: (company: Company) => void;
  onTransferOwnership: (company: Company) => void;
  onAddEmployee: (company: Company) => void;
  onLoginAsAdmin: (company: Company) => void;
  onRunFollowUpAction: (company: Company, action: "remind" | "escalate") => void;
  isMobile: boolean;
  stats: QuickStats;
}

export function CompaniesTable({
  companies, totalPages, currentPage, onPageChange, pageSize, totalItems,
  selectedIds, onToggleSelect, onToggleSelectAll,
  isAllVisibleSelected, isSomeVisibleSelected, loading,
  onOpenDetails, onOpenIntervention, onEdit, onDelete,
  onOpenUsers, onOpenFollowUp, onOpenFacebookPages,
  onTransferOwnership, onAddEmployee, onLoginAsAdmin,
  onRunFollowUpAction, isMobile, stats,
}: CompaniesTableProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const columns = useMemo(() => [
    columnHelper.display({
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <button
          type="button"
          aria-label={expandedId === row.original.id ? "طي التفاصيل" : "عرض التفاصيل"}
          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === row.original.id ? null : row.original.id); }}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {expandedId === row.original.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      ),
      meta: { className: "w-10" },
    }),
    columnHelper.display({
      id: "select",
      header: () => (
        <Checkbox
          aria-label={isAllVisibleSelected ? "إلغاء تحديد الشركات الظاهرة" : "تحديد الشركات الظاهرة"}
          checked={isAllVisibleSelected}
          indeterminate={isSomeVisibleSelected}
          onCheckedChange={(checked) => onToggleSelectAll(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`تحديد ${row.original.name}`}
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={() => onToggleSelect(row.original.id)}
        />
      ),
      meta: { className: "w-14" },
    }),
    columnHelper.accessor("name", {
      header: "الشركة",
      cell: ({ row }) => (
        <div className="space-y-1">
          <button
            type="button"
            className="text-right text-xs font-bold text-foreground hover:text-primary"
            onClick={() => onOpenDetails(row.original)}
          >
            {row.original.name}
          </button>
          <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Mail className="size-3" />
            {row.original.email}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("plan", {
      header: "الخطة",
      cell: ({ getValue }) => {
        const meta = getPlanMeta(getValue());
        return <Badge variant="outline" className={cn("rounded-full border-primary/20 bg-primary/5 px-2.5 py-1 text-[13px] font-black text-primary", meta.className)}>{meta.label}</Badge>;
      },
      meta: { className: "hidden lg:table-cell" },
    }),
    columnHelper.accessor("isActive", {
      header: "الحالة",
      cell: ({ getValue }) => {
        const active = getValue();
        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 text-[13px] font-black",
              active
                ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-rose-200/60 bg-rose-50/50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400",
            )}
          >
            {active ? "نشطة" : "متوقفة"}
          </Badge>
        );
      },
      meta: { className: "hidden lg:table-cell" },
    }),
    columnHelper.display({
      id: "funnel",
      header: "الرحلة",
      cell: ({ row }) => {
        const company = row.original;
        const funnelSummary = company.funnelSummary;
        const followUp = company.followUp;
        if (!funnelSummary) return null;
        return (
          <div className="space-y-1.5 min-w-[180px]">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-black", funnelSummary.badgeClassName)}>
                {funnelSummary.label}
              </Badge>
              <span className="text-xs font-black text-muted-foreground">{funnelSummary.progressLabel}</span>
            </div>
            {followUp ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <div className={cn("size-2 rounded-full", followUp.statusMeta.className.replace("bg-", "bg-").replace("text-", "bg-"))} />
                <span className="text-xs font-bold text-foreground/80">{followUp.statusMeta.label}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-medium text-muted-foreground">{followUp.assignedOwner.label || "بدون مسؤول"}</span>
              </div>
            ) : null}
          </div>
        );
      },
      meta: { className: "hidden xl:table-cell" },
    }),
    columnHelper.display({
      id: "lastActivity",
      header: "آخر نشاط",
      cell: ({ row }) => {
        const act = row.original.funnelLastActivity;
        const stale = row.original.funnelStaleStatus;
        if (!act) return null;
        return (
          <div className="space-y-1 min-w-[140px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black text-foreground">{act.relativeLabel}</span>
              {stale?.isPending ? (
                <div className={cn("size-2 animate-pulse rounded-full", stale.badgeClassName.replace("border-", "bg-").replace("text-", "bg-"))} />
              ) : null}
            </div>
            <p className="text-xs font-medium text-muted-foreground line-clamp-1">{act.label}</p>
          </div>
        );
      },
      meta: { className: "hidden xl:table-cell" },
    }),
    columnHelper.display({
      id: "stats",
      header: "إحصائيات",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Tooltip><TooltipTrigger asChild><span className="inline-flex cursor-help items-center gap-1 text-[13px] font-black text-muted-foreground transition-colors hover:text-foreground"><Users className="size-3 text-primary/60" />{getCount(row.original, "users")}</span></TooltipTrigger><TooltipContent>مستخدمين</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><span className="inline-flex cursor-help items-center gap-1 text-[13px] font-black text-muted-foreground transition-colors hover:text-foreground"><BadgeCheck className="size-3 text-emerald-500/60" />{getCount(row.original, "customers")}</span></TooltipTrigger><TooltipContent>عملاء</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><span className="inline-flex cursor-help items-center gap-1 text-[13px] font-black text-muted-foreground transition-colors hover:text-foreground"><Facebook className="size-3 text-blue-500/60" />{getCount(row.original, "facebookPages")}</span></TooltipTrigger><TooltipContent>صفحات فيسبوك</TooltipContent></Tooltip>
        </div>
      ),
      meta: { className: "hidden xl:table-cell" },
    }),
    columnHelper.accessor("createdAt", {
      header: "الإنشاء",
      cell: ({ getValue }) => <span className="text-xs font-bold text-muted-foreground/70">{formatDate(getValue())}</span>,
      meta: { className: "hidden 2xl:table-cell" },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const company = row.original;
        const followUpAuto = company.followUpAutomation;
        const isHovered = hoveredId === company.id;

        const dropdownActions = [
          { key: "edit", icon: Pencil, label: "تعديل", action: () => onEdit(company) },
          { key: "users", icon: Users, label: "الأعضاء", action: () => onOpenUsers(company) },
          { key: "pages", icon: Building2, label: "صفحات فيسبوك", action: () => onOpenFacebookPages(company) },
          { key: "owner", icon: ArrowLeftRight, label: "نقل الملكية", action: () => onTransferOwnership(company) },
          { key: "employee", icon: UserPlus, label: "إضافة موظف", action: () => onAddEmployee(company) },
          { key: "delete", icon: Trash2, label: "حذف الشركة", action: () => onDelete(company), tone: "text-rose-600 font-black" as const },
        ];

        return (
          <div
            className="flex items-center gap-1"
            onMouseEnter={() => setHoveredId(company.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className={cn("flex items-center gap-1 transition-opacity duration-150", isHovered ? "opacity-100" : "opacity-0 pointer-events-none")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => onOpenFollowUp(company)}>
                    <CheckCircle2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-slate-900">إدارة المتابعة</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => onOpenDetails(company)}>
                    <Eye className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-slate-900">عرض التفاصيل</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => onLoginAsAdmin(company)}>
                    <LogIn className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-slate-900">دخول كأدمن</TooltipContent>
              </Tooltip>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label={`إجراءات ${company.name}`} variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg border-border/60 p-0.5 shadow-lg">
                {dropdownActions.map((item, idx) => (
                  <React.Fragment key={item.key}>
                    {idx === dropdownActions.length - 1 ? <DropdownMenuSeparator className="bg-border/40" /> : null}
                    <DropdownMenuItem onClick={item.action} className={cn("rounded px-2 py-1 text-xs font-semibold focus:bg-primary/10 focus:text-primary", item.tone)}>
                      <item.icon className="ml-1.5 size-3 opacity-70" aria-hidden="true" />
                      {item.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ], [selectedIds, isAllVisibleSelected, isSomeVisibleSelected, expandedId, hoveredId, onAddEmployee, onDelete, onEdit, onLoginAsAdmin, onOpenDetails, onOpenFacebookPages, onOpenFollowUp, onOpenUsers, onRunFollowUpAction, onToggleSelect, onToggleSelectAll, onTransferOwnership]);

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(isMobile ? 4 : 8)].map((_, i) => (
          isMobile ? (
            <div key={i} className="rounded-lg border border-border/60 bg-white p-3 dark:bg-slate-950">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-1 size-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 bg-white px-3 py-2.5 dark:bg-slate-950">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="size-5 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md hidden lg:block" />
              <Skeleton className="h-6 w-14 rounded-md hidden lg:block" />
              <Skeleton className="h-6 w-24 rounded-md hidden xl:block" />
              <Skeleton className="h-6 w-20 rounded-md hidden xl:block" />
              <div className="flex gap-2">
                <Skeleton className="size-7 rounded-md hidden xl:block" />
                <Skeleton className="size-7 rounded-md hidden xl:block" />
                <Skeleton className="size-7 rounded-md hidden xl:block" />
              </div>
              <Skeleton className="size-7 rounded-md" />
            </div>
          )
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/8 text-primary shadow-inner">
          <Building2 className="size-8" />
        </div>
        <h3 className="mt-6 text-xl font-black text-foreground">لا توجد شركات مطابقة</h3>
        <p className="mt-2 text-sm font-medium text-muted-foreground/80">جرّب تعديل الفلاتر أو أضف شركة جديدة للبدء.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isMobile ? (
        <div className="space-y-3">
          {companies.map((company) => {
            const meta = getPlanMeta(company.plan);
            const funnelSummary = company.funnelSummary;
            const followUp = company.followUp;
            const isExpanded = expandedId === company.id;
            return (
              <div key={company.id} className="rounded-lg border border-border/60 bg-white shadow-sm dark:bg-slate-950">
                <div className="flex items-start gap-3 p-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <Checkbox 
                      aria-label={`تحديد ${company.name}`}
                      checked={selectedIds.includes(company.id)} 
                      onCheckedChange={() => onToggleSelect(company.id)} 
                      className="size-4 rounded-md border-border/60"
                    />
                    <button
                      type="button"
                      aria-label={isExpanded ? "طي التفاصيل" : "عرض التفاصيل"}
                      onClick={() => setExpandedId(isExpanded ? null : company.id)}
                      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button type="button" className="text-right text-base font-black text-foreground hover:text-primary" onClick={() => onOpenDetails(company)}>
                          {company.name}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn("rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-black text-primary", meta.className)}>{meta.label}</Badge>
                          <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-xs font-black", company.isActive ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-rose-200/60 bg-rose-50 text-rose-700")}>
                            {company.isActive ? "نشطة" : "متوقفة"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          onClick={() => onOpenFollowUp(company)}
                          aria-label="متابعة"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label={`إجراءات ${company.name}`} variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-lg p-1.5 shadow-xl">
                            <DropdownMenuItem onClick={() => onOpenDetails(company)} className="rounded-lg px-3 py-2 text-[13px] font-bold">
                              <Eye className="ml-2 size-3.5 opacity-70" /> عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenFollowUp(company)} className="rounded-lg px-3 py-2 text-[13px] font-bold">
                              <CheckCircle2 className="ml-2 size-3.5 opacity-70" /> إدارة المتابعة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onLoginAsAdmin(company)} className="rounded-lg px-3 py-2 text-[13px] font-black text-primary">
                              <LogIn className="ml-2 size-3.5 opacity-70" /> دخول كأدمن
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/40" />
                            <DropdownMenuItem onClick={() => onEdit(company)} className="rounded-lg px-3 py-2 text-[13px] font-bold">
                              <Pencil className="ml-2 size-3.5 opacity-70" /> تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(company)} className="rounded-lg px-3 py-2 text-[13px] font-bold text-rose-600">
                              <Trash2 className="ml-2 size-3.5 opacity-70" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1.5 text-[13px] font-medium text-muted-foreground">
                      <p className="flex items-center gap-2"><Mail className="size-3.5 text-primary/60" /> {company.email}</p>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["users", "customers", "facebookPages"] as const).map((key) => (
                        <div key={key} className="rounded-lg border border-border/40 bg-white px-2 py-2 text-center dark:bg-slate-900">
                          <p className="text-base font-black text-foreground">{getCount(company, key)}</p>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/60">{key === "users" ? "أعضاء" : key === "customers" ? "عملاء" : "صفحات"}</p>
                        </div>
                      ))}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        {funnelSummary ? (
                          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                            <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-black", funnelSummary.badgeClassName)}>
                              {funnelSummary.label}
                            </Badge>
                            <span className="text-xs font-bold text-muted-foreground">{funnelSummary.progressLabel}</span>
                          </div>
                        ) : null}
                        {company.phone && (
                          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Phone className="size-3.5 text-primary/60" /> {company.phone}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" className="h-8 flex-1 rounded-lg text-xs font-black" onClick={() => onOpenUsers(company)}>
                            <Users className="ml-1.5 size-3.5" /> الأعضاء
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-8 flex-1 rounded-lg text-xs font-black" onClick={() => onOpenFacebookPages(company)}>
                            <Facebook className="ml-1.5 size-3.5" /> الصفحات
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 dark:bg-slate-900/40">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-border/40 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className={cn("h-8 px-2 text-right text-xs font-black uppercase tracking-wider text-muted-foreground/80", (header.column.columnDef.meta as { className?: string })?.className)}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className="group/row border-border/40 transition-colors hover:bg-primary/5 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cn("px-2 py-1", (cell.column.columnDef.meta as { className?: string })?.className)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedId === row.original.id ? (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/10 px-6 py-4">
                          <ExpandedRowContent
                            company={row.original}
                            onOpenDetails={onOpenDetails}
                            onOpenFollowUp={onOpenFollowUp}
                            onOpenUsers={onOpenUsers}
                            onOpenFacebookPages={onOpenFacebookPages}
                            onLoginAsAdmin={onLoginAsAdmin}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onTransferOwnership={onTransferOwnership}
                            onAddEmployee={onAddEmployee}
                            onRunFollowUpAction={onRunFollowUpAction}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white p-2 shadow-sm dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground/70">
          <span className="rounded-md bg-muted/30 px-2.5 py-1">صفحة {currentPage} من {totalPages}</span>
          <span className="hidden md:inline">— عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} من {totalItems}</span>
        </div>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs font-black border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronRight className="ml-1 size-3" /> السابق
          </Button>
          <div className="flex items-center gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                page = start + i;
              }
              return (
                <Button
                  key={page}
                  type="button"
                  aria-label={`فتح صفحة ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon-sm"
                  className={cn(
                    "h-7 min-w-7 rounded-md text-xs font-black transition-all",
                    page === currentPage
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5",
                  )}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs font-black border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            التالي <ChevronLeft className="mr-1 size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpandedRowContent({
  company, onOpenDetails, onOpenFollowUp, onOpenUsers, onOpenFacebookPages,
  onLoginAsAdmin, onEdit, onDelete, onTransferOwnership, onAddEmployee,
  onRunFollowUpAction,
}: {
  company: Company;
  onOpenDetails: (c: Company) => void;
  onOpenFollowUp: (c: Company) => void;
  onOpenUsers: (c: Company) => void;
  onOpenFacebookPages: (c: Company) => void;
  onLoginAsAdmin: (c: Company) => void;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
  onTransferOwnership: (c: Company) => void;
  onAddEmployee: (c: Company) => void;
  onRunFollowUpAction: (c: Company, a: "remind" | "escalate") => void;
}) {
  const funnelSummary = company.funnelSummary;
  const followUp = company.followUp;
  const followUpAuto = company.followUpAutomation;
  const stale = company.funnelStaleStatus;

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Left: funnel & activity summary */}
      <div className="min-w-[200px] flex-1 space-y-3">
        {funnelSummary ? (
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">مرحلة الرحلة</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-black", funnelSummary.badgeClassName)}>
                {funnelSummary.label}
              </Badge>
              <span className="text-xs font-bold text-muted-foreground/80">{funnelSummary.progressLabel}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/70">{funnelSummary.hint}</p>
          </div>
        ) : null}

        {followUp ? (
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">حالة المتابعة</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-black", followUp.statusMeta.className)}>
                {followUp.statusMeta.label}
              </Badge>
              <span className="text-xs text-muted-foreground">المسؤول: {followUp.assignedOwner.label || "بدون"}</span>
            </div>
          </div>
        ) : null}

        {stale?.isStale72h ? (
          <div className="rounded-lg border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="ml-1.5 inline size-3" />
            {stale.label || "متوقفة منذ أكثر من 72 ساعة"}
          </div>
        ) : null}
      </div>

      {/* Right: action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="default" className="h-8 rounded-lg text-xs font-black shadow-sm" onClick={() => onOpenFollowUp(company)}>
          <CheckCircle2 className="ml-1.5 size-3.5" /> متابعة
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onLoginAsAdmin(company)}>
          <LogIn className="ml-1.5 size-3.5" /> دخول كأدمن
        </Button>
        {followUpAuto?.needsUrgentEscalation || followUpAuto?.needsEscalation ? (
          <Button type="button" size="sm" variant="destructive" className="h-8 rounded-lg text-xs font-black" onClick={() => onRunFollowUpAction(company, "escalate")}>
            <AlertTriangle className="ml-1.5 size-3.5" /> تصعيد
          </Button>
        ) : followUpAuto?.needsReminder ? (
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => onRunFollowUpAction(company, "remind")}>
            <RefreshCw className="ml-1.5 size-3.5" /> تذكير
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onOpenUsers(company)}>
          <Users className="ml-1.5 size-3.5" /> الأعضاء
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onOpenFacebookPages(company)}>
          <Facebook className="ml-1.5 size-3.5" /> الصفحات
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onTransferOwnership(company)}>
          <ArrowLeftRight className="ml-1.5 size-3.5" /> نقل ملكية
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onAddEmployee(company)}>
          <UserPlus className="ml-1.5 size-3.5" /> موظف
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs font-black" onClick={() => onEdit(company)}>
          <Pencil className="ml-1.5 size-3.5" /> تعديل
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => onDelete(company)}>
          <Trash2 className="ml-1.5 size-3.5" /> حذف
        </Button>
      </div>
    </div>
  );
}
