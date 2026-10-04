import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Boxes,
  Users,
  Wallet,
  Workflow,
  Check,
  ArrowLeft,
} from "lucide-react";

type ModuleType = "ai-chat" | "crm" | "erp" | "finance" | "hr";

interface ModuleDetail {
  id: ModuleType;
  label: string;
  codeName: string;
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
      codeName: "WHATSAPP_AI_DISPATCH",
      title: "إغلاق الصفقات عبر الواتساب في ثوانٍ",
      lead: "الربط الرسمي مع WhatsApp Cloud API يضمن وصول رسائلك بدون حظر. يفهم النظام أسئلة العميل الدارجة، يعرض صور المنتجات المتاحة، ويؤكد عنوان الشحن ويجهزه للمخزن تلقائياً.",
      bullets: [
        "رد فوري خلال ثانيتين في أوقات الذروة وخارج مواعيد العمل الرسمية",
        "تأكيد تلقائي لبيانات التوصيل ورقم الهاتف البديل",
        "تحويل مباشر لموظف المبيعات البشري عند الحاجة بدون قطع السياق",
      ],
      mockup: (
        <div className="space-y-3 bg-zinc-950 p-5 rounded-2xl border border-white/[0.06] text-xs font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              محادثة واتساب نشطة
            </span>
            <span className="text-zinc-500">جلسة #WA-8819</span>
          </div>
          <div className="space-y-2.5">
            <div className="bg-zinc-900/80 p-3 rounded-2xl rounded-tr-none text-zinc-300 max-w-[85%] leading-relaxed">
              لو سمحت محتاج مقاس 43 كلاسيك أسود، والتوصيل لمصر الجديدة بكام وبياخد وقت أد إيه؟
            </div>
            <div className="bg-zinc-900 border border-emerald-500/20 p-3 rounded-2xl rounded-tl-none text-zinc-200 mr-auto max-w-[90%] leading-relaxed space-y-1.5">
              <div className="text-[10px] text-emerald-400 font-mono">رد آلي مباشر</div>
              <p>
                أهلاً بحضرتك يا فندم! متاح مقاس 43 وجاهز للشحن الفوري. مصاريف الشحن 45 ج.م والاستلام خلال 24 ساعة مع إمكانية المعاينة قبل الدفع. تحب نعتمد الطلب؟
              </p>
            </div>
            <div className="bg-zinc-900/80 p-2.5 rounded-2xl rounded-tr-none text-zinc-300 max-w-[80%]">
              تمام اعتمد الشحن، العنوان: شارع النزهة مصر الجديدة.
            </div>
            <div className="bg-zinc-900/90 border border-white/10 p-3 rounded-xl text-zinc-200 text-[11px] flex items-center gap-2 font-mono">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تم إنشاء الطلب #8912، وإرسال بوليصة الشحن لشركة بوسطة، وحجز المخزون تلقائياً.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "crm",
      label: "مسارات المبيعات (CRM)",
      codeName: "PIPELINE_ENGINE",
      title: "تتبع كل عميل من أول استفسار وحتى التسليم",
      lead: "قسّم صفقاتك إلى مراحل واضحة: عميل جديد، استفسار عن سعر، منتظر التأكيد، ومكتمل. تخلص من نسيان العملاء المترددين بمتابعات آلية منظمة.",
      bullets: [
        "سحب وإفلات الصفقات بين مراحل البيع بسلاسة",
        "تنبيهات فورية للمحادثات المعلقة التي لم يُرد عليها",
        "سجل تاريخي كامل بمشتريات العميل السابقة وعنوانه وملاحظاته",
      ],
      mockup: (
        <div className="space-y-3 bg-zinc-950 p-5 rounded-2xl border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px]">
            <span className="text-zinc-300">مسار المبيعات: طلبات الأسبوع</span>
            <span className="text-emerald-400 font-bold">148,200 ج.م</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl space-y-1.5">
              <div className="text-zinc-400 font-bold">مهتم (18)</div>
              <div className="bg-zinc-900 p-2 rounded text-zinc-300 border border-white/5 text-[10px]">
                طلب أ/ ماجد — 1,250 ج
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl space-y-1.5">
              <div className="text-amber-400 font-bold">تفاوض (9)</div>
              <div className="bg-zinc-900 p-2 rounded text-zinc-300 border border-white/5 text-[10px]">
                شركة الأهرام — 8,400 ج
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl space-y-1.5">
              <div className="text-emerald-400 font-bold">تم الشحن (42)</div>
              <div className="bg-zinc-900 p-2 rounded text-zinc-300 border border-white/5 text-[10px]">
                طلب د/ هبة — 2,100 ج
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "erp",
      label: "المخازن والمشتريات",
      codeName: "INVENTORY_SYNC",
      title: "تزامن لحظي يمنع البيع الوهمي وتضارب المخزون",
      lead: "اربط مستودعك المركزي بفروع المحلات ومتجرك الإلكتروني. كل حركة بيع في المحل تخصم من أونلاين فوراً، لمنع بيع منتج غير موجود فعلياً.",
      bullets: [
        "جرد لحظي بنظام الباركود عبر الموبايل أو قارئ الليزر",
        "تنبيهات تلقائية عند وصول أي صنف لحد إعادة الطلب",
        "إدارة فواتير الشراء، دفعات الموردين، وتكاليف النقل",
      ],
      mockup: (
        <div className="space-y-3 bg-zinc-950 p-5 rounded-2xl border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px]">
            <span className="text-zinc-300">حالة المستودع الرئيسي</span>
            <span className="text-zinc-400">مخزن مُزامَن لحظياً</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "حذاء جلد كلاسيك أسود 43", stock: "17 قطعة", status: "متوفر", color: "text-emerald-400" },
              { name: "قميص قطن أبيض مقاس L", stock: "3 قطع فقط", status: "قارب على النفاد", color: "text-amber-400" },
              { name: "حقيبة لابتوب مقاومة للمياه", stock: "0 قطعة", status: "غير متوفر", color: "text-zinc-500" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                <span className="text-zinc-200">{item.name}</span>
                <div className="text-right">
                  <span className={`font-bold ${item.color}`}>{item.status}</span>
                  <span className="text-zinc-500 mr-2">({item.stock})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "finance",
      label: "المالية والتسويات",
      codeName: "WALLET_SETTLEMENTS",
      title: "تسويات مالية فورية مع شركات الشحن والمسوقين",
      lead: "تتبع فلوس الـ COD المعلقة لدى شركات الشحن، واصرف عمولات المسوقين والمناديب بدقة بدون خلط الحسابات أو مفاجآت في الأرباح الصافية.",
      bullets: [
        "محفظة رقمية مخصصة لكل مندوب أو مسوق بالعمولة",
        "حساب صافي الربح الحقيقي بعد خصم الإعلانات وتكلفة الشحن والمرتجعات",
        "تقارير تدفق نقدي وأرباح يومية وشهرية بضغطة زر",
      ],
      mockup: (
        <div className="space-y-4 bg-zinc-950 p-5 rounded-2xl border border-white/[0.06] text-xs font-mono">
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase">صافي الرصيد المتاح للتشغيل</div>
            <div className="text-3xl font-black text-white">
              342,850 <span className="text-xs text-zinc-400 font-normal">ج.م</span>
            </div>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">تحصيل COD شركة بوسطة (#8821)</span>
              <span className="text-emerald-400 font-bold">+18,400 ج.م</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">صرف عمولات مبيعات المندوبين</span>
              <span className="text-zinc-400 font-bold">-2,950 ج.م</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "hr",
      label: "فريق العمل والموظفين",
      codeName: "STAFF_PRODUCTIVITY",
      title: "ربط إنتاجية موظفيك بالمبيعات الفعلية",
      lead: "تعرف على مَن في فريقك يجيب على العملاء بأسرع وقت ويحقق أعلى نسبة إغلاق، مع تنظيم مواعيد العمل والورديات بكل سهولة.",
      bullets: [
        "إحصائيات فورية لعدد المحادثات والطلبات المقفولة لكل موظف",
        "توزيع عادل وتلقائي للعملاء على الموظفين المتاحين",
        "نظام احتساب آلي لعمولات المبيعات لتحفيز الفريق",
      ],
      mockup: (
        <div className="space-y-3 bg-zinc-950 p-5 rounded-2xl border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px]">
            <span className="text-zinc-300">لوحة إنتاجية موظفي المبيعات</span>
            <span className="text-emerald-400">4 موظفين نشطين</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              { name: "سارة أحمد", orders: "31 طلب مؤكد", rev: "38,400 ج", speed: "1.2 دقيقة" },
              { name: "خالد محمود", orders: "26 طلب مؤكد", rev: "29,100 ج", speed: "1.8 دقيقة" },
            ].map((emp, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <div className="font-bold text-white font-sans">{emp.name}</div>
                <div className="text-emerald-400">{emp.orders}</div>
                <div className="text-[10px] text-zinc-500 flex justify-between pt-1 border-t border-white/5">
                  <span>{emp.rev}</span>
                  <span>متوسط: {emp.speed}</span>
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
    <section id="modules" className="relative py-24 sm:py-36 border-t border-white/[0.06] bg-zinc-950/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="max-w-2xl mb-14 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>جولة حية داخل الأقسام</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            شاهد كيف يعمل النظام،
            <br />
            <span className="text-zinc-400 font-normal">وكيف يدير تفاصيل يومك.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            اختر أي قسم لتستعرض سيناريو تشغيل حي يوضح كيف يربط Max P دورة البيع والتشغيل دون أخطاء.
          </p>
        </div>

        {/* Tactile Tab Selector (Emil-Style Physics) */}
        <div className="flex items-center justify-start gap-2 flex-wrap mb-10">
          {modules.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                  isActive
                    ? "bg-zinc-100 text-zinc-950 font-bold shadow-md shadow-white/5"
                    : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/15"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Double-Bezel Display Panel */}
        <div className="p-1 sm:p-1.5 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] shadow-2xl">
          <div className="rounded-[calc(2.5rem-0.375rem)] bg-zinc-950 p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModule.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center"
              >
                {/* Descriptive Info */}
                <div className="lg:col-span-7 space-y-6 text-right">
                  <span className="inline-block text-[11px] font-mono text-zinc-400 px-3 py-1 rounded-md bg-white/[0.03] border border-white/10">
                    MODULE: {currentModule.codeName}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                    {currentModule.title}
                  </h3>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {currentModule.lead}
                  </p>

                  <ul className="space-y-3 pt-2">
                    {currentModule.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-200">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <a
                      href="#calculator"
                      className="inline-flex items-center gap-2 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                    >
                      <span>احسب الوفر المالي لشركتك من هذا القسم</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Simulated Screen */}
                <div className="lg:col-span-5">
                  {currentModule.mockup}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
};
