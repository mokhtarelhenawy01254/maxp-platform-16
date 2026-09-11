import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Bot,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Play,
} from "lucide-react";

interface LandingHeroProps {
  onPreloadRegister?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onPreloadRegister,
}) => {
  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
      {/* Dynamic Background Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-red-600/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-7 text-center lg:text-right"
          >
            {/* Top Pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/25 text-red-300 text-xs font-bold mb-6 backdrop-blur-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>الجيل الجديد من منصات إدارة وتشغيل الشركات 2026</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.15] sm:leading-[1.12] tracking-tight mb-6"
            >
              وداعاً لتشتت 10 أنظمة...
              <br />
              <span className="bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                نظام واحد ذكي
              </span>{" "}
              يدير كل مبيعاتك وتشغيلك
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8"
            >
              لا تضيّع وقتك وأموالك بين اشتراكات مبعثرة للـ CRM والمخازن وواتساب والموظفين.
              <strong className="text-white"> Max P </strong>
              يجمع المبيعات، المحادثات، المخازن، الحسابات، ووكلاء الـ AI التوليديين في لوحة قيادة موحدة — لتبدأ التحويل الفوري من أول دقيقة.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
            >
              <Link
                to="/auth/register"
                className="w-full sm:w-auto relative group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-red-600/35 hover:shadow-red-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
              >
                <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500 -skew-x-12" />
                <Zap className="w-4 h-4 text-amber-300" />
                <span>ابدأ تشغيل شركتك مجاناً</span>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </Link>

              <a
                href="#modules"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 px-6 py-4 text-sm font-bold text-slate-200 transition-all"
              >
                <Play className="w-4 h-4 text-red-400 fill-red-400/30" />
                <span>جولة حية في النظام</span>
              </a>
            </motion.div>

            {/* Trust Micro-Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-400"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>بدون بطاقة بنكية للتجربة</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>تكامل رسمي وفوري مع واتساب</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>باقات تبدأ من 299 ج.م/شهر</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Console / Interactive Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-5 relative"
          >
            {/* Floating Live Badge 1 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute -top-6 -left-4 sm:-left-8 z-20 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3 shadow-2xl shadow-emerald-950/50 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  طلب بيع مؤكد آلياً
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="text-[10px] text-emerald-300/80 font-mono">
                  +1,850 ج.م • واتساب بوت
                </div>
              </div>
            </motion.div>

            {/* Floating Live Badge 2 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="absolute -bottom-6 -right-4 sm:-right-6 z-20 bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-3 shadow-2xl shadow-red-950/50 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">AI Agent نشط</div>
                <div className="text-[10px] text-slate-400">
                  رد على 184 عميل بدون تدخل بشري
                </div>
              </div>
            </motion.div>

            {/* Main Mockup Window */}
            <div className="relative rounded-3xl bg-slate-950/90 border border-white/15 p-1 shadow-2xl shadow-black/80 overflow-hidden group">
              {/* Border Beam Effect */}
              <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
                <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#ef4444_360deg)] animate-spin-slow opacity-40" />
              </div>

              <div className="relative rounded-[22px] bg-slate-900/95 p-4 sm:p-5 border border-white/10 space-y-4">
                {/* Console Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Max P Business OS • Live Console
                  </div>
                </div>

                {/* Dashboard Snapshot Rows */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      إيرادات اليوم
                    </div>
                    <div className="text-lg font-black text-white">
                      34,820 <span className="text-xs text-red-400">ج.م</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                      ↑ 24% مقارنة بالأمس
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      معدل إغلاق المحادثات
                    </div>
                    <div className="text-lg font-black text-emerald-400">
                      68.4%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      رد آلي فوري في 2 ثانية
                    </div>
                  </div>
                </div>

                {/* Live Activity Feed in Console */}
                <div className="space-y-2 rounded-xl bg-slate-950/60 border border-white/5 p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>نبض العمليات اللحظي</span>
                    <span className="text-emerald-400 text-[9px] animate-pulse">
                      ● مباشر
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-[10px]">
                        WA
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">
                          عميل جديد: أحمد الصاوي
                        </div>
                        <div className="text-[9px] text-slate-500">
                          تم تحويله لطلب شراء مؤكد
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      مكتمل
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">
                        AI
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">
                          جرد وتنبيه مخزون
                        </div>
                        <div className="text-[9px] text-slate-500">
                          باقي 5 قطع من منتج Premium X
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      تنبيه
                    </span>
                  </div>
                </div>

                {/* Quick Interactive Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MessageSquare className="w-3 h-3 text-red-400" />
                    3 قنوات مربوطة ومستقرة
                  </span>
                  <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Uptime 99.9%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
