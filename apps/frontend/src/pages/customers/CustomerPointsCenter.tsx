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
        apiClient.get("/hr/customer-loyalty/customers", { timeout: 5000 }).catch(() => ({ data: { data: [] } })),
        apiClient.get("/hr/customer-loyalty/programs").catch(() => ({ data: { data: [] } })),
        apiClient.get("/hr/customer-loyalty/tiers").catch(() => ({ data: { data: [] } })),
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
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            مركز نقاط العملاء
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            لوحة شاملة لنقاط العملاء ومستوياتهم وحملات حفظ الولاء.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" />
            إضافة عميل
          </button>
          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all"
            title="تحديث"
            aria-label="تحديث"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>أعضاء الولاء</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {activeMembers.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">عضو نشط</div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>إجمالي الرصيد</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {formatPoints(totalPointsBalance)}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">نقطة متاحة</div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>معدل الاستبدال</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {redemptionRate}%
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">نسبة الفاعلية</div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>مهدد بالانتهاء</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {atRiskCustomers.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">عميل بحاجة لتنبيه</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 sm:p-2.5 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث باسم العميل، إيميل، رقم الهاتف..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-3 pr-9 text-right text-xs sm:text-sm text-gray-900 outline-none focus:bg-white focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-all"
              />
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
               <button
                 type="button"
                 onClick={() => setFilterMode("ALL")}
                 className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                   filterMode === "ALL" ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                 }`}
               >
                 الكل
               </button>
               <button
                 type="button"
                 onClick={() => setFilterMode("VIP")}
                 className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                   filterMode === "VIP" ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                 }`}
               >
                 <Star className="h-3 w-3 text-amber-500" />
                 VIP
               </button>
               <button
                 type="button"
                 onClick={() => setFilterMode("AT_RISK")}
                 className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                   filterMode === "AT_RISK" ? "bg-white text-gray-950 dark:bg-gray-700 dark:text-white shadow-2xs" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
                 }`}
               >
                 <AlertTriangle className="h-3 w-3 text-rose-500" />
                 مهدد
               </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900 flex flex-col min-h-[400px]">
             {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/70 dark:bg-gray-800/40 sticky top-0 border-b border-gray-200/80 dark:border-gray-800">
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
                      className={`cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800/80 last:border-0 ${
                        selectedRecord?.id === record.id
                          ? "bg-slate-100/90 dark:bg-slate-800/80"
                          : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-right">
                        <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                          {record.customer.firstName} {record.customer.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">{record.customer.phone || "-"}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-700 dark:text-gray-300">
                        {record.program.nameAr || record.program.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono tabular-nums text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatPoints(toNumber(record.currentPoints))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
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
