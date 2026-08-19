import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, AlertTriangle, ArrowRight, Calendar, Check, CheckCircle, File, FileText, User, X, XCircle } from 'lucide-react';
import { toast } from "sonner";
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";

const DecisionResignation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isApprove = location.pathname.endsWith("/approve");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resignation, setResignation] = useState<any>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchResignation();
  }, [id]);

  const fetchResignation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/resignations/${id}`);
      setResignation(response.data.resignation);
    } catch (error) {
      console.error("Error fetching resignation:", error);
      toast.error("فشل في تحميل بيانات الاستقالة");
      navigate("/hr/resignations");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    try {
      setSubmitting(true);
      await api.put(`/hr/resignations/${id}`, {
        status,
        reason: status === "REJECTED" ? notes : resignation.reason,
        exitInterview: isApprove ? notes : resignation.exitInterview,
      });

      toast.success(
        status === "APPROVED"
          ? "تمت الموافقة على الاستقالة بنجاح"
          : "تم رفض الاستقالة",
      );
      navigate("/hr/resignations");
    } catch (error: any) {
      console.error("Error updating resignation:", error);
      toast.error(error.response?.data?.error || "حدث خطأ أثناء معالجة الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  if (!resignation)
    return (
      <div className="p-8 text-center text-destructive">
        الاستقالة غير موجودة
      </div>
    );

  return (
    <div className="p-6 w-full max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/hr/resignations")}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
            )}
            {isApprove ? "الموافقة على الاستقالة" : "رفض الاستقالة"}
          </h1>
          <p className="text-muted-foreground mt-1">
            مراجعة تفاصيل طلب الاستقالة المقدم من الموظف
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employee Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              بيانات الموظف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center py-4 bg-muted rounded-lg">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-bold text-lg">
                {resignation.employee?.firstName}{" "}
                {resignation.employee?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {resignation.employee?.employeeNumber}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">القسم:</span>
                <span className="font-medium">
                  {resignation.employee?.department?.name || "غير محدد"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المسمى الوظيفي:</span>
                <span className="font-medium">
                  {resignation.employee?.position?.title || "غير محدد"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resignation Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              تفاصيل الاستقالة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">
                  تاريخ تقديم الاستقالة
                </Label>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  {new Date(resignation.resignationDate).toLocaleDateString(
                    "ar-EG",
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">آخر يوم عمل</Label>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-destructive" />
                  {new Date(resignation.lastWorkingDay).toLocaleDateString(
                    "ar-EG",
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">فترة الإشعار</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {resignation.noticePeriodDays} يوم
                </Badge>
                <p className="text-xs text-muted-foreground">
                  التاريخ المتوقع:{" "}
                  {new Date(resignation.expectedLastDay).toLocaleDateString(
                    "ar-EG",
                  )}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground">سبب الاستقالة</Label>
              <div className="p-3 bg-muted rounded-lg text-sm italic">
                "{resignation.reason || "لا يوجد سبب مذكور"}"
              </div>
            </div>

            {/* Admin Decision Note */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="notes">
                  {isApprove
                    ? "ملاحظات الموافقة (Exit Interview Notes)"
                    : "سبب الرفض"}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={
                    isApprove
                      ? "أضف ملاحظات مقابلة الخروج هنا..."
                      : "يرجى ذكر سبب الرفض..."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px]"
                />
                {isApprove && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    سيتم تفعيل قائمة إخلاء الطرف تلقائياً بعد الموافقة.
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                {isApprove ? (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                    onClick={() => handleDecision("APPROVED")}
                    disabled={submitting}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تأكيد الموافقة
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    onClick={() => handleDecision("REJECTED")}
                    disabled={submitting || !notes.trim()}
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    تأكيد الرفض
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/hr/resignations")}
                  disabled={submitting}
                >
                  إلغاء الرجوع
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DecisionResignation;
