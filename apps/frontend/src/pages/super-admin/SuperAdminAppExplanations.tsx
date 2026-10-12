import React, { useState, useEffect } from "react";
import i18n from "../../i18n";
import {
    Plus,
    Edit,
    Delete,
    PlayCircle as VideoIcon,
    FileText as TextIcon,
} from "lucide-react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface AppExplanation {
    id: string;
    title: string;
    content: string;
    slug: string;
    targetRoute: string;
    videoUrl: string | null;
    /** نسخة الموبايل الرأسية (9:16) */
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
                setExplanations(data.explanations);
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
        return found ? found.label : route || "—";
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
            } else {
                await apiClient.post("/app-explanations/admin", formData);
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
            fetchExplanations();
        } catch (err) {
            console.error(err);
            alert(i18n.t("SuperAdminAppExplanations.error_error_62e5"));
        }
    };

    if (loading && explanations.length === 0) {
        return (
            <div className="p-3 flex justify-center">
                <LoadingSpinner size="md" />
            </div>
        );
    }

    // عدم الصلاحية (403/401 من السيرفر): رسالة واحدة واضحة بدون أي عناصر إدارة
    if (noPermission) {
        return (
            <div className="p-3 rtl">
                <div className="max-w-md mx-auto mt-16 text-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <h1 className="text-xl font-bold mb-2">الصفحة دي لمدير النظام فقط</h1>
                    <p className="text-sm text-muted-foreground">
                        لو محتاج صلاحيات إدارة الشروحات، تواصل مع مدير النظام.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 rtl">
            <div className="flex justify-between mb-3">
                <div>
                    <h1 className="text-2xl font-bold">شرح التطبيقات</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        أضف شروحات وفيديوهات تظهر للتاجر في الشريط العلوي بناءً على الصفحة التي يزورها
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="size-4" />
                    إضافة شرح جديد
                </Button>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-3">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-xl border bg-card text-card-foreground">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>العنوان</TableHead>
                            <TableHead>يظهر في صفحة</TableHead>
                            <TableHead>النوع</TableHead>
                            <TableHead>الترتيب</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {explanations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                    لا توجد شروحات مضافة بعد
                                </TableCell>
                            </TableRow>
                        ) : (
                            explanations.map((exp) => (
                                <TableRow key={exp.id}>
                                    <TableCell>{exp.title}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{getRouteLabel(exp.targetRoute)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {exp.videoUrl ? (
                                            <Badge variant="outline" className="text-destructive border-destructive/30">
                                                <VideoIcon className="size-3" /> فيديو
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">
                                                <TextIcon className="size-3" /> نص
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{exp.order}</TableCell>
                                    <TableCell>
                                        <Badge variant={exp.isActive ? "default" : "secondary"}>{exp.isActive ? "نشط" : "غير نشط"}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(exp)}>
                                            <Edit className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                                            <Delete className="size-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editMode ? "تعديل الشرح" : "إضافة شرح جديد"}</DialogTitle>
                    </DialogHeader>
                    {submitError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="flex flex-col gap-2.5 pt-1">
                        <div>
                            <Label>العنوان (يظهر كزر في الشريط العلوي للتاجر)</Label>
                            <Input name="title" value={formData.title} onChange={handleChange} required placeholder="مثال: كيفية إنشاء منتج بسيط" />
                        </div>
                        <div>
                            <Label>الرابط التعريفي (slug) بالانجليزية وبدون مسافات</Label>
                            <Input name="slug" value={formData.slug} onChange={handleChange} required placeholder="مثال: create-simple-product" />
                        </div>

                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <Label className="font-bold text-sm">يظهر في أي صفحة؟</Label>
                                <div className="flex items-center gap-2">
                                    <Switch size="sm" checked={useCustomRoute} onCheckedChange={(checked) => {
                                        setUseCustomRoute(checked);
                                        if (!checked) {
                                            setFormData((prev) => ({ ...prev, targetRoute: "" }));
                                        }
                                    }} />
                                    <Label>مسار مخصص</Label>
                                </div>
                            </div>
                            {useCustomRoute ? (
                                <div>
                                    <Label>المسار المخصص (مثال: /products/add)</Label>
                                    <Input name="targetRoute" value={formData.targetRoute} onChange={handleChange} placeholder="/products/add" />
                                    <p className="text-xs text-muted-foreground">اكتب المسار بالضبط كما يظهر في شريط العنوان</p>
                                </div>
                            ) : (
                                <div>
                                    <Select value={formData.targetRoute} onValueChange={(value) => setFormData((prev) => ({ ...prev, targetRoute: value }))}>
                                        <SelectTrigger><SelectValue placeholder="اختر الصفحة" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">— كل الصفحات —</SelectItem>
                                            {ROUTE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label} ({opt.value})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label>رابط الفيديو (اختياري - يوتيوب أو أي رابط)</Label>
                            <Input name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." />
                            <p className="text-xs text-muted-foreground">إذا أضفت رابط فيديو، سيظهر أيقونة فيديو بجانب الزر. إذا تركته فارغاً سيظهر كشرح نصي.</p>
                        </div>

                        <div>
                            <Label>رابط فيديو الموبايل — رأسي 9:16 (اختياري)</Label>
                            <Input name="videoUrlMobile" value={formData.videoUrlMobile} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=... (Short رأسي)" />
                            <p className="text-xs text-muted-foreground">لو حطيت رابط هنا، الشرح بيعرض النسخة الرأسية تلقائيًا على الموبايل، وبيظهر زرار تبديل بين نسخة الموبايل واللابتوب.</p>
                        </div>

                        <div>
                            <Label>الترتيب</Label>
                            <Input name="order" type="number" value={formData.order} onChange={handleChange} />
                        </div>

                        <div>
                            <Label>محتوى الشرح (نص أو HTML)</Label>
                            <Textarea name="content" value={formData.content} onChange={handleChange} rows={6} required />
                            <p className="text-xs text-muted-foreground">يظهر عند الضغط على الزر إذا لم يكن هناك فيديو، أو كنص مرافق تحت الفيديو.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))} />
                            <Label>مفعّل ويظهر للتاجر</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>إلغاء</Button>
                        <Button onClick={handleSubmit} disabled={submitLoading || !formData.title || !formData.slug || !formData.content}>
                            {submitLoading ? <LoadingSpinner size="sm" /> : "حفظ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SuperAdminAppExplanations;