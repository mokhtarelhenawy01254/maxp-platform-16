import React from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Carousel, Card } from "../../../../components/ui/luxury/AppleCardsCarousel";
import { BlurFade } from "../../../../components/ui/luxury/BlurFade";

interface ClothingEditorialShopLookProps {
  onFreeRegister?: () => void;
  onPricingScroll?: () => void;
}

export const ClothingEditorialShopLook: React.FC<ClothingEditorialShopLookProps> = ({
  onFreeRegister,
  onPricingScroll,
}) => {
  const merchantSuperpowers = [
    {
      category: "RETURN REDUCTION • 60%",
      title: "مستشار المقاسات الذكي: وقف نزيف شحن المرتجعات",
      src: "/images/fashion/editorial-streetwear.jpg",
      content: (
        <div className="space-y-4 text-right">
          <p className="text-zinc-300 leading-relaxed text-sm">
            أكبر كابوس يواجه براندات الملابس في مصر هو شحن القطعة للزبون وتطلع واسعة أو ضيقة، فيتحمل التاجر مصاريف شحن رايح جاي وخصم من أرباحه.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="text-xs font-bold text-emerald-400">
              كيف تحلها منظومة MaxP لمتجرك؟
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
              <li>✓ أداة تسأل الزبون تفاعلياً عن الطول والوزن وترشح المقاس المظبوط (S/M/L/XL).</li>
              <li>✓ خفضت مرتجعات المقاسات بنسبة 60% لدى البراندات المشتركة.</li>
              <li>✓ تنبيهات واضحة للزبون بنوع التلبيس (Oversized أم Regular Fit).</li>
            </ul>
          </div>
          <div className="text-xs text-zinc-400">
            • توفير متوسط 12,000 ج.م شهرياً في هدر مصاريف الشحن للبراند المتوسط.
          </div>
          {onFreeRegister && (
            <button
              type="button"
              onClick={onFreeRegister}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>جرب مستشار المقاسات لمتجرك مجاناً (0 ج.م)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      category: "OMNICHANNEL • REALTIME",
      title: "كاشير الفروع والمخزون الموحد (Cloud POS)",
      src: "/images/fashion/editorial-coat.jpg",
      content: (
        <div className="space-y-4 text-right">
          <p className="text-zinc-300 leading-relaxed text-sm">
            لو عندك محل وبتبيع أونلاين، أسوأ موقف لما زبون يطلب تيشيرت من الويبسايت ويكون زبون تاني اشتراه من المحل الصبح!
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="text-xs font-bold text-blue-400">
              مزامنة لحظية بين فروعك والمتجر:
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
              <li>✓ أي قطعة تتباع على الكاشير في أي فرع، تتخصم في الثانية نفسها من الموقع.</li>
              <li>✓ دعم البيع بالباركود وطباعة فواتير حرارية لزبائن المحل.</li>
              <li>✓ تقرير يومي بأرباح كل فرع ومطابقة النقدية مع الدرج.</li>
            </ul>
          </div>
          {onPricingScroll && (
            <button
              type="button"
              onClick={onPricingScroll}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>اربط كاشير فروعك بالمتجر (باقة 999 ج.م)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      category: "LOGISTICS • BOSTA 1-CLICK",
      title: "طباعة بوالص بوسطة وتحديث الحالات تلقائياً",
      src: "/images/fashion/editorial-streetwear.jpg",
      content: (
        <div className="space-y-4 text-right">
          <p className="text-zinc-300 leading-relaxed text-sm">
            بدل ما موظف خدمة العملاء يقعد ينسخ العناوين وأرقام التليفونات في موقع شركة الشحن ويغلط في البيانات، المنظومة بتطبع البوليصة بضغطة زر.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="text-xs font-bold text-amber-400">
              ربط مباشر مع بوسطة وميلرز:
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
              <li>✓ إنشاء بوليصة الشحن بباركود التتبع بنقرة واحدة (1-Click Dispatch).</li>
              <li>✓ إرسال رسالة واتساب تلقائية للزبون برقم التتبع وموعد التوصيل.</li>
              <li>✓ تسوية وتدقيق مبالغ الدفع عند الاستلام (COD) مع حسابك البنكي تلقائياً.</li>
            </ul>
          </div>
          {onFreeRegister && (
            <button
              type="button"
              onClick={onFreeRegister}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>ابدأ شحن بوسطة بنقرة واحدة (0 ج.م)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      category: "INVENTORY • MATRIX BARCODE",
      title: "مصفوفة المقاسات والألوان وجرد المحل بالباركود",
      src: "/images/fashion/editorial-coat.jpg",
      content: (
        <div className="space-y-4 text-right">
          <p className="text-zinc-300 leading-relaxed text-sm">
            إدارة ألوان ومقاسات الموديل الواحد بطريقة منظمة بدون فوضى في الكتالوج.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
            <div className="text-xs font-bold text-purple-400">
              جرد وتتبع دقيق للمصنع والمحل:
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
              <li>✓ كود باركود وسعر مستقل لكل توليفة (مثال: أسود L، زيتي XL).</li>
              <li>✓ جرد كامل لفروع المحل والمخازن في دقائق باستخدام ماسح الباركود.</li>
              <li>✓ تنبيه مبكر قبل نفاذ المقاسات الأكثر مبيعاً للطلب من ورشة التصنيع.</li>
            </ul>
          </div>
          {onPricingScroll && (
            <button
              type="button"
              onClick={onPricingScroll}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>فعل مصفوفة الباركود لمتجرك (باقة 999 ج.م)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const cards = merchantSuperpowers.map((card, index) => (
    <Card key={card.title} card={card} index={index} layout={true} />
  ));

  return (
    <section id="shop-the-look" className="py-16 sm:py-24 bg-[#090A0C] text-white border-b border-white/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <BlurFade delay={0.05}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-mono tracking-widest uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>حل كوابيس تشغيل متاجر الملابس • 4 ميزات جذرية</span>
              </div>
            </BlurFade>
            <BlurFade delay={0.1}>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight leading-[1.15] text-balance text-white mb-2">
                كيف تحل المنظومة المشاكل اليومية لبراندك؟
              </h2>
            </BlurFade>
          </div>
          <BlurFade delay={0.15}>
            <p className="text-sm text-zinc-400 max-w-sm mt-3 md:mt-0 leading-relaxed">
              أربع ميزات جذرية تعالج أغلب أسباب المرتجعات، البيع المزدوج بين الفرع والمتجر، وتوه الأوردرات.
            </p>
          </BlurFade>
        </div>

        {/* Aceternity UI Apple Cards Carousel */}
        <div className="-mx-6 md:-mx-12">
          <Carousel items={cards} />
        </div>

      </div>
    </section>
  );
};
