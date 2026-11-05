import React from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  LineChart,
  MessageSquare,
  PieChart,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ProposalTelemetrySuite } from "../types";
import { Band, Lead, Marker, SectionTitle, stripParens } from "./ProposalUi";

interface ProposalAnalyticsSectionProps {
  telemetry?: ProposalTelemetrySuite;
}

const DEFAULT_CADENCE = [
  {
    title: "النبض اليومي الفوري",
    period: "يومياً 9:00 م",
    destination: "جروب واتساب الإدارة",
    description: "ملخص أرقام اليوم: رسائل أولياء الأمور الجديدة، جلسات التقييم المؤكدة، الصرف الإعلاني، ومتوسط تكلفة التسجيل (CPL).",
    badge: "نوم هادئ للإدارة",
  },
  {
    title: "لوحة التحكم الحية في الجيب",
    period: "لحظياً 24/7",
    destination: "تطبيق MaxP على الموبايل",
    description: "شاشة حية يفتحها المدير في أي ثانية: عداد الطلاب النشطين، المجموعات المكتملة، وجدول مواعيد فرع فؤاد اليوم وغداً.",
    badge: "رقابة مباشرة",
  },
  {
    title: "التقرير الأسبوعي التنفيذي",
    period: "كل خميس 5:00 م",
    destination: "شاشة تفاعلية + PDF فخم",
    description: "تحليل قمع التحويل الأسبوعي الكامل، نسبة الحضور الفعلي بالفرع، وتحديد موعد جلسة الـ 20 دقيقة لمراجعة خطة الأسبوع القادم.",
    badge: "قرارات كل 7 أيام",
  },
];

const DEFAULT_ENGINES = [
  {
    id: "att",
    number: "01",
    name: "رادار الإسناد المالي الدقيق للإعلانات",
    category: "الإسناد وتتبع العائد",
    maxpModule: "CampaignAttributionAnalytics",
    timing: "لحظي ومباشر",
    channel: "MaxP CAPI Engine",
    questionAnswered: "أي إعلان وفيديو بالتحديد أتى بالطالب (أحمد) الذي دفع 2,200 ج.م في الفرع اليوم؟",
    metrics: ["Real CAC", "ROAS المباشر", "First & Last Touch Attribution", "CPL لكل حي"],
    impact: "منع هدر الميزانية في إعلانات تجلب نقرات ورسائل عشوائية دون سداد حقيقي.",
  },
  {
    id: "fun",
    number: "02",
    name: "قمع التحويل وتتبع مسار ولي الأمر",
    category: "سلوك أولياء الأمور",
    maxpModule: "StoreAnalyticsFunnel",
    timing: "محدث بعد كل خطوة",
    channel: "MaxP Funnel Telemetry",
    questionAnswered: "أين يتوقف ولي الأمر بالتحديد بين زيارة الموقع، اختبار المستوى، وحضور فرع فؤاد؟",
    metrics: ["تحديد المستوى %", "معدل حجز الموعد %", "نسبة الحضور بالفرع %", "معدل السداد %"],
    impact: "كشف عنق الزجاجة فوراً ومعالجته خلال 24 ساعة بدلاً من التخمين وتبادل الاتهامات.",
  },
  {
    id: "wa",
    number: "03",
    name: "ذكاء محادثات واستقبال واتساب",
    category: "كفاءة الاستقبال والرد",
    maxpModule: "WhatsAppConversationAnalytics",
    timing: "24/7 على مدار الساعة",
    channel: "MaxP WhatsApp AI",
    questionAnswered: "كم ثانية يستغرق الرد على رسائل أولياء الأمور؟ وما هي أشهر اعتراضاتهم؟",
    metrics: ["Speed-to-lead بالثواني", "مصفوفة الاعتراضات الشائعة", "معدل إغلاق كل موظف", "نسبة تأكيد الحضور"],
    impact: "رفع نسبة الحضور لجلسة التقييم لـ 65%+ وخفض زمن الرد إلى أقل من 30 ثانية.",
  },
  {
    id: "coh",
    number: "04",
    name: "تحليل أفواج الطلاب ومضاعفة التجديد",
    category: "الولاء والقيمة التراكمية",
    maxpModule: "CustomerLoyaltyAnalytics",
    timing: "شهري وتراكمي",
    channel: "MaxP Cohort Engine",
    questionAnswered: "طلاب دفعة أكتوبر، كم منهم أكمل للمستوى الثاني والثالث؟ وما هو الـ LTV الحقيقي؟",
    metrics: ["Retention Rate %", "Student LTV (EGP)", "معدل التسرب Churn", "تنبيهات الانقطاع المبكرة"],
    impact: "تنبيه مبكر قبل 10 أيام من نهاية كل مستوى للطلاب المعرضين لعدم التجديد لتداركهم فوراً.",
  },
  {
    id: "geo",
    number: "05",
    name: "الخريطة الجغرافية وقوة الأحياء بالإسكندرية",
    category: "التوزيع الجغرافي والسيولة",
    maxpModule: "RegionAnalytics & Payments",
    timing: "محدث أسبوعياً",
    channel: "MaxP Regional Map",
    questionAnswered: "أي أحياء الإسكندرية (سموحة، فؤاد، كفر عبده، رشدي، لوران) الأعلى إيراداً واستقراراً؟",
    metrics: ["معدل اشتراك كل حي", "توزيع طرق الدفع (انستاباي vs فيزا vs كاش)", "متوسط دخل الأسرة المستهدفة"],
    impact: "توجيه الميزانية الإعلانية بذكاء نحو الأحياء الأعلى إنفاقاً وسرعة في اتخاذ القرار.",
  },
];

