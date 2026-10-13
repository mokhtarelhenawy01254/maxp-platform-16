import React, { useState } from "react";
import {
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  Truck,
  RotateCcw,
  BarChart3,
  GitFork,
  MessageSquare,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { PLATFORM_TELEMETRY } from "./clothingTasteData";

export const ClothingTasteSocialProof: React.FC = () => {
  const [activeWorkflow, setActiveWorkflow] = useState<number>(0);

  const workflows = [
    {
      id: "workflow-dispatch",
      title: "مسار الطلب السريع: من إعلان الميديا باير إلى تسليم بوسطة",
      tagline: "كيف يتعامل النظام مع 50 إلى 200 أوردر يومياً بدون مكالمة هاتفية واحدة وبدون أخطاء كتابة",
      icon: Truck,
      steps: [
        {
          stage: "1. تسجيل الأوردر من المتجر",
          desc: "الزبون يختار المقاس واللون من المتجر الإلكتروني. يتم تسجيل الأوردر برقم تسلسلي فوري وإسناده لـ UTM الحملة الإعلانية.",
          tool: "المتجر + Campaign Attribution",
        },
        {
          stage: "2. تأكيد فوري عبر WhatsApp API",
          desc: "يرسل النظام رسالة رسمية باسم متجرك على واتساب الزبون بمحتوى الأوردر والعنوان لتأكيده بنقرة واحدة، مما يمنع الأوردرات الوهمية.",
          tool: "WhatsApp Business API",
        },
        {
          stage: "3. تحديث مسار الطلبات (Order Workflow)",
          desc: "بمجرد تأكيد الزبون، يتحول الأوردر تلقائياً إلى حالة «مؤكد»، وتظهر تنبيهات بنواقص المقاسات في شاشة تجهيز الطلبات.",
          tool: "مسار الطلبات + تجهيز الطلبات",
        },
        {
          stage: "4. طباعة جماعية لبوالص الشحن بنقرة زر",
          desc: "يحدد مسؤول الشحن 50 أوردر دفعة واحدة في شاشة الطلبات الجماعية، ويصدر بوالص بوسطة وتوربو وتطبع الطابعة الحرارية ملصقات الشحن فوراً.",
          tool: "معالجة الطلبات الجماعية + الشحن الذكي",
        },
      ],
      resultMetric: "توفير 4 ساعات يومياً",
      resultDetail: "إصدار وتجهيز 50 بوليصة شحن في أقل من 3 دقائق بدلاً من كتابتها يدوياً واحدة تلو الأخرى.",
    },
    {
      id: "workflow-returns",
      title: "مسار كبح المرتجعات: تشخيص السبب الحقيقي بالأرقام وعلاجه",
      tagline: "تحويل نزيف مصاريف الشحن رايح-جاي إلى تشخيص عملي بالأرقام يعالج المشكلة من جذورها",
      icon: RotateCcw,
      steps: [
        {
          stage: "1. تصنيف سبب الارتجاع في السيستم",
          desc: "عند رجوع أي شحنة من شركة الشحن، يسجل السيستم السبب الدقيق: مقاس غير ملائم، تأخر مندوب الشحن، معاينة وإلغاء، أو عيب تصنيع.",
          tool: "إعدادات وقواعد المرتجعات",
        },
        {
          stage: "2. تحليل أسباب المرتجعات بالنسبة المئوية",
          desc: "تظهر شاشة التحليلات نسبة كل سبب بدقة: (42% مقاس، 28% تأخر شحن، 20% معاينة وإلغاء، 10% عيب قماش).",
          tool: "تحليلات أسباب المرتجعات",
        },
        {
          stage: "3. معالجة سبب المقاس بمستشار السنتيمترات",
          desc: "بناءً على البيانات، يتم تدقيق جدول مقاسات القطعة بالسنتيمتر وتفعيل مستشار المقاسات، مما يخفض مرتجعات المقاس إلى 8%.",
          tool: "مصفوفة المقاسات والمستودعات",
        },
        {
          stage: "4. توجيه الشحن للشركة الأسرع تسليماً",
          desc: "إسناد شحنات الصعيد لشركة بوسطة وشحنات الإسكندرية والقاهرة لتوربو بناءً على معدلات التسليم الفعلي لكل شركة.",
          tool: "بوابة الشحن الذكي",
        },
      ],
      resultMetric: "انخفاض المرتجعات إلى 8%",
      resultDetail: "معرفة التاجر لسبب المرتجع بدقة يمنع إهدار آلاف الجنيهات شهرياً في مصاريف الشحن المرتجع.",
    },
    {
      id: "workflow-profit",
      title: "مسار إحكام الأرباح: حساب صافي الربح الحقيقي لكل قطعة بالجنيه",
      tagline: "معرفة صافي الربح في الخزينة بعد خصم تكلفة التصنيع ومصاريف الشحن وتكلفة الإعلان الممول",
      icon: BarChart3,
      steps: [
        {
          stage: "1. إسناد الأوردر للحملة الإعلانية (UTM)",
          desc: "كل أوردر يتم ربطه بالحملة والمجموعة الإعلانية على فيسبوك وتيك توك لمعرفة الإعلان الذي جلب البيعة بالضبط.",
          tool: "إسناد الحملات (Campaign Attribution)",
        },
        {
          stage: "2. تسجيل تكلفة تصنيع القطعة",
          desc: "تسجيل تكلفة متر القماش والمصنعية والتغليف لكل موديل في شاشة المخزون لحساب تكلفة البضاعة المباعة (COGS).",
          tool: "المخزون والمستودعات",
        },
        {
          stage: "3. خصم مصاريف الشحن والتحصيل النقدي",
          desc: "تسجيل رسوم بوليصة الشحن وعمولة التحصيل (COD) ومطابقتها مع كشف حساب شركة الشحن عند تسوية المبالغ.",
          tool: "الشحن الذكي + تحليلات الطلبات",
        },
        {
          stage: "4. تقرير صافي الربح الحقيقي بالجنيه",
          desc: "حساب المعادلة الصافية: سعر البيع - تكلفة التصنيع - مصاريف الشحن - تكلفة الإعلان = صافي الربح الفعلي وهامش الربحية.",
          tool: "تحليلات الأرباح وصافي الهامش",
        },
      ],
      resultMetric: "صافي ربح واضح 100%",
      resultDetail: "رؤية رقمية دقيقة للمكسب الصافي بدون مفاجآت في نهاية الشهر وبدون التخبط في شيتات إكسيل مبعثرة.",
    },
  ];

  const current = workflows[activeWorkflow];

  return (
    <section className="py-20 border-b border-black/[0.06] bg-white text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-800" />
            <span>واقع التشغيل العملي للمنظومة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            كيف تدير وتضبط مبيعات براندك على أرض الواقع؟
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            بدلاً من الوعود التسويقية الإنشائية، إليك كيف تعمل منظومة MaxP فعلياً لحل التحديات اليومية الثلاثة الأكبر لأي تاجر ملابس في مصر: تدفق الطلبات، كبح المرتجعات، وإحكام الأرباح.
          </p>
        </div>

        {/* 3 Workflows Tab Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {workflows.map((wf, idx) => {
            const isSelected = activeWorkflow === idx;
            const Icon = wf.icon;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => setActiveWorkflow(idx)}
                className={`p-4 rounded-xl text-right transition-all border flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-[#FAF8F5] border-[#141416] shadow-sm ring-1 ring-[#141416]"
                    : "bg-white border-black/[0.08] hover:border-black/20 text-zinc-700"
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isSelected ? "bg-[#141416] text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-500 mb-0.5 font-mono">
                    مسار العمل 0{idx + 1}
                  </div>
                  <div className="text-sm font-black text-[#141416] leading-snug line-clamp-2">
                    {wf.title.split(":")[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Workflow Operational Deep-Dive Box */}
        <div className="cst-panel rounded-2xl p-6 sm:p-8 bg-[#FAF8F5] border border-black/[0.08] shadow-md mb-12">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-black/[0.06]">
            <div>
              <div className="text-xs font-bold text-emerald-800 font-mono mb-1">
                تشغيل المنظومة خطوة بخطوة
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-1">
                {current.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600">
                {current.tagline}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-black/[0.08] text-right shrink-0 shadow-2xs">
              <div className="text-[11px] text-zinc-500 font-medium">النتيجة التشغيلية المباشرة</div>
              <div className="text-base font-black text-emerald-800 font-mono cst-tabular">
                {current.resultMetric}
              </div>
              <div className="text-[11px] text-zinc-600 mt-0.5 max-w-xs">
                {current.resultDetail}
              </div>
            </div>
          </div>

          {/* 4 Execution Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {current.steps.map((st, sIdx) => (
              <div
                key={sIdx}
                className="p-4 rounded-xl bg-white border border-black/[0.06] flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#141416] font-mono">
                      خطوة 0{sIdx + 1}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  </div>
                  <h4 className="text-sm font-black text-[#141416] mb-2 leading-snug">
                    {st.stage}
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                    {st.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/[0.06] text-[10px] font-mono font-bold text-zinc-500">
                  الأداة: {st.tool}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Live Platform Proof Summary (Production Stats Ledger) */}
        <div className="rounded-2xl p-6 bg-zinc-900 text-white border border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>سجل المنصة الحي • {PLATFORM_TELEMETRY.verifiedDate}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black mb-1">
                منظومة سحابية مجربة تدير عمليات التجارة في مصر على مدار الساعة
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                كل أداة في الباقة تم بناؤها واختبارها وتطويرها لتناسب طبيعة السوق المصري: الدفع عند الاستلام (COD)، بوالص بوسطة وتوربو، أرقام المحمول والواتساب، ومقاسات الأزياء.
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-r border-zinc-800 pt-4 md:pt-0 md:pr-6">
              <div className="text-center">
                <div className="text-3xl font-black text-white font-mono cst-tabular">
                  {PLATFORM_TELEMETRY.activeStores}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">متجر نشط</div>
              </div>
              <div className="w-px h-10 bg-zinc-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400 font-mono cst-tabular">
                  {PLATFORM_TELEMETRY.monthlyOrders}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">أوردر معالج في 30 يوم</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
