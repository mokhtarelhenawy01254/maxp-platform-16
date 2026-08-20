import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../hooks/useDateFormat";
import {
  ComputerDesktopIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  CalendarIcon,
  TagIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const MyCustody: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myCustody, setMyCustody] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    assetType: "",
    category: "",
    reason: "",
    urgency: "normal",
    notes: "",
  });

  useEffect(() => {
    fetchMyCustody();
  }, []);

  const fetchMyCustody = async () => {
    try {
      setLoading(true);

      // Get employee data first
      const empResponse = await api.get("/hr/employees/me");
      const empData = empResponse.data.employee;
      setEmployee(empData);

      // Fetch custody/assets
      if (empData?.id) {
        const response = await api.get(`/hr/assets?assignedTo=${empData.id}`);
        setMyCustody(response.data.assets || []);
      }

      // Fetch my requests
      const requestsResponse = await api.get('/hr/assets/requests/my');
      if (requestsResponse.data && requestsResponse.data.success) {
        setMyRequests(requestsResponse.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching custody:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  const filteredAssets = useMemo(() => {
    return myCustody.filter((asset) => {
      const matchesSearch =
        asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || asset.category?.name === filterCategory;
      const matchesCondition =
        filterCondition === "all" || asset.condition === filterCondition;

      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [myCustody, searchQuery, filterCategory, filterCondition]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(
      myCustody.map((asset) => asset.category?.name).filter(Boolean),
    );
    return Array.from(cats);
  }, [myCustody]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = myCustody.length;
    const newItems = myCustody.filter((a) => a.condition === "NEW").length;
    const goodItems = myCustody.filter((a) => a.condition === "GOOD").length;
    const needsMaintenance = myCustody.filter(
      (a) => a.condition === "NEEDS_REPAIR" || a.condition === "FAIR",
    ).length;

    return { total, newItems, goodItems, needsMaintenance };
  }, [myCustody]);

  // Handle request submission
  const handleSubmitRequest = async () => {
    try {
      if (!requestForm.assetType || !requestForm.reason) {
        alert(t("employee.custody.validationError"));
        return;
      }

      const priorityMap: Record<string, string> = {
        low: "NORMAL",
        normal: "NORMAL",
        high: "HIGH",
        urgent: "URGENT" // if we add urgent 
      };

      const response = await api.post("/hr/assets/requests", {
        assetType: requestForm.assetType,
        category: requestForm.category,
        reason: requestForm.reason,
        priority: priorityMap[requestForm.urgency] || "NORMAL",
        notes: requestForm.notes,
      });

      if (response.data.success) {
        alert(t("employee.custody.submitSuccess"));
        setShowRequestModal(false);
        setRequestForm({
          assetType: "",
          category: "",
          reason: "",
          urgency: "normal",
          notes: "",
        });
        fetchMyCustody(); // Refresh both requests and assets
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      alert(t("employee.custody.submitError"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
      dir="rtl"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t("employee.custody.title")}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {t("employee.custody.subtitle")}
                </p>
              </div>
            </div>

            {/* Request Asset Button */}
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("employee.custody.newRequest")}
            </button>
          </div>

          {/* Info Alert */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {t("employee.custody.importantNote")}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                   {t("employee.custody.noteText")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">
                    {t("employee.custody.totalCustody")}
                  </p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <CubeIcon className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">
                    {t("employee.custody.excellentCondition")}
                  </p>
                  <p className="text-3xl font-bold">{stats.newItems}</p>
                </div>
                <CheckCircleIcon className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">
                    {t("employee.custody.goodCondition")}
                  </p>
                  <p className="text-3xl font-bold">{stats.goodItems}</p>
                </div>
                <CheckCircleIcon className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium mb-1">
                    {t("employee.custody.needsMaintenance")}
                  </p>
                  <p className="text-3xl font-bold">{stats.needsMaintenance}</p>
                </div>
                <ExclamationTriangleIcon className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("employee.custody.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <FunnelIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none"
                  >
                    <option value="all">{t("employee.custody.allCategories")}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition Filter */}
                <div className="relative">
                  <TagIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none"
                  >
                    <option value="all">{t("employee.custody.allConditions")}</option>
                    <option value="NEW">{t("employee.custody.new")}</option>
                    <option value="GOOD">{t("employee.custody.good")}</option>
                    <option value="FAIR">{t("employee.custody.acceptable")}</option>
                    <option value="NEEDS_REPAIR">{t("employee.custody.needsMaintenanceLabel")}</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assets Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {filteredAssets.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full mb-4">
                    <ComputerDesktopIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {searchQuery ||
                    filterCategory !== "all" ||
                    filterCondition !== "all"
                      ? t("employee.custody.noResults")
                      : t("employee.custody.noCustody")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    {searchQuery ||
                    filterCategory !== "all" ||
                    filterCondition !== "all"
                      ? t("employee.custody.changeSearch")
                      : t("employee.custody.noCustodyHint")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("employee.custody.showing", { count: filteredAssets.length, total: myCustody.length })}
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map((asset: any, index: number) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                            <ComputerDesktopIcon className="w-7 h-7 text-white" />
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                            {t("employee.custody.delivered")}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {asset.name}
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <TagIcon className="w-4 h-4" />
                              {t("employee.custody.code")}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {asset.code}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <CubeIcon className="w-4 h-4" />
                              {t("employee.custody.category")}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {asset.category?.name || "-"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t("employee.custody.serialNumber")}
                            </span>
                            <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                              {asset.serialNumber || "-"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t("employee.custody.condition")}
                            </span>
                            <Badge
                              className={`${
                                asset.condition === "NEW"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  : asset.condition === "GOOD"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : asset.condition === "FAIR"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                              } border-0 font-semibold`}
                            >
                              {asset.condition === "NEW"
                                ? "✨ " + t("employee.custody.new")
                                : asset.condition === "GOOD"
                                  ? "✓ " + t("employee.custody.good")
                                  : asset.condition === "FAIR"
                                    ? "⚠ " + t("employee.custody.acceptable")
                                    : "🔧 " + t("employee.custody.needsMaintenanceLabel")}
                            </Badge>
                          </div>

                          {asset.assignedDate && (
                            <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                {t("employee.custody.receiveDate")}
                              </span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {formatDate(asset.assignedDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* My Requests Section */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="mt-12 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
               <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("employee.custody.previousRequests")}</h2>
          </div>

          <Card className="border-0 shadow-lg dark:bg-gray-800">
             <CardContent className="p-0 overflow-x-auto">
               <table className="w-full text-right min-w-[700px]">
                 <thead>
                   <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm font-semibold border-b border-gray-100 dark:border-gray-700">
                     <th className="px-6 py-4">{t("employee.custody.colRequestDate")}</th>
                     <th className="px-6 py-4">{t("employee.custody.colType")}</th>
                     <th className="px-6 py-4">{t("employee.custody.colStatus")}</th>
                     <th className="px-6 py-4">{t("employee.custody.colReason")}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                   {myRequests.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          {t("employee.custody.noPreviousRequests")}
                       </td>
                     </tr>
                   ) : (
                     myRequests.map((req: any) => (
                       <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                         <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-300">
                           {formatDate(req.createdAt)}
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <ComputerDesktopIcon className="w-4 h-4 text-blue-500" />
                             <span className="font-semibold text-gray-900 dark:text-white">{req.assetType}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            {req.status === 'PENDING' && (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 flex w-max items-center gap-1.5 px-3 py-1">
                                <ClockIcon className="w-4 h-4" />
                                {t("employee.custody.pendingStatus")}
                              </Badge>
                            )}
                            {req.status === 'APPROVED' && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 flex w-max items-center gap-1.5 px-3 py-1">
                                <CheckCircleIcon className="w-4 h-4" />
                                {t("employee.custody.approvedStatus")}
                              </Badge>
                            )}
                            {req.status === 'FULFILLED' && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0 flex w-max items-center gap-1.5 px-3 py-1">
                                <CheckCircleIcon className="w-4 h-4" />
                                {t("employee.custody.deliveredStatus")}
                              </Badge>
                            )}
                            {req.status === 'REJECTED' && (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 flex w-max items-center gap-1.5 px-3 py-1">
                                <XCircleIcon className="w-4 h-4" />
                                {t("employee.custody.rejectedStatus")}
                              </Badge>
                            )}
                            {req.status === 'CANCELLED' && (
                              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 flex w-max items-center gap-1.5 px-3 py-1">
                                <XCircleIcon className="w-4 h-4" />
                                {t("employee.custody.cancelledStatus")}
                              </Badge>
                            )}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                           <p className="truncate max-w-xs" title={req.reason}>{req.reason}</p>
                           {req.rejectionReason && (
                              <p className="text-xs text-red-500 mt-1">{t("employee.custody.rejectionReason", { reason: req.rejectionReason })}</p>
                           )}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </CardContent>
          </Card>
        </motion.div>

        {/* Request Modal */}
        {showRequestModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {t("employee.custody.requestDialogTitle")}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Asset Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("employee.custody.requestTypeLabel")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={requestForm.assetType}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        assetType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t("employee.custody.requestTypePlaceholder")}</option>
                    <option value="laptop">{t("employee.custody.laptop")}</option>
                    <option value="desktop">{t("employee.custody.desktop")}</option>
                    <option value="phone">{t("employee.custody.mobile")}</option>
                    <option value="tablet">{t("employee.custody.tablet")}</option>
                    <option value="monitor">{t("employee.custody.monitor")}</option>
                    <option value="keyboard">{t("employee.custody.keyboard")}</option>
                    <option value="mouse">{t("employee.custody.mouse")}</option>
                    <option value="headset">{t("employee.custody.headset")}</option>
                    <option value="printer">{t("employee.custody.printer")}</option>
                    <option value="other">{t("employee.custody.otherType")}</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("employee.custody.categoryLabel")}
                  </label>
                  <input
                    type="text"
                    value={requestForm.category}
                    onChange={(e) =>
                      setRequestForm({
                        ...requestForm,
                        category: e.target.value,
                      })
                    }
                    placeholder={t("employee.custody.categoryPlaceholder")}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("employee.custody.reasonLabel")} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, reason: e.target.value })
                    }
                    placeholder={t("employee.custody.reasonPlaceholder")}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("employee.custody.priorityLabel")}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRequestForm({ ...requestForm, urgency: "low" })
                      }
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        requestForm.urgency === "low"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t("employee.custody.normalPriority")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRequestForm({ ...requestForm, urgency: "normal" })
                      }
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        requestForm.urgency === "normal"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 ring-2 ring-yellow-500"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t("employee.custody.mediumPriority")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRequestForm({ ...requestForm, urgency: "high" })
                      }
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        requestForm.urgency === "high"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 ring-2 ring-red-500"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {t("employee.custody.highPriority")}
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("employee.custody.notesLabel")}
                  </label>
                  <textarea
                    value={requestForm.notes}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, notes: e.target.value })
                    }
                    placeholder={t("employee.custody.notesPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-semibold mb-1">{t("employee.custody.noteHeader")}</p>
                      <p>
                        {t("employee.custody.noteDesc")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmitRequest}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                  >
                    {t("employee.custody.submitButton")}
                  </button>
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                  >
                    {t("employee.custody.cancelButton")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCustody;
