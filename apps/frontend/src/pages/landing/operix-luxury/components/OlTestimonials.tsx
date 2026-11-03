import React from "react";
import { Star, Quote, ArrowLeft } from "lucide-react";

interface TestimonialCard {
  quoteTitle: string;
  quoteText: string;
  authorName: string;
  authorRole: string;
  storeName: string;
  metricBadge: string;
}

const TESTIMONIALS: TestimonialCard[] = [
  {
    quoteTitle: "وداعاً لفوضى شيتات الإكسيل وضياع الأوردرات",
    quoteText:
      "قبل MaxP، كنا تائهين بين جداول الإكسيل ومحادثات واتساب. الآن كل دورة الطلب من الرسالة للبوليصة تدار من شاشة واحدة بدقة تامة.",
    authorName: "أحمد الشناوي",
    authorRole: "مؤسس المتجر",
    storeName: "متجر سوان للأزياء (Swan Store)",
    metricBadge: "3.5x نمو في حجم الطلبات",
  },
  {
    quoteTitle: "انخفاض المرتجع من 28% إلى أقل من 8%",
    quoteText:
      "بفضل تأكيد واتساب الآلي قبل خروج الطرد، تخلصنا من الشحنات غير الجادة ووفرنا عشرات الآلاف شهرياً من مصاريف الشحن الضائعة.",
    authorName: "محمود كمال",
    authorRole: "مدير العمليات",
    storeName: "فخامة للأحذية والجلود (Fakhama)",
    metricBadge: "انخفاض المرتجع إلى 8%",
  },
  {
    quoteTitle: "مزامنة لحظية بين فروع المحلات وكاشير الـ POS",
    quoteText:
      "أي قطعة تباع في كاشير أي فرع تخصم فوراً من المتجر الإلكتروني. انتهى تماماً كابوس البيع على رصيد نافد.",
    authorName: "مروان الديب",
    authorRole: "الشريك المؤسس",
    storeName: "ريد لاين لإكسسوارات السيارات (Red Line)",
    metricBadge: "0% خطأ في أرصدة المخزون",
  },
  {
    quoteTitle: "مطابقة كشوف تحصيلات COD في دقائق معدودة",
    quoteText:
      "مطابقة كشوفات بوسطة كانت تستغرق أسبوعاً شهرياً. في MaxP نرفع الكشف فيطابق الشحنات المسلمة مع الخزينة فورياً.",
    authorName: "سارة فؤاد",
    authorRole: "المدير التنفيذي",
    storeName: "أنجيلا بوتيك للأزياء (Anjella)",
    metricBadge: "مطابقة مالية بنسبة 100%",
  },
];

export const OlTestimonials: React.FC = () => {
  return (
    <section className="py-24 bg-[#ffffff]/80 border-t border-[#013735]/8 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header (Exact Operix Cadence) */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#013735] tracking-tight leading-tight">
            قصص حقيقية. نتائج حقيقية.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4e6362] font-normal">
            تجارب حقيقية من فرق تجارة إلكترونية تدير عملياتها باستخدام MaxP.
          </p>
        </div>

        {/* Testimonials 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="p-8 sm:p-10 rounded-3xl bg-white border border-[#013735]/10 shadow-[0_4px_24px_rgba(1,55,53,0.05)] hover:shadow-[0_16px_40px_rgba(1,55,53,0.09)] hover:border-[#013735]/25 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group bg-cover bg-center"
              style={{ backgroundImage: "url('/operix-assets/testimonial-card-bg.webp')" }}
            >
              {/* Corner Watermark Quote Icon */}
              <div className="absolute top-6 left-6 text-[#013735]/5 pointer-events-none group-hover:text-[#3fffba]/20 transition-colors">
                <Quote className="w-16 h-16" />
              </div>

              <div className="relative z-10">
                {/* Metric Badge & Stars */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#013735] text-[#3fffba] font-bold shadow-sm">
                    {t.metricBadge}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#013735] mb-4 leading-snug">
                  "{t.quoteTitle}"
                </h3>

                <p className="text-sm sm:text-base text-[#4e6362] leading-relaxed mb-8 font-normal">
                  {t.quoteText}
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-5 border-t border-[#013735]/8 flex items-center justify-between relative z-10">
                <div>
                  <span className="font-bold text-sm text-[#013735] block">
                    {t.authorName}
                  </span>
                  <span className="text-xs text-[#4e6362]">
                    {t.authorRole} · <strong className="text-[#013735]">{t.storeName}</strong>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#013735]/5 text-[#013735] font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {t.storeName.charAt(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
