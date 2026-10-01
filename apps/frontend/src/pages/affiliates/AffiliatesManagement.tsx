import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  UserGroupIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

interface Affiliate {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  isActive: boolean;
  commissionType: "PERCENTAGE" | "MARKUP";
  commissionRate: number;
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalClicks: number;
  minPayout: number;
  canCreateOrdersForOthers: boolean;
  canViewCustomerData: boolean;
  identityDocumentUrl?: string | null;
  identityDocumentUploadedAt?: string | null;
  identityDocumentStatus?:
    | "NOT_SUBMITTED"
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REJECTED";
  identityDocumentReviewNote?: string | null;
  identityDocumentReviewedAt?: string | null;
  statusReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  isMissingRecord?: boolean;
}

interface AffiliateReviewLog {
  id: string;
  eventType: string;
  title: string;
  note?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  previousDocumentStatus?: string | null;
  nextDocumentStatus?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface AffiliateDocumentVersion {
  id: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedByUserId?: string | null;
  source: string;
  isCurrent: boolean;
  replacedAt?: string | null;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const AffiliatesManagement: React.FC = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [editingCommission, setEditingCommission] = useState<string | null>(
    null,
  );
  const [newCommission, setNewCommission] = useState<number>(0);
  const [editingPolicyAffiliate, setEditingPolicyAffiliate] =
    useState<Affiliate | null>(null);
  const [policyForm, setPolicyForm] = useState({
    minPayout: 100,
    canCreateOrdersForOthers: true,
    canViewCustomerData: true,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [updatingDocumentAffiliateId, setUpdatingDocumentAffiliateId] =
    useState<string | null>(null);
  const [historyAffiliate, setHistoryAffiliate] = useState<Affiliate | null>(
    null,
  );
  const [reviewHistory, setReviewHistory] = useState<AffiliateReviewLog[]>([]);
  const [documentHistory, setDocumentHistory] = useState<
    AffiliateDocumentVersion[]
  >([]);
  const [loadingReviewHistory, setLoadingReviewHistory] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiSuccess<Affiliate[]>>(
        "/affiliates/list",
      );
      if (response.data.success) {
        setAffiliates(response.data.data);
      }
    } catch (_error: unknown) {
      tToast.error("affiliates.loadFailed");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (affiliateId: string, newStatus: string) => {
    const affiliate = affiliates.find((item) => item.id === affiliateId);
    if (!affiliate) {
      return;
    }

    const promptMessage =
      newStatus === "ACTIVE"
        ? "ملاحظة التفعيل أو سبب القبول (اختياري)"
        : newStatus === "SUSPENDED"
          ? "سبب الإيقاف أو الرفض"
          : "ملاحظة حالة المراجعة (اختياري)";
    const enteredReason = window.prompt(
      promptMessage,
      affiliate.statusReason || "",
    );

    if (enteredReason === null) {
      return;
    }

    const normalizedReason = enteredReason.trim();
    if (newStatus === "SUSPENDED" && !normalizedReason) {
      tToast.error("affiliates.suspendReasonRequired");
      return;
    }

    try {
      const response = await apiClient.put<
        ApiSuccess<unknown>,
        { status: string; statusReason: string | null }
      >(
        `/affiliates/${affiliateId}/status`,
        {
          status: newStatus,
          statusReason: normalizedReason || null,
        },
      );
      if (response.data.success) {
        tToast.success("affiliates.statusUpdated");
        fetchAffiliates();
      }
    } catch (_error: unknown) {
      tToast.error("affiliates.statusUpdateFailed");
    }
  };

  const updateCommission = async (affiliateId: string) => {
    try {
      const affiliate = affiliates.find((item) => item.id === affiliateId);
      if (!affiliate) return;

      if (!Number.isFinite(newCommission) || newCommission < 0) {
        tToast.error("affiliates.invalidCommissionValue");
        return;
      }

      if (affiliate.commissionType === "PERCENTAGE" && newCommission > 100) {
        tToast.error("affiliates.commissionRateMax");
        return;
      }

      const response = await apiClient.put<
        ApiSuccess<unknown>,
        { commissionRate: number }
      >(`/affiliates/${affiliateId}/commission`, {
        commissionRate: newCommission,
      });
      if (response.data.success) {
        tToast.success("affiliates.commissionUpdated");
        setEditingCommission(null);
        fetchAffiliates();
      }
    } catch (_error: unknown) {
      tToast.error("affiliates.commissionUpdateFailed");
    }
  };

  const openPolicyEditor = (affiliate: Affiliate) => {
    setEditingPolicyAffiliate(affiliate);
    setPolicyForm({
      minPayout: Number(affiliate.minPayout || 100),
      canCreateOrdersForOthers: Boolean(affiliate.canCreateOrdersForOthers),
      canViewCustomerData: Boolean(affiliate.canViewCustomerData),
    });
  };

  const updatePolicy = async () => {
    if (!editingPolicyAffiliate) {
      return;
    }

    try {
      setSavingPolicy(true);
      const response = await apiClient.put<
        ApiSuccess<Affiliate>,
        typeof policyForm
      >(`/affiliates/${editingPolicyAffiliate.id}/policy`, {
        minPayout: Number(policyForm.minPayout),
        canCreateOrdersForOthers: policyForm.canCreateOrdersForOthers,
        canViewCustomerData: policyForm.canViewCustomerData,
      });
      if (response.data.success) {
        tToast.success("affiliates.controlsUpdated");
        setEditingPolicyAffiliate(null);
        fetchAffiliates();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث ضوابط المسوق"));
    } finally {
      setSavingPolicy(false);
    }
  };

  const getDocumentStatusLabel = (status?: string | null) => {
    switch (status) {
      case "APPROVED":
        return "المستند معتمد";
      case "REJECTED":
        return "المستند مرفوض";
      case "PENDING_REVIEW":
        return "المستند قيد المراجعة";
      case "NOT_SUBMITTED":
      default:
        return "لا يوجد مستند";
    }
  };

  const getDocumentStatusStyle = (status?: string | null) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      case "PENDING_REVIEW":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "NOT_SUBMITTED":
      default:
        return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const handleDocumentReviewUpdate = async (
    affiliate: Affiliate,
    nextStatus: "APPROVED" | "REJECTED",
  ) => {
    if (!affiliate.identityDocumentUrl || affiliate.isMissingRecord) {
      return;
    }

    let reviewNote: string | null = null;
    if (nextStatus === "REJECTED") {
      const enteredReason = window.prompt(
        "سبب رفض مستند الاعتماد",
        affiliate.identityDocumentReviewNote || "",
      );

      if (enteredReason === null) {
        return;
      }

      reviewNote = enteredReason.trim();
      if (!reviewNote) {
        tToast.error("affiliates.rejectionReasonRequired");
        return;
      }
    }

    try {
      setUpdatingDocumentAffiliateId(affiliate.id);
      const response = await apiClient.put<
        ApiSuccess<Affiliate>,
        { status: "APPROVED" | "REJECTED"; reviewNote: string | null }
      >(`/affiliates/${affiliate.id}/document-review`, {
        status: nextStatus,
        reviewNote,
      });

      if (response.data.success) {
        toast.success(
          nextStatus === "APPROVED"
            ? "تم اعتماد المستند بنجاح"
            : "تم رفض مستند الاعتماد",
        );
        await fetchAffiliates();
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث حالة مستند الاعتماد"));
    } finally {
      setUpdatingDocumentAffiliateId(null);
    }
  };

  const openReviewHistory = async (affiliate: Affiliate) => {
    try {
      setHistoryAffiliate(affiliate);
      setLoadingReviewHistory(true);
      const [reviewResponse, documentResponse] = await Promise.all([
        apiClient.get<ApiSuccess<AffiliateReviewLog[]>>(
          `/affiliates/${affiliate.id}/review-history`,
        ),
        apiClient.get<ApiSuccess<AffiliateDocumentVersion[]>>(
          `/affiliates/${affiliate.id}/document-history`,
        ),
      ]);
      if (reviewResponse.data.success) {
        setReviewHistory(reviewResponse.data.data || []);
      }
      if (documentResponse.data.success) {
        setDocumentHistory(documentResponse.data.data || []);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحميل سجل مراجعات المسوق"));
      setHistoryAffiliate(null);
      setReviewHistory([]);
      setDocumentHistory([]);
    } finally {
      setLoadingReviewHistory(false);
    }
  };

  const getDocumentSourceLabel = (source?: string | null) => {
    switch (source) {
      case "RESUBMISSION":
        return "إعادة رفع";
      case "REGISTRATION":
      default:
        return "التسجيل الأول";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "نشط";
      case "PENDING":
        return "قيد المراجعة";
      case "SUSPENDED":
        return "موقوف";
      default:
        return status;
    }
  };

  const filteredAffiliates = affiliates.filter((affiliate) => {
    const matchesSearch =
      affiliate.user.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      affiliate.user.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      affiliate.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (affiliate.user.phone || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "ALL" || affiliate.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 sm:p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"} min-h-screen`}
    >
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1
              className={`text-xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"} flex items-center`}
            >
              <UserGroupIcon className="h-7 w-7 sm:h-9 sm:w-9 ml-2.5 sm:ml-3 text-indigo-500" />
              إدارة شبكة المسوقين (Premium)
            </h1>
            <p className={`mt-1 sm:mt-2 text-xs sm:text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              تحكم كامل في المسوقين والعمولات والبيانات المالية.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 mb-5 sm:mb-8">
          <div
            className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"}`}
          >
            <div className="text-xs sm:text-sm text-gray-400 mb-1">الجمهور المستهدف</div>
            <div className="text-xl sm:text-3xl font-bold text-indigo-500 tabular-nums">
              {affiliates.length}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
              إجمالي المسوقين المسجلين
            </div>
          </div>
          <div
            className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"}`}
          >
            <div className="text-xs sm:text-sm text-gray-400 mb-1">ينتظرون التفعيل</div>
            <div className="text-xl sm:text-3xl font-bold text-orange-500 tabular-nums">
              {affiliates.filter((a) => a.status === "PENDING").length}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
              طلبات تسجيل جديدة لم تراجع
            </div>
          </div>
          <div
            className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"}`}
          >
            <div className="text-xs sm:text-sm text-gray-400 mb-1">إجمالي المبيعات</div>
            <div className="text-xl sm:text-3xl font-bold text-green-500 tabular-nums">
              {affiliates.reduce(
                (acc, curr) => acc + (curr.totalSales || 0),
                0,
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
              إجمالي الطلبات المحققة
            </div>
          </div>
          <div
            className={`p-3.5 sm:p-6 rounded-xl sm:rounded-2xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm border ${isDark ? "border-gray-700" : "border-gray-100"}`}
          >
            <div className="text-xs sm:text-sm text-gray-400 mb-1">إجمالي العمولات</div>
            <div className="text-xl sm:text-3xl font-bold text-blue-500 tabular-nums">
              {affiliates
                .reduce(
                  (acc, curr) => acc + (Number(curr.totalEarnings) || 0),
                  0,
                )
                .toFixed(2)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
              جنيه مصري مستحقة للمسوقين
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`}
            />
            <input
              type="text"
              placeholder="بحث بالاسم، البريد، أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 sm:py-3 text-sm rounded-xl border ${
                isDark
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-900 shadow-sm"
              } outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {["ALL", "PENDING", "ACTIVE", "SUSPENDED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  filterStatus === status
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : `${isDark ? "bg-gray-800 text-gray-400 border-gray-700" : "bg-white text-gray-600 border-gray-200"} border`
                }`}
              >
                {status === "ALL" ? "الكل" : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Table / Mobile Cards */}
        <div
          className={`rounded-2xl border ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} overflow-hidden shadow-sm`}
        >
          <div className="p-3 md:p-0">
            <div className="overflow-x-auto">
              <table className="block min-w-full md:table md:divide-y md:divide-gray-200 dark:md:divide-gray-700">
                <thead className={`hidden md:table-header-group ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      المسوق
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      البيانات المالية
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      الأداء
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      العمولة اليدوية
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      الضوابط
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                      الإجراء
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`block space-y-3 md:table-row-group md:space-y-0 ${
                    isDark ? "md:bg-gray-800 md:divide-gray-700" : "md:bg-white md:divide-gray-200"
                  } md:divide-y`}
                >
                  {filteredAffiliates.map((affiliate) => (
                    <tr
                      key={affiliate.id}
                      className={`block rounded-2xl border p-4 transition md:table-row md:rounded-none md:border-0 md:p-0 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/40 hover:bg-gray-700/30"
                          : "border-gray-100 bg-white hover:bg-gray-50/50 shadow-sm md:shadow-none"
                      }`}
                    >
                      {/* المسوق */}
                      <td className="block pb-3 md:table-cell md:px-6 md:py-5">
                        <div className="flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`font-bold text-base md:text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                              >
                                {affiliate.user.firstName} {affiliate.user.lastName}
                              </span>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {affiliate.user.email}
                              </div>
                              <div className="text-xs text-indigo-500 mt-0.5">
                                {affiliate.user.phone || "بدون هاتف"}
                              </div>
                            </div>
                            <span
                              className={`md:hidden w-fit px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusStyle(affiliate.status)}`}
                            >
                              {getStatusLabel(affiliate.status)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {affiliate.identityDocumentUrl ? (
                              <a
                                href={affiliate.identityDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                مستند الاعتماد
                              </a>
                            ) : (
                              <span className="text-[11px] text-amber-500">
                                لا يوجد مستند اعتماد مرفوع
                              </span>
                            )}
                            <span
                              className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium ${getDocumentStatusStyle(
                                affiliate.identityDocumentStatus,
                              )}`}
                            >
                              {getDocumentStatusLabel(affiliate.identityDocumentStatus)}
                            </span>
                          </div>

                          {affiliate.isMissingRecord && (
                            <span className="text-[10px] text-orange-500 mt-1">
                              يحتاج إصلاح سجل الأفليت
                            </span>
                          )}
                        </div>
                      </td>

                      {/* البيانات المالية */}
                      <td className="block border-t border-gray-100 py-3 dark:border-gray-700/60 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-2 md:hidden mb-1.5">
                          <span className="text-xs font-semibold text-gray-500">البيانات المالية</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:gap-1 text-xs">
                          <div className="flex flex-col md:flex-row md:justify-between md:max-w-[120px] bg-gray-50 dark:bg-gray-800/60 md:bg-transparent md:dark:bg-transparent p-2 md:p-0 rounded-lg text-center md:text-right">
                            <span className="text-gray-500 text-[10px] md:text-xs">الإجمالي</span>
                            <span
                              className={`font-bold tabular-nums text-xs md:text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {Number(affiliate.totalEarnings).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col md:flex-row md:justify-between md:max-w-[120px] bg-green-50/60 dark:bg-green-900/20 md:bg-transparent md:dark:bg-transparent p-2 md:p-0 rounded-lg text-center md:text-right">
                            <span className="text-gray-500 text-[10px] md:text-xs">المدفوع</span>
                            <span className="text-green-500 font-bold tabular-nums text-xs md:text-xs">
                              {Number(affiliate.paidEarnings).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col md:flex-row md:justify-between md:max-w-[120px] bg-orange-50/60 dark:bg-orange-900/20 md:bg-transparent md:dark:bg-transparent p-2 md:p-0 rounded-lg text-center md:text-right">
                            <span className="text-gray-500 text-[10px] md:text-xs">المعلق</span>
                            <span className="text-orange-500 font-bold tabular-nums text-xs md:text-xs">
                              {Number(affiliate.pendingEarnings).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* الأداء */}
                      <td className="block border-t border-gray-100 py-3 dark:border-gray-700/60 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">الأداء</span>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col text-center">
                              <span className="text-[10px] text-gray-400">
                                مبيعات
                              </span>
                              <span
                                className={`font-bold tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}
                              >
                                {affiliate.totalSales}
                              </span>
                            </div>
                            <div className="w-[1px] h-6 bg-gray-700/20 dark:bg-gray-600/40"></div>
                            <div className="flex flex-col text-center">
                              <span className="text-[10px] text-gray-400">نقرات</span>
                              <span
                                className={`font-bold tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}
                              >
                                {affiliate.totalClicks}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* العمولة */}
                      <td className="block border-t border-gray-100 py-3 dark:border-gray-700/60 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-gray-500 md:hidden">العمولة اليدوية</span>
                          {editingCommission === affiliate.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={
                                  affiliate.commissionType === "PERCENTAGE"
                                    ? 100
                                    : undefined
                                }
                                value={newCommission}
                                onChange={(e) =>
                                  setNewCommission(parseFloat(e.target.value))
                                }
                                className={`w-16 px-2 py-1 rounded border text-xs ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white"}`}
                              />
                              <button
                                onClick={() => updateCommission(affiliate.id)}
                                className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingCommission(null)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium tabular-nums ${isDark ? "text-gray-300" : "text-gray-700"}`}
                              >
                                {affiliate.commissionType === "PERCENTAGE"
                                  ? `${affiliate.commissionRate}%`
                                  : `${affiliate.commissionRate} ج.م`}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingCommission(affiliate.id);
                                  setNewCommission(affiliate.commissionRate);
                                }}
                                disabled={affiliate.isMissingRecord}
                                className="p-1 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-500/5 transition-all"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* الضوابط */}
                      <td className="block border-t border-gray-100 py-3 dark:border-gray-700/60 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-4 md:hidden mb-1.5">
                          <span className="text-xs font-semibold text-gray-500">الضوابط التشغيلية</span>
                        </div>
                        <div className="flex flex-wrap md:flex-col gap-2 md:gap-1 text-xs">
                          <div
                            className={`${isDark ? "text-gray-300" : "text-gray-700"} bg-gray-50 dark:bg-gray-800/40 md:bg-transparent px-2 py-1 md:p-0 rounded`}
                          >
                            سحب أدنى:{" "}
                            <span className="font-bold tabular-nums">
                              {Number(affiliate.minPayout || 100).toFixed(0)}
                            </span>
                          </div>
                          <div
                            className={`${affiliate.canCreateOrdersForOthers ? "text-green-600 dark:text-green-400" : "text-red-500"} bg-gray-50 dark:bg-gray-800/40 md:bg-transparent px-2 py-1 md:p-0 rounded`}
                          >
                            الطلب المباشر:{" "}
                            {affiliate.canCreateOrdersForOthers ? "مسموح" : "موقوف"}
                          </div>
                          <div
                            className={`${affiliate.canViewCustomerData ? "text-green-600 dark:text-green-400" : "text-red-500"} bg-gray-50 dark:bg-gray-800/40 md:bg-transparent px-2 py-1 md:p-0 rounded`}
                          >
                            بيانات العملاء:{" "}
                            {affiliate.canViewCustomerData ? "مسموح" : "مخفية"}
                          </div>
                        </div>
                      </td>

                      {/* الحالة */}
                      <td className="block border-t border-gray-100 py-3 dark:border-gray-700/60 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-4 md:hidden mb-1.5">
                          <span className="text-xs font-semibold text-gray-500">الحالة والمراجعة</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span
                            className={`w-fit px-3 py-1 text-[10px] font-bold rounded-full border ${getStatusStyle(affiliate.status)}`}
                          >
                            {getStatusLabel(affiliate.status)}
                          </span>
                          {affiliate.statusReason && (
                            <span
                              className={`text-[11px] leading-5 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {affiliate.statusReason}
                            </span>
                          )}
                          {affiliate.reviewedAt && (
                            <span className="text-[10px] text-gray-500">
                              {new Date(affiliate.reviewedAt).toLocaleDateString(
                                "ar-EG",
                              )}
                            </span>
                          )}
                          {affiliate.identityDocumentUploadedAt && (
                            <span className="text-[10px] text-gray-500">
                              رفع المستند:{" "}
                              {new Date(
                                affiliate.identityDocumentUploadedAt,
                              ).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                          {affiliate.identityDocumentReviewNote && (
                            <span
                              className={`text-[11px] leading-5 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {affiliate.identityDocumentReviewNote}
                            </span>
                          )}
                          {affiliate.identityDocumentReviewedAt && (
                            <span className="text-[10px] text-gray-500">
                              مراجعة المستند:{" "}
                              {new Date(
                                affiliate.identityDocumentReviewedAt,
                              ).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* الإجراءات */}
                      <td className="block border-t border-gray-100 pt-3 md:table-cell md:border-0 md:px-6 md:py-5">
                        <div className="flex items-center justify-between gap-4 md:hidden mb-2">
                          <span className="text-xs font-semibold text-gray-500">الإجراءات</span>
                        </div>
                        <div className="grid grid-cols-2 md:flex md:flex-col gap-2">
                          {affiliate.isMissingRecord ? (
                            <span
                              className={`rounded-lg border px-3 py-1.5 text-center text-xs col-span-2 md:col-span-1 ${isDark ? "border-orange-500/30 bg-orange-500/10 text-orange-200" : "border-orange-200 bg-orange-50 text-orange-700"}`}
                            >
                              الملف غير مكتمل
                            </span>
                          ) : (
                            <Link
                              to={`/affiliates/management/${affiliate.id}`}
                              className={`rounded-lg border px-3 py-1.5 text-center text-xs font-semibold transition ${isDark ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                            >
                              فتح الملف
                            </Link>
                          )}
                          <select
                            value={affiliate.status}
                            onChange={(e) =>
                              handleStatusUpdate(affiliate.id, e.target.value)
                            }
                            disabled={affiliate.isMissingRecord}
                            className={`text-xs px-2 py-1.5 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-white border-gray-200"}`}
                          >
                            <option value="PENDING">مراجعة الطلب</option>
                            <option value="ACTIVE">تفعيل المسوق</option>
                            <option value="SUSPENDED">إيقاف (Suspend)</option>
                          </select>
                          <button
                            onClick={() => openPolicyEditor(affiliate)}
                            disabled={affiliate.isMissingRecord}
                            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition ${isDark ? "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
                          >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />
                            الضوابط
                          </button>
                          <button
                            onClick={() => openReviewHistory(affiliate)}
                            className={`rounded-lg border px-3 py-1.5 text-xs transition ${isDark ? "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                          >
                            سجل المراجعة
                          </button>
                          {affiliate.identityDocumentUrl && (
                            <>
                              <button
                                onClick={() =>
                                  handleDocumentReviewUpdate(affiliate, "APPROVED")
                                }
                                disabled={
                                  affiliate.isMissingRecord ||
                                  updatingDocumentAffiliateId === affiliate.id
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                اعتماد المستند
                              </button>
                              <button
                                onClick={() =>
                                  handleDocumentReviewUpdate(affiliate, "REJECTED")
                                }
                                disabled={
                                  affiliate.isMissingRecord ||
                                  updatingDocumentAffiliateId === affiliate.id
                                }
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                رفض المستند
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAffiliates.length === 0 && (
            <div
              className={`p-20 text-center flex flex-col items-center ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              <UserGroupIcon className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">
                لم يتم العثور على أي مسوقين يطابقون خيارات البحث.
              </p>
            </div>
          )}
        </div>
      </div>

      {editingPolicyAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}
          >
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h2
                className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                ضوابط المسوق
              </h2>
              <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {editingPolicyAffiliate.user.firstName}{" "}
                {editingPolicyAffiliate.user.lastName}
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  الحد الأدنى للسحب
                </label>
                <input
                  type="number"
                  min="0"
                  aria-label="الحد الأدنى للسحب"
                  value={policyForm.minPayout}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      minPayout: Number(e.target.value),
                    })
                  }
                  className={`w-full rounded-xl border px-4 py-2 ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                />
              </div>

              <label
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    السماح بالطلبات المباشرة
                  </p>
                  <p className="text-xs text-gray-500">
                    تمكين المسوق من إنشاء طلبات نيابة عن العملاء
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="السماح بالطلبات المباشرة"
                  checked={policyForm.canCreateOrdersForOthers}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      canCreateOrdersForOthers: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    عرض بيانات العملاء
                  </p>
                  <p className="text-xs text-gray-500">
                    إظهار بيانات العميل في صفحات العملاء والإحالات
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="عرض بيانات العملاء"
                  checked={policyForm.canViewCustomerData}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      canViewCustomerData: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditingPolicyAffiliate(null)}
                className={`rounded-xl px-4 py-2 text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}`}
              >
                إلغاء
              </button>
              <button
                onClick={updatePolicy}
                disabled={savingPolicy}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingPolicy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-6 dark:border-gray-700">
              <div>
                <h2
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  سجل مراجعات المسوق
                </h2>
                <p
                  className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {historyAffiliate.user.firstName} {historyAffiliate.user.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setHistoryAffiliate(null);
                  setReviewHistory([]);
                  setDocumentHistory([]);
                }}
                className={`rounded-xl px-4 py-2 text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}`}
              >
                إغلاق
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              {loadingReviewHistory ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  جارٍ تحميل السجل...
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    className={`rounded-2xl border p-4 ${isDark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <h3
                      className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      مقارنة المستندات
                    </h3>
                    {documentHistory.length > 0 || historyAffiliate.identityDocumentUrl ? (
                      <div className="mt-4 space-y-3">
                        <div
                          className={`rounded-xl border p-4 ${isDark ? "border-gray-700 bg-gray-800/70" : "border-gray-200 bg-white"}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p
                                className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                              >
                                المستند الحالي
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {(documentHistory.find((version) => version.isCurrent)
                                  ?.uploadedAt ||
                                  historyAffiliate.identityDocumentUploadedAt)
                                  ? new Date(
                                      documentHistory.find(
                                        (version) => version.isCurrent,
                                      )?.uploadedAt ||
                                        historyAffiliate.identityDocumentUploadedAt,
                                    ).toLocaleString("ar-EG")
                                  : "بدون تاريخ رفع"}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {getDocumentSourceLabel(
                                  documentHistory.find((version) => version.isCurrent)
                                    ?.source,
                                )}
                              </p>
                            </div>
                            {historyAffiliate.identityDocumentUrl && (
                              <a
                                href={historyAffiliate.identityDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                              >
                                فتح المستند الحالي
                              </a>
                            )}
                          </div>
                          {historyAffiliate.identityDocumentReviewNote && (
                            <p
                              className={`mt-3 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {historyAffiliate.identityDocumentReviewNote}
                            </p>
                          )}
                        </div>

                        {documentHistory.length > 1 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {documentHistory
                              .filter((version) => !version.isCurrent)
                              .map((version) => (
                                <div
                                  key={version.id}
                                  className={`rounded-xl border p-4 ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-white"}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p
                                        className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                                      >
                                        نسخة سابقة
                                      </p>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {new Date(version.uploadedAt).toLocaleString(
                                          "ar-EG",
                                        )}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {getDocumentSourceLabel(version.source)}
                                      </p>
                                    </div>
                                    <a
                                      href={version.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                                    >
                                      فتح النسخة
                                    </a>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            لا توجد نسخ أقدم محفوظة بعد لهذا المستند.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-500">
                        لا يوجد مستند اعتماد مرفوع لهذا المسوق.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3
                      className={`mb-3 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      سجل القرارات والمراجعات
                    </h3>
                    {reviewHistory.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-500">
                        لا يوجد سجل مراجعات بعد لهذا المسوق.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviewHistory.map((log) => (
                          <div
                            key={log.id}
                            className={`rounded-2xl border p-4 ${isDark ? "border-gray-700 bg-gray-900/50" : "border-gray-200 bg-gray-50"}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p
                                  className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                                >
                                  {log.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {new Date(log.createdAt).toLocaleString("ar-EG")}
                                </p>
                              </div>
                              {log.actor && (
                                <div className="text-left text-xs text-gray-500">
                                  <div>{log.actor.name || "إدارة النظام"}</div>
                                  {log.actor.email && <div>{log.actor.email}</div>}
                                </div>
                              )}
                            </div>

                            {log.note && (
                              <p
                                className={`mt-3 text-sm leading-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                              >
                                {log.note}
                              </p>
                            )}

                            {(log.previousStatus ||
                              log.nextStatus ||
                              log.previousDocumentStatus ||
                              log.nextDocumentStatus) && (
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                {log.previousStatus && log.nextStatus && (
                                  <span
                                    className={`rounded-full px-2 py-1 ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600"}`}
                                  >
                                    حالة الحساب: {log.previousStatus} ← {log.nextStatus}
                                  </span>
                                )}
                                {log.previousDocumentStatus && log.nextDocumentStatus && (
                                  <span
                                    className={`rounded-full px-2 py-1 ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-600"}`}
                                  >
                                    حالة المستند: {log.previousDocumentStatus} ←{" "}
                                    {log.nextDocumentStatus}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliatesManagement;
