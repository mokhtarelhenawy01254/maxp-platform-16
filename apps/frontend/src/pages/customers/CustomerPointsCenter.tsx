import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import {
  Star,
  RefreshCw,
  Search,
  Users,
  TrendingUp,
  AlertTriangle,
  Gift,
  Target,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  Wrench,
  UserPlus,
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X
} from "lucide-react";

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  pointsPerPurchase?: number | string;
  pointsPerAmount?: number | string;
  pointsPerReferral?: number | string;
  minimumPoints?: number | string;
  expiryMonths?: number;
}

interface CustomerLoyaltyTier {
  id: string;
  programId: string;
  name: string;
  nameAr?: string;
  minPoints: number | string;
  maxPoints?: number | string | null;
  priority?: number;
  color?: string;
}

interface CustomerLoyaltyRecord {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  program: CustomerLoyaltyProgram;
  tier?: {
    id: string;
    name: string;
    nameAr?: string;
  } | null;
  currentPoints: number | string;
  totalEarned: number | string;
  totalRedeemed: number | string;
  lastActivity: string;
  metadata?: any;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

type PointsActionType = "ADD" | "REDEEM" | "ADJUST";
type FilterMode = "ALL" | "VIP" | "AT_RISK";

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPoints = (value: number): string =>
  Math.round(value).toLocaleString("ar-EG");

const getMonthsSince = (dateString: string): number => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;

