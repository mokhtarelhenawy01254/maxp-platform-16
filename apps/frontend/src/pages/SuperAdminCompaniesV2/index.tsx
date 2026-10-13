import { useEffect, useId, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Building2, Sparkles, Download, RefreshCw, Plus, Loader2,
  AlertTriangle, CheckCircle2, UserPlus, ArrowLeftRight,
  Pencil, Eye, LogIn, Trash2, Facebook, Users, X, Filter, Clock, BadgeCheck,
  ShoppingBag, Package,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "../../components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { tokenManager } from "../../utils/tokenManager";
import { apiClient } from "../../services/apiClient";
import { businessSpecialtyService, type BusinessSpecialty } from "../../services/businessSpecialtyService";

import { useCompanies, useBulkMutations, useCompanyMutations, useFacebookLookup, useFollowUpOwners, useCompanyUsers } from "./hooks/useCompanies";
import { AlertBanner } from "./components/AlertBanner";
import { CompanyFilters } from "./components/CompanyFilters";
import { CompaniesTable } from "./components/CompaniesTable";
import { BulkActionsBar } from "./components/BulkActionsBar";
import { extractErrorMessage, formatDate, formatDateTime, enrichCompanies, computeQuickStats, getCount, getDefaultFollowUpScheduleValue, toDateTimeLocalValue, fromDateTimeLocalValue, addHoursToDateTimeLocal } from "./utils";
import { CURRENCY_OPTIONS, DEFAULT_SORT, FOLLOW_UP_STATUS_OPTIONS, CALL_STATUS_OPTIONS } from "./constants";
import type { Company, CompanyFormData, EmployeeFormData, FollowUpFormData, FollowUpState, FollowUpReminder, FollowUpAutomation } from "./types";

// ---- Reusable components ----

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[13px] font-black uppercase tracking-widest text-muted-foreground/80 px-1">{label}{required ? <span className="mr-1 text-rose-500">*</span> : null}</label>
      <div className="relative">{children}</div>
      {error ? <p className="text-xs font-bold text-rose-500 px-1">{error}</p> : null}
    </div>
  );
}

