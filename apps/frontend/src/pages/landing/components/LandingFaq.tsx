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
      q: "عندي شيتات إكسيل وسيستم قديم.. هل نقل البيانات صعب وهيعطل الشغل؟",
      a: "إطلاقاً! بننقل كل منتجاتك وعملاءك ومخازنك من شيتات Excel السابقة أو من منصات تانية بدون توقف لحظة واحدة في استقبال الأوردرات اليومية.",
    },
    {
      q: "هل ربط الواتساب رسمي ومحمي ضد الحظر من شركة ميتا؟",
      a: "نعم، رسمي بالكامل. الربط يتم مباشرة عبر بروتوكول WhatsApp Cloud API الرسمي المعتمد من Meta، برقمك الخاص وبدون برامج غير رسمية أو كراك يعرض رقمك لخطر الإغلاق.",
    },
    {
      q: "هل السيستم مناسب للمحلات والمخازن ولا للأونلاين بس؟",
      a: "النظام مصمم خصيصاً للتجارة الهجينة (Omnichannel)؛ يعني لو عندك محل في المعادي ومخزن في العاشر من رمضان وصفحة على الفيسبوك، أي قطعة تتباع في المحل تتخصم فوراً من صفحة الأونلاين بدون تكرار بيع.",
    },
    {
      q: "إزاي السيستم بيقلل المرتجعات مع شركات الشحن زي بوسطة؟",
      a: "السيستم فيه قائمة حظر ذكية بتكشف أرقام العملاء اللي مابيستلموش أو بيكنسلوا دايماً، مع كول سنتر لتأكيد العناوين أوتوماتيكياً قبل طبع بوليصة الشحن، وده بيقلل المرتجعات بشكل ملموس شهر بعد شهر.",
    },
    {
      q: "ما هي تكلفة الاشتراك وهل يوجد التزام سنوي إجباري؟",
      a: "مفيش اشتراك موحّد واحد — بتدفع على التطبيقات اللي بتفعّلها. فيها مجاني تقدر تبدأ بيه فورًا، وتقدر تلغي أو ترقّي في أي وقت بضغطة زر.",
    },
    {
      q: "هل أحتاج مبرمج أو خبرة تقنية عشان أشغل السيستم؟",
      a: "لا تحتاج أي مبرمج. السيستم جاهز للتشغيل بالكامل بواجهة عربية واضحة ومباشرة، وفريق الدعم الفني معاك خطوة بخطوة لحد ما تستقبل أول أوردر.",
    },
  ];

  return (
    <section id="faq" className="relative py-24 sm:py-32 border-t border-white/[0.06]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading — Open Layout */}
        <div className="max-w-2xl mb-14 text-right">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-red-400" />
            <span>الأسئلة الشائعة لتجار مصر</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            إجابات واضحة
            <br />
            <span className="text-zinc-400 font-normal">عن النقل، الشحن، والاشتراك.</span>
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            كل ما تحتاجه لتتأكد من ملاءمة النظام لنشاطك التجاري قبل البدء.
          </p>
        </div>

        {/* FAQ List with Pure Open Dividers (Zero Box-in-Box) */}
        <div className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.q} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-right gap-4 cursor-pointer group"
                >
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-zinc-200 transition-colors">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-400 group-hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                        {faq.a}
                      </p>
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

export default LandingFaq;
