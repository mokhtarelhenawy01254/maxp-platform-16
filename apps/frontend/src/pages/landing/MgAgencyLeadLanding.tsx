import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, Check, BarChart, Folder, PhoneCall, Play, Star, Target } from 'lucide-react';
import { submitPublicLead } from "../../services/publicLeadService";

const MG_PAGE_SLUG = "mg-agency";
const MG_COMPANY_ID = "cmnrf1wp1vvj5jutyjdh94bc4";
const MG_VIDEO_URL = "";

const serviceOptions = [
  "إدارة حملات إعلانية",
  "خطة تسويق شاملة",
  "إدارة سوشيال ميديا",
  "تصميم محتوى وإعلانات",
  "استشارة تسويقية",
];

const budgetOptions = [
  "أقل من 10,000",
  "10,000 - 25,000",
  "25,000 - 50,000",
  "أكثر من 50,000",
];

const valueCards = [
  {
    title: "إعلانات بهدف بيعي واضح",
    description:
      "نحوّل الإعلان من مجرد وصول ومشاهدات إلى طلبات فعلية واجتماعات مع عملاء مناسبين.",
    icon: Target,
  },
  {
    title: "فانل متابعة كاملة",
    description:
      "الفيديو والرسالة واللاندنج والفورم كلها تتكلم بنفس الوعد حتى لا يضيع العميل بين مراحل مختلفة.",
    icon: BarChart3,
  },
  {
    title: "متابعة داخل CRM الحالي",
    description:
      "كل عميل يسجل هنا سيظهر مباشرة داخل قائمة العملاء في شركة MG بنفس نظام إضافة العميل الموجود.",
    icon: Briefcase,
  },
];

const steps = [
  "يشاهد العميل الفيديو الإعلاني ويدخل على اللاندنج.",
  "يسجل بياناته في فورم قصيرة وواضحة.",
  "يتحفظ مباشرة داخل عملاء MG بحالة Lead للمتابعة.",
];

const resolveVideoEmbed = (rawUrl: string) => {
  const source = rawUrl.trim();
  if (!source) {
    return { type: "none" as const, src: "" };
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(source)) {
    return { type: "video" as const, src: source };
  }

  try {
    const parsed = new URL(source);
    if (source.includes("/embed/")) {
      return { type: "embed" as const, src: source };
    }

    const youtubeId = parsed.searchParams.get("v");
    if (youtubeId) {
      return {
        type: "embed" as const,
        src: `https://www.youtube.com/embed/${youtubeId}`,
      };
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return {
          type: "embed" as const,
          src: `https://www.youtube.com/embed/${videoId}`,
        };
      }
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      if (videoId) {
        return {
          type: "embed" as const,
          src: `https://player.vimeo.com/video/${videoId}`,
        };
      }
    }
  } catch {
    return { type: "none" as const, src: "" };
  }

  return { type: "none" as const, src: "" };
};

const extractSubmissionError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return "تعذر إرسال البيانات الآن. حاول مرة أخرى خلال دقائق.";
};

