import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Music,
  Video,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Save,
  User,
  Plus,
  Loader2,
  Calendar,
  Layers,
  Printer,
  CreditCard,
  Receipt,
  Send,
  ExternalLink,
  Smartphone,
  Wallet,
  Building2,
  X,
  Copy,
  Users
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

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; badge: string }> = {
  UNPAID: {
    label: "غير مدفوع",
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    badge: "bg-rose-500"
  },
  PARTIALLY_PAID: {
    label: "مدفوع جزئياً (عربون)",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    badge: "bg-amber-500"
  },
  PAID: {
    label: "مدفوع بالكامل",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    badge: "bg-emerald-500"
  },
  REFUNDED: {
    label: "مسترد",
    color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    badge: "bg-gray-400"
  }
};

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  CASH: "نقداً (كاش)",
  VODAFONE_CASH: "فودافون كاش / محافظ",
  INSTAPAY: "إنستاباي (InstaPay)",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة دفع إلكتروني",
  OTHER: "أخرى"
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Files state
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<ServiceMediaFile[]>([]);
  const [savingFiles, setSavingFiles] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // WhatsApp state
  const [waDetection, setWaDetection] = useState<any>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waMessageText, setWaMessageText] = useState("");
  const [selectedWaSessionId, setSelectedWaSessionId] = useState("");
  const [sendingWa, setSendingWa] = useState(false);

  // Payment & Invoice state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    totalAmount: 0,
    newPaymentAmount: "",
    paymentMethod: "VODAFONE_CASH",
    newPaymentNote: ""
  });

  // Settings
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchWhatsAppSession();
      fetchTeamMembers();
      fetchSettings();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/service-orders/${id}`, { headers: authHeaders() as any });
      const data = await res.json();
      if (data.success && data.data) {
        setOrder(data.data);
        setNotes(data.data.notes || "");
        setAssignedTo(data.data.assignedTo || "");
        setPaymentForm((prev) => ({
          ...prev,
          totalAmount: data.data.payment?.totalAmount || data.data.service?.price || 0
        }));
      } else {
        toast.error(data.error || "تعذر العثور على الطلب");
        navigate("/admin/service-orders");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء تحميل بيانات الطلب");
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppSession = async () => {
    try {
      const res = await fetch(`/api/v1/service-orders/${id}/whatsapp-session`, {
        headers: authHeaders() as any
      });
      const data = await res.json();
      if (data.success && data.data) {
        setWaDetection(data.data);
        if (data.data.session?.id) {
          setSelectedWaSessionId(data.data.session.id);
        }
      }
    } catch (e) {
      console.warn("Could not fetch WhatsApp session:", e);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/v1/service-orders/team-members", { headers: authHeaders() as any });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTeamMembers(data.data);
      }
    } catch (e) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/v1/service-orders/settings", { headers: authHeaders() as any });
      const data = await res.json();
      if (data.success && data.data) {
        setCompanySettings(data.data);
      }
    } catch (e) {}
  };

  const updateStatus = async (status: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/v1/service-orders/${id}/status`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تحديث حالة الطلب بنجاح");
        setOrder(data.data);
        if (data.data.assignedTo) {
          setAssignedTo(data.data.assignedTo);
        }
      } else {
        toast.error(data.error || "فشل تحديث الحالة");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const saveNotesAndAssignment = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/v1/service-orders/${id}`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({ notes, assignedTo })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ الملاحظات وتعيين الموظف المسؤول");
        setOrder(data.data);
      } else {
        toast.error(data.error || "فشل حفظ التعديلات");
      }
    } catch (e) {
      toast.error("خطأ أثناء حفظ التعديلات");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveAdditionalFiles = async () => {
    if (!id || additionalFiles.length === 0) return;
    setSavingFiles(true);
    try {
      const currentFiles = order.files || order.referenceFiles || [];
      const updatedFiles = [...currentFiles, ...additionalFiles];
      const res = await fetch(`/api/v1/service-orders/${id}`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({ referenceFiles: updatedFiles })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تمت إضافة الملفات للطلب بنجاح");
        setOrder(data.data);
        setAdditionalFiles([]);
        setShowAddFiles(false);
      } else {
        toast.error(data.error || "فشل حفظ الملفات");
      }
    } catch (e) {
      toast.error("خطأ في حفظ الملفات");
    } finally {
      setSavingFiles(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/v1/service-orders/${id}/payment`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({
          totalAmount: Number(paymentForm.totalAmount),
          paymentMethod: paymentForm.paymentMethod,
          newPaymentAmount: paymentForm.newPaymentAmount ? Number(paymentForm.newPaymentAmount) : undefined,
          newPaymentNote: paymentForm.newPaymentNote || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تسجيل بيانات الدفع بنجاح!");
        setOrder(data.data);
        setShowPaymentModal(false);
        setPaymentForm((prev) => ({ ...prev, newPaymentAmount: "", newPaymentNote: "" }));
      } else {
        toast.error(data.error || "فشل تسجيل الدفعة");
      }
    } catch (e) {
      toast.error("خطأ أثناء تحديث البيانات المالية");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSendWhatsAppSystem = async () => {
    if (!waMessageText.trim() || !id) {
      toast.error("يرجى كتابة نص الرسالة أولاً");
      return;
    }
    setSendingWa(true);
    try {
      const res = await fetch(`/api/v1/service-orders/${id}/send-whatsapp`, {
        method: "POST",
        headers: authHeaders() as any,
        body: JSON.stringify({
          message: waMessageText.trim(),
          sessionId: selectedWaSessionId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إرسال رسالة الواتساب للعميل من النظام بنجاح!");
        setShowWhatsAppModal(false);
        setWaMessageText("");
      } else {
        toast.error(data.error || "تعذر إرسال رسالة الواتساب");
      }
    } catch (e: any) {
      toast.error("خطأ في الاتصال بجلسة الواتساب");
    } finally {
      setSendingWa(false);
    }
  };

  const openWhatsAppExternal = () => {
    if (!order?.phone) return;
    let cleanPhone = order.phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("01")) {
      cleanPhone = "2" + cleanPhone;
    }
    const serviceName = order.service?.name || "الخدمة";
    const shortId = order.id ? `#${order.id.slice(-6).toUpperCase()}` : "";
    const text = `مرحباً ${order.customerName || "عميلنا العزيز"}، نتواصل معك بخصوص طلبك لخدمة (${serviceName}) رقم ${shortId}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openInternalWhatsAppChat = () => {
    if (!order?.phone) return;
    let cleanPhone = order.phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("01")) cleanPhone = "2" + cleanPhone;
    navigate(`/whatsapp?phone=${cleanPhone}`);
  };

  const applyTemplate = (type: "CONFIRM" | "PROGRESS" | "INVOICE" | "DELIVERY") => {
    const serviceName = order.service?.name || "الخدمة";
    const shortId = order.id ? `#${order.id.slice(-6).toUpperCase()}` : "";
    const total = order.payment?.totalAmount || 0;
    const paid = order.payment?.paidAmount || 0;
    const remaining = order.payment?.remainingAmount || 0;

    switch (type) {
      case "CONFIRM":
        setWaMessageText(
          `مرحباً ${order.customerName}، تم استلام وتأكيد طلبك لخدمة (${serviceName}) رقم ${shortId} بنجاح.\nسنتواصل معك لمتابعة التنفيذ فوراً.`
        );
        break;
      case "PROGRESS":
        setWaMessageText(
          `مرحباً ${order.customerName}، يسعدنا إبلاغك بأن طلبك لخدمة (${serviceName}) رقم ${shortId} قيد التنفيذ الآن بواسطة فريقنا الفني.`
        );
        break;
      case "INVOICE":
        setWaMessageText(
          `فاتورة طلب خدمة (${serviceName}) رقم ${shortId}:\n• إجمالي الحساب: ${total} ج.م\n• المدفوع (عربون): ${paid} ج.م\n• المتبقي: ${remaining} ج.م\n${
            companySettings?.vodafoneCashNumber ? `• فودافون كاش: ${companySettings.vodafoneCashNumber}\n` : ""
          }${companySettings?.instapayAddress ? `• إنستاباي: ${companySettings.instapayAddress}\n` : ""}شكراً لتعاملك معنا!`
        );
        break;
      case "DELIVERY":
        setWaMessageText(
          `مرحباً ${order.customerName}، نود إعلامك باكتمال العمل الخاص بطلبك لخدمة (${serviceName}) رقم ${shortId}، وهو جاهز للتسليم الآن!`
        );
        break;
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    try {
      const res = await fetch(`/api/v1/service-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders() as any
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف الطلب بنجاح");
        navigate("/admin/service-orders");
      } else {
        toast.error(data.error || "فشل حذف الطلب");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء حذف الطلب");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm font-medium">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  if (!order) return null;

  const shortId = order.id ? `#${order.id.slice(-6).toUpperCase()}` : "";
  const currentStatus = STATUS_MAP[order.status] || STATUS_MAP.NEW;
  const currentPaymentStatus = PAYMENT_STATUS_MAP[order.payment?.paymentStatus] || PAYMENT_STATUS_MAP.UNPAID;
  const files: ServiceMediaFile[] = order.files || order.referenceFiles || [];

  const audioFiles = files.filter(
    (f) => f.type === "audio" || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.url)
  );
  const videoFiles = files.filter(
    (f) => f.type === "video" || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.url)
  );
  const imageFiles = files.filter(
    (f) => f.type === "image" || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.url)
  );
  const otherFiles = files.filter(
    (f) => !audioFiles.includes(f) && !videoFiles.includes(f) && !imageFiles.includes(f)
  );

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 rtl" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/service-orders"
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors shadow-xs"
            title="العودة لقائمة الطلبات"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                طلب خدمة {shortId}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${currentStatus.badge}`}></span>
                {currentStatus.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentPaymentStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${currentPaymentStatus.badge}`}></span>
                {currentPaymentStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              تم التقديم: {new Date(order.createdAt).toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-xs focus:ring-2 focus:ring-primary-500 outline-hidden transition-all"
          >
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                تغيير الحالة: {val.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl transition-colors shadow-xs"
            title="عرض وطباعة الفاتورة"
          >
            <Receipt className="w-4 h-4" />
            <span>الفاتورة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors shadow-xs"
            title="مراسلة واتساب من النظام"
          >
            <MessageCircle className="w-4 h-4" />
            <span>واتساب النظام</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteOrder}
            className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl transition-colors shadow-xs"
            title="حذف الطلب"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Service & Requirements Overview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 flex items-center justify-center text-2xl font-bold">
                  {order.service?.icon || "📋"}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {order.service?.name || "خدمة مخصصة"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    تصنيف الخدمة: {order.service?.category || "عام"}
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs text-gray-400 block">السعر الإجمالي</span>
                <span className="text-base sm:text-lg font-bold text-primary-600 dark:text-primary-400">
                  {order.payment?.totalAmount || order.service?.price || 0} ج.م
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                متطلبات ووصف العميل للخدمة:
              </h3>
              {order.description ? (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
                  {order.description}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">لم يقم العميل بإدخال وصف إضافي.</p>
              )}
            </div>
          </div>

          {/* Media & Files Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-gray-100 dark:border-gray-700/60">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-600" />
                  المرفقات والوسائط ({files.length})
                </h2>
                <p className="text-xs text-gray-400">
                  الموسيقى، الفيديوهات، التصاميم، وتسليمات العمل النهائية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFiles(!showAddFiles)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddFiles ? "إلغاء الإضافة" : "إضافة ملفات أو تسليمات"}
              </button>
            </div>

            {showAddFiles && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3">
                <MediaUploadZone
                  files={additionalFiles}
                  onChange={setAdditionalFiles}
                  label="رفع مرفقات جديدة أو تسليمات للطلب"
                  helperText="يمكنك رفع موسيقى، فيديوهات، أو ملفات لتسليمها للعميل أو الاحتفاظ بها في سجل الطلب."
                />
                {additionalFiles.length > 0 && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={savingFiles}
                      onClick={handleSaveAdditionalFiles}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      {savingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>حفظ الملفات في الطلب</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {files.length === 0 ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">لا توجد مرفقات مع هذا الطلب حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Audio */}
                {audioFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                      <Music className="w-4 h-4" />
                      الموسيقى والملفات الصوتية ({audioFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {audioFiles.map((file, i) => (
                        <div key={i} className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Music className="w-4 h-4 text-purple-600 shrink-0" />
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{file.originalName}</span>
                              {file.size && <span className="text-[10px] text-gray-400 shrink-0">({formatFileSize(file.size)})</span>}
                            </div>
                            <a href={file.url} download target="_blank" rel="noopener noreferrer" className="p-1 text-purple-600 hover:text-purple-800 rounded-md">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          <audio controls preload="none" src={file.url} className="w-full h-8 rounded-lg outline-hidden" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {videoFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      مقاطع الفيديو ({videoFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoFiles.map((file, i) => (
                        <div key={i} className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{file.originalName}</span>
                            <a href={file.url} download target="_blank" rel="noopener noreferrer" className="p-1 text-rose-600 hover:text-rose-800 rounded-md">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          <video controls preload="metadata" src={file.url} className="w-full rounded-lg max-h-48 bg-black/90 object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {imageFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      الصور والتصاميم ({imageFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {imageFiles.map((file, i) => (
                        <div key={i} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square cursor-pointer" onClick={() => setSelectedImage(file.url)}>
                          <img src={file.url} alt={file.originalName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={file.url} download onClick={(e) => e.stopPropagation()} className="p-1.5 bg-white/90 text-gray-800 rounded-full">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Docs */}
                {otherFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      المستندات والملفات الأخرى ({otherFiles.length})
                    </h4>
                    <div className="space-y-1.5">
                      {otherFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{file.originalName}</span>
                            {file.size && <span className="text-[10px] text-gray-400">({formatFileSize(file.size)})</span>}
                          </div>
                          <a href={file.url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-600 hover:underline px-2 py-1">
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                الملاحظات الداخلية وسجل المتابعة
              </h3>
              <span className="text-[11px] text-gray-400">خاصة بفريق العمل</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظات داخلية لفريق العمل، شروط خاصة، أو تفاصيل المتابعة..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 outline-hidden focus:ring-2 focus:ring-primary-500"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingNotes}
                onClick={saveNotesAndAssignment}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>حفظ الملاحظات</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Financial & Invoicing Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                الماليات وحالة الدفع
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل دفعة</span>
              </button>
            </div>

            {/* Financial Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900/40">
                <span className="text-gray-500">السعر الإجمالي:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {order.payment?.totalAmount || 0} ج.م
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                <span>المدفوع (عربون/تحصيل):</span>
                <span className="font-bold">{order.payment?.paidAmount || 0} ج.م</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                <span>المبلغ المتبقي:</span>
                <span className="font-bold">{order.payment?.remainingAmount || 0} ج.م</span>
              </div>
            </div>

            {/* Action Buttons for Invoice */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>عرض الفاتورة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  applyTemplate("INVOICE");
                  setShowWhatsAppModal(true);
                }}
                className="flex items-center justify-center p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl"
                title="إرسال الفاتورة عبر واتساب"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Customer & WhatsApp Smart Routing Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <User className="w-4 h-4 text-primary-600" />
              العميل والتواصل الذكي
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-gray-400 block">اسم العميل</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{order.customerName}</p>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 block">رقم الهاتف</span>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200" dir="ltr">
                  {order.phone}
                </p>
              </div>

              {/* Detected WhatsApp Session Indicator */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    جلسة الواتساب المتصلة:
                  </span>
                  {waDetection?.isPreviousChat ? (
                    <span className="px-1.5 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded text-[10px]">
                      محادثة سابقة للعميل
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-[10px]">الجلسة الافتراضية</span>
                  )}
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 truncate">
                  {waDetection?.session?.name || "واتساب الشركة"} ({waDetection?.session?.phoneNumber || "متصل"})
                </p>
              </div>
            </div>

            {/* Quick Contact Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>إرسال واتساب من النظام</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openInternalWhatsAppChat}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors"
                  title="فتح محادثة العميل في شات الواتساب الداخلي للمنصة"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>شات المنصة</span>
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppExternal}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors"
                  title="فتح محادثة واتساب عبر wa.me"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  <span>wa.me مباشر</span>
                </button>
              </div>

              <a
                href={`tel:${order.phone}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال هاتفي</span>
              </a>
            </div>
          </div>

          {/* Team Member & Assignment Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                فريق العمل والمسؤول
              </h3>
              <Link
                to="/admin/services/settings"
                className="text-xs text-primary-600 hover:underline"
                title="إعدادات توزيع الأدوار"
              >
                تعديل الأدوار
              </Link>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                المسؤول الحالي عن الطلب:
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="flex-1 p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200 outline-hidden"
                >
                  <option value="">-- غير محدد --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                  {assignedTo && !teamMembers.some((m) => m.name === assignedTo) && (
                    <option value={assignedTo}>{assignedTo}</option>
                  )}
                </select>
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={saveNotesAndAssignment}
                  className="p-2 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-950/40 rounded-xl"
                  title="حفظ المسؤول"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>تاريخ الإنشاء:</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>آخر تحديث:</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {new Date(order.updatedAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal 1: WhatsApp Quick Send ── */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  إرسال واتساب من النظام للعميل
                </h3>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Info & Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                الإرسال من جلسة الواتساب:
              </label>
              <select
                value={selectedWaSessionId}
                onChange={(e) => setSelectedWaSessionId(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
              >
                {waDetection?.session && (
                  <option value={waDetection.session.id}>
                    {waDetection.isPreviousChat ? "⭐ جلسة العميل السابقة: " : "الجلسة المختارة: "}
                    {waDetection.session.name || "واتساب"} ({waDetection.session.phoneNumber})
                  </option>
                )}
                {waDetection?.companySessions?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Buttons */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">قوالب جاهزة:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyTemplate("CONFIRM")}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-medium"
                >
                  تأكيد الطلب
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("PROGRESS")}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-medium"
                >
                  بدء التنفيذ
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("INVOICE")}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 hover:bg-indigo-100 font-medium"
                >
                  إشعار الفاتورة والحساب
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("DELIVERY")}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 hover:bg-emerald-100 font-medium"
                >
                  جاهزية التسليم
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">نص الرسالة:</label>
              <textarea
                rows={5}
                value={waMessageText}
                onChange={(e) => setWaMessageText(e.target.value)}
                placeholder="اكتب الرسالة المراد إرسالها للعميل..."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={openWhatsAppExternal}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>أو افتح wa.me</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-500 hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={sendingWa}
                  onClick={handleSendWhatsAppSystem}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  {sendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال الآن من النظام</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Record Payment ── */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">تسجيل دفعة / عربون مالي</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">السعر الإجمالي للخدمة:</label>
                <input
                  type="number"
                  required
                  value={paymentForm.totalAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, totalAmount: Number(e.target.value) })}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  المبلغ المحصل الآن (الدفعة / العربون):
                </label>
                <input
                  type="number"
                  placeholder="مثال: 500"
                  value={paymentForm.newPaymentAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, newPaymentAmount: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">طريقة الدفع:</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                >
                  {Object.entries(PAYMENT_METHOD_NAMES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">ملاحظة الدفعة (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: عربون مقدم لبدء العمل"
                  value={paymentForm.newPaymentNote}
                  onChange={(e) => setPaymentForm({ ...paymentForm, newPaymentNote: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-500 hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ وتحديث الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Printable Invoice ── */}
      {showInvoiceModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-xs font-bold text-primary-600 block uppercase tracking-wider">
                  فاتورة خدمة معتمدة
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                  {order.payment?.invoiceNumber || `SRV-${shortId}`}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  تاريخ الإصدار: {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                </p>
              </div>

              <div className="text-left">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${currentPaymentStatus.color}`}>
                  {currentPaymentStatus.label}
                </span>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">فاتورة إلى:</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{order.customerName}</p>
                <p className="text-gray-500 font-mono mt-0.5" dir="ltr">{order.phone}</p>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">تفاصيل الخدمة:</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{order.service?.name || "خدمة"}</p>
                <p className="text-gray-500 mt-0.5">الطلب رقم: {shortId}</p>
              </div>
            </div>

            {/* Invoice Table Breakdown */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-3 font-semibold">بند الخدمة</th>
                    <th className="p-3 font-semibold text-center">الكمية</th>
                    <th className="p-3 font-semibold text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="p-3">
                      <span className="font-bold text-gray-900 dark:text-white block">{order.service?.name}</span>
                      {order.description && <span className="text-[11px] text-gray-400 line-clamp-1">{order.description}</span>}
                    </td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-left font-bold">{order.payment?.totalAmount || 0} ج.م</td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">إجمالي الحساب:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.payment?.totalAmount || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>المسدد (عربون/دفعات):</span>
                  <span className="font-bold">{order.payment?.paidAmount || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-base font-black text-rose-600 dark:text-rose-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <span>المبلغ المتبقي المطلوب:</span>
                  <span>{order.payment?.remainingAmount || 0} ج.م</span>
                </div>
              </div>
            </div>

            {/* Payment Accounts from Settings */}
            {(companySettings?.vodafoneCashNumber || companySettings?.instapayAddress) && (
              <div className="p-3.5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 text-xs space-y-1.5">
                <span className="font-bold text-primary-800 dark:text-primary-300 block">طرق التحصيل المعتمدة:</span>
                {companySettings?.vodafoneCashNumber && (
                  <p className="text-gray-700 dark:text-gray-300">
                    📱 فودافون كاش: <span className="font-mono font-bold" dir="ltr">{companySettings.vodafoneCashNumber}</span>
                  </p>
                )}
                {companySettings?.instapayAddress && (
                  <p className="text-gray-700 dark:text-gray-300">
                    ⚡ إنستاباي: <span className="font-mono font-bold" dir="ltr">{companySettings.instapayAddress}</span>
                  </p>
                )}
              </div>
            )}

            {companySettings?.paymentTerms && (
              <p className="text-[11px] text-gray-400 text-center italic">
                {companySettings.paymentTerms}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 print:hidden">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-500 hover:bg-gray-100"
              >
                إغلاق
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    applyTemplate("INVOICE");
                    setShowWhatsAppModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال للعميل عبر واتساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="صورة مكبرة" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button onClick={() => setSelectedImage(null)} className="absolute top-3 left-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
