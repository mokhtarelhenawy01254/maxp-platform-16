import React from "react";
import { Zap } from "lucide-react";

interface IntegrationItem {
  name: string;
  category: string;
  tag: string;
}

const STRIP_1: IntegrationItem[] = [
  { name: "واتساب بيزنس Cloud API", category: "محادثات وتأكيد", tag: "رسمي معتمد" },
  { name: "بوسطة (Bosta)", category: "شحن وتوزيع", tag: "تكامل لحظي" },
  { name: "أرامكس (Aramex)", category: "لوجستيات", tag: "ربط API" },
  { name: "ميتا (Meta / Instagram)", category: "إعلانات ومبيعات", tag: "تزامن فوري" },
  { name: "إنستاباي (InstaPay)", category: "مدفوعات مصرية", tag: "تأكيد التحويل" },
  { name: "فوري (Fawry)", category: "شبكة الدفع", tag: "كاش ورقمي" },
  { name: "باي موب (Paymob)", category: "بوابات الدفع", tag: "فيزا وماستركارد" },
];

const STRIP_2: IntegrationItem[] = [
  { name: "شوبيفاي (Shopify)", category: "المتاجر العالمية", tag: "مزامنة سحابية" },
  { name: "سلة (Salla)", category: "منصات المتاجر", tag: "تكامل مباشر" },
  { name: "زد (Zid)", category: "منصات المتاجر", tag: "ربط متكامل" },
  { name: "ووكومرس (WooCommerce)", category: "المواقع المخصصة", tag: "إضافة فورية" },
  { name: "SMS Misr", category: "رسائل نصية", tag: "إشعارات OTP" },
  { name: "J&T Express", category: "شحن إقليمي", tag: "تتبع ذكي" },
  { name: "Gemini AI", category: "ذكاء اصطناعي", tag: "ردود فورية" },
];

export const OlIntegrations: React.FC = () => {
  const double1 = [...STRIP_1, ...STRIP_1, ...STRIP_1];
  const double2 = [...STRIP_2, ...STRIP_2, ...STRIP_2];

  return (
    <section id="integrations" className="py-24 border-t border-[#013735]/8 bg-[#ffffff]/60 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3fffba]/20 text-[#013735] text-xs font-semibold mb-4">
          <Zap className="w-3.5 h-3.5 text-emerald-700" />
          <span>متصل بالأدوات التي تثق بها</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#013735] tracking-tight leading-tight">
          حسّن سير عملك عبر تكاملات سلسة
        </h2>
        <p className="mt-4 text-base sm:text-lg text-[#4e6362] max-w-2xl mx-auto font-normal">
          اربط منصات البيع والتواصل والخدمات اللوجستية، وأدر عمليات تجارتك من مركز واحد فعّال.
        </p>
      </div>

      {/* Dual Moving Marquee Strips */}
      <div className="space-y-4">
        {/* Strip 1 */}
        <div className="ol-marquee-mask overflow-hidden w-full py-1">
          <div className="ol-marquee-track">
            {double1.map((item, idx) => (
              <div
                key={`s1-${item.name}-${idx}`}
                className="flex-shrink-0 flex items-center gap-3.5 px-6 py-4 rounded-2xl bg-white border border-[#013735]/10 shadow-[0_2px_8px_rgba(1,55,53,0.04)] hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-[#013735] text-[#3fffba] flex items-center justify-center font-bold text-sm">
                  {item.name.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-[#013735] block leading-tight">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[#4e6362]">{item.category}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      {item.tag}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strip 2 */}
        <div className="ol-marquee-mask overflow-hidden w-full py-1">
          <div
            className="ol-marquee-track"
            style={{ animationDirection: "reverse", animationDuration: "45s" }}
          >
            {double2.map((item, idx) => (
              <div
                key={`s2-${item.name}-${idx}`}
                className="flex-shrink-0 flex items-center gap-3.5 px-6 py-4 rounded-2xl bg-white border border-[#013735]/10 shadow-[0_2px_8px_rgba(1,55,53,0.04)] hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-[#013735] text-[#3fffba] flex items-center justify-center font-bold text-sm">
                  {item.name.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-[#013735] block leading-tight">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[#4e6362]">{item.category}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3fffba]/20 text-[#002624] font-bold">
                      {item.tag}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
