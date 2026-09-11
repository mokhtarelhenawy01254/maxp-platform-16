import React from "react";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, ShieldAlert, Zap } from "lucide-react";

export const LandingComparison: React.FC = () => {
  const painPoints = [
    "شراء ودفع 6 إلى 10 اشتراكات شهرية منفصلة (CRM، محاسبة، HR، متجر، واتساب بوت...)",
    "بيانات العملاء متناثرة بين شيتات Excel، محادثات الواتساب، والرسائل الضائعة",
    "تأخر الرد على العملاء لساعات فيفقد العميل حماسه ويشتري من المنافس",
    "تضارب أرصدة المخازن بين الفروع والمتجر، وبيع بضاعة غير متوفرة بالفعل",
    "صعوبة معرفة من في فريق العمل ينجز ومن يتكاسل، وضياع نسب العمولات",
    "تسويات يدوية معقدة ومرهقة مع شركات الشحن والمناديب والمسوقين",
  ];

  const gainPoints = [
    "اشتراك موحد شامل يبدأ من 299 ج.م/شهر يغنيك عن 10 أنظمة وفواتير مبعثرة",
    "سجل موحد 360 درجة لكل عميل: محادثاته، طلباته السابقة، وقوائم اهتماماته في شاشة واحدة",
    "وكيل AI نشط 24/7 يرد في ثانيتين، يغلق الصفقات، ويؤكد عناوين التوصيل فوراً",
    "تزامن فوري دقيق للمخازن يخصم الكميات لحظياً ويمنع البيع الوهمي وعجز البضاعة",
    "لوحة قيادة تفاعلية توضح مبيعات وإنتاجية كل موظف بدقة وأمانة",
    "تسويات مالية آلية 100% بمحفظة رقمية للمسوقين والمناديب دون حسابات يدوية",
  ];

  return (
    <section id="comparison" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>المقارنة الحاسمة بالأرقام والتجربة</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            لماذا يختار التجار ورواد الأعمال
            <br />
            <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
              منصة Max P بديلاً عن أي حل آخر؟
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            الفرق بين أن تقضي يومك في إطفاء حرائق التشغيل، أو أن تمتلك نظاماً يعمل بكفاءة وأنت تركز على مضاعفة أرباحك.
          </p>
        </div>

        {/* 2-Column Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Old Way (Pain) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-red-950/20 border border-red-500/30 p-6 sm:p-8 space-y-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 pb-6 border-b border-red-500/20">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">الوضع التقليدي: أدوات مشتتة وفواتير متراكمة</h3>
                  <div className="text-xs text-red-300 font-semibold">تكلفة باهظة + وقت مهدر + أخطاء بشرية متكررة</div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                {painPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-red-500/20 text-center">
              <span className="text-xs font-bold text-red-300 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 inline-block">
                متوسط التكلفة الشهرية: 4,500 - 8,000 ج.م لاشتراكات متفرقة
              </span>
            </div>
          </motion.div>

          {/* Max P Way (Gain) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-emerald-950/25 border border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-950/30 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-3 pb-6 border-b border-emerald-500/20">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">مع Max P: نظام تشغيل موحد بالذكاء الاصطناعي</h3>
                  <div className="text-xs text-emerald-300 font-semibold">تحكم كامل + أتمتة فورية + توفير 60% من التكاليف</div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                {gainPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-emerald-500/20 text-center">
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/40 inline-block">
                اشتراك واحد موحد يبدأ من 299 ج.م/شهر فقط
              </span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
