import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import AcademyCourseCheckoutModal from "./AcademyCourseCheckoutModal";
import { ModuleItem } from "./components/CourseCurriculumAccordion";
import { VisitorCourseLanding } from "./components/VisitorCourseLanding";
import { EnrolledCourseCockpit } from "./components/EnrolledCourseCockpit";

interface CourseOutline {
  course: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    freePreviewLessons: number;
    thumbnailUrl?: string | null;
    storeProductId?: string | null;
    storeProduct?: { id: string; name?: string; price?: number } | null;
  };
  isEnrolled: boolean;
  enrollmentId?: string | null;
  certificate?: { id: string } | null;
  modules: ModuleItem[];
}

const FALLBACK_COURSE_ID = "cmuzmwaxs07r2juml2v04xon5";

const AcademyCoursePublicPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentPhone, setStudentPhone] = useState<string | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<{
    type: "success" | "error";
    message: string;
    actionUrl?: string;
    actionText?: string;
  } | null>(null);

  // Subdomain redirect check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host === "maxp.online" || host === "www.maxp.online") {
        const targetId = courseId || FALLBACK_COURSE_ID;
        window.location.replace(
          `https://max-p.maxp.online/portal/course/${targetId}${window.location.search}`
        );
      }
    }
  }, [courseId]);

  // Read local student session
  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("studentToken")));
    setStudentName(localStorage.getItem("studentName"));
    setStudentPhone(localStorage.getItem("studentPhone"));
  }, []);

  const fetchOutline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = courseId || FALLBACK_COURSE_ID;
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = {};
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/courses/${targetId}/outline`, { headers });
      const data = await res.json();
      if (data.success && data.course) {
        setOutline(data);
      } else {
        setError(data.error || "تعذر تحميل بيانات الكورس");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل بيانات الكورس");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Payment Verification Callback from Kashier
  useEffect(() => {
    const orderNumber = searchParams.get("orderNumber");
    const paymentSuccess = searchParams.get("paymentSuccess");
    const targetId = courseId || FALLBACK_COURSE_ID;

    if (orderNumber && paymentSuccess === "1") {
      const verifyPayment = async () => {
        try {
          const res = await fetch(`/api/v1/academy/courses/${targetId}/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber }),
          });
          const data = await res.json();
          if (data.success && data.verified) {
            if (data.student?.phone) localStorage.setItem("studentPhone", data.student.phone);
            if (data.student?.name) localStorage.setItem("studentName", data.student.name);

            const phoneParam = data.student?.phone ? encodeURIComponent(data.student.phone) : "";
            setPaymentBanner({
              type: "success",
              message: "تم تأكيد الدفع وتفعيل اشتراكك بنجاح! سجّل دخولك الآن للبدء.",
              actionUrl: phoneParam ? `/portal/login?phone=${phoneParam}` : "/portal/login",
              actionText: "تسجيل الدخول الآن",
            });
            await fetchOutline();
          } else {
            setPaymentBanner({
              type: "error",
              message:
                (data.message || "لم يتم تأكيد السداد بعد من بوابة الدفع.") +
                " لو تم الخصم، تتحدث الحالة تلقائياً خلال دقائق.",
            });
          }
        } catch (e: any) {
          setPaymentBanner({
            type: "error",
            message: e.message || "حدث خطأ أثناء التحقق من الدفع.",
          });
        }
      };
      verifyPayment();
    } else if (orderNumber && paymentSuccess && paymentSuccess !== "1") {
      setPaymentBanner({
        type: "error",
        message: "لم تكتمل عملية الدفع. لم يتم خصم أي مبلغ — يمكنك إعادة المحاولة في أي وقت.",
        actionUrl: `/portal/course/${targetId}`,
        actionText: "إعادة المحاولة",
      });
      fetchOutline();
    } else {
      fetchOutline();
    }
  }, [courseId, searchParams, fetchOutline]);

  const handleShareCourse = () => {
    const targetId = outline?.course?.id || courseId;
    const shareUrl = `${window.location.origin}/portal/course/${targetId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">جاري تجهيز صفحة الكورس والمنهج...</span>
      </div>
    );
  }

  if (error || !outline) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-8 rounded-3xl text-center space-y-3">
        <p className="font-bold text-base">{error || "لم يتم العثور على الكورس المطلوب"}</p>
        <Link to="/portal/catalog" className="inline-block text-xs font-bold text-rose-900 underline">
          العودة لكتالوج الكورسات
        </Link>
      </div>
    );
  }

  const course = outline.course;
  const modules = Array.isArray(outline.modules) ? outline.modules : [];
  const isEnrolled = Boolean(outline.isEnrolled);
  const flatLessonsAll = modules.flatMap((m) => m.lessons || []);
  const firstLesson = flatLessonsAll[0] || null;
  const totalLessons = flatLessonsAll.length;
  const freeLessons = course?.freePreviewLessons ?? 0;

  return (
    <div className="space-y-6">
      {/* Kashier Payment Feedback Banner */}
      {paymentBanner && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-bold ${
            paymentBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {paymentBanner.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{paymentBanner.message}</span>
          </div>
          {paymentBanner.actionUrl && (
            <Link
              to={paymentBanner.actionUrl}
              className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-2xs ${
                paymentBanner.type === "success"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <span>{paymentBanner.actionText || "تسجيل الدخول"}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Conditional View: Enrolled Student Cockpit VS Visitor/Unenrolled Landing */}
      {isEnrolled ? (
        <EnrolledCourseCockpit
          course={course}
          modules={modules}
          totalLessons={totalLessons}
          certificate={outline.certificate}
          enrollmentId={outline.enrollmentId}
          copiedShare={copiedShare}
          onShare={handleShareCourse}
        />
      ) : (
        <VisitorCourseLanding
          course={course}
          modules={modules}
          totalLessons={totalLessons}
          freeLessons={freeLessons}
          firstLesson={firstLesson}
          isLoggedIn={isLoggedIn}
          studentName={studentName}
          studentPhone={studentPhone}
          copiedShare={copiedShare}
          onShare={handleShareCourse}
          onCheckout={() => setCheckoutOpen(true)}
          storeProductId={course.storeProductId}
        />
      )}

      {/* Checkout Modal for paid course enrollment */}
      <AcademyCourseCheckoutModal
        courseId={course.id}
        courseTitle={course.title}
        price={course.price}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => {
          setOutline((prev) => (prev ? { ...prev, isEnrolled: true } : prev));
        }}
      />
    </div>
  );
};

export default AcademyCoursePublicPage;
