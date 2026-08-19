import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { Award, Crown, DollarSign, Edit, Eye, Filter, Gem, Gift, Medal, Plus, RefreshCw, Search, Star, Trophy, Users } from 'lucide-react';
import { customerService, Customer } from "../../services/customerService";

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  type: "POINTS" | "TIER" | "CASHBACK" | "REFERRAL";
}

interface CustomerLoyaltyTier {
  id: string;
  name: string;
  nameAr?: string;
  color: string;
  icon: string;
}

interface CustomerLoyaltyRecord {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  program: CustomerLoyaltyProgram;
  currentPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  tier?: CustomerLoyaltyTier;
  joinDate: string;
  lastActivity: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

const LoyaltyMembers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerLoyaltyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<CustomerLoyaltyRecord | null>(null);
  const [adjustmentPoints, setAdjustmentPoints] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enroll Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [initialPoints, setInitialPoints] = useState<number>(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await apiClient.get("/hr/customer-loyalty/programs");
      // filter only active points/tier programs
      const activePrograms = (res.data.data || []).filter((p: any) => p.status === 'ACTIVE' && (p.type === 'POINTS' || p.type === 'TIER'));
      setAvailablePrograms(activePrograms);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/hr/customer-loyalty/customers");
      setCustomers(res.data.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search customers for enrollment
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (customerSearch.trim().length >= 2) {
        setIsSearching(true);
        try {
          // You could use searchCustomers if supported, or getCustomers with search filter
          const res = await customerService.getCustomers({ search: customerSearch, limit: 10 });
          setSearchResults(res.data || []);
        } catch (error) {
          console.error("Error searching customers:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [customerSearch]);

  const handleEnrollCustomer = async () => {
    if (!selectedCustomerId || !selectedProgramId) return;

    try {
      setIsEnrolling(true);
      await apiClient.post("/hr/customer-loyalty/enroll", {
        customerId: selectedCustomerId,
        programId: selectedProgramId,
        initialPoints: initialPoints || 0
      });

      // Cleanup & Refresh
      setIsEnrollModalOpen(false);
      setSelectedCustomerId("");
      setSelectedProgramId("");
      setInitialPoints(0);
      setCustomerSearch("");
      setSearchResults([]);
      fetchCustomers();
    } catch (error: any) {
      console.error("Error enrolling customer:", error);
      alert(error?.response?.data?.error || "فشل تسجيل العميل. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedRecord || adjustmentPoints === 0) return;

    try {
      setIsSubmitting(true);
      await apiClient.post("/hr/customer-loyalty/adjust-points", {
        customerId: selectedRecord.customer.id,
        programId: selectedRecord.program.id,
        points: adjustmentPoints,
        reason: adjustmentReason,
      });

      // Success
      setIsAdjustModalOpen(false);
      setAdjustmentPoints(0);
      setAdjustmentReason("");
      fetchCustomers(); // Refresh list
    } catch (error: any) {
      console.error("Error adjusting points:", error);
      alert(error?.response?.data?.error || "فشل تعديل النقاط. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case "POINTS":
        return <Star className="w-4 h-4" />;
      case "TIER":
        return <Crown className="w-4 h-4" />;
      case "CASHBACK":
        return <DollarSign className="w-4 h-4" />;
      case "REFERRAL":
        return <Users className="w-4 h-4" />;
      default:
        return <Gift className="w-4 h-4" />;
    }
  };

  const getTierIcon = (iconName: string) => {
    switch (iconName) {
      case "crown":
        return <Crown className="w-4 h-4" />;
      case "medal":
        return <Medal className="w-4 h-4" />;
      case "gem":
        return <Gem className="w-4 h-4" />;
      case "trophy":
        return <Trophy className="w-4 h-4" />;
      default:
        return <Award className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "SUSPENDED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter customers based on search
  const safeSearch = searchQuery.toLowerCase();
  const filteredCustomers = customers.filter(
    (c) =>
      c.customer?.firstName?.toLowerCase()?.includes(safeSearch) ||
      c.customer?.lastName?.toLowerCase()?.includes(safeSearch) ||
      c.customer?.email?.toLowerCase()?.includes(safeSearch) ||
      c.customer?.phone?.includes(safeSearch),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            أعضاء الولاء
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            قائمة العملاء المشتركين في برامج النقاط والمكافآت
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة عضو
          </button>
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="البحث باسم العميل، البريد، أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <Filter className="w-4 h-4" />
          فلترة متقدمة
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              لا يوجد عملاء
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              لا توجد نتائج تطابق بحثك
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    البرنامج
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    النقاط
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    المستوى
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    آخر نشاط
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {record.customer.firstName} {record.customer.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {record.customer.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {record.program.nameAr || record.program.name}
                        </span>
                        <span className="p-1 rounded bg-gray-100 dark:bg-gray-700">
                          {getProgramIcon(record.program.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {record.currentPoints.toLocaleString()}
                        </span>
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {record.tier ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.tier.nameAr || record.tier.name}
                          </span>
                          <span style={{ color: record.tier.color }}>
                            {getTierIcon(record.tier.icon)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(record.status)}`}
                      >
                        {record.status === "ACTIVE"
                          ? "نشط"
                          : record.status === "INACTIVE"
                            ? "غير نشط"
                            : "معلق"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                      {new Date(record.lastActivity).toLocaleDateString(
                        "ar-EG",
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex gap-3 justify-end">
                        <Link
                          to={`/customers/${record.customer.id}`}
                          className="text-gray-400 hover:text-purple-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsAdjustModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="تعديل الرصيد"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {isAdjustModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-right">
                تعديل نقاط العميل
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-right mt-1">
                العميل: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedRecord.customer.firstName} {selectedRecord.customer.lastName}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-right mt-1">
                البرنامج: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedRecord.program.nameAr || selectedRecord.program.name}</span>
              </p>
              <div className="mt-4 flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الرصيد الحالي:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedRecord.currentPoints.toLocaleString()}
                  </span>
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-2">
                  مقدار النقاط للتعديل
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdjustmentPoints(prev => Math.abs(prev) * -1)}
                    className={`flex-1 flex justify-center items-center py-2.5 rounded-lg border transition-all ${adjustmentPoints < 0 
                      ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  >
                    خصم نقاط
                  </button>
                  <button
                    onClick={() => setAdjustmentPoints(prev => Math.abs(prev))}
                    className={`flex-1 flex justify-center items-center py-2.5 rounded-lg border transition-all ${adjustmentPoints >= 0 
                      ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  >
                    إضافة نقاط
                  </button>
                </div>
                
                <div className="mt-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="أدخل عدد النقاط..."
                    value={Math.abs(adjustmentPoints) || ''}
                    onChange={(e) => {
                      const val = Math.abs(Number(e.target.value));
                      setAdjustmentPoints(adjustmentPoints < 0 ? -val : val);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none font-medium"
                  />
                  {adjustmentPoints < 0 && Math.abs(adjustmentPoints) > selectedRecord.currentPoints && (
                    <p className="mt-1.5 text-xs text-red-500 text-right">
                      تنبيه: لا يمكن خصم نقاط أكثر من الرصيد الحالي للعميل!
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">
                  سبب التعديل (إلزامي)
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none min-h-[100px]"
                  placeholder="الرجاء كتابة سبب التعديل بوضوح..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center rounded-b-xl border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium">
                 صافي الرصيد بعد العملية: 
                 <span className={`mr-2 font-bold ${(selectedRecord.currentPoints + adjustmentPoints) < 0 ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                   {(selectedRecord.currentPoints + (adjustmentPoints || 0)).toLocaleString()}
                 </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustmentPoints(0);
                    setAdjustmentReason("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAdjustPoints}
                  disabled={isSubmitting || adjustmentPoints === 0 || !adjustmentReason.trim() || (adjustmentPoints < 0 && Math.abs(adjustmentPoints) > selectedRecord.currentPoints)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                >
                  {isSubmitting ? "جاري الحفظ..." : "تأكيد التعديل"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Enroll Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-right">
                إضافة عضو جديد للولاء
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-right mt-1">
                ابحث عن العميل وسجله في أحد برامج النقاط أو المستويات النشطة
              </p>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Customer Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-2">
                  العميل
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomerId("");
                    }}
                    placeholder="ابحث بالاسم أو الهاتف..."
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
                  />
                  {/* Search Results Dropdown */}
                  {customerSearch.trim().length >= 2 && !selectedCustomerId && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-sm text-gray-500">جاري البحث...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearch(`${c.firstName} ${c.lastName}`);
                              setSearchResults([]);
                            }}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0 text-right"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{c.firstName} {c.lastName}</div>
                            <div className="text-xs text-gray-500">{c.phone || c.email}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">لا يوجد نتائج</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Program Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-2">
                  برنامج الولاء
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
                  dir="rtl"
                >
                  <option value="">-- اختر البرنامج --</option>
                  {availablePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
                  ))}
                </select>
              </div>

              {/* Initial Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-2">
                  رصيد افتتاحي (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={initialPoints || ''}
                    onChange={(e) => setInitialPoints(Number(e.target.value))}
                    className="w-full pr-4 pl-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right font-medium"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 opacity-50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end items-center rounded-b-xl border-t border-gray-200 dark:border-gray-700 gap-3">
              <button
                onClick={() => {
                  setIsEnrollModalOpen(false);
                  setSelectedCustomerId("");
                  setSelectedProgramId("");
                  setInitialPoints(0);
                  setCustomerSearch("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
              >
                إلغاء
              </button>
              <button
                onClick={handleEnrollCustomer}
                disabled={isEnrolling || !selectedCustomerId || !selectedProgramId}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-sm"
              >
                {isEnrolling ? "جاري التسجيل..." : "تأكيد التسجيل"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyMembers;