const DEFAULT_KPIS = [
  {
    metric: "سرعة الرد الأولي على ولي الأمر",
    benchmark: "أقل من 30 ثانية (عبر وكيل واتساب)",
    alertThreshold: "أكثر من 5 دقائق",
    action: "تدخل فوري وإشعار لمدير الفرع وتصعيد للمناوب",
  },
  {
    metric: "تكلفة الليد المؤهل (Alexandria CPL)",
    benchmark: "90 – 120 ج.م (لأحياء الإسكندرية A/B)",
    alertThreshold: "تتجاوز 150 ج.م",
    action: "إيقاف الإعلان فوراً واختبار زاويتين إبداعيتين بديلتين",
  },
  {
    metric: "نسبة الحضور الفعلي لجلسة التقييم",
    benchmark: "60% إلى 70% من الحجوزات",
    alertThreshold: "أقل من 50%",
    action: "مراجعة مسار رسائل التذكير وتأكيد اللوكيشن هاتفياً",
  },
  {
    metric: "معدل تحويل التقييم لاشتراك مسدد",
    benchmark: "35% إلى 45% من الحاضرين",
    alertThreshold: "أقل من 30%",
    action: "مراجعة سكريبت المقابلة وتدريب موظف الاستقبال والمبيعات",
  },
  {
    metric: "نسبة تجديد المستوى التالي (Retention)",
    benchmark: "80% إلى 85% شهرياً",
    alertThreshold: "أقل من 75%",
    action: "مراجعة تقارير بوابة أولياء الأمور وتكثيف جلسات المتابعة",
  },
];

