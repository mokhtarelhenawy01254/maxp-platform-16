import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MessageCircle,
  Share2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Music,
  Video,
  FileText,
  Copy,
  Loader2,
  X,
  Layers,
  Sparkles
} from "lucide-react";
import { MediaUploadZone, ServiceMediaFile } from "../../components/services/MediaUploadZone";

const STATUS_MAP: Record<string, { label: string; color: string; badge: string }> = {
  NEW: {
    label: "جديد",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    badge: "bg-blue-500"
  },
  IN_PROGRESS: {
    label: "قيد التنفيذ",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    badge: "bg-amber-500"
  },
  COMPLETED: {
    label: "مكتمل",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    badge: "bg-emerald-500"
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    badge: "bg-rose-500"
  },
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

export default function ServiceOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    serviceId: "",
    customerName: "",
    phone: "",
    description: "",
    notes: "",
    assignedTo: ""
  });
  const [createFiles, setCreateFiles] = useState<ServiceMediaFile[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchServices();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/service-orders`, { headers: authHeaders() as any });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error("فشل تحميل قائمة الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/v1/services`, { headers: authHeaders() as any });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setServices(data.data.filter((s: any) => s.isActive));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (id: string, status: string, e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/service-orders/${id}/status`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تحديث حالة الطلب");
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      } else {
        toast.error(data.error || "فشل تحديث الحالة");
      }
    } catch (e) {
      toast.error("خطأ أثناء تحديث الحالة");
    }
  };

  const deleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    try {
      const res = await fetch(`/api/v1/service-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders() as any
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف الطلب بنجاح");
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        toast.error(data.error || "فشل حذف الطلب");
      }
    } catch (e) {
      toast.error("خطأ أثناء حذف الطلب");
    }
  };

  const openWhatsAppChat = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!order.phone) return;
    let cleanPhone = order.phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("01")) {
      cleanPhone = "2" + cleanPhone;
    }
    const serviceName = order.service?.name || "الخدمة";
    const orderNum = order.id ? `#${order.id.slice(-6).toUpperCase()}` : "";
    const text = `مرحباً ${order.customerName || "عميلنا العزيز"}، نتواصل معك بخصوص طلبك لخدمة (${serviceName}) ${orderNum}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyPublicLink = () => {
    const token = localStorage.getItem("token");
    let cid = localStorage.getItem("companyId") || "";
    if (!cid && token) {
      try {
        const p = JSON.parse(atob(token.split(".")[1]));
        cid = p.companyId || "";
      } catch {}
    }
    const url = `${window.location.origin}/request-service${cid ? `?companyId=${cid}` : ""}`;
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط صفحة طلب الخدمات للعملاء بنجاح!");
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.serviceId || !createForm.customerName.trim() || !createForm.phone.trim()) {
      toast.error("يرجى ملء الحقول المطلوبة: الخدمة، اسم العميل، ورقم الهاتف.");
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      let cid = localStorage.getItem("companyId") || "";
      if (!cid && token) {
        try {
          const p = JSON.parse(atob(token.split(".")[1]));
          cid = p.companyId || "";
        } catch {}
      }

      const res = await fetch("/api/v1/service-orders", {
        method: "POST",
        headers: authHeaders() as any,
        body: JSON.stringify({
          companyId: cid,
          serviceId: createForm.serviceId,
          customerName: createForm.customerName.trim(),
          phone: createForm.phone.trim(),
          description: createForm.description.trim() || undefined,
          notes: createForm.notes.trim() || undefined,
          assignedTo: createForm.assignedTo.trim() || undefined,
          referenceFiles: createFiles
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("تم تسجيل طلب الخدمة بنجاح!");
        setShowCreateModal(false);
        setCreateForm({
          serviceId: "",
          customerName: "",
          phone: "",
          description: "",
          notes: "",
          assignedTo: ""
        });
        setCreateFiles([]);
        fetchOrders();
      } else {
        toast.error(data.error || "فشل إنشاء الطلب");
      }
    } catch (err) {
      toast.error("حدث خطأ في الاتصال بالخادم");
    } finally {
      setCreating(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : order.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const shortId = (order.id || "").toLowerCase();
      const customerName = (order.customerName || "").toLowerCase();
      const phone = (order.phone || "").toLowerCase();
      const serviceName = (order.service?.name || "").toLowerCase();

      const matchesSearch =
        shortId.includes(q) ||
        customerName.includes(q) ||
        phone.includes(q) ||
        serviceName.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Metric stats
  const stats = useMemo(() => {
    const total = orders.length;
    const countNew = orders.filter((o) => o.status === "NEW").length;
    const inProgress = orders.filter((o) => o.status === "IN_PROGRESS").length;
    const completed = orders.filter((o) => o.status === "COMPLETED").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    return { total, countNew, inProgress, completed, cancelled };
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm font-medium">جاري تحميل طلبات الخدمات...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 rtl" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>طلبات الخدمات</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-bold">
              {orders.length}
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            إدارة ومتابعة طلبات الخدمات الإبداعية والمخصصة، معاينة وسائط العملاء، وتسليم الأعمال.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-xs transition-colors"
            title="نسخ رابط صفحة طلب الخدمة للعملاء"
          >
            <Copy className="w-3.5 h-3.5 text-primary-600" />
            <span>رابط الطلب للعملاء</span>
          </button>

          <Link
            to="/admin/services"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 shadow-xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>كتالوج الخدمات</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء طلب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "ALL"
              ? "bg-primary-50/70 border-primary-300 dark:bg-primary-950/40 dark:border-primary-800 shadow-xs"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">إجمالي الطلبات</span>
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            {stats.total}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("NEW")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "NEW"
              ? "bg-blue-50/70 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-xs"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 block">طلبات جديدة</span>
          <span className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5 block">
            {stats.countNew}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("IN_PROGRESS")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "IN_PROGRESS"
              ? "bg-amber-50/70 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 shadow-xs"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">قيد التنفيذ</span>
          <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5 block">
            {stats.inProgress}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("COMPLETED")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "COMPLETED"
              ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 shadow-xs"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">مكتملة</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
            {stats.completed}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter("CANCELLED")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "CANCELLED"
              ? "bg-rose-50/70 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 shadow-xs"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">ملغية</span>
          <span className="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5 block">
            {stats.cancelled}
          </span>
        </div>
      </div>

      {/* Search Bar & Status Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، رقم الهاتف، أو اسم الخدمة..."
            className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "الكل" },
            { id: "NEW", label: "جديد" },
            { id: "IN_PROGRESS", label: "قيد التنفيذ" },
            { id: "COMPLETED", label: "مكتمل" },
            { id: "CANCELLED", label: "ملغي" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
            {orders.length === 0 ? "لا توجد طلبات خدمات بعد" : "لا توجد نتائج مطابقة للبحث"}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {orders.length === 0
              ? "يمكنك البدء بإنشاء أول طلب خدمة يدوي، أو نسخ رابط صفحة الطلبات لمشاركتها مع عملائك عبر منصات التواصل."
              : "جرّب تغيير كلمات البحث أو إعادة ضبط فلتر الحالات للوصول إلى طلبات أخرى."}
          </p>
          {orders.length === 0 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                إنشاء أول طلب
              </button>
              <button
                onClick={copyPublicLink}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl"
              >
                نسخ رابط الطلب
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const shortId = o.id ? `#${o.id.slice(-6).toUpperCase()}` : "";
            const statusConfig = STATUS_MAP[o.status] || STATUS_MAP.NEW;
            const files = o.referenceFiles || [];

            const audioCount = files.filter(
              (f: any) => f.type === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(f.url)
            ).length;
            const videoCount = files.filter(
              (f: any) => f.type === "video" || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.url)
            ).length;
            const imageCount = files.filter(
              (f: any) => f.type === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url)
            ).length;

            return (
              <div
                key={o.id}
                onClick={() => navigate(`/admin/service-orders/${o.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 dark:hover:border-primary-700 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center text-lg font-bold shrink-0">
                      {o.service?.icon || "📋"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
                          {shortId}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                          {o.customerName}
                        </span>
                        <span className="text-xs text-gray-400" dir="ltr">
                          {o.phone}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.badge}`}></span>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary-700 dark:text-primary-400">
                          {o.service?.name || "خدمة"}
                        </span>
                        {o.description && (
                          <span className="text-gray-400 line-clamp-1">
                            — {o.description}
                          </span>
                        )}
                      </div>

                      {/* Media Badges & Meta */}
                      <div className="flex items-center gap-2.5 mt-2 text-[11px] text-gray-400 flex-wrap">
                        <span>{new Date(o.createdAt).toLocaleDateString("ar-EG")}</span>
                        {audioCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-md font-medium">
                            <Music className="w-3 h-3" />
                            {audioCount} ملف صوتي
                          </span>
                        )}
                        {videoCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-md font-medium">
                            <Video className="w-3 h-3" />
                            {videoCount} فيديو
                          </span>
                        )}
                        {imageCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md font-medium">
                            {imageCount} صور
                          </span>
                        )}
                        {o.assignedTo && (
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            • المسؤول: {o.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => openWhatsAppChat(o, e)}
                      title="محادثة واتساب سريعة مع العميل"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>

                    <select
                      className="border rounded-xl px-2.5 py-1 text-xs font-medium dark:bg-gray-700 dark:border-gray-600 min-h-[36px]"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value, e)}
                    >
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>

                    <Link
                      to={`/admin/service-orders/${o.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors"
                      title="عرض تفاصيل الطلب الكاملة"
                    >
                      <span>تفاصيل</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => deleteOrder(o.id, e)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      title="حذف الطلب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  تسجيل طلب خدمة جديد يدويًا
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  اختر الخدمة <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.serviceId}
                  onChange={(e) => setCreateForm({ ...createForm, serviceId: e.target.value })}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-hidden"
                >
                  <option value="">-- اختر الخدمة المطلوبة --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon || "📋"} {s.name} {s.price ? `(${s.price} ج.م)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    اسم العميل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الكامل للعميل"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    رقم الهاتف (واتساب) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 01012345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  تفاصيل ومتطلبات الطلب
                </label>
                <textarea
                  rows={2}
                  placeholder="وصف تفاصيل الخدمة المتفق عليها، الشروط الخاصة، المراجع..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-hidden"
                />
              </div>

              {/* Rich Media Upload for audio, video, images */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <MediaUploadZone
                  files={createFiles}
                  onChange={setCreateFiles}
                  label="رفع مرفقات الطلب (موسيقى، فيديوهات، صور، ملفات)"
                  helperText="يمكنك رفع المراجع الموسيقية، لقطات الفيديو، أو ملفات التصميم المرتبطة بالطلب لمعاينتها فوراً."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    ملاحظات داخلية (خاصة بالإدارة)
                  </label>
                  <input
                    type="text"
                    placeholder="ملاحظات لا يراها العميل"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    الموظف أو المنفّذ المسؤول
                  </label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول عن التنفيذ"
                    value={createForm.assignedTo}
                    onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>حفظ وإنشاء الطلب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
