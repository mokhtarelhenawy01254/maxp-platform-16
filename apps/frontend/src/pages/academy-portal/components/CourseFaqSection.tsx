import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, MessageSquareQuote } from "lucide-react";

export const FAQ_ITEMS = [
  {
    q: "غالي — 500 ج.م؟",
    a: "السعر مدفوع مرة واحدة وبتفضل معاك. الفلوس بتتصرف مرة واحدة على مسار كامل بدل ما تجرّب لوحدك شهر ورا شهر. ومقابل التجربة العشوائية بتوفّر وقت وفلوس.",
  },
  {
    q: "معنديش وقت لـ25 درس.",
    a: "كل درس قصير (بين 5 و11 دقيقة) وفكرة واحدة، فتقدر تسمعه في أي وقت من الموبايل. مش محتاج جلسات طويلة — بتتعلم خطوة وتنفّذها.",
  },
  {
    q: "أنا مش تقني، والإعلانات دي حاجة معقدة.",
    a: "الكورس مكتوب بالعربي المصري من غير جارجون، والأبواب ماشية بنفس ترتيب شغلك: تعرف عميلك ← عرضك ← سعرك ← محتواك ← إعلانك ← رقمك. كل خطوة على الخطوة اللي قبلها.",
  },
  {
    q: "جربت كورسات قبل كده وكلها كلام نظري فاضي.",
    a: "الفرق هنا إن الكورس جوه المنصة — كل درس معاه تمرين بيتنفذ على شاشتك، وكوتش يجاوب من محتوى الدرس نفسه. مش سلايدات وخلاص.",
  },
  {
    q: "أنا عندي حد بيعمل لي الإعلانات.",
    a: "كويس — الكورس بتخلّيك تفهم اللي بيتعمل وتعرف تقيس، فتبقى إنت اللي بتقرر مش اللي بيدفع بس. لو وكالة بتدير غيرك، الكورس ده لصاحب المشروع.",
  },
  {
    q: "شغلي مش زي اللي في الكورس.",
    a: "المسار مبني على الخطوات الأساسية لأي صاحب مشروع بيعتمد على إعلانات: السوق والعميل، العرض والسعر، المحتوى، الحملة، والقياس. الشاشات من المنصة، والأمثلة على الخطوات نفسها.",
  },
  {
    q: "فيه دروس لسه مش مكتملة؟",
    a: "السلسلة 25 درس، ومعظمها متاح ومرتب على الأكاديمية دلوقتي. لو درس معيّن لسه في التجهيز، بيوصل لحاله بمجرد ما يكتمل، وإنت معاك الكورس كامل.",
  },
  {
    q: "محتاج أفكر.",
    a: "تمام. ابدأ بالدرس الأول المجاني وشوف بنفسك — لو حسّيت إن ده مسارك، كمل؛ لو لأ، مش خسرت حاجة.",
  },
];

export const CourseFaqSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 space-y-5 text-right shadow-xs" dir="rtl">
      <div className="space-y-1.5 border-b border-border/60 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>إجابات واضحة ومباشرة</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">الأسئلة الشائعة قبل الاشتراك</h2>
      </div>

      <div className="divide-y divide-border/50 space-y-2">
        {FAQ_ITEMS.map((faq, idx) => {
          const isOpen = openFaq === idx;

          return (
            <div key={idx} className="pt-2.5">
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-3 text-right py-2 text-xs font-bold text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                  <span>{faq.q}</span>
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {isOpen && (
                <p className="p-3.5 text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/40 rounded-xl mt-1.5 transition-all">
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
