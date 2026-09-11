import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Bot,
  Boxes,
  Users,
  Share2,
  Workflow,
  Sparkles,
  CheckCircle,
  Database,
  Building2,
  Zap,
} from "lucide-react";

export const LandingBentoGrid: React.FC = () => {
  return (
    <section id="tools" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>20 أداة في اشتراك واحد — Bento Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            منظومة تشغيل متكاملة
            <br />
            <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
              تغنيك عن 10 اشتراكات منفصلة
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            بدلاً من تشتيت فريقك بين برامج مختلفة لا تتصل ببعضها، كل قسم في Max P متصل مباشرة بالقسم الآخر وتتحدث بياناتهم تلقائياً.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Featured Omni-channel + AI Chat (Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="md:col-span-7 group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-red-500/40 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-red-950/40 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-red-600/20 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                  صندوق الوارد الذكي
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                أتمتة المحادثات ووكلاء الـ AI التوليديين
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                استقبل جميع رسائل واتساب، إنستغرام، ومسنجر في شاشة موحدة. يقوم وكيل الذكاء الاصطناعي بالرد على استفسارات الأسعار، ترشيح المنتجات، وتأكيد عنوان التوصيل تلقائياً بدون انتظار.
              </p>

              {/* Chat Simulation Preview */}
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 space-y-2.5 font-sans">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300 font-bold shrink-0">
                    ع
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tr-none px-3.5 py-2 text-xs text-slate-200">
                    متاح فستان المقاس L وألوانه إيه؟
                  </div>
                </div>

                <div className="flex items-start gap-2.5 justify-end">
                  <div className="bg-gradient-to-r from-red-600/20 to-amber-600/20 border border-red-500/30 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs text-red-100 max-w-[85%]">
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold mb-1">
                      <Sparkles className="w-3 h-3" />
                      رد آلي فوري (AI Agent)
                    </div>
                    أهلاً بك! متاح مقاس L بلونين (أسود وزيتي). السعر 650 ج.م والشحن مجاني اليوم. تحب نحجز لحضرتك؟
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-white/10 text-center">
              <div>
                <div className="text-lg font-black text-white">99.8%</div>
                <div className="text-[11px] text-slate-400">سرعة استجابة</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-400">24/7</div>
                <div className="text-[11px] text-slate-400">بدون إجازات</div>
              </div>
              <div>
                <div className="text-lg font-black text-amber-400">+45%</div>
                <div className="text-[11px] text-slate-400">رفع تحويل الطلبات</div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: ERP & Inventory (Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-5 group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-blue-500/40 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-950/40 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Boxes className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  ERP & مخازن
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-3">
                إدارة المخزون والمشتريات
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                ربط المخازن، الفروع، والموردين بدقة. تنبيهات تلقائية لنقص الكميات، وتتبع فواتير الشراء ومديونيات الموردين دون أخطاء يدوية.
              </p>

              <div className="space-y-2 rounded-2xl bg-slate-950/70 border border-white/10 p-3.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>تزامن الفروع والمستودعات</span>
                  <span className="text-emerald-400 font-bold">لحظي</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>تنبيهات نقص المنتجات</span>
                  <span className="text-amber-400 font-bold">مفعل آلياً</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>ربط باركود وماكينات POS</span>
                  <span className="text-blue-400 font-bold">جاهز</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-blue-300">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span>جرد دقيق يمنع عجز البضاعة وسرقة الفواتير</span>
            </div>
          </motion.div>

          {/* Card 3: Growth & Affiliate System (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-4 group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-amber-500/40 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                شبكة مسوقين بالعمولة (Affiliate)
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                ابنِ جيش مبيعات خارجي. أدر مئات المسوقين بروابط تتبع مخصصة وتسويات مالية آلية بمحفظة داخلية.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>توسع بدون ميزانيات إعلانات ضخمة</span>
            </div>
          </motion.div>

          {/* Card 4: HR & Team Performance (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-4 group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-purple-500/40 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                HR والإنتاجية والمكافآت
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                متابعة حضور وانصراف الفريق، احتساب العمولات التلقائية لكل بائع ومندوب، وربط مهام العمل بالنتائج المباشرة.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>لوحة أداء لحظية لكل موظف</span>
            </div>
          </motion.div>

          {/* Card 5: Multi-Tenant & White-Label (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-4 group relative rounded-3xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                White-Label & شركات متعددة
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                أدِر أكثر من شركة ومحل من نفس الحساب، أو أعد بيع المنصة باسم وعلامة وكالتك التجارية كشريك تقني معتمد.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>دخل شهري متكرر للوكالات</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
