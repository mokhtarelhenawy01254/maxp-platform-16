import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TASTE_FAQS } from "./clothingTasteData";

export const ClothingTasteFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-16 border-b border-white/[0.08] bg-[#0c0e14]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-right mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            الأسئلة الشائعة من أصحاب ومسؤولي البراندات
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            إجابات واضحة ومباشرة حول كيفية عمل المنظومة وربط الفروع والشحن.
          </p>
        </div>

        <div className="space-y-3">
          {TASTE_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-[#111318] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-blue-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-3">
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