  const now = new Date();
  let months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());

  if (now.getDate() < date.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

const getEarningRuleText = (program: CustomerLoyaltyProgram | null): string => {
  if (!program) return "حدد برنامج نقاط واضح وسهل الفهم للعملاء.";

  const pointsPerAmount = toNumber(program.pointsPerAmount);
  const pointsPerPurchase = toNumber(program.pointsPerPurchase);
  const pointsPerReferral = toNumber(program.pointsPerReferral);

  if (pointsPerAmount > 0) {
    return `اكسب ${pointsPerAmount} نقطة لكل 1 وحدة عملة من قيمة الطلب.`;
  }

  if (pointsPerPurchase > 0) {
    return `اكسب ${pointsPerPurchase} نقطة لكل عملية شراء مكتملة.`;
  }

  if (pointsPerReferral > 0) {
    return `برنامج الإحالة يضيف ${pointsPerReferral} نقطة لكل إحالة ناجحة.`;
  }

  return "فعّل معدل كسب واضح (لكل طلب أو لكل قيمة شراء) لرفع وضوح البرنامج.";
};

const CustomerPointsCenter: React.FC = () => {
  const [records, setRecords] = useState<CustomerLoyaltyRecord[]>([]);
  const [programs, setPrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [tiers, setTiers] = useState<CustomerLoyaltyTier[]>([]);
  const [allSystemCustomers, setAllSystemCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Selected Customer Management
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [actionType, setActionType] = useState<PointsActionType>("ADD");
  const [pointsValue, setPointsValue] = useState<string>("");
  const [reason, setReason] = useState("");
  
  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [enrollData, setEnrollData] = useState({
    customerId: "",
    programId: "",
    initialPoints: "0"
  });

  // Messages
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [customersRes, programsRes, tiersRes] = await Promise.all([
        apiClient.get("/hr/customer-loyalty/customers"),
        apiClient.get("/hr/customer-loyalty/programs"),
        apiClient.get("/hr/customer-loyalty/tiers"),
      ]);

      const extractArray = <T,>(res: any, fallbackKey?: string): T[] => {
        const payload = res?.data?.data ?? res?.data;
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (fallbackKey && Array.isArray(payload[fallbackKey])) return payload[fallbackKey];
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.records)) return payload.records;
        if (Array.isArray(payload.customers)) return payload.customers;
        if (Array.isArray(payload.programs)) return payload.programs;
        if (Array.isArray(payload.tiers)) return payload.tiers;
        return [];
      };

      const nextRecords: CustomerLoyaltyRecord[] = extractArray<CustomerLoyaltyRecord>(customersRes, "records");
      const nextPrograms: CustomerLoyaltyProgram[] = extractArray<CustomerLoyaltyProgram>(programsRes, "programs");
      const nextTiers: CustomerLoyaltyTier[] = extractArray<CustomerLoyaltyTier>(tiersRes, "tiers");

      setRecords(nextRecords);
      setPrograms(nextPrograms);
      setTiers(nextTiers);

      if (!selectedRecordId && nextRecords.length > 0) {
        setSelectedRecordId(nextRecords[0].id);
      }

      if (
        selectedRecordId &&
        !nextRecords.some((record) => record.id === selectedRecordId)
      ) {
        setSelectedRecordId(nextRecords[0]?.id || "");
      }
    } catch (error) {
      console.error("Error fetching points center data:", error);
      setErrorMessage("فشل تحميل بيانات النقاط. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllCustomers = async () => {
    try {
      // جلب جميع العملاء بما فيهم الذين ليس لديهم طلبات بعد
      const res = await apiClient.get("/customers?limit=200&hasOrders=false");
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload)
        ? payload
        : (payload?.customers || payload?.items || payload?.data || []);
      setAllSystemCustomers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching system customers", error);
    }
  };


  useEffect(() => {
    fetchData();
    fetchAllCustomers();
  }, []);

  // Filter and Sort logic
  const filteredRecords = useMemo(() => {
    let result = records;

    if (filterMode === "AT_RISK") {
      result = result.filter((record) => {
        const expiryMonths = Math.max(1, Number(record.program.expiryMonths || 12));
        const monthsSinceActivity = getMonthsSince(record.lastActivity);
        return (
          record.status === "ACTIVE" &&
          toNumber(record.currentPoints) > 0 &&
          monthsSinceActivity >= expiryMonths - 1
        );
      });
    } else if (filterMode === "VIP") {
      // Top 20% by points or simply top 20
      result = [...result]
        .sort((a, b) => toNumber(b.currentPoints) - toNumber(a.currentPoints))
        .slice(0, 20);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    result = result.filter((record) => {
      if (!normalizedQuery) return true;
      const fullName =
        `${record.customer.firstName} ${record.customer.lastName}`.toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        (record.customer.email || "").toLowerCase().includes(normalizedQuery) ||
        (record.customer.phone || "").includes(normalizedQuery)
      );
    });

    return result.sort((a, b) => toNumber(b.currentPoints) - toNumber(a.currentPoints));
  }, [records, searchQuery, filterMode]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMode]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) || null;

  const selectedProgram = selectedRecord
    ? programs.find((program) => program.id === selectedRecord.program.id) ||
      selectedRecord.program
    : null;
    
  const earningRuleText = getEarningRuleText(selectedProgram);

  const selectedProgramTiers = useMemo(() => {
    if (!selectedProgram) return [];
    return tiers
      .filter((tier) => tier.programId === selectedProgram.id)
      .sort((a, b) => toNumber(a.minPoints) - toNumber(b.minPoints));
  }, [tiers, selectedProgram]);

  const selectedCurrentPoints = toNumber(selectedRecord?.currentPoints || 0);

  const nextTier = selectedProgramTiers.find(
    (tier) => toNumber(tier.minPoints) > selectedCurrentPoints,
  );

  const reachedTiers = selectedProgramTiers.filter(
    (tier) => toNumber(tier.minPoints) <= selectedCurrentPoints,
  );
  const currentTierMin =
    reachedTiers.length > 0 ? reachedTiers[reachedTiers.length - 1].minPoints : 0;

  const progressDenominator = Math.max(
    1,
    toNumber(nextTier?.minPoints || selectedCurrentPoints || 1) -
      toNumber(currentTierMin),
  );
  const progressNumerator = selectedCurrentPoints - toNumber(currentTierMin);
  const progressToNextTier = nextTier
    ? Math.max(
        0,
        Math.min(100, Math.round((progressNumerator / progressDenominator) * 100)),
      )
    : 100;

  const pointsToNextTier = nextTier
    ? Math.max(0, toNumber(nextTier.minPoints) - selectedCurrentPoints)
    : 0;

  // Global Stats calculations (from original records)
  const activeMembers = records.filter((record) => record.status === "ACTIVE").length;
  const totalPointsBalance = records.reduce(
    (sum, record) => sum + toNumber(record.currentPoints),
    0,
  );
  const totalEarnedPoints = records.reduce(
    (sum, record) => sum + toNumber(record.totalEarned),
    0,
  );
  const totalRedeemedPoints = records.reduce(
    (sum, record) => sum + toNumber(record.totalRedeemed),
    0,
  );

  const redemptionRate =
    totalEarnedPoints > 0
      ? Math.round((totalRedeemedPoints / totalEarnedPoints) * 100)
      : 0;

  const atRiskCustomers = records.filter((record) => {
    const expiryMonths = Math.max(1, Number(record.program.expiryMonths || 12));
    const monthsSinceActivity = getMonthsSince(record.lastActivity);
    return (
      record.status === "ACTIVE" &&
      toNumber(record.currentPoints) > 0 &&
      monthsSinceActivity >= expiryMonths - 1
    );
  });

  const handleSubmitAction = async () => {
    if (!selectedRecord) return;

    const points = Number(pointsValue);
    if (!Number.isFinite(points) || points === 0) {
      setErrorMessage("ادخل عدد نقاط صالح.");
      return;
    }

    if ((actionType === "ADD" || actionType === "REDEEM") && points <= 0) {
      setErrorMessage("قيمة النقاط يجب أن تكون أكبر من صفر.");
      return;
    }

    if (actionType === "REDEEM" && points > toNumber(selectedRecord.currentPoints)) {
      setErrorMessage("لا يمكن استبدال نقاط أكبر من رصيد العميل الحالي.");
      return;
    }
    
    if (actionType === "ADJUST" && (!reason || reason.trim().length < 3)) {
      setErrorMessage("بسبب حساسيات التعديل اليدوي، يرجى تقديم سبب واضح للعملية.");
      return;
    }

    const endpointMap: Record<PointsActionType, string> = {
      ADD: "/hr/customer-loyalty/add-points",
      REDEEM: "/hr/customer-loyalty/redeem-points",
      ADJUST: "/hr/customer-loyalty/adjust-points",
    };

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await apiClient.post(endpointMap[actionType], {
        customerId: selectedRecord.customer.id,
        programId: selectedRecord.program.id,
        points,
        reason: reason.trim() || undefined,
      });

      setSuccessMessage("تم تنفيذ العملية بنجاح.");
      setPointsValue("");
      setReason("");
      await fetchData();
    } catch (error) {
      console.error("Error submitting points action:", error);
      setErrorMessage("تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollCustomer = async () => {
    if (!enrollData.customerId || !enrollData.programId) {
      setErrorMessage("يرجى اختيار العميل وبرنامج الولاء");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      
      await apiClient.post("/hr/customer-loyalty/enroll", {
        customerId: enrollData.customerId,
        programId: enrollData.programId,
        initialPoints: Number(enrollData.initialPoints) || 0
      });
      
      setSuccessMessage("تم تسجيل العميل بنجاح في برنامج الولاء");
      setIsEnrollModalOpen(false);
      setEnrollData({ customerId: "", programId: "", initialPoints: "0" });
      await fetchData();
    } catch (error) {
      console.error("Error enrolling customer", error);
      setErrorMessage("حدث خطأ أثناء التسجيل. قد يكون العميل مسجلاً بالفعل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مركز نقاط العملاء
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            لوحة شاملة لنقاط العملاء ومستوياتهم وحملات حفظ الولاء.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            إضافة عميل
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-xs text-gray-500">نشط</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">أعضاء الولاء الإجمالي</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {activeMembers.toLocaleString("ar-EG")}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-gray-500">الرصيد</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي النقاط المتبقية</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatPoints(totalPointsBalance)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span className="text-xs text-gray-500">استبدال</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            معدل استبدال النقاط
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {redemptionRate}%
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-xs text-gray-500">انتهاء صلاحية</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">عملاء مهددون بانتهاء رصيد</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {atRiskCustomers.length.toLocaleString("ar-EG")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث باسم العميل، إيميل، رقم الهاتف..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-right text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
               <button
                 onClick={() => setFilterMode("ALL")}
                 className={`flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                   filterMode === "ALL" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800" : "bg-white border border-gray-300 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600"
                 }`}
               >
                 <Filter className="h-4 w-4" />
                 الكل
               </button>
               <button
                 onClick={() => setFilterMode("VIP")}
                 className={`flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                   filterMode === "VIP" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" : "bg-white border border-gray-300 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600"
                 }`}
               >
                 <Star className="h-4 w-4" />
                 VIP
               </button>
               <button
                 onClick={() => setFilterMode("AT_RISK")}
                 className={`flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                   filterMode === "AT_RISK" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-white border border-gray-300 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:border-gray-600"
                 }`}
               >
                 <AlertTriangle className="h-4 w-4" />
                 مهدد
               </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 flex flex-col min-h-[400px]">
             {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">العميل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">البرنامج</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الرصيد</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستوى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedRecord?.id === record.id
                          ? "bg-purple-50 dark:bg-purple-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      }`}
                    >
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {record.customer.firstName} {record.customer.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{record.customer.phone || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
                        {record.program.nameAr || record.program.name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatPoints(toNumber(record.currentPoints))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>
                          {record.tier?.nameAr || record.tier?.name || "بدون مستوى"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedRecords.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="p-10 text-center text-sm text-gray-500">
                          لا يوجد عملاء مطابقون للبحث والتصفية.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
             {/* Pagination */}
             {totalPages > 1 && (
               <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                   <p className="text-sm text-gray-500 dark:text-gray-400">
                     صفحة <span className="font-medium">{currentPage}</span> من <span className="font-medium">{totalPages}</span>
                   </p>
                   <div className="flex gap-2">
                     <button
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                       disabled={currentPage === 1}
                       className="p-1 rounded bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                     >
                       <ChevronRight className="h-5 w-5" />
                     </button>
                     <button
                       onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                       disabled={currentPage === totalPages}
                       className="p-1 rounded bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                     >
                       <ChevronLeft className="h-5 w-5" />
                     </button>
                   </div>
               </div>
             )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white flex justify-between items-center">
              ملف العميل المختار
              {selectedRecord && (
                 <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="text-xs flex items-center gap-1 font-normal text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-1.5 rounded hover:bg-purple-100 transition"
                 >
                   <History className="h-3.5 w-3.5" /> سجل الحركات
                 </button>
              )}
            </h3>
            {selectedRecord ? (
              <div className="space-y-3 text-right">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  {selectedRecord.customer.firstName} {selectedRecord.customer.lastName}
                </p>
                <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">البرنامج:</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{selectedProgram?.nameAr || selectedProgram?.name || "-"}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-sm text-gray-500 dark:text-gray-400">الرصيد:</p>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-2xl">
                            {formatPoints(selectedCurrentPoints)}
                        </span>
                    </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  آخر نشاط مسجل:{" "}
                  {new Date(selectedRecord.lastActivity).toLocaleDateString("ar-EG")}
                </p>

                <div className="pt-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 mt-2">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-bold">{progressToNextTier}%</span>
                    <span>التقدم للمستوى التالي</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-purple-600"
                      style={{ width: `${progressToNextTier}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {nextTier
                      ? `يحتاج ${formatPoints(pointsToNextTier)} نقطة للوصول لـ ${nextTier.nameAr || nextTier.name}`
                      : "العميل في أعلى مستوى متاح حاليًا 🌟"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-right text-sm text-gray-400 py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                 <Search className="h-8 w-8 text-gray-300 mb-2" />
                 اختَر عميلًا من الجدول العرض
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              إجراء عملية على النقاط
            </h3>
            <div className="space-y-3 text-right relative">
              <select
                value={actionType}
                onChange={(event) => setActionType(event.target.value as PointsActionType)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                disabled={!selectedRecord}
              >
                <option value="ADD">إضافة نقاط (+)</option>
                <option value="REDEEM">استبدال نقاط (-)</option>
                <option value="ADJUST">تعديل يدوي (يتطلب السبب)</option>
              </select>

              <input
                type="number"
                value={pointsValue}
                onChange={(event) => setPointsValue(event.target.value)}
                placeholder={actionType === "ADJUST" ? "مثال: 100 للقيمة الموجبة و -40 للخصم" : "أدخل عدد النقاط المُنفذة"}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-right text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800"
                disabled={!selectedRecord}
              />

              <div className="relative">
                <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={actionType === 'ADJUST' ? "سبب التعديل اليدوي (إلزامي)" : "تفاصيل العملية (اختياري)"}
                    className={`min-h-[80px] w-full rounded-lg border bg-white px-3 py-2.5 text-right text-sm dark:bg-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 ${actionType === 'ADJUST' && !reason.trim() ? "border-amber-400 focus:border-amber-500 outline-none ring-1 ring-amber-400" : "border-gray-300 dark:border-gray-600"}`}
                    disabled={!selectedRecord}
                />
                {actionType === 'ADJUST' && (
                  <AlertTriangle className={`absolute bottom-3 left-3 h-4 w-4 ${reason.trim() ? 'text-emerald-500' : 'text-amber-500'}`} />
                )}
              </div>

              {errorMessage && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                  {successMessage}
                </p>
              )}

              <button
                onClick={handleSubmitAction}
                disabled={!selectedRecord || isSubmitting}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${actionType === 'REDEEM' ? 'bg-amber-600 hover:bg-amber-700' : actionType === 'ADJUST' ? 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {actionType === "ADD" && <ArrowUpCircle className="h-4 w-4" />}
                {actionType === "REDEEM" && <ArrowDownCircle className="h-4 w-4" />}
                {actionType === "ADJUST" && <Wrench className="h-4 w-4" />}
                {isSubmitting ? "جاري التنفيذ..." : "تأكيد العملية"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm dark:border-amber-900/30 dark:from-gray-800 dark:to-amber-900/10">
          <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <Target className="h-5 w-5" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              برامج ولاء كبار المتاجر
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 h-16">
            فعّل إرسال رسائل آلية عند وصول العميل لمستوى VIP لمكافأته بتوصيل مجاني لتعزيز شعوره بالولاية.
          </p>
          <button onClick={() => setFilterMode("VIP")} className="w-full text-sm py-2 px-3 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 shadow-sm transition dark:bg-gray-800 dark:border-gray-600 dark:text-amber-400">
             عرض عملاء VIP الآن
          </button>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm dark:border-purple-900/30 dark:from-gray-800 dark:to-purple-900/10">
          <div className="mb-3 flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              أيام المضاعفات الترويجية
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 h-10">
            أبلغ العملاء عن أيام ترويجية لكسب مضاعف عبر الواتساب.
          </p>
           <p className="text-xs text-purple-700 dark:text-purple-300 mb-4 font-medium flex items-center line-clamp-1 w-full truncate">
            المعدل الحالي: {earningRuleText}
          </p>
          <button className="w-full flex items-center justify-center gap-2 text-sm py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition">
             <MessageCircle className="h-4 w-4" />
             إرسال تنبيه بالبرنامج (قريباً)
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-white to-red-50 p-5 shadow-sm dark:border-red-900/30 dark:from-gray-800 dark:to-red-900/10">
          <div className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-500">
            <Gift className="h-5 w-5" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              حملات إنقاذ النقاط (Expiry)
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 h-16">
            العملاء المهددون بخسارة رصيدهم. ارسل لهم عروض استبدال سريعة قبل خصم النقاط نهائياً.
          </p>
          <button onClick={() => setFilterMode("AT_RISK")} className="w-full text-sm py-2 px-3 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg shadow-sm hover:bg-red-100 transition dark:bg-red-900/30 dark:border-red-900 dark:text-red-400">
             استهداف ({atRiskCustomers.length}) عميل
          </button>
        </div>
      </div>

      {/* Enroll Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-right" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
             <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">إضافة عميل لبرنامج ولاء</h3>
                <button onClick={() => setIsEnrollModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                   <X className="h-5 w-5" />
                </button>
             </div>
             
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العميل</label>
                  <select 
                    value={enrollData.customerId}
                    onChange={e => setEnrollData({...enrollData, customerId: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="">-- اختر عميل من النظام --</option>
                    {allSystemCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">برنامج الولاء المستهدف</label>
                  <select 
                    value={enrollData.programId}
                    onChange={e => setEnrollData({...enrollData, programId: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="">-- اختر برنامج --</option>
                    {programs.filter(p => p.status === 'ACTIVE').map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نقاط ترحيبية مبدئية</label>
                  <input 
                    type="number"
                    value={enrollData.initialPoints}
                    onChange={e => setEnrollData({...enrollData, initialPoints: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-right"
                  />
                  <p className="text-xs text-gray-500 mt-1">يُضاف الرصيد فور التسجيل في البرنامج.</p>
                </div>

                {errorMessage && (
                  <p className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 dark:bg-red-900/20 dark:border-red-900/50">{errorMessage}</p>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                   <button 
                     onClick={() => setIsEnrollModalOpen(false)}
                     className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                   >
                     إلغاء
                   </button>
                   <button 
                     onClick={handleEnrollCustomer}
                     disabled={isSubmitting || !enrollData.customerId || !enrollData.programId}
                     className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                   >
                     <UserPlus className="h-4 w-4" /> 
                     {isSubmitting ? "جاري التسجيل..." : "تسجيل وتفعيل"}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* History Modal (Simplified for local metadata logic) */}
      {isHistoryModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-right" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
             <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <History className="h-5 w-5 text-purple-600" />
                   سجل حركات: {selectedRecord.customer.firstName}
                </h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                   <X className="h-5 w-5" />
                </button>
             </div>
             
             <div className="space-y-4 max-h-[400px] overflow-y-auto">
                 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-inner">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">ملخص الحركات والأرصدة:</p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                       <li className="flex justify-between border-b pb-2 dark:border-gray-700">
                          <span>إجمالي المكتسب تاريخياً:</span>
                          <span className="text-emerald-600 font-bold">{formatPoints(toNumber(selectedRecord.totalEarned))} نقطة</span>
                       </li>
                       <li className="flex justify-between border-b pb-2 dark:border-gray-700">
                          <span>إجمالي المستبدل تاريخياً:</span>
                          <span className="text-red-500 font-bold">{formatPoints(toNumber(selectedRecord.totalRedeemed))} نقطة</span>
                       </li>
                       <li className="flex justify-between pt-1">
                          <span>آخر عملية مسجلة:</span>
                          <span className="text-gray-900 dark:text-white font-medium text-xs">{new Date(selectedRecord.lastActivity).toLocaleString("ar-EG")}</span>
                       </li>
                    </ul>
                 </div>
                 
                 {selectedRecord.metadata && selectedRecord.metadata.lastReason && (
                   <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
                      <p className="text-xs text-amber-800 dark:text-amber-400 font-medium mb-1">سبب التعديل اليدوي الأخير:</p>
                      <p className="text-sm text-amber-900 dark:text-amber-200">{selectedRecord.metadata.lastReason}</p>
                   </div>
                 )}
                 
                 <p className="text-xs text-center text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                     ملاحظة: سجل الحركات المفصل سيُتاح في التحديث القادم للنظام المعماري.
                 </p>
             </div>
             
             <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="mt-6 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                  إغلاق السجل
              </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerPointsCenter;
