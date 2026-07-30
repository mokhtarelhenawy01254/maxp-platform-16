import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Plus, Check, X, Calendar, ChevronLeft, ChevronRight, TrendingUp, Search, Eye, Edit2, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Progress } from "../../components/ui/progress";
import api from "../../services/api";
import { toast } from "sonner";

interface AdvanceRequest {
  id: string;
  amount: number;
  reason: string;
  requestDate: string;
  createdAt: string;
  status: string;
  repaymentType: string;
  installmentsCount: number;
  monthlyAmount: number;
  approvedAt: string | null;
  remainingBalance?: number;
  isPaidOff?: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatar: string;
    department: { name: string } | null;
    position: { title: string } | null;
  };
  installments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: string;
    paidAt: string | null;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: "بانتظار الموافقة",
    color: "bg-yellow-100 text-yellow-800",
  },
  APPROVED: { label: "معتمد", color: "bg-blue-100 text-blue-800" },
  REJECTED: { label: "مرفوض", color: "bg-red-100 text-red-800" },
  COMPLETED: { label: "مكتمل", color: "bg-green-100 text-green-800" },
};

const Advances: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [payStatusFilter, setPayStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(
    null,
  );
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] =
    useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdvances();
    }, 500);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, searchTerm]);

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/hr/advances?${params}`);

      // التأكد من وجود البيانات
      const advancesData = response.data.data || [];
      setRequests(Array.isArray(advancesData) ? advancesData : []);

      if (response.data.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching advances:", error);
      toast.error("حدث خطأ أثناء جلب البيانات");
      setRequests([]); // تعيين array فاضي في حالة الخطأ
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/hr/advances/${id}/approve`);
      toast.success("تم الموافقة على الطلب");
      fetchAdvances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ");
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;
    try {
      await api.post(`/hr/advances/${selectedRequest.id}/reject`, {
        rejectedReason: rejectionReason || "تم الرفض من قبل الإدارة",
      });
      toast.success("تم رفض الطلب");
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      fetchAdvances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ");
    }
  };

  const openRejectDialog = (request: AdvanceRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const openDetailsDialog = (request: AdvanceRequest) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const openUpdateStatusDialog = (request: AdvanceRequest) => {
    setSelectedRequest(request);
    setIsUpdateStatusDialogOpen(true);
  };

  const handleUpdateStatus = (status: "APPROVED" | "REJECTED") => {
    if (!selectedRequest) return;

    setIsUpdateStatusDialogOpen(false);

    if (status === "APPROVED") {
      handleApprove(selectedRequest.id);
    } else {
      openRejectDialog(selectedRequest);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

    try {
      await api.delete(`/hr/advances/${id}`);
      toast.success("تم حذف الطلب بنجاح");
      fetchAdvances();
    } catch (error) {
      console.error("Error deleting advance:", error);
      toast.error("حدث خطأ أثناء حذف الطلب");
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePaidAmount = (installments: any[]) => {
    if (!installments || !Array.isArray(installments)) return 0;
    return installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + parseFloat(i.amount), 0);
  };

  const calculateProgress = (request: AdvanceRequest) => {
    if (!request.installments || !Array.isArray(request.installments)) return 0;
    const paid = calculatePaidAmount(request.installments);
    return (paid / parseFloat(request.amount.toString())) * 100;
  };

  const calculateRemaining = (request: AdvanceRequest) => {
    const total = parseFloat(request.amount.toString());
    const paid = calculatePaidAmount(request.installments || []);
    const remaining = request.remainingBalance ?? total - paid;
    return remaining;
  };

  const isRequestPaid = (request: AdvanceRequest) => {
    return request.isPaidOff || calculateRemaining(request) <= 0;
  };

  const markAsPaid = async (id: string) => {
    try {
      await api.post(`/hr/advances/${id}/mark-paid`);
      toast.success("تم تعليم السلفة كمسددة");
      fetchAdvances();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "فشل في تحديث حالة السلفة");
    }
  };

  // حساب الإحصائيات
  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter((r) => r.status === "PENDING").length || 0,
    approved: requests?.filter((r) => r.status === "APPROVED").length || 0,
    totalAmount:
      requests?.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0) ||
      0,
  };

  return (
    <div
      className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-[#f9fbff] via-[#f2f6ff] to-[#fff7fc] text-slate-900 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إدارة السلف
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            متابعة طلبات السلف والأقساط
          </p>
        </div>
        <Button
          onClick={() => navigate("/hr/advances/new")}
          className="bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-md shadow-slate-300/40 hover:shadow-slate-400/50 border border-slate-200 hover:-translate-y-0.5 transition duration-150 rounded-full px-5"
        >
          <Plus className="h-4 w-4 ml-2" />
          طلب سلفة جديد
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "إجمالي الطلبات",
            value: stats.total,
            icon: <DollarSign className="h-8 w-8" />,
            tint: "from-sky-100 via-sky-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
            accent: "bg-sky-500",
            text: "text-slate-900",
          },
          {
            title: "بانتظار الموافقة",
            value: stats.pending,
            icon: <Calendar className="h-8 w-8" />,
            tint: "from-amber-100 via-amber-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
            accent: "bg-amber-500",
            text: "text-slate-900",
          },
          {
            title: "معتمد",
            value: stats.approved,
            icon: <Check className="h-8 w-8" />,
            tint: "from-emerald-100 via-emerald-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
            accent: "bg-emerald-500",
            text: "text-slate-900",
          },
          {
            title: "إجمالي المبالغ",
            value: formatCurrency(stats.totalAmount),
            icon: <TrendingUp className="h-8 w-8" />,
            tint: "from-indigo-100 via-indigo-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
            accent: "bg-indigo-500",
            text: "text-slate-900",
          },
        ].map((card) => (
          <Card
            key={card.title}
            className="relative overflow-hidden border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur shadow-lg shadow-slate-200 dark:shadow-slate-900/30 rounded-2xl transition-colors duration-200"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.tint}`}
            />
            <div className="absolute inset-0 bg-white/30 pointer-events-none" />
            <CardContent className="relative p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-600 dark:text-slate-200 uppercase tracking-[0.15em]">
                  {card.title}
                </p>
                <h3 className={`text-3xl font-black tracking-tight ${card.text} dark:text-white`}>
                  {card.value}
                </h3>
              </div>
              <div className={`h-12 w-12 rounded-xl ${card.accent} bg-opacity-90 text-white shadow-md shadow-slate-300/40 dark:shadow-black/30 flex items-center justify-center`}>
                {card.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-slate-900/40 rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">تصفية سريعة</p>
              <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-white">ابحث وفرّز طلبات السلف</h3>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-300 h-4 w-4" />
              <Input
                placeholder="بحث باسم الموظف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
              {[
                { key: "all", label: "الكل" },
                { key: "PENDING", label: statusConfig.PENDING.label },
                { key: "APPROVED", label: statusConfig.APPROVED.label },
                { key: "COMPLETED", label: statusConfig.COMPLETED.label },
                { key: "REJECTED", label: statusConfig.REJECTED.label },
              ].map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={statusFilter === item.key ? "default" : "outline"}
                  className={
                    statusFilter === item.key
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  }
                  onClick={() => setStatusFilter(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-600 dark:text-slate-300">حالة السداد:</span>
              {([
                { key: "all", label: "كل حالات السداد" },
                { key: "paid", label: "مسدد" },
                { key: "unpaid", label: "غير مسدد" },
              ] as const).map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={payStatusFilter === item.key ? "default" : "outline"}
                  className={
                    payStatusFilter === item.key
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  }
                  onClick={() => setPayStatusFilter(item.key as any)}
                >
                  {item.label}
                </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <DollarSign className="h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد طلبات سلف</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">التاريخ والوقت</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">نوع السداد</TableHead>
                  <TableHead className="text-right">التقدم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests
                  .filter((request) => {
                    const paid = isRequestPaid(request);
                    if (payStatusFilter === "paid") return paid;
                    if (payStatusFilter === "unpaid") return !paid;
                    return true;
                  })
                  .map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.employee?.avatar} />
                          <AvatarFallback>
                            {request.employee?.firstName?.[0]}
                            {request.employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {request.employee?.firstName}{" "}
                            {request.employee?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.employee?.position?.title}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(
                            request.createdAt || request.requestDate,
                          ).toLocaleDateString("ar-EG")}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            request.createdAt || request.requestDate,
                          ).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(request.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(Math.max(calculateRemaining(request), 0))}</span>
                        {isRequestPaid(request) ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            مسدد
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                            غير مسدد
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.repaymentType === "ONE_TIME"
                        ? "دفعة واحدة"
                        : `${request.installmentsCount} أقساط`}
                    </TableCell>
                    <TableCell>
                      {request.status === "APPROVED" && (
                        <div className="space-y-1">
                          <Progress
                            value={calculateProgress(request)}
                            className="h-2"
                          />
                          <p className="text-xs text-gray-500">
                            {formatCurrency(
                              calculatePaidAmount(request.installments),
                            )}{" "}
                            / {formatCurrency(request.amount)}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusConfig[request.status]?.color || ""}
                      >
                        {statusConfig[request.status]?.label || request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailsDialog(request)}
                          title="التفاصيل"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        {request.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                              onClick={() => handleApprove(request.id)}
                              title="موافقة"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => openRejectDialog(request)}
                              title="رفض"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openUpdateStatusDialog(request)}
                            title="تعديل القرار"
                          >
                            <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </Button>
                        )}
                        {!isRequestPaid(request) && request.status === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => markAsPaid(request.id)}
                            title="تعليم السلفة كمسددة"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            تسوية
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(request.id)}
                          title="حذف"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">
              عرض {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              من {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب السلفة</DialogTitle>
            <DialogDescription>
              الرجاء إدخال سبب الرفض للموظف.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="سبب الرفض..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل السلفة</DialogTitle>
            <DialogDescription>تفاصيل الطلب وجدول الأقساط</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    المبلغ
                  </p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    نظام السداد
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {selectedRequest.repaymentType === "ONE_TIME"
                      ? "دفعة واحدة"
                      : "أقساط"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    سبب الطلب
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedRequest.reason}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    تاريخ ووقت الطلب
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(
                      selectedRequest.createdAt || selectedRequest.requestDate,
                    ).toLocaleString("ar-EG", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {selectedRequest.repaymentType === "INSTALLMENTS" &&
                selectedRequest.installments?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">
                      جدول الأقساط
                    </h4>
                    <div className="border dark:border-gray-700 rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">
                              القسط
                            </TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">
                              تاريخ الاستحقاق
                            </TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">
                              المبلغ
                            </TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-300">
                              الحالة
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRequest.installments.map((inst, idx) => (
                            <TableRow
                              key={inst.id}
                              className="dark:border-gray-700"
                            >
                              <TableCell className="dark:text-gray-200">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {new Date(inst.dueDate).toLocaleDateString(
                                  "ar-EG",
                                )}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {formatCurrency(inst.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    inst.status === "PAID"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {inst.status === "PAID"
                                    ? "تم الدفع"
                                    : "مستحق"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog
        open={isUpdateStatusDialogOpen}
        onOpenChange={setIsUpdateStatusDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل حالة السلفة</DialogTitle>
            <DialogDescription>
              يمكنك تغيير الحالة الحالية للسلفة. يرجى توخي الحذر عند تغيير
              الحالات المعتمدة مسبقاً.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-center py-6">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleUpdateStatus("APPROVED")}
            >
              <Check className="h-4 w-4 ml-2" />
              اعتماد السلفة
            </Button>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleUpdateStatus("REJECTED")}
            >
              <X className="h-4 w-4 ml-2" />
              رفض السلفة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Advances;
