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
  Printer
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

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<ServiceMediaFile[]>([]);
  const [savingFiles, setSavingFiles] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOrder();
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
        setOrder((prev: any) => ({ ...prev, status }));
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
        toast.success("تم حفظ الملاحظات وتعيين الموظف");
        setOrder((prev: any) => ({ ...prev, notes, assignedTo }));
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
      const currentFiles = order.referenceFiles || [];
      const updatedFiles = [...currentFiles, ...additionalFiles];
      const res = await fetch(`/api/v1/service-orders/${id}`, {
        method: "PUT",
        headers: authHeaders() as any,
        body: JSON.stringify({ referenceFiles: updatedFiles })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تمت إضافة الملفات للطلب بنجاح");
        setOrder((prev: any) => ({ ...prev, referenceFiles: updatedFiles }));
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

  const openWhatsApp = () => {
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
  const files: ServiceMediaFile[] = order.referenceFiles || [];

  // Group files by type
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
    (f) =>
      !audioFiles.includes(f) &&
      !videoFiles.includes(f) &&
      !imageFiles.includes(f)
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                طلب خدمة {shortId}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.color}`}>
                <span className={`w-2 h-2 rounded-full ${currentStatus.badge}`}></span>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              تم التقديم: {new Date(order.createdAt).toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Header Actions */}
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
            onClick={() => window.print()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs transition-colors"
            title="طباعة الطلب"
          >
            <Printer className="w-4 h-4" />
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

      {/* Main Grid: Responsive 3 cols on desktop, 1 col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left / Main Column (2 cols) */}
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

              {order.service?.price && (
                <div className="text-left">
                  <span className="text-xs text-gray-400 block">سعر الخدمة</span>
                  <span className="text-base sm:text-lg font-bold text-primary-600 dark:text-primary-400">
                    {order.service.price} ج.م
                  </span>
                </div>
              )}
            </div>

            {/* Customer Description / Requirements */}
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

          {/* Media & Deliverables Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-gray-100 dark:border-gray-700/60">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-600" />
                  المرفقات والوسائط ({files.length})
                </h2>
                <p className="text-xs text-gray-400">
                  الموسيقى، الفيديوهات، التصاميم، والملفات المرفقة بالطلب
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFiles(!showAddFiles)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddFiles ? "إلغاء الإضافة" : "إضافة ملفات للطلب"}
              </button>
            </div>

            {/* Add More Files Form */}
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
                <p className="text-xs">لا توجد مرفقات أو وسائط مع هذا الطلب حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Audio / Music Section */}
                {audioFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                      <Music className="w-4 h-4" />
                      الموسيقى والملفات الصوتية ({audioFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {audioFiles.map((file, i) => (
                        <div
                          key={i}
                          className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Music className="w-4 h-4 text-purple-600 shrink-0" />
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {file.originalName}
                              </span>
                              {file.size && (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  ({formatFileSize(file.size)})
                                </span>
                              )}
                            </div>
                            <a
                              href={file.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 rounded-md transition-colors"
                              title="تحميل الملف الصوتي"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          {/* Embedded Audio Player */}
                          <audio
                            controls
                            preload="none"
                            src={file.url}
                            className="w-full h-8 rounded-lg outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Video Section */}
                {videoFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Video className="w-4 h-4" />
                      مقاطع الفيديو ({videoFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoFiles.map((file, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {file.originalName}
                            </span>
                            <a
                              href={file.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-rose-600 hover:text-rose-800 dark:text-rose-400 rounded-md"
                              title="تحميل الفيديو"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          <video
                            controls
                            preload="metadata"
                            src={file.url}
                            className="w-full rounded-lg max-h-48 bg-black/90 object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Images Section */}
                {imageFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      الصور والتصاميم ({imageFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {imageFiles.map((file, i) => (
                        <div
                          key={i}
                          className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 aspect-square cursor-pointer"
                          onClick={() => setSelectedImage(file.url)}
                        >
                          <img
                            src={file.url}
                            alt={file.originalName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={file.url}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 bg-white/90 text-gray-800 rounded-full hover:bg-white"
                              title="تحميل"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Other Documents Section */}
                {otherFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      المستندات والملفات الأخرى ({otherFiles.length})
                    </h4>
                    <div className="space-y-1.5">
                      {otherFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                              {file.originalName}
                            </span>
                            {file.size && (
                              <span className="text-[10px] text-gray-400 shrink-0">
                                ({formatFileSize(file.size)})
                              </span>
                            )}
                          </div>
                          <a
                            href={file.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline px-2 py-1"
                          >
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
              <span className="text-[11px] text-gray-400">لا تظهر للعميل</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظات داخلية لفريق العمل، تقدم التنفيذ، أو شروط خاصة بالطلب..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-hidden transition-all"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingNotes}
                onClick={saveNotesAndAssignment}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>حفظ الملاحظات</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (1 col) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Customer Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <User className="w-4 h-4 text-primary-600" />
              بيانات العميل والتواصل
            </h3>

            <div className="space-y-2.5">
              <div>
                <span className="text-[11px] text-gray-400 block">اسم العميل</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {order.customerName}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 block">رقم الهاتف</span>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200" dir="ltr">
                  {order.phone}
                </p>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={openWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>محادثة واتساب مخصصة</span>
              </button>

              <a
                href={`tel:${order.phone}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال هاتفي</span>
              </a>
            </div>
          </div>

          {/* Assignment & Operational Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <Clock className="w-4 h-4 text-primary-600" />
              التشغيل وإدارة الطلب
            </h3>

            {/* Assigned Person */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                الموظف أو المنفّذ المسؤول:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="مثال: أحمد (مصمم) أو استوديو الصوت..."
                  className="flex-1 p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-hidden"
                />
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={saveNotesAndAssignment}
                  className="p-2 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-950/40 rounded-xl"
                  title="حفظ المسؤول"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Timestamps */}
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

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="صورة مكبرة"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 left-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
