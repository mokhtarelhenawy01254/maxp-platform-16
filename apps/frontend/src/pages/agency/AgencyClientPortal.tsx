import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  MessageSquare,
  Calendar,
  Share2,
  Briefcase,
  ExternalLink,
  Loader2
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";

interface PublicApprovalData {
  id: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  copyText?: string;
  channel: string;
  status: "pending" | "approved" | "changes_requested";
  feedback?: string;
  scheduledDate?: string;
  createdAt: string;
  clientName: string;
  agencyName: string;
}

export default function AgencyClientPortal() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicApprovalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittedAction, setSubmittedAction] = useState<"approved" | "changes_requested" | null>(null);

  const fetchApproval = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/agency/public-approval/${token}`);
      if (res.data?.success && res.data.data) {
        const raw = res.data.data;
        const app = raw.approval || raw;
        const agency = raw.agency || {};
        const normalizedStatus = (app.status || "pending").toLowerCase();
        setData({
          id: app.id,
          title: app.title,
          description: app.description || "",
          mediaUrl: app.creativeUrl || app.mediaUrl,
          copyText: app.copyText,
          channel: app.platform || app.channel || "social",
          status: normalizedStatus === "approved" ? "approved" : normalizedStatus === "changes_requested" ? "changes_requested" : "pending",
          feedback: app.clientFeedback || app.feedback,
          scheduledDate: app.deadline || app.scheduledDate,
          createdAt: app.createdAt,
          clientName: app.clientName || "العميل",
          agencyName: agency.agencyName || "وكالة التسويق"
        });
        if (normalizedStatus === "approved" || normalizedStatus === "changes_requested") {
          setSubmittedAction(normalizedStatus);
        }
      } else {
        setError(res.data?.message || "طلب الموافقة غير موجود أو منتهي الصلاحية.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "تعذر تحميل تفاصيل طلب الموافقة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproval();
  }, [token]);

  const handleAction = async (action: "approve" | "request_changes") => {
    if (action === "request_changes" && !feedbackText.trim()) {
      toast.error("يرجى كتابة ملاحظاتك والتعديلات المطلوبة");
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiClient.post(`/agency/public-approval/${token}`, {
        action: action === "approve" ? "APPROVED" : "CHANGES_REQUESTED",
        feedback: feedbackText.trim() || undefined
      });

      if (res.data?.success) {
        if (action === "approve") {
          toast.success("تم تأكيد موافقتك على المحتوى بنجاح! شكراً لك.");
          setSubmittedAction("approved");
        } else {
          toast.success("تم إرسال ملاحظاتك إلى فريق الوكالة لتعديل التصميم.");
          setSubmittedAction("changes_requested");
        }
        fetchApproval();
      } else {
        toast.error(res.data?.message || "فشل تنفيذ الإجراء.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إرسال استجابتك.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
        <Loader2 className="size-10 text-primary animate-spin mb-3" />
        <p className="text-sm font-bold text-muted-foreground">جاري تحميل مسودة المحتوى للمعاينة...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border shadow-md text-center space-y-4">
          <AlertCircle className="size-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black">عفواً، تعذر الوصول لطلب الموافقة</h2>
          <p className="text-sm text-muted-foreground">{error || "الرابط غير صحيح أو تم حذفه."}</p>
        </div>
      </div>
    );
  }

  const channelLabels: Record<string, string> = {
    facebook: "فيسبوك",
    instagram: "إنستجرام",
    tiktok: "تيك توك",
    snapchat: "سناب شات",
    google: "إعلانات جوجل"
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="bg-card rounded-2xl p-6 border border-border/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Briefcase className="size-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-primary tracking-wider">بوابة موافقات عملاء الوكالة</p>
              <h1 className="text-xl font-black text-foreground">{data.agencyName || "وكالة التسويق"}</h1>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground font-bold">العميل المعتمد</p>
            <p className="text-sm font-black text-foreground">{data.clientName}</p>
          </div>
        </div>

        {/* Status Notification Banner */}
        {submittedAction === "approved" ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="size-6 shrink-0" />
            <div>
              <p className="font-black text-sm">تم اعتماد هذا المحتوى بنجاح!</p>
              <p className="text-xs">سيبدأ فريق الوكالة في جدولة ونشر هذا الإعلان/التصميم طبقاً للموعد المحدد.</p>
            </div>
          </div>
        ) : submittedAction === "changes_requested" ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-400 flex items-center gap-3">
            <Clock className="size-6 shrink-0" />
            <div>
              <p className="font-black text-sm">تم إرسال طلب التعديل إلى فريق الوكالة</p>
              <p className="text-xs">فريق التصميم وصناعة المحتوى يقوم بمراجعة ملاحظاتك الآن لتحديث المسودة.</p>
            </div>
          </div>
        ) : null}

        {/* Main Creative Card */}
        <Card className="border-border/60 shadow-md overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 font-black text-xs">
                    {channelLabels[data.channel] || data.channel}
                  </Badge>
                  {data.scheduledDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                      <Calendar className="size-3.5" />
                      تاريخ النشر: {data.scheduledDate}
                    </span>
                  )}
                </div>
                <CardTitle className="text-xl font-black text-foreground">{data.title}</CardTitle>
              </div>

              <Badge
                className={`text-xs font-black ${
                  data.status === "approved"
                    ? "bg-emerald-600 text-white"
                    : data.status === "changes_requested"
                    ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {data.status === "approved"
                  ? "معتمد وموافق عليه"
                  : data.status === "changes_requested"
                  ? "مطلوب تعديلات"
                  : "بانتظار موافقتك"}
              </Badge>
            </div>
            {data.description && (
              <CardDescription className="text-xs font-medium mt-1">
                {data.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Visual Media Preview */}
            {data.mediaUrl ? (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-muted-foreground">معاينة التصميم / الفيديو:</p>
                <div className="rounded-2xl overflow-hidden border border-border/50 bg-black/5 max-h-[480px] flex items-center justify-center">
                  <img
                    src={data.mediaUrl}
                    alt={data.title}
                    className="w-full h-auto max-h-[480px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Ad Copy / Caption */}
            {data.copyText && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-muted-foreground">نص الإعلان / الكابشن (Ad Copy):</p>
                <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl text-sm leading-relaxed whitespace-pre-line font-medium text-foreground">
                  {data.copyText}
                </div>
              </div>
            )}

            {/* Feedback History if any */}
            {data.feedback && (
              <div className="p-4 bg-rose-500/10 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1">
                <p className="font-black text-[11px]">ملاحظات التعديل المسجلة سابقاً:</p>
                <p>{data.feedback}</p>
              </div>
            )}

            {/* Action Buttons */}
            {data.status === "pending" && (
              <div className="pt-4 border-t border-border/40 space-y-4">
                {!showFeedbackBox ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto flex-1 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 h-12 rounded-xl"
                      onClick={() => handleAction("approve")}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="size-5 ml-2" />
                      الموافقة على التصميم والمحتوى
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto font-black text-rose-600 border-rose-200 hover:bg-rose-50 h-12 rounded-xl"
                      onClick={() => setShowFeedbackBox(true)}
                      disabled={actionLoading}
                    >
                      <MessageSquare className="size-5 ml-2" />
                      طلب تعديلات على المسودة
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/60">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-foreground">اكتب ملاحظاتك وتعديلاتك لفريق الوكالة:</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFeedbackBox(false)}
                        className="text-xs"
                      >
                        إلغاء
                      </Button>
                    </div>
                    <Textarea
                      placeholder="مثال: يرجى تغيير لون الخلفية وتعديل السعر المكتوب إلى 500 بدل 450..."
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="rounded-xl"
                    />
                    <Button
                      className="w-full font-black bg-rose-600 hover:bg-rose-700 text-white h-11 rounded-xl"
                      onClick={() => handleAction("request_changes")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="size-4 animate-spin ml-2" />
                      ) : (
                        <Send className="size-4 ml-2" />
                      )}
                      إرسال التعديلات المطلوبة
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>تم إرسال هذا الرابط الآمن عبر نظام إدارة وكالات التسويق MaxP Platform</p>
        </div>
      </div>
    </div>
  );
}
