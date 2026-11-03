import React from "react";

interface MerchantBrand {
  name: string;
  category: string;
  tag: string;
  city: string;
}

const MAXP_BRANDS: MerchantBrand[] = [
  { name: "متجر سوان للأزياء (Swan)", category: "أزياء وملابس", tag: "محل + أونلاين", city: "القاهرة" },
  { name: "فخامة للجلود (Fakhama)", category: "أحذية كلاسيك فاخرة", tag: "شحن محافظات", city: "الإسكندرية" },
  { name: "ريد لاين (Red Line)", category: "إكسسوارات وسيارات", tag: "3 فروع + متجر", city: "الجيزة" },
  { name: "أنجيلا بوتيك (Anjella)", category: "ملابس وعبايات راقية", tag: "واتساب بيزنس", city: "المنصورة" },
  { name: "كلوزيت أو إس (Closet OS)", category: "ملابس شبابية كاجوال", tag: "أونلاين ستور", city: "القاهرة" },
  { name: "روز آتيليه (Rose Atelier)", category: "فساتين وتفصيل راقٍ", tag: "حجز مسبق", city: "طنطا" },
  { name: "أورا شيك (Aura Chic)", category: "إكسسوارات وحقائب", tag: "شحن سريع بوسطة", city: "الإسكندرية" },
  { name: "كاتلاين كلوب (Cutline)", category: "أزياء وتريندات عصرية", tag: "تأكيد واتساب", city: "الشيخ زايد" },
];

export const OlMarquee: React.FC = () => {
  const tripleBrands = [...MAXP_BRANDS, ...MAXP_BRANDS, ...MAXP_BRANDS];

  return (
    <section className="py-12 border-y border-[#013735]/8 bg-[#ffffff]/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 text-center mb-6">
        <h3 className="text-sm sm:text-base font-semibold text-[#4e6362] tracking-wide">
          تعتمد عليه متاجر إلكترونية وفرق عمليات في مصر والخليج
        </h3>
      </div>

      <div className="ol-marquee-mask overflow-hidden w-full py-2">
        <div className="ol-marquee-track">
          {tripleBrands.map((brand, idx) => (
            <div
              key={`${brand.name}-${idx}`}
              className="flex-shrink-0 flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-white border border-[#013735]/10 shadow-[0_2px_8px_rgba(1,55,53,0.04)] hover:border-[#013735]/25 hover:shadow-md transition-all cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-[#013735] text-[#3fffba] flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                {brand.name.charAt(0)}
              </div>
              <div className="text-right">
                <span className="font-bold text-xs text-[#013735] block leading-tight">
                  {brand.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#4e6362]">
                  <span>{brand.category}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">{brand.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
