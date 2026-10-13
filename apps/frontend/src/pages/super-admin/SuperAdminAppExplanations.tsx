import React, { useState, useEffect } from "react";
import i18n from "../../i18n";
import {
  Plus,
  Edit2,
  Trash2,
  Video,
  FileText,
  Lock,
  BookOpen,
  Sparkles,
  Layers,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  targetRoute: string;
  videoUrl: string | null;
  videoUrlMobile: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
}

const ROUTE_OPTIONS = [
  { value: "/company-dashboard", label: "لوحة التحكم الرئيسية" },
  { value: "/products", label: "المنتجات" },
  { value: "/orders", label: "الطلبات" },
  { value: "/customers", label: "العملاء" },
  { value: "/conversations", label: "المحادثات" },
  { value: "/broadcast", label: "الحملات والرسائل" },
  { value: "/invoices", label: "الفواتير" },
  { value: "/settings", label: "الإعدادات" },
  { value: "/facebook-inbox", label: "رسائل فيسبوك" },
  { value: "/affiliates", label: "الإحالات والمسوقين" },
  { value: "/coupons", label: "الكوبونات" },
  { value: "/marketplace", label: "متجر التطبيقات" },
  { value: "/wallet", label: "المحفظة" },
  { value: "/analytics", label: "التحليلات" },
  { value: "/hr", label: "الموارد البشرية" },
  { value: "/hr/attendance", label: "الحضور والانصراف" },
  { value: "/whatsapp", label: "واتساب للأعمال" },
  { value: "/advertising", label: "الإعلانات" },
  { value: "/shipping", label: "الشحن والتوصيل" },
  { value: "/returns", label: "المرتجعات" },
  { value: "/procurement", label: "المشتريات" },
  { value: "/tools", label: "أدوات التسويق" },
  { value: "/inventory", label: "المخزون" },
  { value: "/academy", label: "أكاديمية ماكس بي" },
  { value: "/support", label: "الدعم" },
  { value: "/tasks", label: "المهام" },
];