const MgAgencyLeadLanding: React.FC = () => {
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    companyName: "",
    service: serviceOptions[0],
    budgetRange: budgetOptions[1],
    notes: "",
    nickname: "",
  });

  const searchParams = new URLSearchParams(location.search);
  const requestedVideoUrl = searchParams.get("video") || MG_VIDEO_URL;
  const video = resolveVideoEmbed(requestedVideoUrl);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.firstName.trim()) {
      setError("الاسم الأول مطلوب");
      return;
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      setError("رقم الهاتف أو البريد الإلكتروني مطلوب");
      return;
    }

    const utm: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_")) {
        utm[key] = value;
      }
    }

    setIsSubmitting(true);
    try {
      await submitPublicLead({
        companyId: MG_COMPANY_ID,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        companyName: formData.companyName,
        service: formData.service,
        budgetRange: formData.budgetRange,
        notes: formData.notes,
        source: "mg-landing",
        pageSlug: MG_PAGE_SLUG,
        landingPath: `${window.location.pathname}${window.location.search}`,
        referrer: document.referrer || "",
        nickname: formData.nickname,
        utm,
      });
      setSubmitted(true);
    } catch (submissionError: unknown) {
      setError(extractSubmissionError(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#fffaf5] text-slate-900 selection:bg-[#f7cf9c]"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_35%),radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,_#fffaf5_0%,_#fff_55%,_#fff8ef_100%)]" />

      <main className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col gap-20 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f0d4b1] bg-white/80 px-4 py-2 text-sm font-bold text-[#9a5c10] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              لاندنج مخصصة لحملات MG Agency
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.15] text-[#1f1720] sm:text-5xl lg:text-6xl">
                حوّل الفيديو الترويجي إلى{" "}
                <span className="bg-gradient-to-l from-[#e25d91] via-[#a855f7] to-[#0ea5e9] bg-clip-text text-transparent">
                  عملاء محتملين جاهزين للمتابعة
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                هذه الصفحة مصممة لتخدم إعلان MG Agency مباشرة. العميل يشاهد
                الرسالة، يسجل بياناته، ثم يظهر فوراً داخل قائمة عملاء MG بحالة
                Lead حتى تبدأ المتابعة من نفس النظام الحالي.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#lead-form"
                className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-[#111827] px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0f172a]"
              >
                ابدأ بتسجيل أول Lead
                <ArrowLeft className="h-5 w-5" />
              </a>
              <a
                href="#campaign-video"
                className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] border border-[#e8d5bf] bg-white px-8 py-4 text-base font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-[#d7b58a]"
              >
                <PlayCircle className="h-5 w-5" />
                مشاهدة مكان الفيديو
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {valueCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="rounded-[1.8rem] border border-white/70 bg-white/75 p-5 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur"
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-[#fff3e4] p-3 text-[#cb6a14]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900">
                      {card.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {card.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <section
            id="campaign-video"
            className="overflow-hidden rounded-[2rem] border border-white/70 bg-[#120f17] p-4 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.75)]"
          >
            <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-5">
              <div className="mb-5 flex items-center justify-between text-white/85">
                <div>
                  <p className="text-sm font-bold tracking-[0.25em] text-[#f8c98f]">
                    VIDEO SLOT
                  </p>
                  <h2 className="mt-2 text-2xl font-black">الفيديو الترويجي</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs">
                  <BadgeCheck className="h-4 w-4 text-[#34d399]" />
                  جاهز للربط بالحملة
                </div>
              </div>

              {video.type === "embed" ? (
                <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 pt-[56.25%]">
                  <iframe
                    src={video.src}
                    title="MG Campaign Video"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : video.type === "video" ? (
                <video
                  controls
                  playsInline
                  className="w-full rounded-[1.4rem] border border-white/10 bg-black"
                  src={video.src}
                />
              ) : (
                <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,_rgba(226,93,145,0.2),_transparent_45%),linear-gradient(135deg,_rgba(14,165,233,0.12),_rgba(15,23,42,0.15))] px-8 text-center text-white/85">
                  <PlayCircle className="h-14 w-14 text-[#f7cf9c]" />
                  <h3 className="mt-5 text-2xl font-black">
                    مكان الفيديو الترويجي جاهز
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                    بمجرد وضع رابط فيديو YouTube أو Vimeo أو MP4 هنا ستظهر
                    المعاينة مباشرة داخل اللاندنج بدون تعديل باقي المنظومة.
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {steps.map((step) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/80"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="space-y-6 rounded-[2rem] border border-[#f2e4d1] bg-white p-7 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.45)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4e8] px-4 py-2 text-sm font-bold text-[#b96b1b]">
              <PhoneCall className="h-4 w-4" />
              ماذا يحدث بعد التسجيل؟
            </div>
            <h2 className="text-3xl font-black text-slate-900">
              البيانات تدخل مباشرة إلى عملاء MG
            </h2>
            <p className="text-base leading-8 text-slate-600">
              الهدف هنا ليس مجرد استقبال نموذج تواصل. الهدف أن يظهر الاسم
              والموبايل والبريد داخل قائمة العملاء في MG بنفس منطق الإضافة
              الموجودة حالياً حتى يبدأ فريقك المتابعة فوراً.
            </p>

            <div className="space-y-4">
              {[
                "تسجيل العميل بحالة Lead داخل شركة MG فقط.",
                "حفظ مصدر التسجيل وبيانات الحملة داخل metadata للمتابعة.",
                "إمكانية الربط لاحقاً مع واتساب أو حجز مكالمة أو conversion tracking.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-[#ecfdf5] p-1 text-[#10b981]">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </aside>

          <section
            id="lead-form"
            className="rounded-[2rem] border border-[#ead9c2] bg-[linear-gradient(160deg,_#fff_0%,_#fff7ef_100%)] p-7 shadow-[0_28px_75px_-45px_rgba(146,64,14,0.35)]"
          >
            {!submitted ? (
              <>
                <div className="mb-8">
                  <p className="text-sm font-bold tracking-[0.28em] text-[#b86b20]">
                    LEAD FORM
                  </p>
                  <h2 className="mt-3 text-3xl font-black text-slate-900">
                    سجّل بياناتك وسيتواصل معك فريق MG
                  </h2>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    نموذج قصير ومباشر. اترك بيانات أساسية فقط حتى نبدأ التواصل
                    معك بسرعة.
                  </p>
                </div>

                {error ? (
                  <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    autoComplete="off"
                    tabIndex={-1}
                    className="hidden"
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        الاسم الأول
                      </span>
                      <input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="مثال: محمد"
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        اسم العائلة
                      </span>
                      <input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="اختياري"
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        رقم الهاتف
                      </span>
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="05xxxxxxxx"
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        البريد الإلكتروني
                      </span>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@company.com"
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        اسم الشركة
                      </span>
                      <input
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="مثال: شركة النخبة"
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-bold text-slate-700">
                        الخدمة المطلوبة
                      </span>
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                      >
                        {serviceOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">
                      الميزانية التقريبية
                    </span>
                    <select
                      name="budgetRange"
                      value={formData.budgetRange}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                    >
                      {budgetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">
                      نبذة سريعة عن احتياجك
                    </span>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="اكتب باختصار نوع النشاط أو الهدف من الإعلان"
                      className="w-full rounded-[1.6rem] border border-[#dec7a7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cb7b22] focus:ring-4 focus:ring-[#ffe7c3]"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[#111827] px-6 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "جاري إرسال البيانات..." : "إرسال البيانات إلى فريق MG"}
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-[#ecfdf5] p-4 text-[#10b981]">
                  <BadgeCheck className="h-10 w-10" />
                </div>
                <h2 className="mt-6 text-3xl font-black text-slate-900">
                  تم استلام بياناتك بنجاح
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                  تم إضافة بياناتك داخل نظام MG كعميل محتمل، وسيقوم الفريق
                  بمراجعتها والتواصل معك قريباً.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      firstName: "",
                      lastName: "",
                      phone: "",
                      email: "",
                      companyName: "",
                      service: serviceOptions[0],
                      budgetRange: budgetOptions[1],
                      notes: "",
                      nickname: "",
                    });
                  }}
                  className="mt-8 inline-flex items-center gap-3 rounded-[1.4rem] border border-[#d9c4a6] bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-[#b97a23]"
                >
                  إرسال Lead جديدة
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
};

export default MgAgencyLeadLanding;
