import React from "react";
import { Cloud, Layers, MessageSquare, Tag, Palette, RefreshCw } from "lucide-react";

interface WhyItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const WHY_LIST: WhyItem[] = [
  {
    icon: <Cloud className="w-5 h-5 text-[#3fffba]" />,
    title: "قائم على السحابة",
    description:
      "تابع وتحكم في كل جزء من عمليات متجرك لحظة بلحظة، في أي وقت ومن أي مكان عبر السحابة.",
  },
  {
    icon: <Layers className="w-5 h-5 text-[#3fffba]" />,
    title: "منصة شاملة متكاملة",
    description:
      "إدارة الطلبات، والمخزون، وفروع المحلات، والشحن، والتذاكر، والتحصيل — مترابطة في منصة واحدة.",
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-[#3fffba]" />,
    title: "تأكيد الطلبات الذكي",
    description:
      "تأكيد آلي فوري عبر واتساب يتحقق من المقاس والعنوان ويرفع نسب التسليم ويمنع المرتجع.",
  },
  {
    icon: <Tag className="w-5 h-5 text-[#3fffba]" />,
    title: "أسعار بسيطة و0% عمولة",
    description:
      "اختر الباقة المناسبة لحجم طلباتك الشهري. أسعار بسيطة بلا رسوم مخفية وبدون أي عمولة على المبيعات.",
  },
  {
    icon: <Palette className="w-5 h-5 text-[#3fffba]" />,
    title: "هوية مخصّصة لعلامتك",
    description:
      "اجعل MaxP منصتك أنت. أضف شعار براندك وألوانك وبيانات شركتك على كل بوليصة شحن وفاتورة.",
  },
  {
    icon: <RefreshCw className="w-5 h-5 text-[#3fffba]" />,
    title: "تحديثات مستمرة ومجانية",
    description:
      "أدوات جديدة وعمليات ربط أسرع وتحديثات أتمتة دورية ليتطور نظامك باستمرار مع نمو تجارتك.",
  },
];

export const OlWhyMaxP: React.FC = () => {
  return (
    <section id="why-maxp" className="py-24 bg-white/70 border-t border-[#013735]/8 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#013735]/6 text-[#013735] text-xs font-semibold mb-4">
            <span>لماذا تختار MaxP؟</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#013735] tracking-tight leading-tight">
            طريقة أذكى لإدارة عمليات التجارة في مصر والشرق الأوسط
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4e6362] leading-relaxed font-normal">
            أتمت مسارات عملك، واربط فرقك، وابقَ متحكّمًا وأنت تنمو بدون تعقيد.
          </p>
        </div>

        {/* 3-Column Clean Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_LIST.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-white border border-[#013735]/10 shadow-[0_4px_20px_rgba(1,55,53,0.04)] hover:shadow-[0_12px_28px_rgba(1,55,53,0.08)] hover:border-[#013735]/20 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#013735] flex items-center justify-center shadow-md mb-6 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>

                <h3 className="text-lg font-bold text-[#013735] mb-2.5">
                  {item.title}
                </h3>

                <p className="text-sm text-[#4e6362] leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
