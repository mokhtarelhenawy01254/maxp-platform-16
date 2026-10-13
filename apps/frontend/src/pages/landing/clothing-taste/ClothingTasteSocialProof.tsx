import React, { useState } from "react";
import { CheckCircle2, MessageSquare, Star, TrendingDown, Store, ShieldCheck, MapPin } from "lucide-react";

export const ClothingTasteSocialProof: React.FC = () => {
  const [activeStory, setActiveStory] = useState<number>(0);

  const stories = [
    {
      brand: "Cairo Atelier",
      location: "المعادي، القاهرة",
      niche: "براند ملابس كاجوال وأوفرسايز (أونلاين + ستوديو)",
      highlight: "انخفاض المرتجعات من 34% إلى 8%",
      monthlySavings: "وفروا 29,400 ج.م شهرياً في مصاريف الشحن رايح-جاي",
      story:
        "قبل ماكس بي، كل 10 أوردرات كان بيرجع منهم 3 أو 4 بسبب لغبطة مقاسات الأوفرسايز ومصاريف بوسطة رايح-جاي كانت بتضيع كل الأرباح. بعد تشغيل مستشار المقاسات الذكي، الزبون بقى يختار مقاسه بدقة السنتيمتر، والأوردرات المرتجعة نزلت لأقل من 8% والزبائن بقت تطلب تاني بثقة.",
      metrics: [
        { label: "انخفاض المرتجعات", value: "60%-" },
        { label: "وفر شهري في الشحن", value: "29,400 ج.م" },
        { label: "زمن إعداد الأوردر", value: "Click-1" },
      ],
    },
    {
      brand: "Urban Threads",
      location: "المهندسين ومدينة نصر",
      niche: "سلسلة محلات أزياء بفرعين + متجر ويب",
      highlight: "إنهاء خناقات البيع المزدوج وتضارب المخزون",
      monthlySavings: "ضبط جرد فرعين بدقة 100% بدون أي قطعة مفقودة",
      story:
        "كانت أكبر مشكلتنا إن الزبونة تطلب قطعة من إنستجرام وتدفع، ونتفاجأ إن العامل في فرع المهندسين باعها في نفس اللحظة في المحل! كاشير ماكس بي السحابي حل المشكلة جذرياً: أي قطعة بتتبس بالباركود في المحل بتتحذف فورياً في نفس الثانية من المتجر الإلكتروني.",
      metrics: [
        { label: "تزامن مخزون الفروع", value: "لحظي 100%" },
        { label: "خطأ البيع المزدوج", value: "0 قطعة" },
        { label: "تدريب كاشير المحل", value: "15 دقيقة" },
      ],
    },
    {
      brand: "Zahra Modest Wear",
      location: "الإسكندرية + شحن لكل محافظات مصر",
      niche: "براند أزياء محجبات وعبايات (أونلاين)",
      highlight: "طباعة 80 بوليصة بوسطة يومياً بضغطة زر واحدة",
      monthlySavings: "ارتفاع نسبة استلام الأوردرات مع بوسطة إلى 92%",
      story:
        "كنا بنضيع 4 ساعات يومياً كل يوم بعد العصر في كتابة بوالص الشحن اليدوية وإرسال رسايل الواتساب للزباين لتأكيد العنوان. مع ربط بوسطة الرسمي في ماكس بي، البوالص بتطلع دفعة واحدة ورسائل التتبع بتروح أوتوماتيك للزبون، ومعدل الاستلام وصل 92%.",
      metrics: [
        { label: "معدل استلام الأوردرات", value: "92%" },
        { label: "توفير وقت بوالص الشحن", value: "4 ساعات/يوم" },
        { label: "تأكيد واتساب", value: "أوتوماتيك" },
      ],
    },
  ];

  const whatsappQuotes = [
    {
      sender: "أحمد الشريف — صاحب براند ملابس شبابي",
      message:
        "يا باشا الله يباركلك، بوسطة استلمت النهاردة 48 أوردر في ربع ساعة وكلهم مربوطين أوتوماتيك بالبوالص، شغل احترافي بجد وفر علينا مجهود كان بياخد نص اليوم.",
      tag: "ربط بوسطة الرسمي",
    },
    {
      sender: "مريم عبد الرحمن — مديرة فرع المهندسين",
      message:
        "البنات في المحل اتعلموا على شاشة الكاشير في ربع ساعة بس، وميزة مسح الباركود سريعة جداً وحسابات الوردية بقت تقفل بالمللي مفيش ربع جنيه عجز.",
      tag: "كاشير الفروع السحابي",
    },
    {
      sender: "كريم النجار — مؤسس براند ملابس كاجوال",
      message:
        "مستشار المقاسات فرق معانا جداً في أرقام الأسبوع ده.. الزباين بطلت تطلب مقاسين عشان تجرب وترجع واحد، معدل المرتجع نزل للنص تقريباً.",
      tag: "مستشار المقاسات",
    },
  ];

  return (
    <section className="py-20 border-b border-black/[0.06] bg-white text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>نتائج تجارية حقيقية وموثقة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            براندات ومحلات ملابس حقيقية تعتمد على MaxP يومياً في مصر
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            من محلات المعادي والمهندسين إلى براندات إنستجرام في القاهرة والإسكندرية — هكذا تحولت عملياتهم من الفوضى ونزيف المرتجعات إلى الاستقرار والربحية.
          </p>
        </div>

        {/* 3 Interactive Case Studies Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* Brand Switcher Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {stories.map((st, idx) => {
              const isSelected = activeStory === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStory(idx)}
                  className={`w-full p-4 rounded-xl text-right transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#FAF8F5] border-[#141416] shadow-sm ring-1 ring-[#141416]"
                      : "bg-white border-black/[0.06] hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-[#141416]">{st.brand}</span>
                    <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {st.location.split("،")[0]}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mb-2">{st.niche}</div>
                  <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-block">
                    {st.highlight}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Story Deep-Dive Card (8 cols) */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/[0.06] mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#141416]">
                    {stories[activeStory].brand}
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono px-2 py-0.5 rounded bg-white border border-black/[0.06]">
                    {stories[activeStory].location}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 mt-1">
                  {stories[activeStory].niche}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-zinc-500">الأثر المالي المباشر:</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-800">
                  {stories[activeStory].monthlySavings}
                </div>
              </div>
            </div>

            {/* Story Paragraph */}
            <p className="text-sm text-zinc-700 leading-relaxed mb-6 font-normal">
              "{stories[activeStory].story}"
            </p>

            {/* Metrics Ticker */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-black/[0.06]">
              {stories[activeStory].metrics.map((m, mIdx) => (
                <div key={mIdx} className="p-3 rounded-xl bg-white border border-black/[0.06] text-center">
                  <div className="text-lg sm:text-2xl font-black text-[#141416] font-mono cst-tabular mb-0.5">
                    {m.value}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Real Merchant WhatsApp Messages Strip */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h4 className="text-base font-black text-[#141416]">
              رسائل مباشرة من تجار ومسؤولي محلات بعد تفعيل المنظومة
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {whatsappQuotes.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {q.tag}
                    </span>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed mb-4">
                    "{q.message}"
                  </p>
                </div>

                <div className="pt-3 border-t border-black/[0.06] text-[11px] font-bold text-zinc-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>{q.sender}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Corporate Assurance Strip */}
        <div className="mt-12 p-4 rounded-xl bg-zinc-50 border border-black/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-600 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>شركة مصرية رسمية متخصصة في أنظمة تجارة التجزئة والأزياء</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>دعم فني واستشارات متجر الملابس متاحة 7 أيام في الأسبوع عبر واتساب</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>ربط وتفعيل مع بوسطة وكاشير خلال أقل من 24 ساعة عمل</span>
          </div>
        </div>

      </div>
    </section>
  );
};
