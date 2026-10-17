import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  PlayCircle,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Video,
  AlertCircle,
  Share2,
  Check,
} from "lucide-react";
import AcademyCourseCheckoutModal from "./AcademyCourseCheckoutModal";
import { CourseCurriculumAccordion, ModuleItem } from "./components/CourseCurriculumAccordion";
import { CourseFaqSection } from "./components/CourseFaqSection";

interface CourseOutline {
  course: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    freePreviewLessons: number;
  };
  isEnrolled: boolean;
  modules: ModuleItem[];
}

const AcademyCoursePublicPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'error';
    message: string;
    actionUrl?: string;
    actionText?: string;
  } | null>(null);

  const fetchOutline = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = courseId || "cmuzmwaxs07r2juml2v04xon5";
      const studentToken = localStorage.getItem("studentToken") || "";
      const headers: Record<string, string> = {};
      if (studentToken) headers["Authorization"] = `Bearer ${studentToken}`;

      const res = await fetch(`/api/v1/academy/courses/${targetId}/outline`, { headers });
      const data = await res.json();
      if (data.success && data.course) {
        setOutline(data);
      } else {
        setError(data.error || "تعذر تحميل منهج الكورس");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل بيانات الكورس");
    } finally {
      setLoading(false);
    }
  };

  // 1. Verify Payment on return from Kashier gateway
  useEffect(() => {
    const orderNumber = searchParams.get("orderNumber");
    const paymentSuccess = searchParams.get("paymentSuccess");
    const targetId = courseId || "cmuzmwaxs07r2juml2v04xon5";

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
            // 🔒 Security (Round 3): NO token issued upon payment verification. Access is gated by OTP.
            if (data.student?.phone) localStorage.setItem("studentPhone", data.student.phone);
            if (data.student?.name) localStorage.setItem("studentName", data.student.name);

            const phoneParam = data.student?.phone ? encodeURIComponent(data.student.phone) : "";
            setPaymentBanner({
              type: 'success',
              message: 'تم تأكيد الدفع وتفعيل اشتراكك بنجاح! سجّل دخولك الآن لمتابعة الكورس.',
              actionUrl: phoneParam ? `/portal/login?phone=${phoneParam}` : '/portal/login',
              actionText: 'تسجيل الدخول الآن',
            });
            await fetchOutline();
          } else {
            setPaymentBanner({
              type: 'error',
              message: (data.message || 'لم يتم تأكيد السداد بعد من بوابة الدفع.') + ' لو تم الخصم، الحالة تتحدث تلقائياً خلال دقائق.',
            });
          }
        } catch (e: any) {
          setPaymentBanner({
            type: 'error',
            message: e.message || 'حدث خطأ أثناء التحقق من الدفع.',
          });
        }
      };
      verifyPayment();
    } else if (orderNumber && paymentSuccess && paymentSuccess !== "1") {
      // 🔔 الطالب رجع من بوابة الدفع بدون إتمام (إلغاء أو فشل) — رسالة صادقة مع إعادة محاولة
      setPaymentBanner({
        type: 'error',
        message: 'لم تكتمل عملية الدفع. لم يتم خصم أي مبلغ — يمكنك إعادة المحاولة في أي وقت.',
        actionUrl: `/portal/course/${targetId}`,
        actionText: 'إعادة محاولة الاشتراك',
      });
      fetchOutline();
    } else {
      fetchOutline();
    }
  }, [courseId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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

  const handleShareCourse = () => {
    const targetId = outline?.course?.id || courseId;
    const shareUrl = `${window.location.origin}/portal/course/${targetId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const course = outline?.course;
  const modules = Array.isArray(outline?.modules) ? outline.modules : [];
  const isEnrolled = outline?.isEnrolled ?? false;
  const flatLessonsAll = modules.flatMap((m) => m.lessons || []);
  const firstLesson = flatLessonsAll[0];
  // نقطة الاستكمال: آخر درس مفتوح للطالب المسجّل (قبل أول درس مقفول)
  const resumeLesson = isEnrolled
    ? [...flatLessonsAll].reverse().find((l) => l.isUnlocked) || firstLesson
    : firstLesson;
  const totalLessons = flatLessonsAll.length;
  const freeLessons = course?.freePreviewLessons ?? 0;
  const isDefaultCourse = course?.id === "cmuzmwaxs07r2juml2v04xon5";

  return (
    <div className="space-y-12">
      {/* Payment Feedback Banner */}
      {paymentBanner && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-bold ${
            paymentBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {paymentBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{paymentBanner.message}</span>
          </div>
          {paymentBanner.actionUrl && (
            <Link
              to={paymentBanner.actionUrl}
              className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm ${
                paymentBanner.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <span>{paymentBanner.actionText || 'تسجيل الدخول'}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* 1. Hero Section */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-sm space-y-6">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{totalLessons} درس{freeLessons > 0 ? ` · أول ${freeLessons} ${freeLessons === 1 ? "درس" : "دروس"} معاينة مجانًا` : ""}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {course.title || (isDefaultCourse ? "من أول إعلان… لأول نظام — كورس صاحب المحل، مش للوكالة" : "تفاصيل الكورس التدريبي")}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {course.description || (isDefaultCourse
              ? "سايب الإعلانات للتجربة عشان محدش ورّاك الطريق كامل؟ الكورس ده ماشي معاك من أول خطوة: تفهم عميلك مين، تظبّط عرضك وسعرك، تكتب محتوى بيبيع، تشغّل إعلانك، وتقرا رقمك آخر الشهر. مسار واحد من أوله لآخره — 25 درس، كل درس فكرة واحدة بالعربي المصري، من غير كلام كبير."
              : "منهج عملي مكثف خطوة بخطوة يبدأ معك من الصفر وحتى إتقان المهارات وتحقيق النتائج المطلوبة.")}
          </p>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isEnrolled ? (
              <Link
                to={resumeLesson ? `/portal/course/${course.id}/lesson/${resumeLesson.id}` : `/portal/my-courses`}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-98"
              >
                <span>أكمل من حيث توقفت</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-sm transition-all flex items-center gap-2 active:scale-98"
              >
                <span>اشترك الآن — {course.price} ج.م</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {firstLesson && (
              <Link
                to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-indigo-600" />
                <span>شاهد أول درس مجانًا</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleShareCourse}
              title="مشاركة رابط الكورس"
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span>مشاركة الكورس</span>
                </>
              )}
            </button>
          </div>

          {freeLessons > 0 && (
            <p className="text-[11px] text-slate-500">
              أول {freeLessons} دروس مفتوحة من غير ما تدفع — اتفرج على الأسلوب قبل أي قرار.
            </p>
          )}

          {/* Feature Chips */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <span className="px-3 py-1 rounded-lg bg-slate-100/80">{modules.length} وحدات · {totalLessons} درس</span>
            <span className="px-3 py-1 rounded-lg bg-slate-100/80">أول {freeLessons} دروس معاينة مجانًا</span>
            <span className="px-3 py-1 rounded-lg bg-slate-100/80">كوتش ذكي لكل درس مقيّد بالسكريبت</span>
            <span className="px-3 py-1 rounded-lg bg-slate-100/80">تمارين عملية على شاشات المنصة</span>
            <span className="px-3 py-1 rounded-lg bg-slate-100/80">بلا ظهور لأي حد — كروت وشاشات فقط</span>
          </div>
        </div>
      </section>

      {/* 2. Intro Video Placeholder Frame */}
      <section className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Video className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold">فيديو المقدمة والأسلوب</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-300 font-mono">
            قيد الاعتماد
          </span>
        </div>

        <div className="w-full aspect-video max-h-[380px] bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400">
            <PlayCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-200">فيديو تعريفي مدته 60 ثانية — أسلوب الكورس والمسار</p>
            <p className="text-xs text-slate-400">يمكنك البدء مباشرة بمشاهدة أول درس مجاناً بالكامل من الرابط أدناه.</p>
          </div>
          {firstLesson && (
            <Link
              to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              <span>مشاهدة الدرس الأول الآن (مجاناً)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </section>

      {/* 3. لمين (Who it's for) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600">الفئة المستهدفة</span>
            <h2 className="text-lg font-bold text-slate-900">الكورس ده لصاحب المشروع — مش للوكالة</h2>
            <p className="text-xs text-slate-500">مصري، بيدير شغله بيده، وبيعتمد على الإعلانات تجيب له طلبات.</p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>عندك محل أو مشروع بتبيع أونلاين، وبتصرف على إعلانات وبتجرّب لوحدك.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>بتتعامل مع واتساب/ماسنجر/إنستجرام في استقبال وتأكيد الطلبات.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>عايز تفهم مسار التسويق كامل بدل ما تلمّع معلومة من هنا ومعلومة من هنا.</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-50/70 rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">من باب الصراحة</span>
            <h2 className="text-lg font-bold text-slate-900">مش مناسب ليك لو:</h2>
            <p className="text-xs text-slate-500">توضيح مهم قبل الاشتراك لضمان تحقيق الفائدة.</p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <span>وكالة إعلانات بتدير حسابات عملاء بشكل احترافي ومتخصص.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <span>بتدوّر على كورس Media Buying معقد ونظري للمحترفين — ده مش اللي هنا.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* 4. الوجع (Pain) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-rose-600">المشكلة الواقعية</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            بتفتح مدير الإعلانات… وبعد شوية تقفله وانت تايه؟
          </h2>
          <p className="text-xs text-slate-500">الوجع مش إنك بتصرف — الوجع إنك بتصرف وتجرّب لوحدك ومش عارف النتيجة.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-xs text-slate-800 block">إعلانات وشحن ومصاريف</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              بتدفع ميزانيات في الإعلانات وبتوصل طلبات، لكن آخر الشهر مش عارف ربحك الحقيقي كام.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-xs text-slate-800 block">دروس مفرّقة ومشتتة</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              كل فيديو على النت بيتكلم بلغة وشكل، وانت عايز حاجة واحدة: تعرف الإعلان جاب أوردر ولا لأ.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-xs text-slate-800 block">الصرف في التجربة</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              بتصرف فلوسك ووقتك في التجربة العشوائية، بدل ما تستثمرها في مسار تطبيقي ثابت.
            </p>
          </div>
        </div>
      </section>

      {/* 5. المنهج (Curriculum: 4 Units · 25 Lessons) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600">المحتوى الأكاديمي</span>
            <h2 className="text-xl font-bold text-slate-900">{modules.length} وحدات · {totalLessons} درس — مسار واحد من أوله لآخره</h2>
            <p className="text-xs text-slate-500">كل درس فكرة واحدة عملية على شاشات MaxP نفسها.</p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full self-start sm:self-auto">
            أول {freeLessons} دروس متاحة مجاناً للمعاينة
          </span>
        </div>

        <CourseCurriculumAccordion courseId={course.id} modules={modules} />
      </section>

      {/* 6. جوه المنصة (Inside the Platform) */}
      <section className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-indigo-700">الميزة الحصرية</span>
          <h2 className="text-xl font-bold text-slate-900">مش فيديو وخلاص — كل درس معاه كوتش يفهم الدرس</h2>
          <p className="text-xs text-slate-600">
            الكورس جوه حسابك على أكاديمية MaxP، وكل درس واخد كوتش ذكي مربوط بسكريبت الدرس نفسه.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white p-5 rounded-2xl border border-indigo-100/80 space-y-2">
            <span className="font-bold text-xs text-slate-900 block">كوتش ذكي مقيّد بالسكريبت</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              تسأل سؤال من الدرس → يجاوبك من محتوى وسيناريو الدرس مباشرة؛ تسأل حاجة بره الدرس → يرجّعك للخطوة العملية المطلوبة بدل الكلام العام.
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-indigo-100/80 space-y-2">
            <span className="font-bold text-xs text-slate-900 block">تمارين حقيقية على شاشتك</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              كل درس معاه تمرين عملي بتطبقه على شاشات المنصة نفسها (العملاء، الحملات، الكتالوج) — مش مجرد أسئلة اختيار من متعدد.
            </p>
          </div>
        </div>
      </section>

      {/* 7. السعر والمعاينة */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <span className="text-xs font-bold text-indigo-600 block">السعر الرسمي المسجّل</span>
          <h2 className="text-2xl font-black text-slate-900">{course.price} ج.م — والكورس كامل جوه حسابك</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            أول {freeLessons} دروس معاينة مجانًا بدون أي تسجيل أو دفع. تدخل، تشوف الأسلوب والدرس الأول، وبعدها تقرر الاشتراك.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {firstLesson && (
            <Link
              to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              معاينة أول درس
            </Link>
          )}
          <button
            onClick={() => setCheckoutOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all shadow-md shadow-indigo-200 active:scale-95"
          >
            اشترك الآن بـ{course.price} ج.م
          </button>
        </div>
      </section>

      {/* 8. الأسئلة الشائعة (FAQ) */}
      <CourseFaqSection price={Number(course.price) || 0} totalLessons={totalLessons} />

      {/* 9. Final CTA */}
      <section className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ابدأ بأول درس — مجانًا</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          شوف الأسلوب بنفسك بدون ما تدفع أي حاجة، وبعدها قرر تكمل الكورس كامل بـ{course.price} ج.م.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {firstLesson && (
            <Link
              to={`/portal/course/${course.id}/lesson/${firstLesson.id}`}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
            >
              شاهد أول درس مجاناً
            </Link>
          )}
          <button
            onClick={() => setCheckoutOpen(true)}
            className="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition-all shadow-md shadow-indigo-900/50 active:scale-95"
          >
            اشترك الآن بـ{course.price} ج.م
          </button>
        </div>
      </section>

      {/* Checkout Modal */}
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
