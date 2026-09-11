import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export const LandingFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: "هل أحتاج إلى خبرة تقنية أو مبرمج لتشغيل Max P؟",
      a: "إطلاقاً. النظام مصمم ليعمل مباشرة بدون كتابة سطر كود واحد، وبواجهة عربية كاملة وسهلة الفهم. كما يتوفر فريق دعم فني يساعدك في ضبط إعداداتك الأولى وربط أرقام الواتساب والمخازن.",
    },
    {
      q: "كيف أنقل بيانات العملاء والمنتجات الحالية من Excel أو سلة أو شوبيفاي؟",
      a: "يوفر النظام أدوات استيراد ذكية تمكّنك من رفع شيتات Excel أو CSV بضغطة زر واحدة، أو الربط المباشر مع متجرك الحالي لمزامنة الكتالوج والأسعار دون الحاجة لإعادة كتابة أي منتج يدوياً.",
    },
    {
      q: "هل ربط الواتساب رسمي ومحمي ضد الحظر؟",
      a: "نعم، التكامل يتم وفق بروتوكول WhatsApp Cloud API الرسمي التابع لشركة Meta مباشرة، مما يضمن أمان أرقامك الرسمية، واستقرار البث، والرد الآلي بدون أي برامج غير رسمية قد تعرض حسابك للإيقاف.",
    },
    {
      q: "ما هي تكلفة الاشتراك وهل يوجد التزام سنوي إجباري؟",
      a: "تبدأ الباقات من 299 ج.م شهرياً مع اشتراك شهري مرن يمكنك ترقيته أو إيقافه في أي وقت بدون أي شروط جزائية أو قيود.",
    },
    {
      q: "ماذا عن حماية وسرية بيانات المبيعات والعملاء؟",
      a: "بياناتك مشفرة بالكامل ومعزولة بأحدث معايير الأمان وقواعد الصلاحيات المتقدمة، مع نسخ احتياطي دوري لكل بيانات المخازن والمبيعات. بياناتك ملك لك وحدك وتستطيع تصديرها بنقرة زر في أي وقت.",
    },
  ];

  return (
    <section id="faq" className="relative py-24 sm:py-36 border-t border-white/[0.06] bg-zinc-950/40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="max-w-2xl mb-16 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>الأسئلة الشائعة</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            إجابات واضحة
            <br />
            <span className="text-zinc-400 font-normal">عن كل ما يدور في ذهنك.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            كل ما تحتاجه لتتأكد من ملاءمة النظام لنشاطك التجاري.
          </p>
        </div>

        {/* FAQ List with Double-Bezel items */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="p-1 rounded-[1.75rem] bg-white/[0.03] border border-white/[0.08] transition-all duration-300"
              >
                <div className="rounded-[calc(1.75rem-0.25rem)] bg-zinc-950 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full text-right p-5 sm:p-6 flex items-center justify-between gap-4 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-white text-sm sm:text-base font-sans">
                      {faq.q}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/10 text-zinc-400 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        isOpen ? "rotate-180 bg-white/10 text-white" : "bg-white/[0.02]"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] pt-4 font-sans">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
