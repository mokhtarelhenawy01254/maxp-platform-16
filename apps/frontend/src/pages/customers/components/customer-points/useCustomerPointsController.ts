import { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "../../../../services/apiClient";
import {
  CustomerLoyaltyProgram,
  CustomerLoyaltyTier,
  CustomerLoyaltyRecord,
  PointsActionType,
  FilterMode,
  CustomerPointsStats,
  toNumber,
  getMonthsSince,
  getEarningRuleText,
} from "./types";

export const ITEMS_PER_PAGE = 8;

export function useCustomerPointsController() {
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
    initialPoints: "0",
  });

  // Messages
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = useCallback(async () => {
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

      setSelectedRecordId((prev) => {
        if (!prev && nextRecords.length > 0) return nextRecords[0].id;
        if (prev && !nextRecords.some((r) => r.id === prev)) return nextRecords[0]?.id || "";
        return prev;
      });
    } catch (error) {
      console.error("Error fetching points center data:", error);
      setErrorMessage("فشل تحميل بيانات النقاط. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllCustomers = useCallback(async () => {
    try {
      const res = await apiClient.get("/customers?limit=200&hasOrders=false");
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.customers || payload?.items || payload?.data || [];
      setAllSystemCustomers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching system customers", error);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    void fetchAllCustomers();
  }, [fetchData, fetchAllCustomers]);

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
      result = [...result]
        .sort((a, b) => toNumber(b.currentPoints) - toNumber(a.currentPoints))
        .slice(0, 20);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    result = result.filter((record) => {
      if (!normalizedQuery) return true;
      const fullName = `${record.customer.firstName} ${record.customer.lastName}`.toLowerCase();
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

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || null,
    [records, selectedRecordId],
  );

  const selectedProgram = selectedRecord
    ? programs.find((program) => program.id === selectedRecord.program.id) || selectedRecord.program
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
    toNumber(nextTier?.minPoints || selectedCurrentPoints || 1) - toNumber(currentTierMin),
  );
  const progressNumerator = selectedCurrentPoints - toNumber(currentTierMin);
  const progressToNextTier = nextTier
    ? Math.max(0, Math.min(100, Math.round((progressNumerator / progressDenominator) * 100)))
    : 100;

  const pointsToNextTier = nextTier
    ? Math.max(0, toNumber(nextTier.minPoints) - selectedCurrentPoints)
    : 0;

  // Global Stats calculations
  const stats = useMemo((): CustomerPointsStats => {
    const activeMembers = records.filter((record) => record.status === "ACTIVE").length;
    const totalPointsBalance = records.reduce((sum, record) => sum + toNumber(record.currentPoints), 0);
    const totalEarnedPoints = records.reduce((sum, record) => sum + toNumber(record.totalEarned), 0);
    const totalRedeemedPoints = records.reduce((sum, record) => sum + toNumber(record.totalRedeemed), 0);
    const redemptionRate =
      totalEarnedPoints > 0 ? Math.round((totalRedeemedPoints / totalEarnedPoints) * 100) : 0;
    const atRiskCount = records.filter((record) => {
      const expiryMonths = Math.max(1, Number(record.program.expiryMonths || 12));
      const monthsSinceActivity = getMonthsSince(record.lastActivity);
      return (
        record.status === "ACTIVE" &&
        toNumber(record.currentPoints) > 0 &&
        monthsSinceActivity >= expiryMonths - 1
      );
    }).length;

    return {
      activeMembers,
      totalPointsBalance,
      totalEarnedPoints,
      totalRedeemedPoints,
      redemptionRate,
      atRiskCount,
    };
  }, [records]);

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
        initialPoints: Number(enrollData.initialPoints) || 0,
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

  return {
    records,
    programs,
    tiers,
    allSystemCustomers,
    isLoading,
    isSubmitting,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedRecords,
    selectedRecordId,
    setSelectedRecordId,
    selectedRecord,
    selectedProgram,
    earningRuleText,
    selectedCurrentPoints,
    nextTier,
    progressToNextTier,
    pointsToNextTier,
    stats,
    actionType,
    setActionType,
    pointsValue,
    setPointsValue,
    reason,
    setReason,
    isEnrollModalOpen,
    setIsEnrollModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    enrollData,
    setEnrollData,
    errorMessage,
    successMessage,
    fetchData,
    handleSubmitAction,
    handleEnrollCustomer,
  };
}
