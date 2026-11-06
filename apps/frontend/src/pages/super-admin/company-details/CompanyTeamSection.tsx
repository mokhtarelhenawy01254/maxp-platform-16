import { useState, useMemo } from "react";
import type { CompanyData, CompanyUser, FacebookPage } from "./companyDetailsTypes";
import { MoreVertical, Globe, Mail, Phone, Shield, Trash2, UserPlus, UserRoundX, Users, Search } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { InfoLine } from "./InfoLine";
import { EmptyState } from "./EmptyState";
import { formatDate, formatNumber, getStatusMeta } from "./helpers";
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
  COMPANY_ADMIN: "مدراء الشركة",
  MANAGER: "المدراء",
  AGENT: "الموظفون",
};

const STATUS_FILTER_ITEMS: Record<string, string> = {
  ALL: "كل الحالات",
  ACTIVE: "نشط فقط",
  INACTIVE: "موقوف فقط",
};

export function CompanyTeamSection({
  companyUsers, usersLoading, company, facebookPages, pagesLoading, openAddEmployeeModal,
  handleUpdateUserRole, handleToggleUserStatus, handleDeleteUser,
  deleteConfirmUserId, setDeleteConfirmUserId, deleteUserLoading,
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
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredUsers = useMemo(() => {
    return companyUsers.filter((user) => {
      // Search text
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

      // Role filter
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "INACTIVE" && user.isActive) return false;

      return true;
    });
  }, [companyUsers, searchTerm, roleFilter, statusFilter]);

  const totalUsers = companyUsers.length;
  const activeCount = companyUsers.filter((u) => u.isActive).length;
  const inactiveCount = totalUsers - activeCount;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <Card className="rounded-2xl border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-black">فريق الشركة</CardTitle>
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-mono">
                  {formatNumber(totalUsers)} عضو
                </Badge>
              </div>
              <CardDescription>
                إدارة أعضاء الفريق، الصلاحيات، وحالات الحسابات ({formatNumber(activeCount)} نشط / {formatNumber(inactiveCount)} موقوف).
              </CardDescription>
            </div>
            <Button type="button" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm gap-1.5" onClick={openAddEmployeeModal}>
              <UserPlus className="size-4" /> إضافة عضو
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم، البريد أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pr-9 rounded-xl text-xs"
                />
              </div>

              <Select value={roleFilter} items={ROLE_FILTER_ITEMS} onValueChange={(val: string | null) => setRoleFilter(val ?? "ALL")}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الأدوار</SelectItem>
                  <SelectItem value="COMPANY_ADMIN">مدراء الشركة</SelectItem>
                  <SelectItem value="MANAGER">المدراء</SelectItem>
                  <SelectItem value="AGENT">الموظفون</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} items={STATUS_FILTER_ITEMS} onValueChange={(val: string | null) => setStatusFilter(val ?? "ALL")}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">كل الحالات</SelectItem>
                  <SelectItem value="ACTIVE">نشط فقط</SelectItem>
                  <SelectItem value="INACTIVE">موقوف فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count notice when filtering */}
            {(searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL") && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                <span>المعروض: {formatNumber(filteredUsers.length)} من أصل {formatNumber(totalUsers)} عضو</span>
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

            {/* Users List */}
            {usersLoading ? (
              [...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))
            ) : filteredUsers.length ? (
              <div className="divide-y divide-border/20">
                {filteredUsers.map((user) => {
                  const userStatusMeta = getStatusMeta("user", user.isActive ? "ACTIVE" : "INACTIVE");
                  const roleMeta = getStatusMeta("role", user.role);

                  return (
                    <div key={user.id} className="py-3.5 space-y-2">
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
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 text-xs">
                            <InfoLine icon={Mail}>{user.email}</InfoLine>
                            {user.phone ? <InfoLine icon={Phone}>{user.phone}</InfoLine> : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="space-y-0.5 text-[11px] text-muted-foreground sm:text-left">
                            <p>أضيف: {formatDate(user.createdAt)}</p>
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
                })}
              </div>
            ) : (
              <EmptyState
                message={searchTerm || roleFilter !== "ALL" || statusFilter !== "ALL" ? "لا توجد نتائج مطابقة لشروط البحث والفلاتر." : "لا يوجد أعضاء مضافون لهذه الشركة حتى الآن."}
                icon={Users}
                className="p-6"
              />
            )}
          </CardContent>
        </Card>

        {/* Channels Card */}
        <Card className="rounded-2xl border">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black">قنوات الربط</CardTitle>
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
