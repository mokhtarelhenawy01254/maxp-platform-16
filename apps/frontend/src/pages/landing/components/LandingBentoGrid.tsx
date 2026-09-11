import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Boxes,
  Users,
  Wallet,
  Workflow,
  ShieldCheck,
  Check,
} from "lucide-react";

export const LandingBentoGrid: React.FC = () => {
  return (
    <section id="tools" className="relative py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>البنية المعمارية للمنظومة</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            أدوات متصلة ببعضها،
            <br />
            <span className="text-zinc-400 font-normal">مش شاشات منفصلة.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            كل قسم في Max P يسلّم البيانات للقسم التالي تلقائياً: العميل يدخل من الإعلان، المحادثة تحوله لأوردر، المخزن يخصم القطعة، وبوليصة الشحن تتجهز في ثوانٍ.
          </p>
        </div>

        {/* Double-Bezel Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Featured Omni-channel Inbox (Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="md:col-span-7 p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all duration-500"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 border border-white/10 px-2.5 py-1 rounded-full">
                    Omnichannel Inbox
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  صندوق محادثات موحد وأتمتة ذكية
                </h3>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6">
                  استقبل رسائل واتساب، إنستغرام، وفيسبوك في شاشة واحدة. يوزع النظام المحادثات على فريق المبيعات بنظام، مع تشغيل الرد الذكي 24/7 للإجابة على الأسئلة المتكررة وتأكيد العناوين بدون تأخير.
                </p>

                {/* Practical Scenario Inside Card */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 text-xs space-y-3 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>قنوات مربوطة: WhatsApp Cloud + Instagram Direct</span>
                    <span className="text-emerald-400">نشط</span>
                  </div>
                  <div className="text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-white/5 font-sans leading-relaxed text-xs">
                    "العميل أرسل استفساراً عبر واتساب ← تم تصنيفه كعميل ساخن ← تأكيد مقاس الحذاء وحجز القطعة من المخزن فوراً."
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>تكامل رسمي بدون حظر للأرقام</span>
                <span className="text-zinc-300">رد فوري بدون انتظار</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Inventory & Warehouses (Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="md:col-span-5 p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all duration-500"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 border border-white/10 px-2.5 py-1 rounded-full">
                    Multi-Warehouse ERP
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  إدارة المخازن والباركود والفروع
                </h3>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-4">
                  جرد دقيق يمنع عجز البضاعة وسرقة الفواتير. خصم لحظي للأرصدة مع كل عملية بيع أونلاين أو في المحل، مع تنبيهات قبل نفاد أي منتج مطلوب.
                </p>

                <div className="space-y-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 text-xs font-mono text-zinc-300">
                  <div className="flex justify-between">
                    <span>مزامنة فروع ومستودعات</span>
                    <span className="text-emerald-400">لحظي</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تتبع فواتير ومشتريات الموردين</span>
                    <span className="text-zinc-200">مكتمل</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>ربط مباشر مع ماكينات POS وقارئ الباركود</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Sales CRM Pipelines (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="md:col-span-4 p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all duration-500"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-7 h-full flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200 mb-6">
                  <Workflow className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  مسارات البيع ومتابعة العملاء
                </h3>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  تتبع كل عميل من مرحلة الاهتمام وحتى إتمام الشحن. إرسال تذكيرات تلقائية للعملاء المترددين لاستعادة الطلبات الضائعة.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-zinc-400">
                رفع استرداد السلات المتروكة بنسبة 28%
              </div>
            </div>
          </motion.div>

          {/* Card 4: Finance & Commissions (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="md:col-span-4 p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all duration-500"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-7 h-full flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200 mb-6">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  المالية والمحفظة الرقمية
                </h3>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  تسويات تلقائية لمدفوعات الدفع عند الاستلام (COD) مع شركات الشحن، واحتساب دقيق لعمولات المسوقين والمناديب.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-zinc-400">
                تسوية آلية 100% بدون دفاتر يدوية
              </div>
            </div>
          </motion.div>

          {/* Card 5: HR & Team Productivity (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="md:col-span-4 p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-white/20 transition-all duration-500"
          >
            <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-7 h-full flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-200 mb-6">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  إنتاجية الفريق وشؤون الموظفين
                </h3>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  لوحة تحكم توضح من في فريقك يحقق أعلى مبيعات وأفضل خدمة عملاء، مع إدارة الدوام والمكافآت بنظام واضح.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-zinc-400">
                ربط الإنتاجية بالمبيعات الفعلية
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
