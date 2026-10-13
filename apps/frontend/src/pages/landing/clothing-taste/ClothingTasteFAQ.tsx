import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { TASTE_FAQS } from "./clothingTasteData";

export const ClothingTasteFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-16 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-right mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-700" />
            <span>أسئلة وإجابات</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#141416] tracking-tight mb-2">
            الأسئلة الشائعة من أصحاب ومسؤولي البراندات
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600">
            إجابات واضحة ومباشرة حول كيفية عمل المنظومة وربط الفروع والشحن.
          </p>
        </div>

        <div className="space-y-3">
          {TASTE_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-black/[0.08] bg-white overflow-hidden shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 font-bold text-sm text-[#141416] hover:text-black transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#141416]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-zinc-600 leading-relaxed border-t border-black/[0.06] pt-3">
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
