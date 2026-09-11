import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Boxes,
  Users,
  Wallet,
  Bot,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type ModuleType = "ai-chat" | "crm" | "erp" | "growth" | "finance" | "hr";

interface ModuleDetail {
  id: ModuleType;
  label: string;
  badge: string;
  icon: React.ElementType;
  title: string;
  lead: string;
  bullets: string[];
  mockup: React.ReactNode;
}

export const LandingInteractiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ModuleType>("ai-chat");

  const modules: ModuleDetail[] = [
    {
      id: "ai-chat",
      label: "الرد الذكي وواتساب",
      badge: "AI Powered",
      icon: Bot,
      title: "وكيل ذكاء اصطناعي يغلق صفقاتك على مدار الساعة",
      lead: "تكامل مباشر مع WhatsApp Cloud API و Instagram Direct. الوكيل يفهم اللهجة الدارجة، يجيب على الأسئلة، يؤكد الطلبات، ويسجلها في السيستم فوراً.",
      bullets: [
        "رد في خلال 2 ثانية 24/7 دون تأخير",
        "فهم سياق العميل وترشيح المنتجات البديلة",
        "تأكيد أوتوماتيكي لعنوان الشحن ورقم الهاتف",
      ],
      mockup: (
        <div className="space-y-3 bg-slate-950/90 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              محادثة واتساب نشطة الآن
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ID: #WA-9041</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="bg-slate-900 p-2.5 rounded-xl text-slate-300 max-w-[80%]">
              عايز أطلب قطعتين من العرض ويوصلوا بكرة مصر الجديدة، التكلفة كام؟
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-200 mr-auto max-w-[85%] space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <Sparkles className="w-3 h-3" /> MaxP Auto-Closer
              </div>
              <p>
                تمام يا فندم! إجمالي القطعتين بعد الخصم 780 ج.م + الشحن السريع 40 ج.م = 820 ج.م.
                هل نعتمد الشحن على العنوان المسجل لمصر الجديدة؟
              </p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl text-slate-300 max-w-[80%]">
              أيوه تمام اعتمد.
            </div>
            <div className="bg-blue-950/40 border border-blue-500/30 p-2.5 rounded-xl text-blue-200 mr-auto max-w-[85%] text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تم تحويل المحادثة إلى طلب مؤكد برقم #9921 وإخطار شركة الشحن تلقائياً!</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "crm",
      label: "المبيعات و CRM",
      badge: "Pipeline Flow",
      icon: MessageSquare,
      title: "مسارات مبيعات تفاعلية تُظهر حالة كل عميل",
      lead: "لا تترك عميلاً منسياً. قسّم عملاءك إلى مراحل (Leads، تفاوض، مؤكد، مغلق) وتتبع أداء موظفي المبيعات لحظة بلحظة.",
      bullets: [
        "سحب وإفلات الصفقات بين مراحل البيع",
        "تذكيرات متابعة آلية للعملاء المترددين",
        "تاريخ كامل لكل رسالة ومكالمة وطلب سابق",
      ],
      mockup: (
        <div className="space-y-3 bg-slate-950/90 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <span className="font-bold text-slate-300">مسار مبيعات: العملاء الجدد</span>
            <span className="text-emerald-400 font-bold">128,400 ج.م صفقات</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold mb-1">مهتم (34)</div>
              <div className="bg-slate-900 p-1.5 rounded text-[10px] text-slate-300 border border-white/5">
                مكتب النور — 14,000 ج
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl">
              <div className="text-[10px] text-amber-400 font-bold mb-1">تفاوض (12)</div>
              <div className="bg-amber-500/10 p-1.5 rounded text-[10px] text-amber-200 border border-amber-500/20">
                براند ستايل — 32,500 ج
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl">
              <div className="text-[10px] text-emerald-400 font-bold mb-1">تم الإغلاق (58)</div>
              <div className="bg-emerald-500/10 p-1.5 rounded text-[10px] text-emerald-200 border border-emerald-500/20">
                عيادات الشفاء — 48,000 ج
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "erp",
      label: "العمليات والمخازن",
      badge: "Real-time Stock",
      icon: Boxes,
      title: "تزامن فوري للمخازن يمنع نفاد البضاعة وتضارب الأرصدة",
      lead: "اربط متجرك الإلكتروني، فروعك الفعلية، ومخازنك المركزية في مكان واحد. الخصم لحظي مع كل عملية بيع أونلاين أو أوفلاين.",
      bullets: [
        "إدارة مستودعات متعددة وفروع متعددة",
        "أوامر شراء وإدارة مديونيات الموردين",
        "طباعة فواتير ضريبية وبوالص شحن بنقرة زر",
      ],
      mockup: (
        <div className="space-y-3 bg-slate-950/90 rounded-2xl border border-white/10 p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-slate-300">حالة المستودع الرئيسي</span>
            <span className="text-blue-400 font-bold">1,820 قطعة متوفرة</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "قميص قطن بريميوم", sku: "SH-90", stock: 140, status: "متوفر", color: "text-emerald-400" },
              { name: "حذاء كاجوال جلد", sku: "SH-12", stock: 8, status: "أوشك على النفاد", color: "text-amber-400" },
              { name: "ساعة كلاسيك سوداء", sku: "WT-04", stock: 0, status: "غير متوفر", color: "text-red-400" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <div className="font-bold text-slate-200">{item.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.color}`}>{item.status}</div>
                  <div className="text-[10px] text-slate-400">{item.stock} قطعة</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "finance",
      label: "المالية والمحفظة",
      badge: "Wallet Engine",
      icon: Wallet,
      title: "محفظة مالية رقمية وتسويات فورية دون حسابات معقدة",
      lead: "تسوية حسابات المناديب، المسوقين، والموردين بضغطة زر واحدة. تتبع صافي أرباحك وتدفقاتك النقدية الحقيقية بعيداً عن مفاجآت الإكسيل.",
      bullets: [
        "محفظة داخلية لكل شريك ومسوق",
        "تسويات فورية للتحصيلات ومدفوعات الـ COD",
        "تقارير ربحية صافية بعد خصم تكلفة البضاعة والإعلانات والشحن",
      ],
      mockup: (
        <div className="space-y-4 bg-slate-950/90 rounded-2xl border border-white/10 p-5 text-xs">
          <div className="text-center py-3 bg-gradient-to-br from-amber-500/10 to-red-500/10 rounded-xl border border-amber-500/20">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">الرصيد المتاح للتشغيل</div>
            <div className="text-2xl font-black text-white">482,900.00 <span className="text-xs text-amber-400">ج.م</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg border border-white/5">
              <span className="text-slate-300">تحصيل COD من شركة الشحن</span>
              <span className="text-emerald-400 font-mono font-bold">+24,800 ج.م</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg border border-white/5">
              <span className="text-slate-300">صرف عمولات مسوقين آلياً</span>
              <span className="text-red-400 font-mono font-bold">-3,450 ج.م</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "hr",
      label: "الموظفين و HR",
      badge: "Productivity Score",
      icon: Users,
      title: "ربط إنتاجية الموظف بالمبيعات الفعلية مباشرة",
      lead: "اعرف مَن في فريقك يحقق أعلى مبيعات وأفضل خدمة عملاء. تتبع شفتات العمل، الحضور، والمكافآت بنظام عادل وشفاف.",
      bullets: [
        "متابعة الحضور وساعات الدوام",
        "توزيع المهام ومتابعة إنجاز الـ KPIs",
        "احتساب آلي لعمولات المبيعات ونسب المندوبين",
      ],
      mockup: (
        <div className="space-y-3 bg-slate-950/90 rounded-2xl border border-white/10 p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-slate-300">فريق المبيعات والدعم</span>
            <span className="text-purple-400 font-bold">4 موظفين نشطين</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "سارة محمود", role: "Sales Lead", sales: "38 طلب", rate: "98%" },
              { name: "كريم يوسف", role: "Customer Care", sales: "24 طلب", rate: "94%" },
            ].map((emp, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="font-bold text-white">{emp.name}</div>
                <div className="text-[10px] text-slate-400">{emp.role}</div>
                <div className="text-[10px] text-emerald-400 font-bold pt-1 border-t border-white/5 flex justify-between">
                  <span>{emp.sales}</span>
                  <span>رضا {emp.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const currentModule = modules.find((m) => m.id === activeTab) || modules[0];

  return (
    <section id="modules" className="relative py-20 sm:py-28 bg-slate-950/60 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>جولة حية داخل كونسول التشغيل</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            تصفّح المنصة وتخيّل
            <br />
            <span className="bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              كيف سيبدو يوم عملك بدون فوضى
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            انقر على أي قسم وشاهد كيف يتولى النظام إدارة المهام المعقدة بذكاء وسلاسة.
          </p>
        </div>

        {/* Modular Tabs Navigation */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
          {modules.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 scale-105"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Panel with AnimatePresence */}
        <div className="relative rounded-3xl bg-slate-900/90 border border-white/10 p-6 sm:p-10 shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentModule.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center"
            >
              {/* Left Side: Descriptive Info */}
              <div className="lg:col-span-7 space-y-6 text-right">
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-md bg-white/5 text-amber-400 border border-amber-400/20">
                  {currentModule.badge}
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                  {currentModule.title}
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {currentModule.lead}
                </p>

                <ul className="space-y-3 pt-2">
                  {currentModule.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  <a
                    href="#calculator"
                    className="inline-flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                  >
                    <span>احسب كم ستوفر شهرياً مع هذا القسم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Right Side: Interactive Mockup Screen */}
              <div className="lg:col-span-5">
                {currentModule.mockup}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};
