import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Building2,
  Search,
  ArrowLeftRight,
  Plus,
  Mail,
  Phone,
  Trash2,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface UserCompanyRelation {
  company: {
    id: string;
    name: string;
    logo: string | null;
  };
  role: string;
  isActive: boolean;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  companies?: UserCompanyRelation[];
}

const OwnerUsersManagement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3007";
    return `${apiUrl}/${path.replace(/^\/+/, "")}`;
  };

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("owner/users");
      if (response?.data?.success) {
        const list = Array.isArray(response.data.data?.users)
          ? response.data.data.users
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];
        setUsers(list);
      } else {
        toast.error(response?.data?.message || i18n.t("OwnerUsersManagement.failed_load_47f1"));
      }
    } catch (error: any) {
      console.error("Failed to fetch users", error);
      toast.error(error.response?.data?.message || "فشل تحميل المستخدمين");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const onFocus = () => fetchUsers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchUsers]);

  const allCompanies = useMemo(() => {
    const companiesMap = new Map<string, { id: string; name: string }>();
    users.forEach((user) => {
      (user.companies || []).forEach((uc) => {
        if (uc?.company?.id && !companiesMap.has(uc.company.id)) {
          companiesMap.set(uc.company.id, {
            id: uc.company.id,
            name: uc.company.name,
          });
        }
      });
    });
    return Array.from(companiesMap.values());
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        user.email?.toLowerCase().includes(q) ||
        `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase().includes(q);

      const userComps = user.companies || [];
      const matchesCompany =
        selectedCompanyFilter === "all" ||
        userComps.some((uc) => uc?.company?.id === selectedCompanyFilter);

      return matchesSearch && matchesCompany;
    });
  }, [users, searchQuery, selectedCompanyFilter]);

  const handleDeleteUser = async (user: UserData) => {
    const userComps = user.companies || [];
    const targetCompanies =
      selectedCompanyFilter !== "all"
        ? [selectedCompanyFilter]
        : userComps.map((uc) => uc?.company?.id).filter(Boolean);

    if (!targetCompanies.length) {
      tToast.error("OwnerUsersManagement.msg_60da");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف ${user.firstName}؟`)) return;

    try {
      setDeleteLoading(user.id);
      let success = false;
      let lastMessage = "";
      let notFoundCount = 0;

      for (const companyId of targetCompanies) {
        try {
          const res = await apiClient.delete(`/company/${companyId}/users/${user.id}`);
          if (res.data?.status === "success" || res.data?.success) {
            success = true;
            break;
          }
          lastMessage = res.data?.message || lastMessage;
        } catch (err: any) {
          if (err.response?.status === 404) {
            notFoundCount += 1;
            continue;
          }
          lastMessage = err.response?.data?.message || "خطأ في حذف المستخدم";
        }
      }

      if (success || notFoundCount === targetCompanies.length) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        tToast.success("OwnerUsersManagement.success_delete_9115");
      } else {
        toast.error(lastMessage || "فشل حذف المستخدم");
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف المستخدم");
    } finally {
      setDeleteLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "COMPANY_ADMIN":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "MANAGER":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "OWNER":
        return "مالك";
      case "SUPER_ADMIN":
        return "مدير عام";
      case "COMPANY_ADMIN":
        return "مدير شركة";
      case "MANAGER":
        return "مدير فرع";
      case "AGENT":
        return "موظف";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs">جاري تحميل سجل مستخدمي الشركات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground" dir="rtl">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              إدارة المستخدمين المركزية
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة صلاحيات وحسابات المستخدمين والموظفين عبر جميع الشركات التابعة لك
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل الشركات ({allCompanies.length})</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Telemetry Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">إجمالي المستخدمين</span>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">{users.length}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">الحسابات النشطة</span>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
          <span className="text-xs text-muted-foreground">حسابات متعددة الشركات</span>
          <p className="text-xl font-bold font-mono tabular-nums text-primary mt-0.5">
            {users.filter((u) => (u.companies || []).length > 1).length}
          </p>
        </div>
      </div>

      {/* Single-Surface Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60 text-right text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">المستخدم</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">التواصل</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">الشركات والأدوار</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">الحالة</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {filteredUsers.map((user) => {
                const userComps = user.companies || [];
                return (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full border border-border/70 bg-muted/40 flex items-center justify-center font-bold text-primary flex-shrink-0 overflow-hidden text-xs">
                          {user.avatar ? (
                            <img src={getImageUrl(user.avatar) || ""} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{user.firstName?.charAt(0) || "U"}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {user.lastLoginAt ? `آخر ظهور: ${new Date(user.lastLoginAt).toLocaleDateString("ar-EG")}` : "لم يسجل دخول بعد"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground/70" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground/70" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {userComps.length === 0 ? (
                          <span className="text-muted-foreground text-[11px]">بدون شركات مرتبطة</span>
                        ) : (
                          userComps.map((uc, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px]">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-foreground font-medium">{uc?.company?.name || "شركة"}</span>
                              <span className={`px-1 rounded text-[10px] border ${getRoleBadge(uc?.role)}`}>
                                {getRoleLabel(uc?.role)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${
                        user.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}>
                        {user.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteLoading === user.id}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border/70 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors disabled:opacity-50"
                        title="حذف من الشركة"
                      >
                        {deleteLoading === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-xs">لا يوجد مستخدمون مطابقون لمعايير البحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerUsersManagement;
