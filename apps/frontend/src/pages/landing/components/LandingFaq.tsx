import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export const LandingFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: "هل أحتاج إلى أي خبرة تقنية أو برمجة لتشغيل النظام؟",
      a: "إطلاقاً. النظام مصمم ليعمل بسهولة فائقة وبواجهة عربية واضحة 100%. كما نوفر لك مدير حساب ودعم فني متخصص يساعدك في خطوات الإعداد الأولى وتدريب فريق عملك.",
    },
    {
      q: "كيف أنقل بياناتي وعملائي ومنتجاتي الحالية من Excel أو سلة أو شوبيفاي؟",
      a: "نوفر أدوات استيراد ذكية تمكّنك من رفع شيتات Excel أو CSV بضغطة زر، أو المزامنة المباشرة مع متجرك الحالي على WooCommerce و Shopify دون فقدان أي عميل أو منتج.",
    },
    {
      q: "هل يمكنني ربط رقم واتساب الرسمي للشركة وتوزيع المحادثات على أكثر من موظف؟",
      a: "نعم، يدعم Max P التكامل مع أرقام واتساب متعددة وتوزيع المحادثات تلقائياً على موظفي المبيعات والدعم حسب التخصص أو التفرغ، مع استمرار وكيل الـ AI في العمل خلال فترات الذروة وخارج أوقات العمل.",
    },
    {
      q: "ما هي أسعار الباقات، وهل توجد عقود التزام طويلة؟",
      a: "تبدأ الباقات من 299 ج.م شهرياً مع إمكانية الترقية أو الإلغاء في أي وقت دون أي شروط جزائية. كما يمكنك بدء تجربة مجانية لاختبار جميع مزايا المنصة قبل اتخاذ قرار الاشتراك.",
    },
    {
      q: "كيف تضمنون سرية وأمان بيانات عملاء شركتي ومبيعاتي؟",
      a: "بياناتك مشفرة وفق أعلى معايير الأمان العالمية (End-to-End Encryption) مع نسخ احتياطي دوري كل ساعتين. بياناتك ملك لك وحدك وتستطيع تصديرها بالكامل في أي وقت بنقرة واحدة.",
    },
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-slate-950/60 border-t border-white/10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            إجابات واضحة
            <br />
            <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
              لكل ما قد يدور في ذهنك
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            كل ما تحتاجه لتتخذ قرارك بثقة واطمئنان كاملين.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-slate-900 border-red-500/30 shadow-lg shadow-black/40"
                    : "bg-slate-900/60 border-white/10 hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-right p-5 sm:p-6 flex items-center justify-between gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-white text-sm sm:text-base">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "rotate-180 bg-red-500/20 text-red-400"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
