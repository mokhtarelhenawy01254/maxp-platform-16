import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Save, ArrowRight, Star, User, Info, AlertCircle } from "lucide-react";
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";

// Types
type FeedbackFormData = {
  toEmployeeId: string;
  type: string;
  category: string;
  content: string;
  rating: number;
  isAnonymous: boolean;
};

const CreateFeedback = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const isPersonal = window.location.pathname.startsWith("/my-feedback");
  const isHR = window.location.pathname.startsWith("/hr");
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEdit);
  const [hoverRating, setHoverRating] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    defaultValues: {
      toEmployeeId: isPersonal ? "management" : "",
      type: isPersonal ? "SUGGESTION" : "PEER",
      category: "",
      content: "",
      rating: 0,
      isAnonymous: false,
    },
  });

  const currentRating = watch("rating");
  const selectedEmployeeId = watch("toEmployeeId");
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await api.get("/hr/employees");
        setEmployees(empRes.data.employees || []);

        if (isEdit) {
          const fbRes = await api.get(`/hr/feedback/${id}`);
          const currentFB = fbRes.data.feedback;

          if (currentFB) {
            setValue("toEmployeeId", currentFB.toUserId || "management");
            setValue("type", currentFB.type);
            setValue("category", currentFB.category || "");
            setValue("content", currentFB.content);
            setValue("rating", currentFB.rating || 0);
            setValue("isAnonymous", currentFB.isAnonymous);
          } else {
            tToast.error("hr_CreateFeedback.msg_ad77");
            navigate("/my-feedback");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        tToast.error("hr_CreateFeedback.failed_load_cfaf");
      } finally {
        setFetchingData(false);
      }
    };
    fetchData();
  }, [id, isEdit, setValue, navigate]);

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      const isReviewType = ["PEER", "MANAGER", "SUBORDINATE"].includes(data.type);
      if (isReviewType && data.rating === 0) {
        tToast.error("hr_CreateFeedback.msg_79e3");
        return;
      }
      setLoading(true);
      const payload = {
        ...data,
        toUserId: data.toEmployeeId === "management" ? null : data.toEmployeeId,
        rating: isReviewType ? Number(data.rating) : null,
      };

      if (isEdit) {
        await api.put(`/hr/feedback/${id}`, payload);
        tToast.success("hr_CreateFeedback.success_update_293e");
      } else {
        await api.post("/hr/feedback", payload);
        tToast.success("hr_CreateFeedback.msg_1de5");
      }
      navigate("/my-feedback");
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error(
        isEdit
          ? "فشل في تحديث البيانات"
          : "فشل في عملية الإرسال",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(isPersonal ? "/my-feedback" : "/hr/feedback")}
            className="rounded-full shadow-sm hover:bg-muted"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isEdit ? "تعديل الرسالة" : "إرسال شكوى أو اقتراح"}
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {isEdit
                ? "قم بتحديث تفاصيل رسالتك المرسلة"
                : isPersonal
                  ? "تعبيرك عن رأيك يساعدنا على تحسين بيئة العمل"
                  : "تواصل مع الإدارة أو شارك تقييمك لزملائك بكل شفافية"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm border-t border-white/5">
            <CardHeader className="bg-muted/50 border-b dark:border-white/5">
              <CardTitle className="text-xl flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                تفاصيل الرسالة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  {/* To Employee - Hide for personal mode as it defaults to management */}
                  {!isPersonal ? (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">
                        الموظف المستهدف
                      </Label>
                      <Controller
                        name="toEmployeeId"
                        control={control}
                        rules={{ required: "يجب اختيار الموظف" }}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger className="h-12 bg-gray-50/30">
                              <SelectValue placeholder="اختر الموظف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="management">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                      HQ
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-bold">الإدارة (الشركة)</span>
                                </div>
                              </SelectItem>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-[10px]">
                                        {emp.firstName?.[0] || ""}
                                        {emp.lastName?.[0] || ""}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>
                                      {emp.firstName} {emp.lastName}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.toEmployeeId && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{" "}
                          {errors.toEmployeeId.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">HQ</div>
                        <div>
                          <p className="text-sm font-bold">جهة الإرسال</p>
                          <p className="text-xs text-muted-foreground">الإدارة العامة للشركة</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white">رسالة رسمية</Badge>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">
                        نوع الرسالة
                      </Label>
                      <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <SelectTrigger className="h-12 bg-muted/30 border-muted-foreground/20">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SUGGESTION">اقتراح</SelectItem>
                              <SelectItem value="COMPLAINT">شكوى</SelectItem>
                              <SelectItem value="INQUIRY">استفسار</SelectItem>
                              {!isPersonal && (
                                <>
                                  <SelectItem value="PEER">تقييم زميل</SelectItem>
                                  <SelectItem value="MANAGER">تقييم مدير</SelectItem>
                                  <SelectItem value="SUBORDINATE">تقييم مرؤوس</SelectItem>
                                </>
                              )}
                              <SelectItem value="OTHER">آخر</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="category"
                        className="text-base font-semibold"
                      >
                        التصنيف (اختياري)
                      </Label>
                      <Input
                        id="category"
                        placeholder="مثال: أداء، سلوك، تعاون..."
                        className="h-12 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
                        {...register("category")}
                      />
                    </div>
                  </div>

                  {/* Rating - Only show for HR mode and specific types */}
                  {!isPersonal && ["PEER", "MANAGER", "SUBORDINATE"].includes(watch("type")) && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-base font-semibold">
                        التقييم
                      </Label>
                      <div className="flex items-center gap-2 bg-muted/20 p-4 rounded-xl border border-dashed border-muted-foreground/30">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className="transition-transform active:scale-90"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setValue("rating", star)}
                          >
                            <Star
                              className={`h-10 w-10 transition-colors ${(hoverRating || currentRating) >= star
                                ? "fill-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                                : "text-muted-foreground/30"
                                }`}
                            />
                          </button>
                        ))}
                        <span className="mr-4 font-bold text-xl text-yellow-600 dark:text-yellow-400">
                          {currentRating > 0
                            ? currentRating
                            : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="content"
                      className="text-base font-semibold"
                    >
                      رسالتك
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="اكتب ملاحظاتك بشكل بناء ومفيد..."
                      className="min-h-[150px] bg-muted/30 border-muted-foreground/20 focus:bg-background resize-none transition-colors"
                      {...register("content", { required: "المحتوى مطلوب" })}
                    />
                    {errors.content && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{" "}
                        {errors.content.message}
                      </p>
                    )}
                  </div>

                  {/* Anonymous */}
                  <div className="flex items-center space-x-3 space-x-reverse p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <Controller
                      name="isAnonymous"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isAnonymous"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-6 w-6"
                        />
                      )}
                    />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="isAnonymous"
                        className="text-base font-bold cursor-pointer"
                      >
                        إرسال كمجهول الهوية
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        لن يتم عرض اسمك للموظف المتلقي
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="w-full sm:w-auto h-12 px-10 shadow-lg"
                  >
                    {loading ? (
                      "جاري الحفظ..."
                    ) : (
                      <>
                        <Save className="h-5 w-5 ml-2" />
                        {isEdit
                          ? "تحديث التغذية الراجعة"
                          : "إرسال التغذية الراجعة"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-primary/20 to-primary/5 border-t border-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-primary">
                إرشادات التغذية الراجعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/80 leading-relaxed">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <p>كن محدداً في ملاحظاتك واذكر أمثلة واقعية.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <p>ركز على السلوكيات والأداء وليس الشخصية.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <p>قدم نصائح عملية للتحسين المستقبلي.</p>
              </div>
            </CardContent>
          </Card>

          {selectedEmployee && (
            <Card className="border-none shadow-lg animate-in fade-in zoom-in duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                  الموظف المختار
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {selectedEmployee.firstName?.[0] || ""}
                    {selectedEmployee.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position?.title || "موظف"}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {selectedEmployee.department?.name || "بدون قسم"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateFeedback;
