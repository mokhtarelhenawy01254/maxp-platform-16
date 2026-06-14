import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Search,
  Edit,
  RefreshCw,
  X,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useMemo } from "react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

interface Subscription {
  id: string;
  plan: string;
  monthlyFee: number;
  status: string;
  billingDay: number;
  nextBillingDate: string;
  lastBillingDate?: string;
  failedAttempts: number;
  createdAt: string;
  company: {
    id: string;
    name: string;
    email: string;
    plan: string;
    isActive: boolean;
    createdAt: string;
  };
}

export default function PlatformSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [editFormData, setEditFormData] = useState({
    status: "",
    plan: "",
    monthlyFee: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const filteredSubscriptions = useMemo(() => {
    if (!searchQuery) return subscriptions;
    const query = searchQuery.toLowerCase();
    return subscriptions.filter(
      (sub) =>
        sub.company.name.toLowerCase().includes(query) ||
        sub.company.email.toLowerCase().includes(query),
    );
  }, [subscriptions, searchQuery]);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, filterStatus, filterPlan]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterPlan) params.plan = filterPlan;

      const response = await apiClient.get(
        "/super-admin/platform/subscriptions",
        { params },
      );

      if (response.data.success) {
        setSubscriptions(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("خطأ في جلب الاشتراكات");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      ACTIVE: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "نشط",
      },
      SUSPENDED: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
        text: "معلق",
      },
      CANCELLED: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        text: "ملغي",
      },
      PAST_DUE: {
        color: "bg-orange-100 text-orange-800",
        icon: Clock,
        text: "متأخر",
      },
    };

    const badge = badges[status] || badges["ACTIVE"]!;
    const Icon = badge!.icon;

    return (
      <span
        className={`${badge.color} px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit`}
      >
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const plans: Record<string, string> = {
      FREE: "مجاني",
      BASIC: "أساسي",
      PRO: "احترافي",
      ENTERPRISE: "مؤسسات",
    };
    return (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
        {plans[plan] || plan}
      </span>
    );
  };

  const handleEditClick = (sub: Subscription) => {
    setSelectedSub(sub);
    setEditFormData({
      status: sub.status,
      plan: sub.plan,
      monthlyFee: sub.monthlyFee,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSub) return;
    try {
      setIsSaving(true);
      const response = await apiClient.put(
        `/super-admin/platform/subscription/${selectedSub.id}`,
        editFormData,
      );

      if (response.data.success) {
        toast.success("تم تحديث الاشتراك بنجاح");
        setIsEditModalOpen(false);
        fetchSubscriptions();
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("خطأ في تحديث الاشتراك");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotalMRR = () => {
    return subscriptions
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + parseFloat(s.monthlyFee.toString()), 0);
  };

  if (loading && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إدارة اشتراكات المنصة
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            مراقبة وإدارة جميع اشتراكات الشركات
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  إجمالي الاشتراكات
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {subscriptions.length}
                </p>
              </div>
              <Users className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  الاشتراكات النشطة
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {subscriptions.filter((s) => s.status === "ACTIVE").length}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg group hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  MRR (التوقعات الشهرية)
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {calculateTotalMRR().toLocaleString("ar-EG")} ج
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  معلقة/متأخرة
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {
                    subscriptions.filter(
                      (s) =>
                        s.status === "SUSPENDED" || s.status === "PAST_DUE",
                    ).length
                  }
                </p>
              </div>
              <AlertCircle className="text-yellow-600" size={32} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter size={16} className="inline mr-2" />
                الحالة
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">الكل</option>
                <option value="ACTIVE">نشط</option>
                <option value="SUSPENDED">معلق</option>
                <option value="CANCELLED">ملغي</option>
                <option value="PAST_DUE">متأخر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter size={16} className="inline mr-2" />
                الخطة
              </label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">الكل</option>
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search size={16} className="inline mr-2" />
                بحث
              </label>
              <div className="flex-1 relative">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="البحث باسم الشركة أو البريد الإلكتروني..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={fetchSubscriptions}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الشركة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الخطة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الرسوم الشهرية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الفاتورة القادمة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    محاولات فاشلة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {sub.company.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {sub.company.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getPlanBadge(sub.plan)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white font-semibold">
                        <DollarSign size={16} />
                        {parseFloat(sub.monthlyFee.toString()).toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {new Date(sub.nextBillingDate).toLocaleDateString(
                        "ar-EG",
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sub.failedAttempts > 0 ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {sub.failedAttempts}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEditClick(sub)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="تعديل"
                      >
                        <Edit size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Subscription Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل اشتراك الشركة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-right block">
                اسم الشركة
              </Label>
              <Input
                id="companyName"
                value={selectedSub?.company.name || ""}
                disabled
                className="bg-gray-50 text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-right block">
                الحالة
              </Label>
              <Select
                value={editFormData.status}
                onValueChange={(val) =>
                  setEditFormData({ ...editFormData, status: val || "" })
                }
              >
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">نشط</SelectItem>
                  <SelectItem value="SUSPENDED">معلق</SelectItem>
                  <SelectItem value="CANCELLED">ملغي</SelectItem>
                  <SelectItem value="PAST_DUE">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan" className="text-right block">
                الخطة
              </Label>
              <Select
                value={editFormData.plan}
                onValueChange={(val) =>
                  setEditFormData({ ...editFormData, plan: val || "" })
                }
              >
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder="اختر الخطة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">مجاني</SelectItem>
                  <SelectItem value="BASIC">أساسي</SelectItem>
                  <SelectItem value="PRO">احترافي</SelectItem>
                  <SelectItem value="ENTERPRISE">مؤسسات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyFee" className="text-right block">
                الرسوم الشهرية (جنية)
              </Label>
              <Input
                id="monthlyFee"
                type="number"
                value={editFormData.monthlyFee}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    monthlyFee: parseFloat(e.target.value),
                  })
                }
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1"
            >
              <X size={16} className="ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <RefreshCw size={16} className="ml-2 animate-spin" />
              ) : (
                <Save size={16} className="ml-2" />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
