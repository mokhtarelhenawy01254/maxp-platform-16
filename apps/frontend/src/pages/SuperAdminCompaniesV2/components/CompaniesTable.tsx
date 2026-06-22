import React, { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import {
  Mail, Facebook, Eye, LogIn, MoreHorizontal, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, Trash2, Pencil, Users, UserPlus, ArrowLeftRight,
  Building2, RefreshCw, BadgeCheck, ChevronDown, ChevronUp, Phone, Search,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Checkbox } from "../../../components/ui/checkbox";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { getCount, getPlanMeta } from "../utils";
import type { Company } from "../types";

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
  searchQuery?: string;
  onOpenDetails: (company: Company) => void;
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
}

export function CompaniesTable({
  companies, totalPages, currentPage, onPageChange, pageSize, totalItems,
  selectedIds, onToggleSelect, onToggleSelectAll,
  isAllVisibleSelected, isSomeVisibleSelected, loading, searchQuery,
  onOpenDetails, onEdit, onDelete,
  onOpenUsers, onOpenFollowUp, onOpenFacebookPages,
  onTransferOwnership, onAddEmployee, onLoginAsAdmin,
  onRunFollowUpAction, isMobile,
}: CompaniesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("isActive", {
      header: "الحالة",
      cell: ({ row }) => {
        const company = row.original;
        const active = company.isActive;
        const followUpAuto = company.followUpAutomation;
        const isCritical = followUpAuto?.needsUrgentEscalation;
        const isAttention = followUpAuto?.needsEscalation && !isCritical;

        if (isCritical) {
          return (
            <Badge variant="outline" className="rounded-full border-rose-300 bg-rose-50 px-2.5 py-1 text-[13px] font-black text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300">
              <span className="ml-1 size-1.5 rounded-full bg-rose-500 animate-pulse" />
              حرجة
            </Badge>
          );
        }
        if (isAttention) {
          return (
            <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-2.5 py-1 text-[13px] font-black text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
              <span className="ml-1 size-1.5 rounded-full bg-amber-500" />
              متابعة
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 text-[13px] font-black",
              active
                ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
            )}
          >
            <span className={cn("ml-1 size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
            {active ? "نشطة" : "متوقفة"}
          </Badge>
        );
      },
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.display({
      id: "stats",
      header: "إحصائيات",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-primary/5 px-2 py-1 text-[12px] font-black text-foreground/80 transition-colors hover:bg-primary/10">
                <Users className="size-3 text-primary/70" />
                <span className="tabular-nums">{getCount(row.original, "users")}</span>
                <span className="text-[10px] font-bold text-muted-foreground/70">عضو</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>عدد المستخدمين</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-emerald-50/60 px-2 py-1 text-[12px] font-black text-foreground/80 transition-colors hover:bg-emerald-100/60 dark:bg-emerald-950/30">
                <BadgeCheck className="size-3 text-emerald-600/70" />
                <span className="tabular-nums">{getCount(row.original, "customers")}</span>
                <span className="text-[10px] font-bold text-muted-foreground/70">عميل</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>عدد العملاء</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-blue-50/60 px-2 py-1 text-[12px] font-black text-foreground/80 transition-colors hover:bg-blue-100/60 dark:bg-blue-950/30">
                <Facebook className="size-3 text-blue-600/70" />
                <span className="tabular-nums">{getCount(row.original, "facebookPages")}</span>
                <span className="text-[10px] font-bold text-muted-foreground/70">صفحة</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>عدد صفحات فيسبوك</TooltipContent>
          </Tooltip>
        </div>
      ),
      meta: { className: "hidden lg:table-cell" },
    }),
    columnHelper.accessor("createdAt", {
      header: "الإنشاء",
      cell: ({ getValue }) => {
        const raw = getValue() as string | null | undefined;
        if (!raw) return <span className="text-xs font-bold text-muted-foreground/50">-</span>;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return <span className="text-xs font-bold text-muted-foreground/50">-</span>;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground/80">{date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">{date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        );
      },
      meta: { className: "hidden lg:table-cell" },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const company = row.original;

        const dropdownActions = [
          { key: "edit", icon: Pencil, label: "تعديل", action: () => onEdit(company) },
          { key: "users", icon: Users, label: "الأعضاء", action: () => onOpenUsers(company) },
          { key: "pages", icon: Building2, label: "صفحات فيسبوك", action: () => onOpenFacebookPages(company) },
          { key: "owner", icon: ArrowLeftRight, label: "نقل الملكية", action: () => onTransferOwnership(company) },
          { key: "employee", icon: UserPlus, label: "إضافة موظف", action: () => onAddEmployee(company) },
          { key: "delete", icon: Trash2, label: "حذف الشركة", action: () => onDelete(company), tone: "text-rose-600 font-black" as const },
        ];

        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => onOpenDetails(company)}>
                  <Eye className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-card">عرض التفاصيل</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label={`إجراءات ${company.name}`} variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-lg border-border/60 p-1 shadow-lg">
                {[
                  { key: "followup", icon: CheckCircle2, label: "إدارة المتابعة", action: () => onOpenFollowUp(company) },
                  { key: "login", icon: LogIn, label: "دخول كأدمن", action: () => onLoginAsAdmin(company), tone: "text-primary font-black" as const },
                  { key: "sep1", sep: true },
                  ...dropdownActions,
                ].map((item: any, idx) => item.sep
                  ? <DropdownMenuSeparator key={item.key} className="bg-border/40" />
                  : (
                    <DropdownMenuItem key={item.key} onClick={item.action} className={cn("rounded px-2.5 py-1.5 text-[13px] font-semibold focus:bg-primary/10 focus:text-primary", item.tone)}>
                      <item.icon className="ml-1.5 size-3.5 opacity-70" aria-hidden="true" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ], [selectedIds, isAllVisibleSelected, isSomeVisibleSelected, expandedId, onAddEmployee, onDelete, onEdit, onLoginAsAdmin, onOpenDetails, onOpenFacebookPages, onOpenFollowUp, onOpenUsers, onRunFollowUpAction, onToggleSelect, onToggleSelectAll, onTransferOwnership]);

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
            <div key={i} className="rounded-lg border border-border/60 bg-white p-3 dark:bg-card">
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
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 bg-white px-3 py-2.5 dark:bg-card">
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
          <Search className="size-8" />
        </div>
        <h3 className="mt-6 text-xl font-black text-foreground">
          {searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : "لا توجد شركات مطابقة"}
        </h3>
        <p className="mt-2 text-sm font-medium text-muted-foreground/80">
          {searchQuery
            ? "لم نعثر على أي شركة تطابق بحثك. جرّب كلمات أخرى أو راجع الفلاتر."
            : "جرّب تعديل الفلاتر أو أضف شركة جديدة للبدء."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isMobile ? (
        <div className="space-y-3">
          {companies.map((company) => {
            const meta = getPlanMeta(company.plan);
            const isExpanded = expandedId === company.id;
            const attention = company.followUpAutomation?.needsEscalation || company.followUpAutomation?.needsUrgentEscalation;
            const critical = company.followUpAutomation?.needsUrgentEscalation;
            return (
              <div key={company.id} className={cn(
                "rounded-lg border bg-white shadow-sm dark:bg-card",
                attention ? "border-l-2 border-l-amber-400 border-amber-200 bg-amber-50/25" : "border-border/60",
                critical && "border-l-rose-500 bg-rose-50/35",
              )}>
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
                        <div key={key} className="rounded-lg border border-border/40 bg-white px-2 py-2 text-center dark:bg-card">
                          <p className="text-base font-black text-foreground">{getCount(company, key)}</p>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/60">{key === "users" ? "أعضاء" : key === "customers" ? "عملاء" : "صفحات"}</p>
                        </div>
                      ))}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        {company.phone && (
                          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Phone className="size-3.5 text-primary/60" /> {company.phone}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Button type="button" size="sm" variant="default" className="h-9 rounded-lg text-xs font-black shadow-sm" onClick={() => onOpenFollowUp(company)}>
                            <CheckCircle2 className="ml-1.5 size-3.5" /> متابعة
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg text-xs font-black" onClick={() => onLoginAsAdmin(company)}>
                            <LogIn className="ml-1.5 size-3.5" /> دخول كأدمن
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg text-xs font-black" onClick={() => onOpenUsers(company)}>
                            <Users className="ml-1.5 size-3.5" /> الأعضاء
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg text-xs font-black" onClick={() => onOpenFacebookPages(company)}>
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
        <div className="rounded-lg border border-border/60 bg-white shadow-sm dark:bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 dark:bg-card/95">
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
                {table.getRowModel().rows.map((row, idx) => {
                  const company = row.original;
                   const attention = company.followUpAutomation?.needsEscalation || company.followUpAutomation?.needsUrgentEscalation;
                   const critical = company.followUpAutomation?.needsUrgentEscalation;
                  return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "group/row border-border/40 transition-colors hover:bg-primary/5 cursor-pointer",
                        idx % 2 === 1 && "bg-muted/[0.03]",
                        attention && "border-l-2 border-l-amber-400 bg-amber-50/[0.25] hover:bg-amber-50/40",
                        critical && "border-l-2 border-l-rose-500 bg-rose-50/[0.35] hover:bg-rose-50/50",
                      )}
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
                )})}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white p-2 shadow-sm dark:bg-card md:flex-row md:items-center md:justify-between">
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
  company, onOpenFollowUp, onOpenUsers, onOpenFacebookPages,
  onLoginAsAdmin, onEdit, onDelete, onTransferOwnership, onAddEmployee,
  onRunFollowUpAction,
}: {
  company: Company;
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
  const followUp = company.followUp;
  const followUpAuto = company.followUpAutomation;

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Left: follow-up status */}
      <div className="min-w-[200px] flex-1 space-y-3">
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

        {followUpAuto?.needsUrgentEscalation || followUpAuto?.needsEscalation ? (
          <div className="rounded-lg border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="ml-1.5 inline size-3" />
            {followUpAuto?.needsUrgentEscalation ? "حرجة: تحتاج تصعيدًا فوريًا" : "مستحقة أكثر من 24 ساعة — تحتاج تصعيدًا"}
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
