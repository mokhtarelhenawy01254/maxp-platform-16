import React, { useState, useEffect, useCallback } from "react";
import {
  UsersIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
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
  companies: UserCompanyRelation[];
}

const OwnerUsersManagement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] =
    useState<string>("all");
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
      if (response.data.success) {
        setUsers(response.data.data.users);
      } else {
        toast.error(response.data.message || "فشل تحميل المستخدمين");
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

  // تحديث تلقائي عند عودة التركيز للنافذة
  useEffect(() => {
    const onFocus = () => fetchUsers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchUsers]);

  // Get unique companies for filter
  const allCompanies = React.useMemo(() => {
    const companiesMap = new Map<string, { id: string; name: string }>();
    users.forEach((user) => {
      user.companies.forEach((uc) => {
        if (!companiesMap.has(uc.company.id)) {
          companiesMap.set(uc.company.id, {
            id: uc.company.id,
            name: uc.company.name,
          });
        }
      });
    });
    return Array.from(companiesMap.values());
  }, [users]);

  // Filter users
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Company filter
      const matchesCompany =
        selectedCompanyFilter === "all" ||
        user.companies.some((uc) => uc.company.id === selectedCompanyFilter);

      return matchesSearch && matchesCompany;
    });
  }, [users, searchQuery, selectedCompanyFilter]);

  const handleDeleteUser = async (user: UserData) => {
    const targetCompanies =
      selectedCompanyFilter !== "all"
        ? [selectedCompanyFilter]
        : user.companies.map((uc) => uc.company.id).filter(Boolean);
    if (!targetCompanies.length) {
      toast.error("لا يمكن تحديد الشركة لهذا المستخدم");
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
          const status = err.response?.status;
          const msg = err.response?.data?.message || "خطأ في حذف المستخدم";
          lastMessage = msg;
          if (status === 404) {
            // محذوف مسبقاً في هذه الشركة
            notFoundCount += 1;
            continue;
          }
        }
      }

      if (success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast.success("تم حذف المستخدم");
      } else if (notFoundCount === targetCompanies.length) {
        // كله 404 -> اعتبره محذوف وحدث القائمة
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast.success("المستخدم محذوف مسبقاً وتم تحديث القائمة");
      } else {
        toast.error(lastMessage || "فشل حذف المستخدم");
      }
      // تأكيد التزامن مع الخادم
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف المستخدم");
    } finally {
      setDeleteLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "COMPANY_ADMIN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "MANAGER":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "AGENT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
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
        return "مدير";
      case "AGENT":
        return "موظف";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-blue-600" />
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة مركزية لموظفي جميع شركاتك
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pr-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          {/* Company Filter */}
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="form-select rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">كل الشركات</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إجمالي المستخدمين
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
            {users.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">نشط</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            في أكثر من شركة
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {users.filter((u) => u.companies.length > 1).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  المستخدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  التواصل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  الشركات والأدوار
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  إجراءات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={getImageUrl(user.avatar) || ""}
                            alt=""
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-blue-600 font-bold">
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.lastLoginAt
                            ? `آخر ظهور: ${new Date(user.lastLoginAt).toLocaleDateString("ar-EG")}`
                            : "لم يسجل دخول بعد"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                        <EnvelopeIcon className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <PhoneIcon className="w-4 h-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.companies.map((uc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg"
                        >
                          <div className="w-5 h-5 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center overflow-hidden">
                            {uc.company.logo ? (
                              <img
                                src={getImageUrl(uc.company.logo) || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BuildingOffice2Icon className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {uc.company.name}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(uc.role)}`}
                          >
                            {getRoleLabel(uc.role)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {user.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="إضافة لشركة أخرى"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                        title="نقل بين الشركات"
                      >
                        <ArrowsRightLeftIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteLoading === user.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-60"
                        title="حذف المستخدم"
                      >
                        {deleteLoading === user.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            لا يوجد مستخدمين مطابقين للبحث
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerUsersManagement;
