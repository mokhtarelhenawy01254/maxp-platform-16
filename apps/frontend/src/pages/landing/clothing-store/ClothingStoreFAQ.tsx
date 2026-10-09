import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { CLOTHING_FAQS } from "./clothingStoreData";

export const ClothingStoreFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 border-b border-white/5 bg-[#050608]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="csn-badge mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>إجابات واضحة ومباشرة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight csn-text-balance mb-2">
            الأسئلة الشائعة حول المنظومة
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed csn-text-pretty">
            كل ما يهمك معرفته حول تشغيل المتجر، ربط بوسطة، وكاشير الفروع.
          </p>
        </div>

        <div className="space-y-3">
          {CLOTHING_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="csn-panel overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-right gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-white leading-relaxed">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-white/5 csn-text-pretty">
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