function ResponsiveOverlay({
  mobile, open, onOpenChange, title, description, children, footer, bodyClassName,
}: {
  mobile: boolean; open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; bodyClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open) {
    return null;
  }

  if (mobile) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[96vh] rounded-t-2xl border-t border-border/40 bg-white px-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-0 shadow-lg dark:bg-card" dir="rtl">
          <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-muted/60" />
          <SheetHeader className="px-6 pb-4 pt-6 text-right">
            <SheetTitle className="text-right text-2xl font-black tracking-tight">{title}</SheetTitle>
            {description ? <SheetDescription className="text-right text-sm font-medium text-muted-foreground/80">{description}</SheetDescription> : null}
          </SheetHeader>
          <div className={cn("overflow-y-auto px-6 py-4", bodyClassName)}>{children}</div>
          {footer ? <div className="mt-2 border-t border-border/40 bg-muted/10 px-6 py-6 flex gap-3">{footer}</div> : null}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => onOpenChange(false)} role="presentation">
      <div
        className={cn("max-w-4xl w-full rounded-xl border border-border/40 bg-white shadow-lg dark:bg-card max-h-[90vh] flex flex-col overflow-hidden", bodyClassName)}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="flex items-start justify-between border-b border-border/40 p-8">
          <div>
            <h2 id={titleId} className="text-3xl font-black tracking-tight text-foreground">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm font-medium text-muted-foreground/70">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
        {footer ? <div className="border-t border-border/40 bg-muted/10 p-8 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

// ---- FollowUp Form Fields ----
function FollowUpFormContent({
  followUp, reminder, automation, owners, loadingOwners,
  form, setForm, onSave, saving, onLogReminder, onLogEscalation, onAssignSelf, currentAdminId,
}: {
  followUp: FollowUpState;
  reminder: FollowUpReminder | null;
  automation: FollowUpAutomation | null;
  owners: { id: string; firstName: string; lastName: string; role: string }[];
  loadingOwners: boolean;
  form: FollowUpFormData;
  setForm: React.Dispatch<React.SetStateAction<FollowUpFormData>>;
  onSave: () => void;
  saving: boolean;
  onLogReminder: () => void;
  onLogEscalation: () => void;
  onAssignSelf: () => void;
  currentAdminId: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">الحالة الحالية</p>
          <Badge variant="outline" className={cn("mt-2 px-2.5 py-1 text-xs font-black", followUp.statusMeta.className)}>
            {followUp.statusMeta.label}
          </Badge>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">المسؤول الحالي</p>
          <p className="mt-1.5 text-sm font-black text-foreground">{followUp.assignedOwner.label || "بدون مسؤول"}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">آخر تحديث</p>
          <p className="mt-1.5 text-xs font-bold text-foreground/80">{formatDateTime(followUp.updatedAt)}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">المتابعة القادمة</p>
          <Badge variant="outline" className={cn("mt-2 px-2.5 py-1 text-xs font-black", reminder?.badgeClassName)}>
            {reminder?.nextActionLabel || "لا يوجد موعد"}
          </Badge>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">الأتمتة الحالية</p>
          <Badge variant="outline" className={cn("mt-2 px-2.5 py-1 text-xs font-black", automation?.badgeClassName)}>
            {automation?.label || "لا توجد أتمتة"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="مسؤول المتابعة">
          <div className="space-y-3">
            <Select
              value={form.assignedOwnerId || "__none"}
              onValueChange={(value) => setForm((prev) => ({
                ...prev,
                assignedOwnerId: value === "__none" ? "" : value,
                status: value === "__none" ? "pending" : prev.status === "unassigned" ? "pending" : prev.status,
                nextActionAt: value === "__none" ? "" : prev.nextActionAt || getDefaultFollowUpScheduleValue(prev.status),
              }))}
            >
              <SelectTrigger aria-label="مسؤول المتابعة" className="h-12 w-full rounded-lg border-border/60 bg-background px-4 text-sm font-bold shadow-sm">
                <SelectValue placeholder="بدون مسؤول" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="__none">بدون مسؤول</SelectItem>
                {owners.length ? owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.firstName} {o.lastName} - {o.role}</SelectItem>
                )) : <SelectItem value="__empty" disabled>{loadingOwners ? "جاري التحميل..." : "لا يوجد أعضاء"}</SelectItem>}
              </SelectContent>
            </Select>
            {currentAdminId ? (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-primary/20 px-4 text-xs font-black text-primary hover:bg-primary/5" onClick={onAssignSelf}>
                <UserPlus className="ml-1.5 size-3" /> اسندها لي
              </Button>
            ) : null}
          </div>
        </FormField>

        <FormField label="حالة المتابعة">
          <Select
            value={form.assignedOwnerId ? form.status : "unassigned"}
            onValueChange={(value) => setForm((prev) => ({
              ...prev, status: value,
              nextActionAt: value === "resolved" ? "" : prev.nextActionAt || getDefaultFollowUpScheduleValue(value),
            }))}
            disabled={!form.assignedOwnerId}
          >
            <SelectTrigger aria-label="حالة المتابعة" className="h-12 w-full rounded-lg border-border/60 bg-background px-4 text-sm font-bold shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {!form.assignedOwnerId ? (
                <SelectItem value="unassigned">بدون مسؤول</SelectItem>
              ) : (
                FOLLOW_UP_STATUS_OPTIONS.filter((o) => o.value !== "unassigned").map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField label="حالة الاتصال الهاتفي">
          <Select value={form.callStatus || "not_called"} onValueChange={(v) => setForm((prev) => ({ ...prev, callStatus: v }))}>
            <SelectTrigger aria-label="حالة الاتصال الهاتفي" className="h-12 w-full rounded-lg border-border/60 bg-background px-4 text-sm font-bold shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {CALL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="مدة المكالمة (ثانية)">
          <input
            aria-label="مدة المكالمة بالثواني"
            type="number"
            min="0"
            className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5"
            value={form.callDuration}
            onChange={(e) => setForm((prev) => ({ ...prev, callDuration: e.target.value }))}
            placeholder="0"
          />
        </FormField>
      </div>

      <FormField label="ملاحظة المتابعة">
        <textarea
          aria-label="ملاحظة المتابعة"
          className="min-h-[140px] w-full rounded-lg border-border/60 bg-background p-5 text-sm font-medium shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5"
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
          placeholder="أدخل ملاحظاتك هنا... مثال: تواصلنا مع العميل وسيضيف أول منتج اليوم."
        />
      </FormField>

      <FormField label="موعد المتابعة القادم">
        <div className="space-y-4">
          <input
            aria-label="موعد المتابعة القادم"
            type="datetime-local"
            className="h-12 w-full rounded-lg border-border/60 bg-background px-4 text-sm font-bold shadow-sm transition-all disabled:opacity-50 focus:border-primary/50 focus:ring-4 focus:ring-primary/5"
            value={form.nextActionAt}
            onChange={(e) => setForm((prev) => ({ ...prev, nextActionAt: e.target.value }))}
            disabled={!form.assignedOwnerId || form.status === "resolved"}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg border-border/60 text-xs font-black hover:bg-muted" disabled={!form.assignedOwnerId}
              onClick={() => setForm((prev) => ({ ...prev, nextActionAt: addHoursToDateTimeLocal(24) }))}>
              بعد 24 ساعة
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg border-border/60 text-xs font-black hover:bg-muted" disabled={!form.assignedOwnerId}
              onClick={() => setForm((prev) => ({ ...prev, nextActionAt: addHoursToDateTimeLocal(72) }))}>
              بعد 72 ساعة
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg border-border/60 text-xs font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600" disabled={!form.nextActionAt}
              onClick={() => setForm((prev) => ({ ...prev, nextActionAt: "" }))}>
              مسح الموعد
            </Button>
          </div>
        </div>
      </FormField>

      {automation && followUp.assignedOwner?.id && followUp.status !== "resolved" ? (
        <div className="rounded-lg border-primary/20 bg-primary/5 p-4 shadow-sm">
            <div className="space-y-1.5">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> أتمتة المتابعة الذكية
              </h4>
              <p className="text-xs font-medium leading-relaxed text-muted-foreground/80">{automation.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg border-primary/20 bg-white px-4 text-[13px] font-black shadow-sm" disabled={saving || !automation.needsReminder} onClick={onLogReminder}>
                تسجيل التذكير
              </Button>
              <Button type="button" size="sm" variant={automation.needsUrgentEscalation ? "default" : "outline"}
                className={cn("h-9 rounded-lg px-4 text-[13px] font-black shadow-sm", automation.needsUrgentEscalation ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200" : "border-primary/20 bg-white")}
                disabled={saving || (!automation.needsEscalation && !automation.needsUrgentEscalation)} onClick={onLogEscalation}>
                تسجيل التصعيد
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border-border/40 bg-white p-3 shadow-sm dark:bg-card">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">آخر تذكير مسجل</p>
                <p className="mt-1 text-xs font-bold text-foreground/80">{formatDateTime(followUp.lastReminderSentAt)}</p>
              </div>
              <div className="rounded-lg border-border/40 bg-white p-3 shadow-sm dark:bg-card">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">آخر تصعيد مسجل</p>
                <p className="mt-1 text-xs font-bold text-foreground/80">{formatDateTime(followUp.lastEscalatedAt)}</p>
              </div>
            </div>
          </div>
      ) : null}

      {followUp.history?.length ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-sm font-black text-foreground">سجل نشاط المتابعة</h4>
            <Badge variant="secondary" className="rounded-full bg-muted/40 px-3 py-1 text-xs font-black">{followUp.history.length} سجل</Badge>
          </div>
          <div className="space-y-3">
            {followUp.history.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border/60 bg-white p-4 shadow-sm dark:bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-border/60 px-2.5 py-0.5 text-xs font-black">{entry.status}</Badge>
                  <p className="text-xs font-bold text-muted-foreground/70">{formatDateTime(entry.occurredAt)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary/40" />
                  <p className="text-xs font-black text-foreground">{entry.actor?.label || "عضو الفريق"}</p>
                </div>
                <div className="mt-2 space-y-1">
                  {entry.assignedOwner?.label ? <p className="text-[13px] font-bold text-muted-foreground/80">المسؤول: {entry.assignedOwner.label}</p> : null}
                  {entry.nextActionAt ? <p className="text-[13px] font-bold text-muted-foreground/80">المتابعة القادمة: {formatDateTime(entry.nextActionAt)}</p> : null}
                </div>
                {entry.note ? <p className="mt-3 rounded-xl bg-muted/20 p-3 text-[13px] font-medium leading-relaxed text-muted-foreground/90">{entry.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
        <Button type="button" className="h-11 rounded-lg px-8 text-sm font-black shadow-sm shadow-primary/20" onClick={() => onSave()} disabled={saving}>
          {saving ? <Loader2 className="ml-2 size-4 animate-spin" /> : <CheckCircle2 className="ml-2 size-4" />}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function SuperAdminCompaniesV2() {
  const navigate = useNavigate();
  // Filter & Sort state — MUST be before useCompanies
  const [search, setSearch] = useState("");
  const [savedView, setSavedView] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const { companies, isLoading, isFetching, error: pageError, admin, refetch, total, totalPages, meta, serverStats } = useCompanies({
    search,
    status,
    savedView,
    page: currentPage,
    pageSize: Number(rowsPerPage),
    sort,
  });
  const { bulkStatus, bulkDelete } = useBulkMutations();
  const { createCompany, editCompany } = useCompanyMutations();
  const facebookLookup = useFacebookLookup();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Modals
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);
  useEffect(() => {
    businessSpecialtyService.listSpecialties()
      .then((list) => setSpecialties(list.filter((s) => s.isActive)))
      .catch((err) => console.error("Failed to load specialties", err));
  }, []);

  const [companyModal, setCompanyModal] = useState<{ open: boolean; mode: "create" | "edit"; company: Company | null }>({ open: false, mode: "create", company: null });
  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    name: "", email: "", phone: "", website: "", currency: "EGP", businessSpecialtyId: "",
    adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "",
  });
  const [companyFormErrors, setCompanyFormErrors] = useState<Record<string, string>>({});
  const [savingCompany, setSavingCompany] = useState(false);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpCompany, setFollowUpCompany] = useState<Company | null>(null);
  const [followUpForm, setFollowUpForm] = useState<FollowUpFormData>({ assignedOwnerId: "", status: "pending", nextActionAt: "", note: "" });
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const [ownersOpen, setOwnersOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormData>({ firstName: "", lastName: "", email: "", password: "", role: "COMPANY_ADMIN" });
  const [employeeErrors, setEmployeeErrors] = useState<Record<string, string>>({});
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [usersOpen, setUsersOpen] = useState(false);
  const [userCompany, setUserCompany] = useState<Company | null>(null);

  const [pagesOpen, setPagesOpen] = useState(false);
  const [pagesCompany, setPagesCompany] = useState<Company | null>(null);
  const [pages, setPages] = useState<{ id: string; pageName: string; pageId: string; status: string; connectedAt?: string; updatedAt?: string; messageCount?: number }[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [ownerTransferOpen, setOwnerTransferOpen] = useState(false);
  const [ownerTransferCompany, setOwnerTransferCompany] = useState<Company | null>(null);
  const [ownerTransferTarget, setOwnerTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [actionsCompany] = useState<Company | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[]; name: string }>({ open: false, ids: [], name: "" });
  const [deleting, setDeleting] = useState(false);

  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  // FB Lookup state
  const [fbQuery, setFbQuery] = useState("");
  const [fbResults, setFbResults] = useState<import("./types").FacebookPageResult[]>([]);
  const [fbSearched, setFbSearched] = useState(false);

  // Data integration — companies are already server-filtered and sorted
  const enrichedCompanies = useMemo(() => enrichCompanies(companies, admin?.id || null), [companies, admin?.id]);
  const quickStats = useMemo(() => {
    if (meta?.stats) {
      return {
        totalCompanies: meta.stats.totalCompanies || 0,
        activeCompanies: meta.stats.activeCompanies || 0,
        connectedFacebookPages: meta.stats.connectedFacebookPages || 0,
        followUpNow: meta.stats.followUpNow || 0,
        escalationDue: meta.stats.escalationDue || 0,
        urgentEscalationDue: meta.stats.urgentEscalationDue || 0,
        stale72h: meta.stats.stale72h || 0,
        myDueToday: meta.stats.myDueToday || 0,
      };
    }
    return computeQuickStats(enrichedCompanies, serverStats);
  }, [enrichedCompanies, meta, serverStats]);

  const pageSize = Number(rowsPerPage) || 10;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => { setCurrentPage(1); }, [search, savedView, status, sort, rowsPerPage]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const visibleIds = enrichedCompanies.map((c) => c.id);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !isAllVisibleSelected;
  const filterCount = [status !== "ALL"].filter(Boolean).length;
  const activeFilterLabels = [
    status !== "ALL" ? (status === "ACTIVE" ? "نشطة" : "متوقفة") : null,
  ].filter(Boolean);

  // ---- Handlers ----
  const handleOpenView = useCallback((view: string) => {
    setSavedView(view);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch(""); setSavedView("ALL"); setStatus("ALL"); setSort(DEFAULT_SORT);
  }, []);

  const handleOpenDetails = useCallback((company: Company) => navigate(`/super-admin/companies/${company.id}`), [navigate]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    else setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  }, [visibleIds]);

  const handleBulkActivate = useCallback(() => { if (selectedIds.length) bulkStatus.mutate({ companyIds: selectedIds, isActive: true }); }, [selectedIds, bulkStatus]);
  const handleBulkDeactivate = useCallback(() => { if (selectedIds.length) bulkStatus.mutate({ companyIds: selectedIds, isActive: false }); }, [selectedIds, bulkStatus]);
  const handleBulkDelete = useCallback(() => setDeleteDialog({ open: true, ids: selectedIds, name: "" }), [selectedIds]);

  const handleExport = useCallback(() => {
    const headers = ["ID", "Name", "Email", "Phone", "Website", "Is Active", "Users", "Customers", "Facebook Pages", "Installed Apps", "Created At"];
    const lines = enrichedCompanies.map((c) => [
      c.id, `"${c.name || ""}"`, c.email || "", c.phone || "", c.website || "",
      c.isActive ? "Active" : "Inactive",
      getCount(c, "users"), getCount(c, "customers"), getCount(c, "facebookPages"), getCount(c, "installedApps"),
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
    ].join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `companies_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }, [enrichedCompanies]);

  const handleCreateCompany = useCallback(() => {
    setCompanyForm({ name: "", email: "", phone: "", website: "", currency: "EGP", businessSpecialtyId: "", adminFirstName: "", adminLastName: "", adminEmail: "", adminPassword: "" });
    setCompanyFormErrors({});
    setCompanyModal({ open: true, mode: "create", company: null });
  }, []);

  const handleEditCompany = useCallback((company: Company) => {
    setCompanyForm({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      currency: company.currency || "EGP",
      businessSpecialtyId: company.businessSpecialtyId || (company.businessSpecialty?.id || ""),
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: ""
    });
    setCompanyFormErrors({});
    setCompanyModal({ open: true, mode: "edit", company });
  }, []);

  const validateCompanyForm = () => {
    const errors: Record<string, string> = {};
    if (!companyForm.name.trim()) errors.name = "اسم الشركة مطلوب";
    if (!companyForm.email.trim()) errors.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) errors.email = "صيغة غير صحيحة";
    if (companyModal.mode === "create") {
      if (!companyForm.adminFirstName.trim()) errors.adminFirstName = "مطلوب";
      if (!companyForm.adminLastName.trim()) errors.adminLastName = "مطلوب";
      if (!companyForm.adminEmail.trim()) errors.adminEmail = "مطلوب";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.adminEmail)) errors.adminEmail = "صيغة غير صحيحة";
      if (!companyForm.adminPassword.trim()) errors.adminPassword = "مطلوبة";
    }
    setCompanyFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCompany = async () => {
    if (!validateCompanyForm()) return;
    setSavingCompany(true);
    try {
      if (companyModal.mode === "create") {
        await createCompany.mutateAsync({
          name: companyForm.name.trim(), email: companyForm.email.trim(),
          phone: companyForm.phone.trim() || undefined, website: companyForm.website.trim() || undefined,
          currency: companyForm.currency,
          businessSpecialtyId: companyForm.businessSpecialtyId || undefined,
          adminFirstName: companyForm.adminFirstName.trim(), adminLastName: companyForm.adminLastName.trim(),
          adminEmail: companyForm.adminEmail.trim(), adminPassword: companyForm.adminPassword,
        });
      } else if (companyModal.company) {
        await editCompany.mutateAsync({
          id: companyModal.company.id, name: companyForm.name.trim(), email: companyForm.email.trim(),
          phone: companyForm.phone.trim() || "", website: companyForm.website.trim() || "",
          currency: companyForm.currency,
          businessSpecialtyId: companyForm.businessSpecialtyId || null,
        });
      }
      setCompanyModal((prev) => ({ ...prev, open: false }));
    } catch (err) { toast.error(extractErrorMessage(err, "فشل في الحفظ")); }
    finally { setSavingCompany(false); }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpCompany) return;
    setSavingFollowUp(true);
    try {
      const payload: Record<string, unknown> = {
        status: followUpForm.assignedOwnerId ? followUpForm.status : "unassigned",
        note: followUpForm.note.trim() || undefined,
        clearOwner: !followUpForm.assignedOwnerId,
        clearNextAction: !followUpForm.assignedOwnerId || !followUpForm.nextActionAt,
        callStatus: followUpForm.callStatus || "not_called",
        callDuration: followUpForm.callDuration ? Number(followUpForm.callDuration) : undefined,
      };
      if (followUpForm.assignedOwnerId) payload.assignedOwnerId = followUpForm.assignedOwnerId;
      if (followUpForm.assignedOwnerId && followUpForm.nextActionAt) payload.nextActionAt = fromDateTimeLocalValue(followUpForm.nextActionAt);
      const res = await apiClient.put(`/admin/companies/${followUpCompany.id}/follow-up`, payload);
      if (res.data?.success) { tToast.success("index.success_update_f06b"); setFollowUpOpen(false); refetch(); }
      else toast.error(res.data?.message || "فشل في التحديث");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل في التحديث")); }
    finally { setSavingFollowUp(false); }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try { await bulkDelete.mutateAsync(deleteDialog.ids); setDeleteDialog({ open: false, ids: [], name: "" }); setSelectedIds([]); }
    catch { /* handled by mutation */ }
    finally { setDeleting(false); }
  };

  const handleLoginAsAdmin = useCallback(async (company: Company) => {
    try {
      const res = await apiClient.post(`/admin/companies/${company.id}/login-as-admin`);
      if (res.data?.success) {
        const superToken = tokenManager.getAccessToken();
        if (superToken) localStorage.setItem("superAuth", superToken);
        const u = localStorage.getItem("user");
        if (u) localStorage.setItem("superUser", u);
        tokenManager.setAccessToken(res.data.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        window.location.href = "/company-dashboard";
      } else toast.error(res.data?.message || "فشل تسجيل الدخول");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل تسجيل الدخول")); }
  }, []);

  const handleOpenWhatsApp = useCallback((company: Company) => {
    const phone = company.phone?.replace(/\s+/g, "").replace(/^0+/, "");
    if (!phone) { tToast.error("index.msg_5363"); return; }
    const full = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("20") ? phone : `20${phone}`;
    window.open(`https://wa.me/${full}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleOpenFollowUp = useCallback(async (company: Company) => {
    const state = company.followUp || (await import("../../utils/companyFollowUp")).getCompanyFollowUpState(company);
    setFollowUpCompany(company);
    setFollowUpForm({
      assignedOwnerId: state.assignedOwner.id || "",
      status: state.status === "unassigned" ? "pending" : state.status,
      callStatus: state.callStatus || "not_called",
      callDuration: state.callDuration ? String(state.callDuration) : "",
      nextActionAt: toDateTimeLocalValue(state.nextActionAt) || (state.assignedOwner.id && state.status !== "resolved" ? getDefaultFollowUpScheduleValue(state.status) : ""),
      note: "",
    });
    setFollowUpOpen(true);
  }, []);

  const handleRunFollowUpAction = useCallback(async (company: Company, action: "remind" | "escalate") => {
    try {
      const payload = action === "remind" ? { markReminderSent: true } : { markEscalated: true };
      const res = await apiClient.put(`/admin/companies/${company.id}/follow-up`, payload);
      if (res.data?.success) { toast.success(action === "remind" ? "تم تسجيل التذكير" : "تم تسجيل التصعيد"); refetch(); }
      else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
  }, [refetch]);

  const handleOpenUsers = useCallback(async (company: Company) => {
    setUserCompany(company); setUsersOpen(true);
  }, []);

  const handleOpenFacebookPages = useCallback(async (company: Company) => {
    setPagesCompany(company); setPages([]); setPagesOpen(true); setLoadingPages(true);
    try {
      const res = await apiClient.get(`/admin/companies/${company.id}/facebook-pages`);
      if (res.data?.success) setPages(res.data.data || []);
      else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
    finally { setLoadingPages(false); }
  }, []);

  const handleTransferOwnership = useCallback((company: Company) => {
    setOwnerTransferCompany(company); setOwnerTransferTarget(""); setOwnerTransferOpen(true);
  }, []);

  const handleTransferConfirm = async () => {
    if (!ownerTransferCompany) return;
    setTransferring(true);
    try {
      const res = await apiClient.post(`/admin/companies/${ownerTransferCompany.id}/transfer-ownership`, { targetUserId: ownerTransferTarget });
      if (res.data?.success) { tToast.success("index.msg_3f26"); setOwnerTransferOpen(false); refetch(); }
      else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
    finally { setTransferring(false); }
  };

  const handleAddEmployee = useCallback((company: Company) => {
    setActiveCompany(company);
    setEmployeeForm({ firstName: "", lastName: "", email: "", password: "", role: "COMPANY_ADMIN" });
    setEmployeeErrors({});
    setOwnersOpen(true);
  }, []);

  const validateEmployeeForm = () => {
    const errors: Record<string, string> = {};
    if (!employeeForm.firstName.trim()) errors.firstName = "مطلوب";
    if (!employeeForm.lastName.trim()) errors.lastName = "مطلوب";
    if (!employeeForm.email.trim()) errors.email = "مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeForm.email)) errors.email = "صيغة غير صحيحة";
    if (!employeeForm.password.trim()) errors.password = "مطلوبة";
    setEmployeeErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleAddEmployeeSubmit = async () => {
    if (!activeCompany || !validateEmployeeForm()) return;
    setSavingEmployee(true);
    try {
      const res = await apiClient.post(`/admin/companies/${activeCompany.id}/employees`, {
        firstName: employeeForm.firstName.trim(), lastName: employeeForm.lastName.trim(),
        email: employeeForm.email.trim(), password: employeeForm.password, role: employeeForm.role,
      });
      if (res.data?.success) { tToast.success("index.msg_8006"); setOwnersOpen(false); refetch(); }
      else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
    finally { setSavingEmployee(false); }
  };

  const handleDeleteCompany = useCallback((company: Company) => {
    setDeleteDialog({ open: true, ids: [company.id], name: company.name });
  }, []);

  const handleFbSearch = useCallback(async () => {
    if (!fbQuery.trim()) { setFbSearched(false); setFbResults([]); return; }
    try { setFbSearched(true); const r = await facebookLookup.mutateAsync(fbQuery.trim()); setFbResults(r || []); }
    catch { /* error shown by mutation */ }
  }, [fbQuery, facebookLookup]);

  const handleFbClear = useCallback(() => { setFbQuery(""); setFbResults([]); setFbSearched(false); }, []);

  const assignFollowUpSelf = useCallback(() => {
    if (!admin?.id || !followUpCompany) return;
    setFollowUpForm((prev) => ({
      ...prev, assignedOwnerId: admin.id as string,
      status: prev.status === "unassigned" ? "pending" : prev.status,
      nextActionAt: prev.nextActionAt || getDefaultFollowUpScheduleValue(prev.status),
    }));
  }, [admin, followUpCompany]);

  const followUpOwnersQuery = useFollowUpOwners();

  const activeFollowUp = followUpCompany?.followUp || null;
  const activeReminder = followUpCompany?.followUpReminder || null;
  const activeAutomation = followUpCompany?.followUpAutomation || null;

  // ---- Render ----
  return (
    <div dir="rtl" className="min-h-full pb-6">
      <div className="flex w-full flex-col gap-1.5 p-1 md:p-1.5">
        {/* Error banner */}
        {pageError ? (
          <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-white dark:bg-card/90">
            <AlertTriangle className="size-4" />
            <AlertTitle>تعذر تحميل الصفحة</AlertTitle>
            <AlertDescription>{(pageError as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        {/* Main panel */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          {/* Linear Header */}
          <div className="flex flex-col gap-2.5 p-3 sm:p-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
                <Building2 className="size-4 text-foreground/80" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    إدارة الشركات
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {total} شركة • {quickStats.activeCompanies} نشطة
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  قاعدة بيانات الشركات المشتركة ومتابعة دورة حياة العملاء
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform" onClick={handleExport} disabled={!total}>
                <Download className="size-3.5" />
                <span>تصدير</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform" onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                <span>تحديث</span>
              </Button>
              <Button type="button" size="sm" className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform" onClick={handleCreateCompany}>
                <Plus className="size-3.5" />
                <span>إضافة شركة</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs transition-all active:scale-[0.98]",
                  filterOpen ? "bg-muted text-foreground border-border" : "text-muted-foreground"
                )}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="size-3.5" />
                <span>فلاتر</span>
                {filterCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-mono text-primary-foreground">
                    {filterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-3">
            {(quickStats.urgentEscalationDue > 0 || quickStats.myDueToday > 0) && (
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-px">
                <AlertBanner urgentEscalationDue={quickStats.urgentEscalationDue} myDueToday={quickStats.myDueToday} onOpenView={handleOpenView} />
              </div>
            )}

            {/* Cockpit Lifecycle Unified Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={handleClearFilters}
                className={cn(
                  "p-3 text-right transition-colors cursor-pointer active:scale-[0.99]",
                  savedView === "ALL" ? "bg-card shadow-xs" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">كل الشركات</span>
                  <span className={cn("size-1.5 rounded-full", savedView === "ALL" ? "bg-primary" : "bg-muted-foreground/30")} />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {quickStats.totalCompanies}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{quickStats.activeCompanies} نشطة</p>
              </button>

              <button
                type="button"
                onClick={() => handleOpenView("TRIAL")}
                className={cn(
                  "p-3 text-right transition-colors cursor-pointer active:scale-[0.99]",
                  savedView === "TRIAL" ? "bg-card shadow-xs" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">فترة تجريبية</span>
                  <span className={cn("size-1.5 rounded-full", savedView === "TRIAL" ? "bg-purple-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {quickStats.trialCompanies ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-purple-600 dark:text-purple-400">تجربة مجانية</p>
              </button>

              <button
                type="button"
                onClick={() => handleOpenView("ACTIVE_STORES")}
                className={cn(
                  "p-3 text-right transition-colors cursor-pointer active:scale-[0.99]",
                  savedView === "ACTIVE_STORES" ? "bg-card shadow-xs" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">متاجر نشطة</span>
                  <span className={cn("size-1.5 rounded-full", savedView === "ACTIVE_STORES" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {quickStats.activeStores ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">لديها مبيعات</p>
              </button>

              <button
                type="button"
                onClick={() => handleOpenView("ONBOARDING_STUCK")}
                className={cn(
                  "p-3 text-right transition-colors cursor-pointer active:scale-[0.99]",
                  savedView === "ONBOARDING_STUCK" ? "bg-card shadow-xs" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">تحتاج إعداد</span>
                  <span className={cn("size-1.5 rounded-full", savedView === "ONBOARDING_STUCK" ? "bg-sky-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {quickStats.onboardingStuck ?? 0}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-sky-600 dark:text-sky-400">بدون منتجات</p>
              </button>

              <button
                type="button"
                onClick={() => handleOpenView("FOLLOW_UP_NOW")}
                className={cn(
                  "p-3 text-right transition-colors cursor-pointer active:scale-[0.99]",
                  savedView === "FOLLOW_UP_NOW" ? "bg-card shadow-xs" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">متابعة وتصعيد</span>
                  <span className={cn("size-1.5 rounded-full", savedView === "FOLLOW_UP_NOW" ? "bg-amber-500" : "bg-muted-foreground/30")} />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {quickStats.followUpNow + quickStats.escalationDue + quickStats.urgentEscalationDue}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-amber-600 dark:text-amber-400">تدخل فوري</p>
              </button>
            </div>

                <div className="rounded-lg border border-border/40 bg-muted/10 dark:bg-card/30 p-1 md:p-1.5">
                  <CompanyFilters
                  collapsed={!filterOpen}
                  search={search} onSearchChange={setSearch}
                  status={status} onStatusChange={setStatus}
                  sort={sort} onSortChange={setSort}
                  rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage}
                  onClearAll={handleClearFilters}
                  filterCount={filterCount} activeFilterLabels={activeFilterLabels}
                  searchLoading={isFetching}
                  facebookLookup={{
                    query: fbQuery, onQueryChange: setFbQuery,
                    onSearch: handleFbSearch, onClear: handleFbClear,
                    loading: facebookLookup.isPending, error: facebookLookup.error?.message || "",
                    searched: fbSearched, results: fbResults,
                  }}
                />
              </div>

              <div className="relative">
                <BulkActionsBar
                  selectedCount={selectedIds.length}
                  onActivate={handleBulkActivate}
                  onDeactivate={handleBulkDeactivate}
                  onDelete={handleBulkDelete}
                  onClear={() => setSelectedIds([])}
                />
              </div>

              <CompaniesTable
                companies={enrichedCompanies}
                totalPages={totalPages}
                currentPage={safeCurrentPage}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={total}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                isAllVisibleSelected={isAllVisibleSelected}
                isSomeVisibleSelected={isSomeVisibleSelected}
                loading={isLoading}
                searchQuery={search}
                onOpenDetails={handleOpenDetails}
                onEdit={handleEditCompany}
                onDelete={handleDeleteCompany}
                onOpenUsers={handleOpenUsers}
                onOpenFollowUp={handleOpenFollowUp}
                onOpenFacebookPages={handleOpenFacebookPages}
                onOpenWhatsApp={handleOpenWhatsApp}
                onTransferOwnership={handleTransferOwnership}
                onAddEmployee={handleAddEmployee}
                onLoginAsAdmin={handleLoginAsAdmin}
                onRunFollowUpAction={handleRunFollowUpAction}
                isMobile={isMobile}
              />
            </div>
          </div>
      </div>

      {/* Mobile FAB */}
      <Button type="button" aria-label="إضافة شركة جديدة" size="icon-lg" className="fixed bottom-6 right-4 z-40 rounded-2xl shadow-lg md:hidden" onClick={handleCreateCompany}>
        <Plus className="size-5" aria-hidden="true" />
      </Button>

      {/* Actions Sheet (mobile) */}
      <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-lg border-t border-border/60 bg-white px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 dark:bg-card" dir="rtl">
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
          <SheetHeader className="px-4 pb-3 pt-4 text-right">
            <SheetTitle className="text-right text-lg font-black">{actionsCompany?.name || "إجراءات"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4">
            {actionsCompany ? (
              <div className="grid gap-2">
                {[
                  { key: "details", icon: Eye, label: "عرض التفاصيل", action: () => { setActionsSheetOpen(false); handleOpenDetails(actionsCompany); } },
                  { key: "followup", icon: CheckCircle2, label: "إدارة المتابعة", action: () => { setActionsSheetOpen(false); handleOpenFollowUp(actionsCompany); } },
                  { key: "edit", icon: Pencil, label: "تعديل", action: () => { setActionsSheetOpen(false); handleEditCompany(actionsCompany); } },
                  { key: "users", icon: Users, label: "الأعضاء", action: () => { setActionsSheetOpen(false); handleOpenUsers(actionsCompany); } },
                  { key: "pages", icon: Facebook, label: "صفحات فيسبوك", action: () => { setActionsSheetOpen(false); handleOpenFacebookPages(actionsCompany); } },
                  { key: "transfer", icon: ArrowLeftRight, label: "نقل الملكية", action: () => { setActionsSheetOpen(false); handleTransferOwnership(actionsCompany); } },
                  { key: "employee", icon: UserPlus, label: "إضافة موظف", action: () => { setActionsSheetOpen(false); handleAddEmployee(actionsCompany); } },
                  { key: "login", icon: LogIn, label: "دخول كأدمن", action: () => { setActionsSheetOpen(false); handleLoginAsAdmin(actionsCompany); }, tone: "text-primary font-black" },
                  { key: "delete", icon: Trash2, label: "حذف", action: () => { setActionsSheetOpen(false); handleDeleteCompany(actionsCompany); }, tone: "text-rose-600 font-black" },
                ].map((item) => (
                  <button key={item.key} type="button" className={cn("flex h-13 w-full items-center gap-3 rounded-lg border border-border/60 bg-white px-5 text-[13px] font-bold shadow-sm dark:bg-card", item.tone)} onClick={item.action}>
                    <item.icon className="size-4.5 opacity-70" /> {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Company Form Modal */}
      <ResponsiveOverlay
        mobile={isMobile} open={companyModal.open}
        onOpenChange={(v) => setCompanyModal((prev) => ({ ...prev, open: v }))}
        title={companyModal.mode === "create" ? "إضافة شركة جديدة" : "تعديل الشركة"}
        description={companyModal.mode === "create" ? "أنشئ الشركة وحساب المدير في خطوة واحدة." : "حدّث بيانات الشركة."}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setCompanyModal((prev) => ({ ...prev, open: false }))}>إلغاء</Button>
            <Button type="button" className="h-11 rounded-2xl" onClick={handleSaveCompany} disabled={savingCompany}>
              {savingCompany ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {companyModal.mode === "create" ? "إنشاء الشركة" : "حفظ التعديلات"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="اسم الشركة" error={companyFormErrors.name} required>
              <input aria-label="اسم الشركة" name="company-name" autoComplete="organization" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm focus:border-primary/50 focus:ring-4 focus:ring-primary/5" value={companyForm.name} onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="شركة التقنية" />
            </FormField>
            <FormField label="البريد الإلكتروني" error={companyFormErrors.email} required>
              <input aria-label="البريد الإلكتروني للشركة" name="company-email" autoComplete="email" type="email" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={companyForm.email} onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="company@example.com" />
            </FormField>
            <FormField label="الهاتف" error={companyFormErrors.phone}>
              <input aria-label="هاتف الشركة" name="company-phone" autoComplete="tel" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={companyForm.phone} onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="01000000000" />
            </FormField>
            <FormField label="الموقع الإلكتروني" error={companyFormErrors.website}>
              <input aria-label="الموقع الإلكتروني للشركة" name="company-website" autoComplete="url" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={companyForm.website} onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="company.com" />
            </FormField>
            <FormField label="العملة" error={companyFormErrors.currency} required>
              <Select value={companyForm.currency} onValueChange={(v) => setCompanyForm((prev) => ({ ...prev, currency: v }))}>
                <SelectTrigger aria-label="عملة الشركة" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-black shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {CURRENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={companyModal.mode === "create" ? "تخصص الشركة (تثبيت التطبيقات تلقائياً)" : "نوع الشركة / تخصص النشاط"}>
              <Select
                value={companyForm.businessSpecialtyId || "none"}
                onValueChange={(v) => setCompanyForm((prev) => ({ ...prev, businessSpecialtyId: v === "none" ? "" : v }))}
              >
                <SelectTrigger aria-label="تخصص الشركة" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-black shadow-sm">
                  <SelectValue placeholder="اختر مجال الشركة..." />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="none">بدون تخصص محدد (تخصيص عام)</SelectItem>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nameAr || s.nameEn} ({s.appSlugs.length} تطبيق)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {companyModal.mode === "create" ? (
            <div className="space-y-5 rounded-lg border border-border/60 bg-muted/20 p-6 shadow-inner">
              <p className="text-[13px] font-black uppercase tracking-widest text-primary">بيانات مدير الشركة</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="الاسم الأول" error={companyFormErrors.adminFirstName} required>
                  <input aria-label="الاسم الأول لمدير الشركة" name="admin-first-name" autoComplete="given-name" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5" value={companyForm.adminFirstName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminFirstName: e.target.value }))} />
                </FormField>
                <FormField label="الاسم الأخير" error={companyFormErrors.adminLastName} required>
                  <input aria-label="الاسم الأخير لمدير الشركة" name="admin-last-name" autoComplete="family-name" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5" value={companyForm.adminLastName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminLastName: e.target.value }))} />
                </FormField>
                <FormField label="بريد المدير" error={companyFormErrors.adminEmail} required>
                  <input aria-label="بريد مدير الشركة" name="admin-email" autoComplete="email" type="email" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={companyForm.adminEmail} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminEmail: e.target.value }))} />
                </FormField>
                <FormField label="كلمة المرور" error={companyFormErrors.adminPassword} required>
                  <input aria-label="كلمة مرور مدير الشركة" name="admin-password" autoComplete="new-password" type="password" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={companyForm.adminPassword} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminPassword: e.target.value }))} />
                </FormField>
              </div>
            </div>
          ) : null}
        </div>
      </ResponsiveOverlay>

      {/* Follow Up Modal */}
      <ResponsiveOverlay mobile={isMobile} open={followUpOpen} onOpenChange={setFollowUpOpen}
        title={`متابعة ${followUpCompany?.name || "الشركة"}`}
        description="عيّن مسؤولًا للحالة وسجل آخر متابعة."
        bodyClassName="space-y-4"
      >
        {followUpCompany && activeFollowUp ? (
          <FollowUpFormContent
            followUp={activeFollowUp}
            reminder={activeReminder}
            automation={activeAutomation}
            owners={followUpOwnersQuery.data || []}
            loadingOwners={followUpOwnersQuery.isLoading}
            form={followUpForm}
            setForm={setFollowUpForm}
            onSave={handleSaveFollowUp}
            saving={savingFollowUp}
            onLogReminder={() => handleRunFollowUpAction(followUpCompany, "remind")}
            onLogEscalation={() => handleRunFollowUpAction(followUpCompany, "escalate")}
            onAssignSelf={assignFollowUpSelf}
            currentAdminId={admin?.id as string | null}
          />
        ) : null}
      </ResponsiveOverlay>

      {/* Users Modal */}
      <ResponsiveOverlay mobile={isMobile} open={usersOpen} onOpenChange={setUsersOpen}
        title={`أعضاء ${userCompany?.name || ""}`} bodyClassName="space-y-3"
        footer={<Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setUsersOpen(false)}>إغلاق</Button>}
      >
        {userCompany ? <CompanyUsersList companyId={userCompany.id} /> : null}
      </ResponsiveOverlay>

      {/* Facebook Pages Modal */}
      <ResponsiveOverlay mobile={isMobile} open={pagesOpen} onOpenChange={setPagesOpen}
        title={`صفحات فيسبوك ${pagesCompany?.name || ""}`} bodyClassName="space-y-3"
        footer={<Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setPagesOpen(false)}>إغلاق</Button>}
      >
        {loadingPages ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-lg bg-muted/30 animate-pulse" />)}</div>
        ) : pages.length ? pages.map((page) => (
          <div key={page.id} className="rounded-lg border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h4 className="text-base font-black text-foreground">{page.pageName}</h4>
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-muted-foreground/80">معرف الصفحة: <span className="font-mono">{page.pageId}</span></p>
                  {page.connectedAt ? <p className="text-[13px] font-bold text-muted-foreground/80">تاريخ الربط: {formatDate(page.connectedAt)}</p> : null}
                  {page.messageCount !== undefined ? <p className="text-[13px] font-bold text-muted-foreground/80">إجمالي الرسائل: <span className="text-primary">{page.messageCount}</span></p> : null}
                </div>
              </div>
              <div className="flex size-12 items-center justify-center rounded-lg bg-[#1877F2]/8 text-[#1877F2] shadow-sm">
                <Facebook className="size-6" />
              </div>
            </div>
          </div>
        )) : <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-16 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted/40 text-muted-foreground mb-4">
            <Facebook className="size-8 opacity-40" />
          </div>
          <p className="text-sm font-black text-muted-foreground/60">لا توجد صفحات فيسبوك مرتبطة حالياً</p>
        </div>}
      </ResponsiveOverlay>

      {/* Transfer Ownership Modal */}
      <ResponsiveOverlay mobile={isMobile} open={ownerTransferOpen} onOpenChange={setOwnerTransferOpen}
        title={`نقل ملكية ${ownerTransferCompany?.name || ""}`}
        description="سيتم تحويل المالك الحالي إلى مدير شركة."
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setOwnerTransferOpen(false)}>إلغاء</Button>
            <Button type="button" className="h-11 rounded-2xl" onClick={handleTransferConfirm} disabled={transferring || !ownerTransferTarget}>
              {transferring ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeftRight className="size-4" />} تأكيد النقل
            </Button>
          </>
        }
      >
        <Alert className="rounded-lg border-amber-200/60 bg-amber-50/50 p-4 text-amber-900 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-sm font-black">إجراء حساس للغاية</AlertTitle>
          <AlertDescription className="text-xs font-medium opacity-80">سيتم نقل جميع صلاحيات الملكية إلى المستخدم المختار. المالك الحالي سيصبح مديراً للشركة.</AlertDescription>
        </Alert>
        <FormField label="اختيار المالك الجديد" required>
          <Select value={ownerTransferTarget} onValueChange={setOwnerTransferTarget}>
            <SelectTrigger aria-label="اختيار المالك الجديد" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-black shadow-sm">
              <SelectValue placeholder="-- اختر المستخدم من القائمة --" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="">-- اختر المستخدم من القائمة --</SelectItem>
              {ownerTransferCompany ? <CompanyUsersOptions companyId={ownerTransferCompany.id} /> : null}
            </SelectContent>
          </Select>
        </FormField>
      </ResponsiveOverlay>

      {/* Add Employee Modal */}
      <ResponsiveOverlay mobile={isMobile} open={ownersOpen} onOpenChange={setOwnersOpen}
        title={`إضافة موظف إلى ${activeCompany?.name || ""}`} bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setOwnersOpen(false)}>إلغاء</Button>
            <Button type="button" className="h-11 rounded-2xl" onClick={handleAddEmployeeSubmit} disabled={savingEmployee}>
              {savingEmployee ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} إضافة الموظف
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="الاسم الأول" error={employeeErrors.firstName} required>
            <input aria-label="الاسم الأول للموظف" name="employee-first-name" autoComplete="given-name" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5" value={employeeForm.firstName} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, firstName: e.target.value }))} />
          </FormField>
          <FormField label="الاسم الأخير" error={employeeErrors.lastName} required>
            <input aria-label="الاسم الأخير للموظف" name="employee-last-name" autoComplete="family-name" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5" value={employeeForm.lastName} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, lastName: e.target.value }))} />
          </FormField>
          <FormField label="البريد الإلكتروني" error={employeeErrors.email} required>
            <input aria-label="البريد الإلكتروني للموظف" name="employee-email" autoComplete="email" type="email" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={employeeForm.email} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))} />
          </FormField>
          <FormField label="كلمة المرور" error={employeeErrors.password} required>
            <input aria-label="كلمة مرور الموظف" name="employee-password" autoComplete="new-password" type="password" dir="ltr" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-bold shadow-sm transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5 text-right" value={employeeForm.password} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, password: e.target.value }))} />
          </FormField>
          <FormField label="الدور الوظيفي" required>
            <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm((prev) => ({ ...prev, role: v }))}>
              <SelectTrigger aria-label="الدور الوظيفي للموظف" className="h-12 w-full rounded-lg border-border/60 bg-background px-5 text-sm font-black shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="COMPANY_ADMIN">مدير شركة (كامل الصلاحيات)</SelectItem>
                <SelectItem value="MANAGER">مدير قسم</SelectItem>
                <SelectItem value="AGENT">موظف عادي</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </ResponsiveOverlay>

      {/* Delete Confirmation */}
      <ResponsiveOverlay mobile={isMobile} open={deleteDialog.open} onOpenChange={(v) => setDeleteDialog((prev) => ({ ...prev, open: v }))}
        title={deleteDialog.ids.length > 1 ? `حذف ${deleteDialog.ids.length} شركة` : "حذف الشركة"}
        description={deleteDialog.name ? `هل أنت متأكد من حذف "${deleteDialog.name}"؟` : "هذا الإجراء لا يمكن التراجع عنه."}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setDeleteDialog({ open: false, ids: [], name: "" })}>إلغاء</Button>
            <Button type="button" variant="destructive" className="h-11 rounded-2xl" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} تأكيد الحذف
            </Button>
          </>
        }
      >
        <Alert variant="destructive" className="rounded-lg border-rose-200/60 bg-rose-50/50 p-5 shadow-sm">
          <AlertTriangle className="size-5 text-rose-600" />
          <AlertTitle className="text-base font-black text-rose-700">تحذير نهائي</AlertTitle>
          <AlertDescription className="text-sm font-bold text-rose-600/80 leading-relaxed">سيتم حذف الشركة وجميع البيانات المرتبطة (الأعضاء، العملاء، الرسائل، الصفحات) بشكل نهائي. هذا الإجراء مدمر ولا يمكن التراجع عنه أبداً.</AlertDescription>
        </Alert>
      </ResponsiveOverlay>
    </div>
  );
}

// ---- Sub-components ----
function CompanyUsersList({ companyId }: { companyId: string }) {
  const { data: users, isLoading } = useCompanyUsers(companyId);
  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>;
  if (!users?.length) return <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-16 text-center text-sm font-black text-muted-foreground/60">لا يوجد أعضاء في هذه الشركة حالياً.</div>;
  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className="rounded-lg border border-border/60 bg-white p-5 shadow-sm dark:bg-card">
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary shadow-inner">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-base font-black text-foreground">{user.firstName} {user.lastName}</p>
                <p className="text-[13px] font-bold text-muted-foreground/80">{user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn("rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-xs font-black text-primary")}>
              {user.role === "OWNER" ? "مالك الشركة" : user.role === "COMPANY_ADMIN" ? "مدير شركة" : user.role === "MANAGER" ? "مدير قسم" : "موظف"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyUsersOptions({ companyId }: { companyId: string }) {
  const { data: users, isLoading } = useCompanyUsers(companyId);
  if (isLoading) return <SelectItem value="" disabled>جاري التحميل...</SelectItem>;
  if (!users?.length) return <SelectItem value="" disabled>لا يوجد أعضاء</SelectItem>;
  return users.map((user) => (
    <SelectItem key={user.id} value={user.id}>
      {user.firstName} {user.lastName} - {user.role === "OWNER" ? "مالك" : user.role === "COMPANY_ADMIN" ? "مدير شركة" : user.role === "MANAGER" ? "مدير" : "موظف"}
    </SelectItem>
  ));
}
