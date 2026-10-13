import React, { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Building2,
  AlertCircle,
  Search,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface UserCompany {
  companyId: string;
  role: string;
  company: Company;
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  company?: Company;
  userCompanies: UserCompany[];
}

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const StaffCompanyAccess = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState("AGENT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff(true);
    fetchCompanies();
  }, []);

  const fetchStaff = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(buildApiUrl("super-admin/users?limit=100"), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStaff(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch staff", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(buildApiUrl("admin/companies?limit=1000"), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies", error);
    }
  };

  const handleAddAccess = async (companyId: string) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("auth/user-company"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          userId: selectedUser.id,
          companyId: companyId,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaff(false);
        setShowAddModal(false);
        toast.success("تم ربط الموظف بالشركة بنجاح");
      } else {
        toast.error("فشل الربط: " + (data.message || "حدث خطأ غير متوقع"));
      }
    } catch (error) {
      toast.error("تعذر إكمال عملية ربط الموظف بالشركة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAccess = async (userId: string, companyId: string) => {
    if (!confirm("هل أنت متأكد من حذف وصول هذا الموظف لهذه الشركة؟")) return;
    try {
      const res = await fetch(
        buildApiUrl(`auth/user-company/${userId}/${companyId}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchStaff(false);
        toast.success("تم حذف وصول الموظف للشركة بنجاح");
      } else {
        toast.error("فشل الحذف: " + (data.message || "حدث خطأ غير متوقع"));
      }
    } catch (error) {
      toast.error("تعذر إكمال عملية حذف الوصول");
    }
  };

  const handleSetPrimaryCompany = async (userId: string, userName: string) => {
    if (!confirm(`هل تريد تعيين شركة النظام كشركة أساسية لـ ${userName}؟`))
      return;
    try {
      const res = await fetch(buildApiUrl("auth/set-primary-company"), {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaff(false);
        toast.success("تم تصحيح وتعيين شركة النظام كشركة أساسية بنجاح");
      } else {
        toast.error("فشل التصحيح: " + (data.message || "حدث خطأ"));
      }
    } catch (error) {
      toast.error("تعذر تعيين الشركة الأساسية");
    }
  };

  const getCurrentSystemCompanyId = () => {
    const userWithCompany = staff.find((u) => u.company);
    return userWithCompany?.company?.id || "";
  };

  const filteredCompanies = useMemo(() => {
    const searchLower = companySearch.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.slug.toLowerCase().includes(searchLower),
    );
  }, [companySearch, companies]);

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const totalLinks = useMemo(
    () => staff.reduce((acc, u) => acc + (u.userCompanies?.length || 0), 0),
    [staff],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري استدعاء بيانات وصول الموظفين...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Users className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                إدارة وصول الموظفين للشركات
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {staff.length} موظف
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ربط حسابات إدارة النظام بالشركات وإدارة تصاريح الأعضاء عبر المنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="h-8 text-xs pr-8 rounded-lg bg-card border-border/60"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchStaff(false)}
            disabled={refreshing}
            className="size-8 rounded-lg shadow-2xs active:scale-[0.98] transition-transform shrink-0"
            title="تحديث القائمة"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">موظفو إدارة النظام</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {staff.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات المسجلة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {companies.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">روابط الوصول والتصاريح</span>
              <span className="size-1.5 rounded-full bg-purple-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totalLinks}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground uppercase text-[11px] font-mono">
              <tr>
                <th className="px-4 py-3 font-semibold">الموظف</th>
                <th className="px-4 py-3 font-semibold">الرتبة في النظام</th>
                <th className="px-4 py-3 font-semibold">الشركات المرتبطة</th>
                <th className="px-4 py-3 font-semibold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground">
                    لا يوجد موظفون يطابقون معايير البحث
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {user.email}
                        </span>
                        {user.company && user.company.id !== getCurrentSystemCompanyId() && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md">
                              تنبيه: الشركة الأساسية ليست شركة النظام
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/70 bg-muted/40 text-[11px] font-mono font-medium text-foreground">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.company && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 text-[11px] font-mono">
                            <Building2 className="size-3 text-primary" />
                            <span className="font-semibold">{user.company.name}</span>
                            <span className="text-[10px] opacity-75">(أساسي)</span>
                          </div>
                        )}

                        {user.userCompanies && user.userCompanies.length > 0
                          ? user.userCompanies
                              .filter((link) => !user.company || link.companyId !== user.company.id)
                              .map((link) => (
                                <div
                                  key={`${user.id}-${link.companyId}`}
                                  className="group inline-flex items-center gap-1 px-2 py-0.5 bg-muted/40 text-foreground rounded-md border border-border/70 text-[11px] font-mono"
                                >
                                  <Building2 className="size-3 text-muted-foreground" />
                                  <span>{link.company.name}</span>
                                  <span className="text-[10px] text-muted-foreground">({link.role})</span>
                                  <button
                                    onClick={() => handleRemoveAccess(user.id, link.companyId)}
                                    className="text-muted-foreground hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                                    title="إزالة الوصول"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              ))
                          : !user.company && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                لا توجد شركات مرتبطة
                              </span>
                            )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddModal(true);
                            setCompanySearch("");
                          }}
                          className="h-7 px-2.5 text-xs font-mono font-medium gap-1 active:scale-[0.98] transition-transform"
                        >
                          <Plus className="size-3" />
                          <span>ربط بشركة</span>
                        </Button>
                        {user.company && user.company.id !== getCurrentSystemCompanyId() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSetPrimaryCompany(
                                user.id,
                                `${user.firstName} ${user.lastName}`,
                              )
                            }
                            className="h-7 px-2 text-xs font-mono font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 active:scale-[0.98] transition-transform"
                            title="تعيين شركة النظام كشركة أساسية"
                          >
                            <span>تصحيح</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Context Dialog */}
      <Dialog open={showAddModal && !!selectedUser} onOpenChange={(open) => { if (!open) setShowAddModal(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="size-4.5 text-primary" />
              ربط {selectedUser?.firstName} بشركة جديدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                الدور داخل الشركة
              </label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                <SelectTrigger className="h-8.5 text-xs font-mono">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">مالك الشركة (Owner)</SelectItem>
                  <SelectItem value="COMPANY_ADMIN">مدير الشركة (Admin)</SelectItem>
                  <SelectItem value="MANAGER">مدير قسم (Manager)</SelectItem>
                  <SelectItem value="AGENT">موظف عادي (Agent)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col h-[300px]">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                اختر الشركة المستهدفة
              </label>
              <div className="relative mb-2">
                <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  className="h-8 pr-8 text-xs font-mono"
                  placeholder="بحث عن اسم أو Slug..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-border/80 rounded-lg divide-y divide-border/60">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAddAccess(c.id)}
                      className="w-full flex items-center justify-between p-2.5 text-right hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-muted/60 rounded-md text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                          <Building2 className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            @{c.slug}
                          </p>
                        </div>
                      </div>
                      <Plus className="size-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    لا توجد شركات تطابق البحث
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffCompanyAccess;
