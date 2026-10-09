import React, { useState } from "react";
import { Sparkles, Check, ShoppingBag, ArrowLeft } from "lucide-react";
import { Carousel, Card } from "../../../../components/ui/luxury/AppleCardsCarousel";
import { BlurFade } from "../../../../components/ui/luxury/BlurFade";

export const ClothingEditorialShopLook: React.FC = () => {
  const [bundleAdded, setBundleAdded] = useState(false);

  const carouselData = [
    {
      category: "LOOKBOOK #01 • STREETWEAR",
      title: "سويت شيرت أوفر سايز وبنطلون كارجو ستوديو",
      src: "/images/fashion/editorial-streetwear.jpg",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 leading-relaxed">
            طقم الشارع المتكامل: خامة سويت شيرت قطن مصري 100% ثقيل (500 جرام)، بنطلون كارجو بـ 6 جيوب مقاوم للتجعيد، وكاب قماش مطرز.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">إجمالي الطقم المنسق</div>
              <div className="text-xl font-black text-white font-serif cse-tabular">1,400 ج.م</div>
            </div>
            <button
              type="button"
              onClick={() => setBundleAdded(true)}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all"
            >
              {bundleAdded ? "✓ تمت إضافة الطقم كاملاً" : "أضف الطقم كاملاً لسلة الشراء"}
            </button>
          </div>
          <div className="text-xs text-zinc-400">
            • ميزة ربط الأطقم (Shop The Look) ترفع متوسط سلة الشراء بنسبة 45%.
          </div>
        </div>
      ),
    },
    {
      category: "LOOKBOOK #02 • QUIET LUXURY",
      title: "معطف الكشمير العاجي والبنطلون التيلور",
      src: "/images/fashion/editorial-coat.jpg",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 leading-relaxed">
            تصميم تحريري راقٍ لبراندات الأزياء الفاخرة: معطف كشمير مهدأ بصف أزرار مزدوج وتفصيل إيطالي دقيق، يبرز جمال التصوير وتفاصيل الخامة.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
            <div className="text-xs text-emerald-400 font-bold mb-1">
              مزامنة فورية بين فروع المحل والمتجر
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              بيع قطعة داخل الفرع يخصمها في اللحظة نفسها من المتجر الإلكتروني لمنع أي بيع متضارب.
            </div>
          </div>
        </div>
      ),
    },
    {
      category: "ENGINE • SMART MATRIX",
      title: "إدارة المقاسات والألوان ووقف نزيف المرتجعات",
      src: "/images/fashion/editorial-streetwear.jpg",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 leading-relaxed">
            مصفوفة متقدمة تدعم كل توليفات المقاسات (S, M, L, XL, 2XL) والألوان مع كود باركود مستقل لكل مقاس.
          </p>
          <ul className="text-xs text-zinc-400 space-y-2">
            <li>✓ مستشار المقاسات التلقائي يخفض المرتجعات بنسبة 60%.</li>
            <li>✓ جرد فوري بالباركود في ثوانٍ معدودة.</li>
            <li>✓ تنبيهات ذكية قبل نفاذ المقاسات الأكثر طلباً.</li>
          </ul>
        </div>
      ),
    },
    {
      category: "LOGISTICS • BOSTA SYNC",
      title: "ربط بوسطة وشركات الشحن المصرية بلحظة",
      src: "/images/fashion/editorial-coat.jpg",
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300 leading-relaxed">
            إنشاء بوالص الشحن وطباعتها بنقرة واحدة، مع تحديث مسار التوصيل للعميل تلقائياً على الواتساب دون أي تدخل بشري.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-300">
            مطابقة دقيقة لتحصيلات الدفع عند الاستلام (COD) مع حسابك البنكي.
          </div>
        </div>
      ),
    },
  ];

  const cards = carouselData.map((card, index) => (
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
                <span>ACETERNITY CAROUSEL • كوليكشن الكتالوج الحي</span>
              </div>
            </BlurFade>
            <BlurFade delay={0.1}>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight text-white mb-2">
                انقر على أي كوليكشن لاستكشاف التفاصيل وتجربة الشراء
              </h2>
            </BlurFade>
          </div>
          <BlurFade delay={0.15}>
            <p className="text-sm text-zinc-400 max-w-sm mt-3 md:mt-0 leading-relaxed">
              تجربة مستوحاة من كبرى دور الأزياء العالمية: انقر على الكرت للتوسيع السينمائي، فحص تفاصيل الطقم، والإضافة بنقرة واحدة.
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
