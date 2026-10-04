import React from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

export const LandingComparison: React.FC = () => {
  const painPoints = [
    "شراء 5 إلى 8 اشتراكات لبرامج منفصلة (CRM، محاسبة، مخازن، شات بوت، HR) بفواتير شهرية بين 4,500 و 8,000 ج.م",
    "تشتت رسائل العملاء بين واتساب وفيسبوك وإنستغرام وشيتات الإكسيل",
    "تأخر الرد على العملاء لساعات فيفقد العميل حماسه ويشتري من المنافس الأسرع",
    "تضارب أرصدة المخازن بين الفروع والمتجر، وبيع بضاعة غير متوفرة بالفعل للعملاء",
    "صعوبة معرفة من في فريق العمل ينجز ومن يتكاسل، وضياع نسب وعمولات المبيعات",
    "تسويات يدوية مرهقة ومعقدة مع شركات الشحن والمناديب والمسوقين في نهاية كل شهر",
  ];

  const gainPoints = [
    "اشتراك موحد يبدأ من 299 ج.م شهرياً يغنيك عن شراء ودمج برامج متفرقة كتيرة",
    "سجل موحد لكل عميل يجمع محادثاته، طلباته السابقة، ورقم هاتفه البديل في شاشة واحدة",
    "رد ذكي فوري في أوقات الذروة وخارج الدوام لتأكيد الطلبات فوراً",
    "جرد لحظي بنظام الباركود يخصم الأرصدة تلقائياً ويمنع عجز البضاعة وسرقة الفواتير",
    "لوحة أداء واضحة تبين مبيعات كل موظف، سرعة رده، والأوردرات المقفولة بأمانة",
    "تسويات مالية آلية بمحفظة رقمية مخصصة لتحصيلات COD وعمولات المسوقين",
  ];

  return (
    <section id="comparison" className="relative py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="max-w-2xl mb-16 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>مقارنة واقعية من صلب التشغيل</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            الفرق بين إطفاء حرائق التشغيل،
            <br />
            <span className="text-zinc-400 font-normal">وبين التفرغ لمضاعفة أرباحك.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            مقارنة مباشرة بالأرقام والتجربة بين فوضى البرامج المبعثرة، وبين امتلاك نظام تشغيل موحد يربط فريقك ومخازنك.
          </p>
        </div>

        {/* 2-Column High-Contrast Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: Separated Chaotic Software */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="p-1 rounded-[2.25rem] bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="pb-6 border-b border-white/[0.06]">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">الوضع اليدوي التقليدي</div>
                  <h3 className="text-xl font-bold text-zinc-300">أدوات مبعثرة وتكاليف اشتراك متراكمة</h3>
                </div>

                <div className="space-y-4 pt-6">
                  {painPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-3 h-3" />
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.06] text-center">
                <span className="text-xs font-mono text-zinc-400">
                  متوسط التكلفة الشهرية: 4,500 – 8,000 ج.م لاشتراكات متفرقة
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Max P Unified OS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="p-1 rounded-[2.25rem] bg-white/[0.05] border border-white/[0.12] shadow-2xl flex flex-col justify-between"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="pb-6 border-b border-white/[0.08]">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase mb-1">مع MAX P BUSINESS OS</div>
                  <h3 className="text-xl font-bold text-white">نظام تشغيل موحد يربط كل التفاصيل</h3>
                </div>

                <div className="space-y-4 pt-6">
                  {gainPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.08] text-center">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full inline-block">
                  اشتراك موحد يبدأ من 299 ج.م شهرياً شامل كل الأدوات
                </span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