export const ProposalAnalyticsSection: React.FC<ProposalAnalyticsSectionProps> = ({ telemetry }) => {
  const cadence = telemetry?.cadence || DEFAULT_CADENCE;
  const engines = telemetry?.reports || DEFAULT_ENGINES;
  const kpis = telemetry?.kpis || DEFAULT_KPIS;

  return (
    <Band tone="graphite" id="telemetry">
      {/* 1. Header */}
      <div className="space-y-4 max-w-3xl pb-10 border-b border-white/10">
        <Marker>منظومة الاستخبارات وقياس الأداء المدمجة في MaxP</Marker>
        <SectionTitle>
          كيف ومتى نراقب النتائج؟ لغة الأرقام الصريحة والرقابة اللحظية
        </SectionTitle>
        <Lead>
          بدلاً من تقارير الإكسيل اليدوية في نهاية الشهر، نوفر لإدارة كود تريبس وصولاً مباشراً لنظام استخبارات
          أعمال يربط إعلانات ميتا وتيك توك بمحادثات واتساب وفواتير الحضور الفعلي بفرع فؤاد.
        </Lead>
      </div>

      {/* 2. The 3 Cadence Tiers — When & Where the Client Receives Reports */}
      <div className="py-10 space-y-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-[#FFD368] font-bold tracking-widest uppercase">
            دوريات الاستلام وخطوط التواصل المباشر
          </div>
          <span className="text-xs text-white/40 font-mono">3 مستويات للمتابعة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cadence.map((c, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 flex flex-col justify-between hover:border-[#FFD368]/30 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#FFD368] bg-[#FFD368]/10 px-2.5 py-0.5 rounded-full border border-[#FFD368]/20">
                    {c.period}
                  </span>
                  <span className="text-[11px] text-white/50 font-medium">{c.badge}</span>
                </div>
                <h4 className="text-lg font-black text-white">{c.title}</h4>
                <div className="text-xs text-[#FFD368]/90 font-medium flex items-center gap-1.5">
                  <Smartphone className="size-3.5 shrink-0" />
                  <span>{c.destination}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. The 5 Native MaxP Intelligence Engines */}
      <div className="py-10 space-y-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-[#FFD368] font-bold tracking-widest uppercase">
            ٥ محركات تحليلات مدمجة تعمل تلقائياً للأكاديمية
          </div>
          <span className="text-xs text-white/40 font-mono">MaxP Telemetry Engines</span>
        </div>

        <div className="divide-y divide-white/10">
          {engines.map((eng, idx) => (
            <div
              key={eng.id || idx}
              className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start hover:bg-white/[0.015] transition-colors"
            >
              {/* Col 1: Identity & Module (4 cols) */}
              <div className="lg:col-span-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FFD368] tabular-nums">
                    0{idx + 1}
                  </span>
                  <span className="text-[11px] font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {eng.category}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                  {stripParens(eng.name)}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#FFD368]/80">
                  <Activity className="size-3" />
                  <span>{eng.timing}</span>
                  <span className="text-white/20">•</span>
                  <span>{eng.channel}</span>
                </div>
                <div className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded inline-block">
                  مبني على: {eng.maxpModule}
                </div>
              </div>

              {/* Col 2: Business Question Answered (4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">
                  السؤال التجاري الذي يجيب عليه التقرير:
                </div>
                <p className="text-sm text-white/90 font-medium leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  &ldquo;{eng.questionAnswered}&rdquo;
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {eng.metrics.map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="text-[10px] font-mono text-white/70 bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Col 3: Direct Financial & Operational Impact (4 cols) */}
              <div className="lg:col-span-4 space-y-2 border-r-2 border-[#FFD368]/30 pr-4">
                <div className="text-xs font-bold text-[#FFD368] uppercase tracking-wider">
                  الأثر التشغيلي والمالي المباشر
                </div>
                <p className="text-sm text-white/80 leading-relaxed">
                  {eng.impact}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. The Accountability Matrix & KPI Thresholds */}
      <div className="pt-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-[#FFD368] font-bold tracking-widest uppercase">
            مصفوفة الحوكمة والمحاسبة (SLA & KPI Thresholds)
          </div>
          <span className="text-xs text-white/40 font-mono">التزام تشغيلي ملزم</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 font-bold pr-2">المؤشر المحاسبي</th>
                <th className="py-3 font-bold">المستهدف المقبول</th>
                <th className="py-3 font-bold">حد الخطر (التنبيه)</th>
                <th className="py-3 font-bold pl-2">الإجراء الفوري المتفق عليه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {kpis.map((kpi, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pr-2 font-bold text-white flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#FFD368]" />
                    <span>{kpi.metric}</span>
                  </td>
                  <td className="py-3.5 text-emerald-400 font-mono font-medium">
                    {kpi.benchmark}
                  </td>
                  <td className="py-3.5 text-rose-400 font-mono font-medium">
                    {kpi.alertThreshold}
                  </td>
                  <td className="py-3.5 pl-2 text-white/70 leading-relaxed">
                    {kpi.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Band>
  );
};
