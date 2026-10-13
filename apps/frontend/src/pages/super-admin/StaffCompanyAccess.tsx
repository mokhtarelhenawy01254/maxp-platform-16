import { useState, useEffect } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

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
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState("AGENT");

  useEffect(() => {
    fetchStaff();
    fetchCompanies();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch(buildApiUrl("super-admin/users?limit=100"), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStaff(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch staff", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      // Using the standard admin companies endpoint
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
        fetchStaff();
        setShowAddModal(false);
        alert(i18n.t("StaffCompanyAccess.msg_7dc0"));
      } else {
        alert("فشل: " + data.message);
      }
    } catch (error) {
      alert(i18n.t("StaffCompanyAccess.msg_968c"));
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
        fetchStaff();
        alert(i18n.t("StaffCompanyAccess.msg_abf3"));
      } else {
        alert("فشل: " + data.message);
      }
    } catch (error) {
      alert(i18n.t("StaffCompanyAccess.msg_968c"));
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
        fetchStaff();
        alert(i18n.t("StaffCompanyAccess.msg_bd23"));
      } else {
        alert("فشل: " + data.message);
      }
    } catch (error) {
      alert(i18n.t("StaffCompanyAccess.msg_968c"));
    }
  };

  const getCurrentSystemCompanyId = () => {
    // Get it from the first staff member who has a company
    // System company is the one that appears most or the super admin's company
    // For simplicity, we'll get from first user
    const userWithCompany = staff.find((u) => u.company);
    return userWithCompany?.company?.id || "";
  };

  useEffect(() => {
    const searchLower = companySearch.toLowerCase();
    const filtered = companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.slug.toLowerCase().includes(searchLower),
    );
    setFilteredCompanies(filtered);
  }, [companySearch, companies]);

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  const totalLinks = staff.reduce((acc, u) => acc + (u.userCompanies?.length || 0), 0);

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <UserGroupIcon className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                إدارة وصول الموظفين للشركات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {staff.length} موظف
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ربط حسابات إدارة النظام بالشركات وإدارة تصاريح الأعضاء
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="size-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="بحث عن موظف..."
            className="w-full h-8 pr-8 pl-3 text-xs rounded-lg border border-border/80 bg-background/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-3 rounded-xl border border-border/80 bg-card/40 divide-x divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">موظفو النظام</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {staff.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">إجمالي حسابات Staff</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الشركات المتاحة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {companies.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">الشركات المسجلة</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">روابط الوصول النشطة</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {totalLinks}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تصاريح العضوية المسندة</p>
        </div>
      </div>

      {/* Single Chassis Table */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="px-4 py-3 font-semibold">الموظف</th>
                <th className="px-4 py-3 font-semibold">الرتبة في النظام</th>
                <th className="px-4 py-3 font-semibold">الشركات المرتبطة</th>
                <th className="px-4 py-3 font-semibold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {staff
                .filter(
                  (u) =>
                    `${u.firstName} ${u.lastName}`
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    u.email.toLowerCase().includes(search.toLowerCase()),
                )
                .map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {user.email}
                        </span>
                        {user.company &&
                          user.company.id !== getCurrentSystemCompanyId() && (
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
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Primary Company Link (from companyId) */}
                        {user.company && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20 text-[11px] font-mono">
                            <BuildingOfficeIcon className="size-3 text-blue-500" />
                            <span className="font-semibold">{user.company.name}</span>
                            <span className="text-[10px] opacity-75">(أساسي)</span>
                          </div>
                        )}

                        {/* Secondary Company Links (from UserCompany table) */}
                        {user.userCompanies && user.userCompanies.length > 0
                          ? user.userCompanies
                              .filter(
                                (link) =>
                                  !user.company ||
                                  link.companyId !== user.company.id,
                              )
                              .map((link) => (
                                <div
                                  key={`${user.id}-${link.companyId}`}
                                  className="group inline-flex items-center gap-1 px-2 py-0.5 bg-muted/40 text-foreground rounded-md border border-border/70 text-[11px] font-mono"
                                >
                                  <BuildingOfficeIcon className="size-3 text-muted-foreground" />
                                  <span>{link.company.name}</span>
                                  <span className="text-[10px] text-muted-foreground">({link.role})</span>
                                  <button
                                    onClick={() =>
                                      handleRemoveAccess(
                                        user.id,
                                        link.companyId,
                                      )
                                    }
                                    className="text-muted-foreground hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                                    title="إزالة الوصول"
                                  >
                                    <TrashIcon className="size-3" />
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
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddModal(true);
                            setCompanySearch("");
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border/80 bg-background/50 hover:bg-muted text-xs font-mono font-medium text-foreground active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                        >
                          <PlusIcon className="size-3" />
                          <span>ربط بشركة</span>
                        </button>
                        {user.company &&
                          user.company.id !== getCurrentSystemCompanyId() && (
                            <button
                              onClick={() =>
                                handleSetPrimaryCompany(
                                  user.id,
                                  `${user.firstName} ${user.lastName}`,
                                )
                              }
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono font-medium text-amber-600 dark:text-amber-400 active:scale-[0.98] transition-all cursor-pointer"
                              title="تعيين شركة النظام كشركة أساسية"
                            >
                              <span>تصحيح</span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Context Modal */}
      {showAddModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
                ربط {selectedUser.firstName} بشركة جديدة
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الدور داخل الشركة
                </label>
                <select
                  className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="OWNER">مالك الشركة (Owner)</option>
                  <option value="COMPANY_ADMIN">مدير الشركة (Admin)</option>
                  <option value="MANAGER">مدير قسم (Manager)</option>
                  <option value="AGENT">موظف عادي (Agent)</option>
                </select>
              </div>

              <div className="flex flex-col h-[350px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اختر الشركة
                </label>
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pr-10 pl-4 py-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="بحث عن اسم أو Slug..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-xl dark:border-gray-600 divide-y dark:divide-gray-700 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleAddAccess(c.id)}
                        className="w-full flex items-center justify-between p-4 text-right hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              {c.name}
                            </p>
                            <p className="text-xs text-gray-400 tracking-wider">
                              @{c.slug}
                            </p>
                          </div>
                        </div>
                        <PlusIcon className="h-5 w-5 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))
                  ) : (
                    <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                      <ExclamationCircleIcon className="h-8 w-8 opacity-20" />
                      <span className="text-sm italic">
                        لا توجد نتائج تطابق بحثك
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCompanyAccess;
