import React, { useState, useEffect } from "react";
import { returnService, ReturnRequest } from "../../services/returnService";
import { toast } from "sonner";
import {
  Plus,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
} from "lucide-react";
import ReturnDetailsModal from "./ReturnDetailsModal";

const ReturnManagementPage: React.FC = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
    null,
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [newReturn, setNewReturn] = useState({
    orderNumber: "",
    reasonId: "",
    customerNotes: "",
    adminNotes: "",
    responsibleParty: "OTHER" as "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER",
  });

  // Edit Reason Modal State
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReturnRequest | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    reasonId: "",
    responsibleParty: "OTHER" as "CUSTOMER" | "STORE" | "SHIPPING" | "OTHER",
    customerNotes: "",
    adminNotes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes] = await Promise.all([
        returnService.getRequests(
          statusFilter ? { status: statusFilter } : undefined,
        ),
      ]);
      setRequests(reqRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndReasons = async () => {
    try {
      const [catRes, reasonRes] = await Promise.all([
        returnService.getCategories(),
        returnService.getReasons(),
      ]);
      console.log("📦 Categories:", catRes.data);
      console.log("📋 Reasons:", reasonRes.data);
      setCategories(catRes.data);
      setReasons(reasonRes.data);
    } catch (error) {
      console.error("Failed to load categories/reasons:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategoriesAndReasons();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await returnService.updateRequest(id, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex items-center gap-1">
            <CheckCircle size={12} /> تم الموافقة
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 flex items-center gap-1">
            <XCircle size={12} /> مرفوض
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center gap-1">
            <CheckCircle size={12} /> مكتمل
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
            <Clock size={12} /> قيد الانتظار
          </span>
        );
    }
  };

  const getRatingBadge = (rating: string | undefined) => {
    if (!rating) return null;
    switch (rating) {
      case "EXCELLENT":
        return (
          <span className="mr-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
            💎 ممتاز
          </span>
        );
      case "GOOD":
        return (
          <span className="mr-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            ✅ جيد
          </span>
        );
      case "AVERAGE":
        return (
          <span className="mr-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
            متوسط
          </span>
        );
      case "BAD":
        return (
          <span className="mr-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
            ⛔ سيء
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            إدارة المرتجعات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            إدارة طلبات الإرجاع وتقييمات العملاء
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <Plus size={18} /> طلب جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Filter size={18} />
          <span className="text-sm font-medium">Filter by Status:</span>
        </div>
        <div className="flex gap-2">
          {["", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {status || "All"}
              </button>
            ),
          )}
        </div>
        <button
          onClick={fetchData}
          className="ml-auto text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الطلب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                العميل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                السبب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                المسؤول
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                المراجعة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-6">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  جاري التحميل...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  لا توجد طلبات إرجاع
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.order?.orderNumber || "غير متوفر"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {request.refundAmount
                        ? `${request.refundAmount} ${request.order?.currency || "ج.م"}`
                        : "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 w-1/3">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          {request.customer?.firstName}{" "}
                          {request.customer?.lastName}
                          {getRatingBadge(request.customer?.customerRating)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {request.customer?.phone}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          معدل النجاح:{" "}
                          {request.customer?.successScore?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {request.reason?.reason || "أخرى"}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {request.reason?.category?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        request.responsibleParty === "CUSTOMER"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : request.responsibleParty === "STORE"
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {request.responsibleParty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.isReviewed ? (
                      <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                        <CheckCircle size={14} /> تمت المراجعة
                      </span>
                    ) : (
                      <span className="text-orange-500 dark:text-orange-400 text-xs flex items-center gap-1">
                        <Clock size={14} /> لم تراجع
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium pl-6">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingRequest(request);
                          setEditForm({
                            reasonId: request.reasonId || "",
                            responsibleParty:
                              request.responsibleParty || "OTHER",
                            customerNotes: request.customerNotes || "",
                            adminNotes: request.adminNotes || "",
                          });
                          setShowEditReasonModal(true);
                        }}
                        className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                        title="تعديل السبب"
                      >
                        <Edit size={18} />
                      </button>

                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="عرض التفاصيل"
                      >
                        <Eye size={18} />
                      </button>

                      {request.status === "PENDING" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "APPROVED")
                            }
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            title="موافقة"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "REJECTED")
                            }
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="رفض"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      {request.status === "APPROVED" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(request.id, "COMPLETED")
                          }
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="تحديد كمكتمل"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Return Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                إنشاء طلب إرجاع جديد
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رقم الطلب *
                </label>
                <input
                  type="text"
                  value={newReturn.orderNumber}
                  onChange={(e) =>
                    setNewReturn({ ...newReturn, orderNumber: e.target.value })
                  }
                  placeholder="ORD-20260117-233349-05"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سبب الإرجاع *
                </label>
                <select
                  value={newReturn.reasonId}
                  onChange={(e) => {
                    const selectedReason = reasons.find(
                      (r) => r.id === e.target.value,
                    );
                    setNewReturn({
                      ...newReturn,
                      reasonId: e.target.value,
                      responsibleParty:
                        selectedReason?.category?.defaultRole || "OTHER",
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- اختر السبب --</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {reasons
                        .filter((r) => r.categoryId === cat.id)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  {/* Reasons without category */}
                  {reasons.filter((r) => !r.categoryId).length > 0 && (
                    <optgroup label="أخرى">
                      {reasons
                        .filter((r) => !r.categoryId)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Responsible Party */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المسؤول
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["CUSTOMER", "STORE", "SHIPPING", "OTHER"].map((party) => (
                    <button
                      key={party}
                      type="button"
                      onClick={() =>
                        setNewReturn({
                          ...newReturn,
                          responsibleParty: party as any,
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newReturn.responsibleParty === party
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {party === "CUSTOMER"
                        ? "عميل"
                        : party === "STORE"
                          ? "متجر"
                          : party === "SHIPPING"
                            ? "شحن"
                            : "أخرى"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات العميل
                </label>
                <textarea
                  value={newReturn.customerNotes}
                  onChange={(e) =>
                    setNewReturn({
                      ...newReturn,
                      customerNotes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="أي ملاحظات من العميل..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات الإدارة
                </label>
                <textarea
                  value={newReturn.adminNotes}
                  onChange={(e) =>
                    setNewReturn({ ...newReturn, adminNotes: e.target.value })
                  }
                  rows={3}
                  placeholder="ملاحظات داخلية للإدارة..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    if (!newReturn.orderNumber || !newReturn.reasonId) {
                      toast.error("رقم الطلب وسبب الإرجاع مطلوبان");
                      return;
                    }
                    setCreating(true);
                    try {
                      await returnService.createRequest({
                        orderNumber: newReturn.orderNumber,
                        reasonId: newReturn.reasonId,
                        customerNotes: newReturn.customerNotes,
                        adminNotes: newReturn.adminNotes,
                        responsibleParty: newReturn.responsibleParty,
                      });
                      toast.success("تم إنشاء طلب الإرجاع بنجاح");
                      setShowCreateModal(false);
                      setNewReturn({
                        orderNumber: "",
                        reasonId: "",
                        customerNotes: "",
                        adminNotes: "",
                        responsibleParty: "OTHER",
                      });
                      fetchData();
                    } catch (error: any) {
                      console.error(error);
                      toast.error(
                        error.response?.data?.error ||
                          "فشل في إنشاء طلب الإرجاع",
                      );
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "جاري الإنشاء..." : "إنشاء الطلب"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reason Modal */}
      {showEditReasonModal && editingRequest && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowEditReasonModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                تعديل سبب الإرجاع
              </h2>
              <button
                onClick={() => setShowEditReasonModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Return Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  سبب الإرجاع *
                </label>
                <select
                  value={editForm.reasonId}
                  onChange={(e) => {
                    const selectedReason = reasons.find(
                      (r) => r.id === e.target.value,
                    );
                    setEditForm({
                      ...editForm,
                      reasonId: e.target.value,
                      responsibleParty:
                        selectedReason?.category?.defaultRole ||
                        editForm.responsibleParty,
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- اختر السبب --</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {reasons
                        .filter((r) => r.categoryId === cat.id)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  {/* Reasons without category */}
                  {reasons.filter((r) => !r.categoryId).length > 0 && (
                    <optgroup label="أخرى">
                      {reasons
                        .filter((r) => !r.categoryId)
                        .map((reason) => (
                          <option key={reason.id} value={reason.id}>
                            {reason.reason}{" "}
                            {reason.description && `- ${reason.description}`}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Responsible Party */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المسؤول
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["CUSTOMER", "STORE", "SHIPPING", "OTHER"].map((party) => (
                    <button
                      key={party}
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          responsibleParty: party as any,
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editForm.responsibleParty === party
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {party === "CUSTOMER"
                        ? "عميل"
                        : party === "STORE"
                          ? "متجر"
                          : party === "SHIPPING"
                            ? "شحن"
                            : "أخرى"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات العميل
                </label>
                <textarea
                  value={editForm.customerNotes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerNotes: e.target.value })
                  }
                  rows={3}
                  placeholder="أي ملاحظات من العميل..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات الإدارة
                </label>
                <textarea
                  value={editForm.adminNotes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, adminNotes: e.target.value })
                  }
                  rows={3}
                  placeholder="ملاحظات داخلية للإدارة..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setShowEditReasonModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    if (!editForm.reasonId) {
                      toast.error("سبب الإرجاع مطلوب");
                      return;
                    }
                    setCreating(true);
                    try {
                      await returnService.updateRequest(editingRequest.id, {
                        reasonId: editForm.reasonId,
                        responsibleParty: editForm.responsibleParty,
                        customerNotes: editForm.customerNotes,
                        adminNotes: editForm.adminNotes,
                      });
                      toast.success("تم تحديث السبب بنجاح");
                      setShowEditReasonModal(false);
                      setEditingRequest(null);
                      fetchData();
                    } catch (error: any) {
                      console.error(error);
                      toast.error(
                        error.response?.data?.error || "فشل في تحديث السبب",
                      );
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "جاري التحديث..." : "حفظ التعديلات"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Integration */}
      {selectedRequest && (
        <ReturnDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default ReturnManagementPage;
