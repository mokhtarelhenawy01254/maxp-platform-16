import React from "react";
import { MessageCircle, Plus, Trash2 } from "lucide-react";

interface WhatsAppGreetingEditorProps {
  greeting: string;
  onGreetingChange: (val: string) => void;
  quickFaqs: string[];
  onQuickFaqsChange: (faqs: string[]) => void;
}

const DEFAULT_FAQ_SUGGESTIONS = [
  "أرغب بطلب هذا المنتج، ما هي خطوات التأكيد؟",
  "ما هي مدة وتكلفة الشحن لمحافظتي؟",
  "هل يمكنني معاينة المنتج قبل الدفع عند الاستلام؟",
  "هل يوجد ألوان أو مقاسات أخرى متوفرة؟",
];

export const WhatsAppGreetingEditor: React.FC<WhatsAppGreetingEditorProps> = ({
  greeting,
  onGreetingChange,
  quickFaqs,
  onQuickFaqsChange,
}) => {
  const handleAddFaq = (text = "") => {
    if (quickFaqs.length >= 3) return;
    onQuickFaqsChange([...quickFaqs, text]);
  };

  const handleUpdateFaq = (index: number, text: string) => {
    const updated = [...quickFaqs];
    updated[index] = text;
    onQuickFaqsChange(updated);
  };

  const handleRemoveFaq = (index: number) => {
    onQuickFaqsChange(quickFaqs.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
              قالب بدء المحادثة على WhatsApp
            </h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              الرسالة التلقائية والأسئلة السريعة التي تظهر للعميل عند النقر على الإعلان
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-900/50">
          Click-to-WhatsApp
        </span>
      </div>

      {/* Greeting Message */}
      <div>
        <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1.5">
          رسالة الترحيب التلقائية (Greeting Message)
        </label>
        <textarea
          value={greeting}
          onChange={(e) => onGreetingChange(e.target.value)}
          placeholder="أهلاً بك! يسعدنا تواصلك معنا بخصوص هذا المنتج. كيف يمكننا مساعدتك اليوم؟"
          rows={2}
          maxLength={140}
          className="w-full px-3 py-2 border border-emerald-300 dark:border-emerald-800 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 text-left">
          {greeting.length}/140
        </p>
      </div>

      {/* Quick FAQs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            الأسئلة السريعة المقترحة للعميل (Quick Questions)
          </label>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {quickFaqs.length} من 3 أسئلة
          </span>
        </div>

        {quickFaqs.map((faq, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
              س {index + 1}:
            </span>
            <input
              type="text"
              value={faq}
              onChange={(e) => handleUpdateFaq(index, e.target.value)}
              placeholder="اكتب سؤالاً يظهر كزر سريع للعميل..."
              maxLength={80}
              className="flex-1 px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleRemoveFaq(index)}
              className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              title="حذف هذا السؤال"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {quickFaqs.length < 3 && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => handleAddFaq()}
              className="w-full py-2 border border-dashed border-emerald-400 dark:border-emerald-700 hover:border-emerald-600 dark:hover:border-emerald-500 bg-emerald-100/40 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة سؤال مقترح بنقرة واحدة
            </button>

            {/* Suggestions */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">مقترحات شائعة:</span>
              {DEFAULT_FAQ_SUGGESTIONS.filter((s) => !quickFaqs.includes(s)).map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddFaq(s)}
                  className="text-[10px] px-2 py-0.5 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mini Preview Box */}
      <div className="p-3 bg-white/80 dark:bg-gray-800/80 border border-emerald-200 dark:border-emerald-900/40 rounded-lg space-y-2">
        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
          معاينة تجربة العميل عند فتح المحادثة:
        </span>
        <div className="bg-[#EFEAE2] dark:bg-[#111b21] p-3 rounded-lg text-right space-y-2">
          <div className="bg-white dark:bg-[#202c33] p-2 rounded-lg shadow-sm max-w-[85%] inline-block text-xs text-gray-800 dark:text-gray-100">
            {greeting || "أهلاً بك! يسعدنا تواصلك معنا..."}
            <span className="text-[9px] text-gray-400 dark:text-gray-400 block text-left mt-0.5">الآن ✓✓</span>
          </div>
          {quickFaqs.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[9px] text-gray-500 dark:text-gray-400 block">أسئلة يمكن للعميل إرسالها بنقرة واحدة:</span>
              {quickFaqs.filter(Boolean).map((faq, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1 bg-white dark:bg-[#202c33] border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-full text-[11px] inline-block shadow-xs ml-1 mb-1"
                >
                  {faq}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
