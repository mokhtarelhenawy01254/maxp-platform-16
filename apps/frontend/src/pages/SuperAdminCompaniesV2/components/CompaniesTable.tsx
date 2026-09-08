import React, { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import {
  Mail, Facebook, Eye, LogIn, MoreHorizontal, ChevronLeft, ChevronRight,
  CheckCircle2, AlertTriangle, Trash2, Pencil, Users, UserPlus, ArrowLeftRight,
  Building2, RefreshCw, BadgeCheck, ChevronDown, ChevronUp, Phone, Search, MessageCircle, Package,
  ExternalLink, Store, KeyRound, ShoppingBag, Wallet, Globe, Sparkles
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
import { getCount, getStorefrontUrl, getStorefrontDisplay, getSubscriptionBadge } from "../utils";
import type { Company } from "../types";

const columnHelper = createColumnHelper<Company>();

function getWhatsAppUrl(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "").replace(/^0+/, "");
  const full = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned.startsWith("20") ? cleaned : `20${cleaned}`;
  return `https://wa.me/${full}`;
}

function getCallStatusLabel(callStatus: string | null | undefined): string {
  switch (callStatus) {
    case "answered": return "تم الرد";
    case "no_answer": return "لم يرد";
    case "call_back_later": return "معاودة الاتصال";
    default: return "لم يتم الاتصال";
  }
}

function getCallStatusColor(callStatus: string | null | undefined): string {
  switch (callStatus) {
    case "answered": return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800";
    case "no_answer": return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800";
    case "call_back_later": return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
    default: return "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800";
  }
}

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
  onOpenWhatsApp?: (company: Company) => void;
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
  onOpenWhatsApp, onTransferOwnership, onAddEmployee, onLoginAsAdmin,
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
      meta: { className: "w-8" },
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
      meta: { className: "w-10" },
    }),
    columnHelper.accessor("name", {
      header: "الشركة والمتجر",
      cell: ({ row }) => {
        const company = row.original;
        const waUrl = getWhatsAppUrl(company.phone);
        const storefrontUrl = getStorefrontUrl(company);
        const storefrontDisplay = getStorefrontDisplay(company);

        return (
          <div className="space-y-1 py-1 min-w-[190px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="text-right text-xs font-black text-foreground hover:text-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); onOpenDetails(company); }}
              >
                {company.name}
              </button>
              {storefrontUrl ? (
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/25 shrink-0"
                  title={`معاينة المتجر الحي: ${storefrontDisplay}`}
                >
                  <Store className="size-2.5" />
                  متجر
                  <ExternalLink className="size-2 opacity-60" />
                </a>
              ) : null}
              {company.businessSpecialty ? (
                <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-black text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {company.businessSpecialty.nameAr || company.businessSpecialty.nameEn}
                </Badge>
              ) : (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/70 bg-muted/40 border border-border/40">
                  عام
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Mail className="size-3" />
              {company.email}
            </p>
            {company.phone ? (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/80 dir-ltr font-mono">
                  <Phone className="size-2.5 opacity-70" />
                  {company.phone}
                </span>
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                    title="مراسلة واتساب فورية"
                  >
                    <MessageCircle className="size-2.5" /> واتساب
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "subscription",
      header: "الاشتراك والمحفظة",
      cell: ({ row }) => {
        const company = row.original;
        const subBadge = getSubscriptionBadge(company);
        const balance = company.wallet?.balance ?? 0;
        const isLowBalance = balance <= 0;

        return (
          <div className="space-y-1 py-1 min-w-[140px]">
            <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-black", subBadge.tone)}>
              {subBadge.label}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className={cn("size-3", isLowBalance ? "text-amber-500" : "text-emerald-600")} />
              <span className="text-[11px] font-bold text-muted-foreground/70">المحفظة:</span>
              <span className={cn("font-mono font-black tabular-nums text-[11px]", isLowBalance ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                {balance.toLocaleString("en-US")} {company.currency || "EGP"}
              </span>
            </div>
          </div>
        );
      },
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.display({
      id: "operational",
      header: "النشاط التشغيلي",
      cell: ({ row }) => {
        const company = row.original;
        const productsCount = company._count?.products ?? 0;
        const ordersCount = company._count?.orders ?? 0;
        const customersCount = getCount(company, "customers");
        const isStuckOnboarding = productsCount === 0 && ordersCount === 0;

        return (
          <div className="space-y-1 py-1 min-w-[140px]">
            <div className="flex items-center gap-2 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-black text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                    <Package className="size-3 text-indigo-500" />
                    <span className="tabular-nums">{productsCount}</span>
                    <span className="text-[10px] font-bold text-indigo-600/70">منتج</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>عدد المنتجات المضافة في المتجر</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <ShoppingBag className="size-3 text-emerald-500" />
                    <span className="tabular-nums">{ordersCount}</span>
                    <span className="text-[10px] font-bold text-emerald-600/70">طلب</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>عدد طلبات المتجر الكلية</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground/80">
                <Users className="size-2.5 text-muted-foreground/60" />
                <span className="tabular-nums">{customersCount}</span> عميل
              </span>
              {isStuckOnboarding ? (
                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-black text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                  لم يضف منتجات
                </span>
              ) : null}
            </div>
          </div>
        );
      },
      meta: { className: "hidden lg:table-cell" },
    }),
    columnHelper.accessor("isActive", {
      header: "الحالة والمتابعة",
      cell: ({ row }) => {
        const company = row.original;
        const active = company.isActive;
        const followUpAuto = company.followUpAutomation;
        const isCritical = followUpAuto?.needsUrgentEscalation;
        const isAttention = followUpAuto?.needsEscalation && !isCritical;
        const callStatus = company.followUp?.callStatus;

        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5">
              {isCritical ? (
                <Badge variant="outline" className="rounded-full border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300">
                  <span className="ml-1 size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  حرجة
                </Badge>
              ) : isAttention ? (
                <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
                  <span className="ml-1 size-1.5 rounded-full bg-amber-500" />
                  متابعة
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-black",
                    active
                      ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
                  )}
                >
                  <span className={cn("ml-1 size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
                  {active ? "نشطة" : "متوقفة"}
                </Badge>
              )}
            </div>
            {callStatus && callStatus !== "not_called" ? (
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-black", getCallStatusColor(callStatus))}>
                <Phone className="size-2.5" /> {getCallStatusLabel(callStatus)}
              </span>
            ) : null}
          </div>
        );
      },
      meta: { className: "hidden sm:table-cell" },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const company = row.original;
        const storefrontUrl = getStorefrontUrl(company);

        const dropdownActions = [
          { key: "details", icon: Eye, label: "عرض التفاصيل الكاملة", action: () => onOpenDetails(company) },
          { key: "edit", icon: Pencil, label: "تعديل بيانات الشركة", action: () => onEdit(company) },
          { key: "users", icon: Users, label: "إدارة أعضاء الفريق", action: () => onOpenUsers(company) },
          { key: "pages", icon: Building2, label: "صفحات فيسبوك", action: () => onOpenFacebookPages(company) },
          ...(onOpenWhatsApp && company.phone ? [{ key: "whatsapp", icon: MessageCircle, label: "مراسلة واتساب", action: () => onOpenWhatsApp(company), tone: "text-emerald-600 font-black" as const }] : []),
          ...(storefrontUrl ? [{ key: "storefront", icon: ExternalLink, label: "فتح المتجر المباشر", action: () => window.open(storefrontUrl, "_blank") }] : []),
          { key: "owner", icon: ArrowLeftRight, label: "نقل ملكية الشركة", action: () => onTransferOwnership(company) },
          { key: "employee", icon: UserPlus, label: "إضافة موظف جديد", action: () => onAddEmployee(company) },
          { key: "delete", icon: Trash2, label: "حذف الشركة", action: () => onDelete(company), tone: "text-rose-600 font-black" as const },
        ];

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Quick 1-Click Login as Admin */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-black text-primary border-primary/30 hover:bg-primary/10 gap-1 shadow-2xs transition-all"
                  onClick={() => onLoginAsAdmin(company)}
                >
                  <KeyRound className="size-3 text-primary" />
                  <span className="hidden xl:inline">دخول كأدمن</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-card">
                دخول مباشر كأدمن للمتجر (Impersonate)
              </TooltipContent>
            </Tooltip>

            {/* Quick View Details */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => onOpenDetails(company)}
                >
                  <Eye className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg bg-white text-xs font-bold shadow-md dark:bg-card">عرض التفاصيل</TooltipContent>
            </Tooltip>

            {/* Overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label={`إجراءات ${company.name}`} variant="ghost" size="icon-sm" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg border-border/60 p-1 shadow-lg">
                {[
                  { key: "login", icon: LogIn, label: "دخول كأدمن (Impersonate)", action: () => onLoginAsAdmin(company), tone: "text-primary font-black" as const },
                  { key: "followup", icon: CheckCircle2, label: "إدارة المتابعة والتذكير", action: () => onOpenFollowUp(company) },
                  { key: "sep1", sep: true },
                  ...dropdownActions,
                ].map((item: any) => item.sep
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
            <div key={i} className="rounded-xl border border-border/60 bg-white p-3.5 dark:bg-card">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-1 size-4 rounded" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1 rounded-lg" />
                    <Skeleton className="h-8 flex-1 rounded-lg" />
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
              <Skeleton className="h-6 w-24 rounded-md hidden md:block" />
              <Skeleton className="h-6 w-24 rounded-md hidden lg:block" />
              <Skeleton className="h-6 w-20 rounded-md hidden sm:block" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          )
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Search className="size-8" />
        </div>
        <h3 className="mt-4 text-lg font-black text-foreground">
          {searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : "لا توجد شركات مطابقة"}
        </h3>
        <p className="mt-1 text-xs font-medium text-muted-foreground/80">
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
        /* Mobile Single-Depth Card Surface (MOB-015 compliant) */
        <div className="space-y-2.5">
          {companies.map((company) => {
            const isExpanded = expandedId === company.id;
            const attention = company.followUpAutomation?.needsEscalation || company.followUpAutomation?.needsUrgentEscalation;
            const critical = company.followUpAutomation?.needsUrgentEscalation;
            const waUrl = getWhatsAppUrl(company.phone);
            const storefrontUrl = getStorefrontUrl(company);
            const subBadge = getSubscriptionBadge(company);
            const productsCount = company._count?.products ?? 0;
            const ordersCount = company._count?.orders ?? 0;
            const balance = company.wallet?.balance ?? 0;

            return (
              <div
                key={company.id}
                className={cn(
                  "rounded-xl border bg-white shadow-2xs transition-all dark:bg-card p-3",
                  critical
                    ? "border-r-4 border-r-rose-500 border-rose-200/80 bg-rose-50/[0.15]"
                    : attention
                    ? "border-r-4 border-r-amber-500 border-amber-200/80 bg-amber-50/[0.15]"
                    : "border-border/60"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/30">
                  <div className="flex items-start gap-2 min-w-0">
                    <Checkbox
                      aria-label={`تحديد ${company.name}`}
                      checked={selectedIds.includes(company.id)}
                      onCheckedChange={() => onToggleSelect(company.id)}
                      className="size-4 mt-0.5 rounded border-border/70"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="text-right text-sm font-black text-foreground hover:text-primary transition-colors truncate max-w-[200px]"
                          onClick={() => onOpenDetails(company)}
                        >
                          {company.name}
                        </button>
                        {storefrontUrl ? (
                          <a
                            href={storefrontUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-black text-primary bg-primary/10 border border-primary/20"
                          >
                            <Store className="size-2.5" /> متجر ↗
                          </a>
                        ) : null}
                      </div>
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        <Mail className="size-2.5 shrink-0" /> {company.email}
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-[10px] font-black shrink-0", subBadge.tone)}>
                    {subBadge.label}
                  </Badge>
                </div>

                {/* 4 Essential Operational Metrics */}
                <div className="grid grid-cols-4 gap-1.5 py-2">
                  <div className="rounded-lg bg-muted/20 p-1.5 text-center">
                    <p className="text-xs font-black tabular-nums text-foreground">{productsCount}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">منتج</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 p-1.5 text-center">
                    <p className="text-xs font-black tabular-nums text-emerald-600">{ordersCount}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">طلب</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 p-1.5 text-center">
                    <p className="text-xs font-black tabular-nums text-blue-600">{getCount(company, "customers")}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">عميل</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 p-1.5 text-center">
                    <p className="text-xs font-black tabular-nums font-mono text-foreground">{balance}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">رصيد</p>
                  </div>
                </div>

                {/* Mobile Quick Action Buttons Bar */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 flex-1 rounded-lg text-xs font-black shadow-2xs gap-1"
                    onClick={() => onLoginAsAdmin(company)}
                  >
                    <KeyRound className="size-3.5" /> دخول كأدمن
                  </Button>

                  {waUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 rounded-lg text-xs font-black border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
                      onClick={() => onOpenWhatsApp ? onOpenWhatsApp(company) : window.open(waUrl, "_blank")}
                    >
                      <MessageCircle className="size-3.5" />
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-xs font-black"
                    onClick={() => onOpenFollowUp(company)}
                    title="متابعة"
                  >
                    <CheckCircle2 className="size-3.5 text-muted-foreground" />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-xs font-black"
                    onClick={() => onOpenDetails(company)}
                    title="التفاصيل"
                  >
                    <Eye className="size-3.5 text-muted-foreground" />
                  </Button>

                  <button
                    type="button"
                    aria-label={isExpanded ? "طي التفاصيل" : "عرض المزيد"}
                    onClick={() => setExpandedId(isExpanded ? null : company.id)}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:bg-muted"
                  >
                    {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                </div>

                {/* Mobile Expanded Drawer */}
                {isExpanded && (
                  <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2 text-xs">
                    {company.phone && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3 text-primary" /> {company.phone}
                      </p>
                    )}
                    {company.followUp?.callStatus ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">حالة الاتصال:</span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-black", getCallStatusColor(company.followUp.callStatus))}>
                          {getCallStatusLabel(company.followUp.callStatus)}
                        </span>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onOpenUsers(company)}>
                        <Users className="ml-1 size-3" /> الأعضاء
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onOpenFacebookPages(company)}>
                        <Facebook className="ml-1 size-3" /> الصفحات
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onAddEmployee(company)}>
                        <UserPlus className="ml-1 size-3" /> إضافة موظف
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onTransferOwnership(company)}>
                        <ArrowLeftRight className="ml-1 size-3" /> نقل ملكية
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="rounded-xl border border-border/60 bg-white shadow-2xs dark:bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/60 dark:bg-card/90 border-b border-border/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-border/40 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className={cn("h-9 px-3 text-right text-xs font-black uppercase tracking-wider text-muted-foreground/80", (header.column.columnDef.meta as { className?: string })?.className)}>
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
                          "group/row border-border/40 transition-colors hover:bg-primary/[0.03] cursor-pointer",
                          idx % 2 === 1 && "bg-muted/[0.02]",
                          attention && "border-r-4 border-r-amber-500 bg-amber-50/[0.25] hover:bg-amber-50/40",
                          critical && "border-r-4 border-r-rose-500 bg-rose-50/[0.35] hover:bg-rose-50/50",
                        )}
                        onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={cn("px-3 py-2", (cell.column.columnDef.meta as { className?: string })?.className)}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {expandedId === row.original.id ? (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/15 px-6 py-4">
                            <ExpandedRowContent
                              company={row.original}
                              onOpenDetails={onOpenDetails}
                              onOpenFollowUp={onOpenFollowUp}
                              onOpenUsers={onOpenUsers}
                              onOpenFacebookPages={onOpenFacebookPages}
                              onOpenWhatsApp={onOpenWhatsApp}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-white p-2.5 shadow-2xs dark:bg-card md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 px-2 text-xs font-bold text-muted-foreground/70">
          <span className="rounded-md bg-muted/40 px-2.5 py-1">صفحة {currentPage} من {totalPages}</span>
          <span className="hidden md:inline">— إجمالي {totalItems} شركة</span>
        </div>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs font-black border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronRight className="ml-1 size-3.5" /> السابق
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
                    "h-8 min-w-8 rounded-lg text-xs font-black transition-all",
                    page === currentPage
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5",
                  )}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-xs font-black border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            التالي <ChevronLeft className="mr-1 size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpandedRowContent({
  company, onOpenDetails, onOpenFollowUp, onOpenUsers, onOpenFacebookPages,
  onLoginAsAdmin, onEdit, onDelete, onTransferOwnership, onAddEmployee,
  onRunFollowUpAction, onOpenWhatsApp,
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
  onOpenWhatsApp?: (c: Company) => void;
}) {
  const followUp = company.followUp;
  const followUpAuto = company.followUpAutomation;
  const waUrl = getWhatsAppUrl(company.phone);
  const storefrontUrl = getStorefrontUrl(company);
  const storefrontDisplay = getStorefrontDisplay(company);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 1. Store & Technical Info */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-white p-4 dark:bg-card">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <Store className="size-3.5 text-primary" /> تفاصيل المتجر والموقع
        </p>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">رابط المتجر الحي: </span>
            {storefrontUrl ? (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="font-black text-primary hover:underline inline-flex items-center gap-1"
              >
                {storefrontDisplay} <ExternalLink className="size-2.5" />
              </a>
            ) : (
              <span className="text-muted-foreground/60 font-medium">لم يتم إنشاء slug</span>
            )}
          </div>
          {company.customDomain ? (
            <div>
              <span className="text-muted-foreground">دومين مخصص: </span>
              <span className="font-mono font-bold text-foreground">{company.customDomain}</span>
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">تاريخ التسجيل: </span>
            <span className="font-bold text-foreground">
              {company.createdAt ? new Date(company.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">العملة الأساسية: </span>
            <span className="font-bold text-foreground">{company.currency}</span>
          </div>
        </div>
      </div>

      {/* 2. Follow-Up & CRM Status */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-white p-4 dark:bg-card">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" /> المتابعة والاتصال
        </p>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">المسؤول: </span>
            <span className="font-bold text-foreground">{followUp?.assignedOwner.label || "غير مسند"}</span>
          </div>
          {followUp?.callStatus ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">حالة المكالمة: </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[11px] font-black", getCallStatusColor(followUp.callStatus))}>
                {getCallStatusLabel(followUp.callStatus)}
              </span>
            </div>
          ) : null}
          {followUp?.nextActionAt ? (
            <div>
              <span className="text-muted-foreground">الموعد القادم: </span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {new Date(followUp.nextActionAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ) : null}
          <div className="pt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onOpenFollowUp(company)}>
              <Pencil className="ml-1 size-3" /> تعديل المتابعة
            </Button>
            {waUrl ? (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onOpenWhatsApp ? onOpenWhatsApp(company) : window.open(waUrl, "_blank")}>
                <MessageCircle className="ml-1 size-3" /> واتساب
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Installed Apps & Quick Admin Action */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-white p-4 dark:bg-card">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
          <Package className="size-3.5 text-indigo-500" /> التطبيقات والخدمات
        </p>
        <div className="space-y-2 text-xs">
          {company.installedApps && company.installedApps.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {company.installedApps.map((app) => (
                <span key={app.id} className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {app.appName}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground/60 italic">لا توجد تطبيقات إضافية مثبتة</p>
          )}
          <div className="pt-3 border-t border-border/30 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 text-xs font-black gap-1"
              onClick={() => onLoginAsAdmin(company)}
            >
              <KeyRound className="size-3.5" /> دخول كأدمن للمتجر
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold"
              onClick={() => onOpenDetails(company)}
            >
              <Eye className="ml-1 size-3.5" /> التفاصيل
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
