import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    question: "ما هي منصة MaxP؟",
    answer:
      "نظام تشغيل متكامل يجمع إدارة وتأكيد الطلبات، المخزون متعدد الفروع، بوالص الشحن، ومطابقة الكاش في لوحة تحكم واحدة.",
  },
  {
    question: "هل أحتاج إلى مطوّر لتشغيل النظام؟",
    answer:
      "لا، المنصة سحابية بالكامل وتعمل خلال 15 دقيقة بدون أي أكواد، مع دعم فني يرافقك في تفعيل الربط خطوة بخطوة.",
  },
  {
    question: "هل يمكن ربط شركات الشحن الحالية التي أتعامل معها؟",
    answer:
      "نعم، تربط حسابك المباشر في بوسطة أو أرامكس عبر الـ API وتستمر بنفس أسعارك وتعاقدك لإصدار البوالص وتتبعها تلقائياً.",
  },
  {
    question: "لمن صُممت منصة MaxP؟",
    answer:
      "لأصحاب البراندات والمتاجر ومسؤولي العمليات الذين يديرون مبيعات أونلاين وفروعاً واقعية ويريدون أتمتة دقيقة لدورة الطلب.",
  },
  {
    question: "كيف يساهم النظام في تقليل المرتجعات (RTO)؟",
    answer:
      "عبر إرسال رسالة تأكيد تفاعلية تلقائية للعميل على واتساب للتحقق من المقاس والعنوان، فلا يخرج الطرد إلا بعد تأكيد العميل.",
  },
  {
    question: "كيف تتم مطابقة تحصيلات الدفع عند الاستلام (COD)؟",
    answer:
      "يطابق النظام كشوفات تحصيل شركات الشحن مع الطلبات المسلّمة آلياً لكشف أي فروقات وتحديد صافي أرباحك الفعلي في الخزينة.",
  },
];

export const OlFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-white/70 border-t border-[#013735]/8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#013735]/6 text-[#013735] text-xs font-semibold mb-4">
            <span>عندك أسئلة؟ عندنا الإجابات!</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#013735] tracking-tight leading-tight">
            عندك أسئلة؟ عندنا الإجابات!
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4e6362] font-normal">
            كل ما تحتاج معرفته عن MaxP — من الإعداد وحتى توسيع عمليات تجارتك.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#013735]/10 bg-white overflow-hidden transition-all duration-200 shadow-[0_2px_8px_rgba(1,55,53,0.03)]"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-right flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-[#013735] hover:text-[#02817d] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isOpen
                        ? "bg-[#013735] text-[#3fffba] rotate-180"
                        : "bg-[#f0f5f3] text-[#013735]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm sm:text-base text-[#4e6362] leading-relaxed border-t border-[#013735]/5 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
