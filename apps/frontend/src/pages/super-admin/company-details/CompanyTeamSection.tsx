import { useState, useMemo } from "react";
import type { CompanyData, CompanyUser, FacebookPage } from "./companyDetailsTypes";
import { MoreVertical, Globe, Mail, Phone, Shield, Trash2, UserPlus, UserRoundX, Users, Search, Bot, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { InfoLine } from "./InfoLine";
import { EmptyState } from "./EmptyState";
import { formatDate, formatNumber, getStatusMeta, isSystemAccount, isUserDormant } from "./helpers";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "../../../components/ui/alert-dialog";

const ROLE_OPTIONS = [
  { value: "COMPANY_ADMIN", label: "مدير شركة" },
  { value: "MANAGER", label: "مدير" },
  { value: "AGENT", label: "موظف" },
];

const ROLE_FILTER_ITEMS: Record<string, string> = {
  ALL: "كل الأدوار",
  OWNER: "مالك الشركة",
  COMPANY_ADMIN: "مدراء الشركة",
  MANAGER: "المدراء",
  AGENT: "الموظفون",
  AFFILIATE: "المسوّقون",
  SUPER_ADMIN: "حسابات النظام",
};

const STATUS_FILTER_ITEMS: Record<string, string> = {
  ALL: "كل الحالات",
  ACTIVE: "نشط فقط",
  INACTIVE: "موقوف فقط",
  DORMANT: "خامل > 30 يوم",
};

const SORT_ITEMS: Record<string, string> = {
  LAST_LOGIN_DESC: "آخر دخول: الأحدث",
  LAST_LOGIN_ASC: "آخر دخول: الأقدم",
  CREATED_DESC: "تاريخ الإضافة: الأحدث",
  NAME_ASC: "الاسم: أ - ي",
};

function getTimestamp(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const parsed = new Date(dateValue).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function CompanyTeamSection({
  companyUsers, usersLoading, company, facebookPages, pagesLoading, openAddEmployeeModal,
  handleUpdateUserRole, handleToggleUserStatus, handleDeleteUser,
  deleteConfirmUserId, setDeleteConfirmUserId, deleteUserLoading,
  unifiedUsersCount,
  usersHasMore,
  loadingMoreUsers = false,
  onLoadMoreUsers,
}: {
  companyUsers: CompanyUser[];
  usersLoading: boolean;
  company: CompanyData;
  facebookPages: FacebookPage[];
  pagesLoading: boolean;
  openAddEmployeeModal: () => void;
  handleUpdateUserRole: (userId: string, role: string) => Promise<void>;
  handleToggleUserStatus: (userId: string) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
  deleteConfirmUserId: string | null; setDeleteConfirmUserId: (id: string | null) => void; deleteUserLoading: boolean;
  unifiedUsersCount?: number;
  usersHasMore?: boolean;
  loadingMoreUsers?: boolean;
  onLoadMoreUsers?: () => void | Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("LAST_LOGIN_DESC");

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = companyUsers.filter((user) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
        const email = (user.email || "").toLowerCase();
        const phone = (user.phone || "").toLowerCase();
        const empNo = (user.employee?.employeeNumber || "").toLowerCase();
        if (!fullName.includes(query) && !email.includes(query) && !phone.includes(query) && !empNo.includes(query)) {
          return false;
        }
      }

      if (roleFilter === "SUPER_ADMIN") {
        if (!isSystemAccount(user)) return false;
      } else if (roleFilter !== "ALL") {
        const normalizedRole = String(user.role || "")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");
        if (normalizedRole !== roleFilter) return false;
      }

      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "INACTIVE" && user.isActive) return false;
      if (statusFilter === "DORMANT" && !isUserDormant(user, 30)) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "NAME_ASC") {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB, "ar");
      }
      if (sortBy === "CREATED_DESC") {
        return (getTimestamp(b.createdAt) ?? 0) - (getTimestamp(a.createdAt) ?? 0);
      }
      const loginA = getTimestamp(a.lastLoginAt);
      const loginB = getTimestamp(b.lastLoginAt);
      if (sortBy === "LAST_LOGIN_ASC") {
        if (loginA === null && loginB === null) return 0;
        if (loginA === null) return -1;
        if (loginB === null) return 1;
        return loginA - loginB;
      }
      // LAST_LOGIN_DESC (default)
      if (loginA === null && loginB === null) return 0;
      if (loginA === null) return 1;
      if (loginB === null) return -1;
      return loginB - loginA;
    });
  }, [companyUsers, searchTerm, roleFilter, statusFilter, sortBy]);

  const regularUsers = useMemo(
    () => filteredAndSortedUsers.filter((user) => !isSystemAccount(user)),
    [filteredAndSortedUsers],
  );
  const systemAccounts = useMemo(
    () => filteredAndSortedUsers.filter((user) => isSystemAccount(user)),
    [filteredAndSortedUsers],
  );

  // مصدر واحد للعدّ: `_count.users` بيعدّ كل المستخدمين في القاعدة (بما فيهم حسابات النظام) فبيختلف عن الجدول.
  const displayUsersCount = unifiedUsersCount ?? companyUsers.length;
  const hasMoreToLoad =
    usersHasMore !== undefined
      ? Boolean(usersHasMore)
      : companyUsers.length >= 100 && displayUsersCount > companyUsers.length;
  const hasActiveFilter = Boolean(searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL");

  const renderUserRow = (user: CompanyUser) => {
    const userStatusMeta = getStatusMeta("user", user.isActive ? "ACTIVE" : "INACTIVE");
    const roleMeta = getStatusMeta("role", user.role);
    const dormant = isUserDormant(user, 30);

    return (
      <div key={user.id} className="py-3 space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleMeta.className}`}>
                {roleMeta.label}
              </Badge>
              <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] ${userStatusMeta.className}`}>
                {userStatusMeta.label}
              </Badge>
              {dormant ? (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <AlertCircle className="size-3" />
                  خامل &gt; {formatNumber(30)} يوم
                </Badge>
              ) : !user.lastLoginAt ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  لم يسجل دخول
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <InfoLine icon={Mail}>{user.email}</InfoLine>
              {user.phone ? <InfoLine icon={Phone}>{user.phone}</InfoLine> : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="space-y-0.5 text-[11px] text-muted-foreground sm:text-left">
              <p>تاريخ الإضافة: {formatDate(user.createdAt)}</p>
              <p>آخر دخول: {user.lastLoginAt ? formatDate(user.lastLoginAt) : "لم يسجل دخول"}</p>
              {user.employee?.employeeNumber ? <p>رقم الموظف: {user.employee.employeeNumber}</p> : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-full">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rounded-lg">
                    <Shield className="ml-2 size-4" /> تغيير الصلاحية
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-xl">
                    {ROLE_OPTIONS.filter((opt) => opt.value !== user.role).map((opt) => (
                      <DropdownMenuItem key={opt.value} className="rounded-lg"
                        onClick={() => void handleUpdateUserRole(user.id, opt.value)}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem className="rounded-lg" onClick={() => void handleToggleUserStatus(user.id)}>
                  {user.isActive ? <UserRoundX className="ml-2 size-4 text-amber-600" /> : <UserPlus className="ml-2 size-4 text-emerald-600" />}
                  {user.isActive ? "إيقاف حساب العضو" : "تفعيل حساب العضو"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmUserId(user.id)}
                >
                  <Trash2 className="ml-2 size-4" /> حذف العضو نهائياً
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <Card className="rounded-2xl border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black">فريق الشركة</CardTitle>
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-mono" data-testid="team-total-badge">
                  {hasMoreToLoad
                    ? `${formatNumber(companyUsers.length)} من ${formatNumber(displayUsersCount)} عضو`
                    : `${formatNumber(displayUsersCount)} عضو`}
                </Badge>
              </div>
              <CardDescription>
                إدارة أعضاء الفريق، الصلاحيات، وحالات الحسابات.
              </CardDescription>
            </div>
            <Button type="button" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm gap-1.5" onClick={openAddEmployeeModal}>
              <UserPlus className="size-4" /> إضافة عضو
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search, Filters & Sort Bar */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو البريد..."
                  aria-label="بحث في أعضاء الفريق"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pr-9 rounded-xl text-xs"
                />
              </div>

              <Select value={roleFilter} items={ROLE_FILTER_ITEMS} onValueChange={(val: string | null) => setRoleFilter(val ?? "ALL")}>
                <SelectTrigger className="h-10 min-w-0 w-full rounded-xl text-xs" aria-label="فلتر الدور">
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الأدوار</SelectItem>
                  <SelectItem value="OWNER">مالك الشركة</SelectItem>
                  <SelectItem value="COMPANY_ADMIN">مدراء الشركة</SelectItem>
                  <SelectItem value="MANAGER">المدراء</SelectItem>
                  <SelectItem value="AGENT">الموظفون</SelectItem>
                  <SelectItem value="AFFILIATE">المسوّقون</SelectItem>
                  <SelectItem value="SUPER_ADMIN">حسابات النظام</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} items={STATUS_FILTER_ITEMS} onValueChange={(val: string | null) => setStatusFilter(val ?? "ALL")}>
                <SelectTrigger className="h-10 min-w-0 w-full rounded-xl text-xs" aria-label="فلتر الحالة">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  <SelectItem value="ACTIVE">نشط فقط</SelectItem>
                  <SelectItem value="INACTIVE">موقوف فقط</SelectItem>
                  <SelectItem value="DORMANT">خامل &gt; 30 يوم</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} items={SORT_ITEMS} onValueChange={(val: string | null) => setSortBy(val ?? "LAST_LOGIN_DESC")}>
                <SelectTrigger className="h-10 min-w-0 w-full rounded-xl text-xs" aria-label="فرز الأعضاء">
                  <SelectValue placeholder="الفرز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAST_LOGIN_DESC">آخر دخول: الأحدث</SelectItem>
                  <SelectItem value="LAST_LOGIN_ASC">آخر دخول: الأقدم</SelectItem>
                  <SelectItem value="CREATED_DESC">تاريخ الإضافة: الأحدث</SelectItem>
                  <SelectItem value="NAME_ASC">الاسم: أ - ي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilter && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                <span>نتائج البحث والتصفية: {formatNumber(filteredAndSortedUsers.length)} مطابقة</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-primary hover:underline"
                  onClick={() => { setSearchTerm(""); setRoleFilter("ALL"); setStatusFilter("ALL"); }}
                >
                  إعادة ضبط الفلاتر
                </Button>
              </div>
            )}

            {/* Regular Team Members */}
            {usersLoading ? (
              [...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))
            ) : regularUsers.length || systemAccounts.length ? (
              <div className="space-y-4">
                {regularUsers.length ? (
                  <div className="divide-y divide-border/20">
                    {regularUsers.map(renderUserRow)}
                  </div>
                ) : (
                  <EmptyState
                    message="لا يوجد أعضاء شركة مطابقون لمعايير البحث الحالية."
                    icon={Users}
                    className="p-5"
                  />
                )}

                {/* Separated System Accounts Group */}
                <div
                  className="rounded-xl border border-sky-200/70 bg-sky-50/40 p-3.5 space-y-2 dark:border-sky-800/50 dark:bg-sky-950/15"
                  data-testid="system-accounts-section"
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-sky-200/60 dark:border-sky-800/40">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-sky-600 dark:text-sky-400" />
                      <h4 className="text-sm font-black text-foreground">حسابات النظام</h4>
                    </div>
                    <Badge variant="outline" className="rounded-full border-sky-200 bg-background/80 px-2.5 py-0.5 text-[11px] text-sky-700 dark:border-sky-800 dark:text-sky-300">
                      مجموعة منفصلة
                    </Badge>
                  </div>
                  {systemAccounts.length ? (
                    <div className="divide-y divide-border/20">
                      {systemAccounts.map(renderUserRow)}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-1">
                      لا توجد حسابات نظام مرتبطة بهذه الشركة.
                    </p>
                  )}
                </div>

                {hasMoreToLoad ? (
                  <div
                    className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    data-testid="team-load-more-bar"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">
                        يتم عرض {formatNumber(companyUsers.length)} من أصل {formatNumber(displayUsersCount)} عضو
                      </p>
                      {hasActiveFilter ? (
                        <p className="text-[11px] text-muted-foreground">
                          البحث والفلتر يعملان على الأعضاء المحمّلين حالياً — حمّل البقية لعرض القائمة كاملة.
                        </p>
                      ) : null}
                    </div>
                    {onLoadMoreUsers ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold text-xs gap-1.5 shrink-0"
                        onClick={() => void onLoadMoreUsers()}
                        disabled={loadingMoreUsers}
                        data-testid="team-load-more-button"
                      >
                        {loadingMoreUsers ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        <span>{loadingMoreUsers ? "جاري التحميل..." : "تحميل المزيد من الأعضاء"}</span>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                message={hasActiveFilter ? "لا توجد نتائج مطابقة لشروط البحث والفلاتر." : "لا يوجد أعضاء مضافون لهذه الشركة حتى الآن."}
                icon={Users}
                className="p-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Channels Card */}
        <Card className="rounded-2xl border">
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black">قنوات الربط</CardTitle>
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-mono">
                {formatNumber(facebookPages.length)} صفحة
              </Badge>
            </div>
            <CardDescription>صفحات فيسبوك المرتبطة بالنظام والرد الآلي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pagesLoading ? (
              [...Array(2)].map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)
            ) : facebookPages.length ? (
              <div className="divide-y divide-border/20">
                {facebookPages.map((page) => {
                  const channelMeta = getStatusMeta("channel", page.status === "DISCONNECTED" ? "DISCONNECTED" : "CONNECTED");
                  return (
                    <div key={page.id} className="py-3 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{page.pageName || page.pageId}</p>
                          <p className="text-xs text-muted-foreground font-mono">معرف الصفحة: {page.pageId}</p>
                          <p className="text-[11px] text-muted-foreground">متصلة منذ: {formatDate(page.connectedAt || page.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[11px] ${channelMeta.className}`}>
                          {channelMeta.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="لا توجد صفحات فيسبوك مربوطة بهذه الشركة." icon={Globe} />
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteConfirmUserId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmUserId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العضو نهائياً</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العضو من الشركة؟ سيتم إلغاء وصوله بالكامل ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserLoading} onClick={() => { if (deleteConfirmUserId) void handleDeleteUser(deleteConfirmUserId); }}
            >
              {deleteUserLoading ? "جاري الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
