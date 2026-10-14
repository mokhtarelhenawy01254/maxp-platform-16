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
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { StaffCompanyAccessDialog, Company } from "./StaffCompanyAccessDialog";

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
      if (data.success) setStaff(data.data || []);
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
      if (data.success) setCompanies(data.data.companies || []);
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
        body: JSON.stringify({ userId: selectedUser.id, companyId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaff(false);
        setShowAddModal(false);
        toast.success("تم ربط الموظف بالشركة بنجاح");
      } else {
        toast.error("فشل الربط: " + (data.message || "حدث خطأ غير متوقع"));
      }
    } catch {
      toast.error("تعذر إكمال عملية ربط الموظف بالشركة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAccess = async (userId: string, companyId: string) => {
    if (!confirm("هل أنت متأكد من حذف وصول هذا الموظف لهذه الشركة؟")) return;
    try {
      const res = await fetch(buildApiUrl(`auth/user-company/${userId}/${companyId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchStaff(false);
        toast.success("تم حذف وصول الموظف للشركة بنجاح");
      } else {
        toast.error("فشل الحذف: " + (data.message || "حدث خطأ"));
      }
    } catch {
      toast.error("تعذر إكمال عملية حذف الوصول");
    }
  };

  const handleSetPrimaryCompany = async (userId: string, userName: string) => {
    if (!confirm(`هل تريد تعيين شركة النظام كشركة أساسية لـ ${userName}؟`)) return;
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
    } catch {
      toast.error("تعذر تعيين الشركة الأساسية");
    }
  };

  const systemCompanyId = useMemo(() => {
    return staff.find((u) => u.company)?.company?.id || "";
  }, [staff]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [companySearch, companies]);

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const totalLinks = useMemo(
    () => staff.reduce((acc, u) => acc + (u.userCompanies?.length || 0), 0),
    [staff]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]" dir="rtl">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري استدعاء بيانات وصول الموظفين...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Single-Surface Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                إدارة وصول الموظفين للشركات
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {staff.length} موظف
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
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
              className="h-8 text-xs pr-8 font-mono bg-background border-border/70"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchStaff(false)}
            disabled={refreshing}
            className="size-8 rounded-lg shrink-0 active:scale-[0.98] transition-transform"
            title="تحديث القائمة"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">موظفو إدارة النظام</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {staff.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات المسجلة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {companies.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between hover:bg-muted/10 transition-colors">
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
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground uppercase text-[11px] font-mono">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">الموظف</th>
                <th className="px-3.5 py-2.5 font-semibold">الرتبة بالنظام</th>
                <th className="px-3.5 py-2.5 font-semibold">الشركات المرتبطة</th>
                <th className="px-3.5 py-2.5 font-semibold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-xs font-mono text-muted-foreground">
                    لا يوجد موظفون يطابقون معايير البحث
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/15 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-xs">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {user.email}
                        </span>
                        {user.company && user.company.id !== systemCompanyId && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded w-fit mt-0.5">
                            الشركة الأساسية ليست شركة النظام
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/70 bg-muted/40 text-[10px] font-mono font-medium text-foreground">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {user.company && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded border border-primary/20 text-[10px] font-mono">
                            <Building2 className="size-2.5" />
                            <span className="font-semibold">{user.company.name}</span>
                            <span className="opacity-75">(أساسي)</span>
                          </div>
                        )}
                        {user.userCompanies && user.userCompanies.length > 0
                          ? user.userCompanies
                              .filter((link) => !user.company || link.companyId !== user.company.id)
                              .map((link) => (
                                <div
                                  key={`${user.id}-${link.companyId}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted/40 text-foreground rounded border border-border/70 text-[10px] font-mono"
                                >
                                  <Building2 className="size-2.5 text-muted-foreground" />
                                  <span>{link.company.name}</span>
                                  <span className="text-muted-foreground">({link.role})</span>
                                  <button
                                    onClick={() => handleRemoveAccess(user.id, link.companyId)}
                                    className="text-muted-foreground hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                                    title="إزالة الوصول"
                                  >
                                    <Trash2 className="size-2.5" />
                                  </button>
                                </div>
                              ))
                          : !user.company && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                لا توجد شركات مرتبطة
                              </span>
                            )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddModal(true);
                            setCompanySearch("");
                          }}
                          className="h-7 px-2 text-xs font-mono gap-1 active:scale-[0.98]"
                        >
                          <Plus className="size-3" />
                          <span>ربط</span>
                        </Button>
                        {user.company && user.company.id !== systemCompanyId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSetPrimaryCompany(user.id, `${user.firstName} ${user.lastName}`)
                            }
                            className="h-7 px-2 text-xs font-mono text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 active:scale-[0.98]"
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
      <StaffCompanyAccessDialog
        open={showAddModal && !!selectedUser}
        onOpenChange={(open) => { if (!open) setShowAddModal(false); }}
        userName={selectedUser?.firstName}
        role={newRole}
        onRoleChange={setNewRole}
        companySearch={companySearch}
        onCompanySearchChange={setCompanySearch}
        companies={filteredCompanies}
        submitting={submitting}
        onSelectCompany={handleAddAccess}
      />
    </div>
  );
};

export default StaffCompanyAccess;