const SuperAdminAppExplanations: React.FC = () => {
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noPermission, setNoPermission] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [useCustomRoute, setUseCustomRoute] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    slug: "",
    targetRoute: "",
    videoUrl: "",
    videoUrlMobile: "",
    isActive: true,
    order: 0,
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchExplanations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/app-explanations/admin");
      const data = res.data as any;
      if (data.success) {
        setExplanations(data.explanations || []);
      }
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        setNoPermission(true);
        setError(null);
      } else {
        setError(err.response?.data?.message || "فشل في جلب الشروحات");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanations();
  }, []);

  const getRouteLabel = (route: string) => {
    const found = ROUTE_OPTIONS.find((r) => r.value === route);
    return found ? found.label : route || "كل الصفحات";
  };

  const handleOpenDialog = (exp?: AppExplanation) => {
    if (exp) {
      setEditMode(true);
      setCurrentId(exp.id);
      const isCustom = !ROUTE_OPTIONS.find((r) => r.value === exp.targetRoute);
      setUseCustomRoute(isCustom && exp.targetRoute !== "");
      setFormData({
        title: exp.title,
        content: exp.content,
        slug: exp.slug,
        targetRoute: exp.targetRoute,
        videoUrl: exp.videoUrl || "",
        videoUrlMobile: exp.videoUrlMobile || "",
        isActive: exp.isActive,
        order: exp.order,
      });
    } else {
      setEditMode(false);
      setCurrentId(null);
      setUseCustomRoute(false);
      setFormData({
        title: "",
        content: "",
        slug: "",
        targetRoute: "",
        videoUrl: "",
        videoUrlMobile: "",
        isActive: true,
        order: 0,
      });
    }
    setSubmitError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseInt(value) || 0
            : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      setSubmitError(null);

      if (editMode && currentId) {
        await apiClient.put(`/app-explanations/admin/${currentId}`, formData);
        toast.success("تم تحديث الشرح بنجاح");
      } else {
        await apiClient.post("/app-explanations/admin", formData);
        toast.success("تمت إضافة الشرح بنجاح");
      }

      setOpenDialog(false);
      fetchExplanations();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الشرح؟")) return;
    try {
      await apiClient.delete(`/app-explanations/admin/${id}`);
      toast.success("تم حذف الشرح بنجاح");
      fetchExplanations();
    } catch (err) {
      console.error(err);
      toast.error(i18n.t("SuperAdminAppExplanations.error_error_62e5") || "حدث خطأ أثناء الحذف");
    }
  };

  if (loading && explanations.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (noPermission) {
    return (
      <div className="w-full p-6" dir="rtl">
        <div className="max-w-md mx-auto mt-16 text-center space-y-3">
          <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 w-fit mx-auto">
            <Lock className="size-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">هذه الصفحة متاحة لمدير النظام فقط</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            إذا كنت بحاجة لصلاحيات إدارة شروحات التطبيقات، يرجى التواصل مع الإدارة الفنية.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = explanations.filter((e) => e.isActive).length;
  const videoCount = explanations.filter((e) => e.videoUrl).length;

  return (
    <div className="w-full space-y-4 p-4 md:p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Control Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              شرح التطبيقات والشاشات
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              In-App Guides
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            إدارة الشروحات والفيديوهات المدمجة التي تظهر للتجار في الشريط العلوي لكل صفحة
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()} className="gap-1.5 text-xs md:text-sm">
          <Plus className="size-4" />
          إضافة شرح جديد
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card overflow-hidden divide-y md:divide-y-0 divide-x md:divide-x-reverse divide-border shadow-xs">
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي الشروحات</span>
            <BookOpen className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
            {explanations.length}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>الشروحات النشطة</span>
            <CheckCircle2 className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span>شروحات الفيديو</span>
            <Video className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-primary">
            {videoCount}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>شروحات نصية</span>
            <FileText className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
            {explanations.length - videoCount}
          </p>
        </div>
      </div>

      {/* Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              قائمة الأدلة والشروحات المسجلة
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {explanations.length} شرح
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-xs md:text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  العنوان
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  المسار المستهدف
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  النوع
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  الترتيب
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  الحالة
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-24">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {explanations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-xs">
                    لا توجد شروحات مسجلة بعد. اضغط على "إضافة شرح جديد" للبدء.
                  </td>
                </tr>
              ) : (
                explanations.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{exp.title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{exp.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-border bg-background text-foreground">
                        {getRouteLabel(exp.targetRoute)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {exp.videoUrl ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <Video className="size-3" /> فيديو
                          </span>
                          {exp.videoUrlMobile && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Smartphone className="size-2.5" /> 9:16
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                          <FileText className="size-3" /> نص
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-foreground font-semibold">
                      {exp.order}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          exp.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {exp.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenDialog(exp)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(exp.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editMode ? "تعديل الشرح" : "إضافة شرح جديد"}
            </DialogTitle>
          </DialogHeader>

          {submitError && (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 py-2 text-xs md:text-sm">
            <div>
              <Label className="text-xs font-medium">العنوان (يظهر كزر في الشريط العلوي للتاجر)</Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="مثال: كيفية إنشاء منتج بسيط"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">الرابط التعريفي (slug) بالإنجليزية وبدون مسافات</Label>
              <Input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                placeholder="مثال: create-simple-product"
                className="mt-1 font-mono text-xs"
              />
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">الصفحة المستهدفة</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useCustomRoute}
                    onCheckedChange={(checked) => {
                      setUseCustomRoute(checked);
                      if (!checked) {
                        setFormData((prev) => ({ ...prev, targetRoute: "" }));
                      }
                    }}
                  />
                  <Label className="text-xs text-muted-foreground">مسار مخصص</Label>
                </div>
              </div>

              {useCustomRoute ? (
                <div>
                  <Input
                    name="targetRoute"
                    value={formData.targetRoute}
                    onChange={handleChange}
                    placeholder="/products/add"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">اكتب المسار تماماً كما يظهر في شريط المتصفح</p>
                </div>
              ) : (
                <Select
                  value={formData.targetRoute}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, targetRoute: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر الصفحة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— كل الصفحات —</SelectItem>
                    {ROUTE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">رابط الفيديو الأفقي (YouTube / CDN)</Label>
                <Input
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">رابط فيديو الموبايل الرأسي 9:16 (Shorts)</Label>
                <Input
                  name="videoUrlMobile"
                  value={formData.videoUrlMobile}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/shorts/..."
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">الترتيب في القائمة</Label>
              <Input
                name="order"
                type="number"
                value={formData.order}
                onChange={handleChange}
                className="mt-1 font-mono text-xs w-32"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">محتوى الشرح (نص عادي أو HTML)</Label>
              <Textarea
                name="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={5}
                required
                className="mt-1 font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                يظهر كنص رئيسي أو ملخص أسفل الفيديو عند تشغيله
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label className="text-xs font-medium">مفعّل ويظهر في لوحة التاجر</Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDialog} className="text-xs">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitLoading ||
                !formData.title.trim() ||
                !formData.slug.trim() ||
                !formData.content.trim()
              }
              className="text-xs"
            >
              {submitLoading ? <LoadingSpinner size="sm" /> : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminAppExplanations;