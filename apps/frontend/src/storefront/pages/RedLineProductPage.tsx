import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  Phone, 
  MessageCircle, 
  Car, 
  Sun, 
  Eye, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Star,
  Check
} from 'lucide-react';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { toast } from 'sonner';

interface KitOption {
  id: string;
  name: string;
  description: string;
  piecesCount: number;
  fixedPrice: number;
  movablePrice: number;
  popular?: boolean;
  saveAmount?: number;
}

const KIT_OPTIONS: KitOption[] = [
  {
    id: 'full-kit',
    name: 'طقم السيارة الكامل (7 قطع)',
    description: 'شباكين أماميين + شباكين خلفيين + مثلثات الشراعات + الزجاج الخلفي للشنطة',
    piecesCount: 7,
    fixedPrice: 1700,
    movablePrice: 2000,
    popular: true,
    saveAmount: 280,
  },
  {
    id: 'front-kit',
    name: 'طقم أمامي (شباكين)',
    description: 'شباك السائق والراكب الأمامي بتفصيل دقيق يراعي المرايا الجانبية',
    piecesCount: 2,
    fixedPrice: 500,
    movablePrice: 500,
  },
  {
    id: 'rear-kit',
    name: 'طقم خلفي (شباكين)',
    description: 'شباكي الأبواب الخلفية لعزل ركاب الكنبة الخلفية وحماية الأطفال من الشمس',
    piecesCount: 2,
    fixedPrice: 500,
    movablePrice: 500,
  },
  {
    id: 'rear-with-quarters',
    name: 'طقم خلفي مع شراعات (4 قطع)',
    description: 'شباكي الأبواب الخلفية + شراعات المثلثات الخلفية للسيارات العائلية وSUV',
    piecesCount: 4,
    fixedPrice: 580,
    movablePrice: 580,
  },
  {
    id: 'rear-windshield',
    name: 'ستارة الزجاج الخلفي للشنطة',
    description: 'قطعة واحدة تغطي الزجاج الخلفي بالكامل مع خطوط الرؤية ومساحات التدفئة',
    piecesCount: 1,
    fixedPrice: 600,
    movablePrice: 600,
  },
];

const TINT_LEVELS = [
  {
    id: 'tint-80',
    title: 'تظليل 80% (متوسط)',
    badge: 'الأكثر طلباً',
    desc: 'توازن مثالي بين عزل حرارة الشمس والرؤية الممتازة من الداخل للخارج ليلاً ونهاراً.',
  },
  {
    id: 'tint-100',
    title: 'تظليل 100% (بلاك آوت)',
    badge: 'أقصى خصوصية',
    desc: 'حجب كامل للرؤية من الخارج وراحة تامة للعائلات وركاب المقعد الخلفي.',
  },
  {
    id: 'tint-50',
    title: 'تظليل 50% (خفيف)',
    badge: 'شفافية عالية',
    desc: 'عزل الأشعة فوق البنفسجية وتخفيف وهج الشمس مع أعلى درجة وضوح للرؤية.',
  },
];

const GALLERY_IMAGES = [
  {
    id: 'full-kit',
    title: 'طقم السيارة الكامل 7 قطع (أمامي وخلفي وشراعات وزجاج الشنطة)',
    src: 'https://cdn.shopify.com/s/files/1/0721/6640/8252/files/80_2437ebe3-f884-4c9b-911f-7e65d195688f.png?v=1787709797',
    tag: 'محتويات الطقم الكامل',
  },
  {
    id: 'fixed-system',
    title: 'نظام الكبس الثابت (شبك ألماني مخرم يسمح بفتح الزجاج والتهوية)',
    src: 'https://cdn.shopify.com/s/files/1/0721/6640/8252/files/80_9edc92f3-24df-40f5-8930-2a16079c2a88.png?v=1787709655',
    tag: 'نظام كبس ثبات تام',
  },
  {
    id: 'movable-system',
    title: 'نظام الجرار المتحرك (سحاب قماش بليسيه فاخر سهل الفتح والقفل)',
    src: 'https://cdn.shopify.com/s/files/1/0721/6640/8252/files/80_3b80eb10-1583-4474-b234-e99131ce66ac.png?v=1787709660',
    tag: 'نظام سحاب مرن',
  },
  {
    id: 'rear-windshield',
    title: 'ستارة الزجاج الخلفي للشنطة مع مراعاة مساحات الرؤية والتدفئة',
    src: 'https://cdn.shopify.com/s/files/1/0721/6640/8252/files/80_a5473dbe-8079-444b-9422-054964cde7d9.png?v=1787709767',
    tag: 'زجاج الشنطة الخلفي',
  },
  {
    id: 'car-lifestyle',
    title: 'عزل حرارة الشمس الحارقة وحماية التابلوه والفرش من التلف',
    src: 'https://cdn.shopify.com/s/files/1/0721/6640/8252/files/Untitled-2_8d6fdfb2-a03e-45f7-9e94-da1b74bdcb6c.png?v=1786398230',
    tag: 'العزل الفعلي',
  },
];

export const RedLineProductPage: React.FC = () => {
  // Selection State
  const [selectedKit, setSelectedKit] = useState<string>('full-kit');
  const [selectedSystem, setSelectedSystem] = useState<'fixed' | 'movable'>('fixed');
  const [selectedTint, setSelectedTint] = useState<string>('tint-80');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [alternatePhone, setAlternatePhone] = useState<string>('');
  const [governorate, setGovernorate] = useState<string>('القاهرة');
  const [address, setAddress] = useState<string>('');
  const [carSpecification, setCarSpecification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const currentKit = useMemo(() => {
    return KIT_OPTIONS.find((k) => k.id === selectedKit) || KIT_OPTIONS[0];
  }, [selectedKit]);

  const unitPrice = useMemo(() => {
    return selectedSystem === 'fixed' ? currentKit.fixedPrice : currentKit.movablePrice;
  }, [currentKit, selectedSystem]);

  const shippingCost = useMemo(() => {
    // Free shipping on full kit as a powerful promo
    if (selectedKit === 'full-kit') return 0;
    if (governorate === 'القاهرة' || governorate === 'الجيزة') return 45;
    return 65;
  }, [selectedKit, governorate]);

  const grandTotal = unitPrice + shippingCost;

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('برجاء كتابة الاسم ثلاثي بالكامل');
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 11) {
      toast.error('برجاء إدخال رقم هاتف صحيح مكون من 11 رقم');
      return;
    }

    if (!carSpecification.trim()) {
      toast.error('برجاء كتابة ماركة وموديل وسنة صنع سيارتك لضمان تفصيل المقاس بدقة');
      return;
    }

    if (!address.trim()) {
      toast.error('برجاء كتابة عنوان التوصيل بالتفصيل');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setOrderPlaced(true);
      toast.success('تم استلام طلبك بنجاح! سيتواصل معك فني المتجر لتأكيد المقاس.');
    }, 800);
  };

  const scrollToCheckout = () => {
    const el = document.getElementById('order-form-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-[#121214] border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">تم تأكيد طلبك بنجاح</h2>
            <p className="text-sm text-zinc-400">
              شكراً لاختيارك Red Line! تم تسجيل طلب تفصيل ستائر سيارتك بنجاح والدفع عند الاستلام.
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-4 text-right space-y-2.5 text-xs text-zinc-300">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-zinc-400">العميل:</span>
              <span className="font-semibold text-white">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-zinc-400">السيارة:</span>
              <span className="font-semibold text-red-400">{carSpecification}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-zinc-400">الطقم المطلوب:</span>
              <span className="font-medium text-white">{currentKit.name} ({selectedSystem === 'fixed' ? 'كبس ثابت' : 'جرار متحرك'})</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-zinc-400">العنوان:</span>
              <span className="text-white">{governorate} - {address}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-sm text-white">
              <span>المجموع شامل الشحن:</span>
              <span className="text-red-500 tabular-nums">{grandTotal} ج.م</span>
            </div>
          </div>

          <div className="p-3.5 bg-red-950/30 border border-red-800/30 rounded-xl text-right flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">خطوة التأكيد عبر الواتساب:</span>
              سيتواصل معك فني التركيبات هاتفياً أو عبر الواتساب خلال ساعتين لمراجعة سنة وموديل السيارة بالصور لضمان تطابق المقاس بالمللي قبل الشحن.
            </div>
          </div>

          <button
            onClick={() => setOrderPlaced(false)}
            className="w-full py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all"
          >
            الرجوع لصفحة المنتج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased font-sans selection:bg-red-600 selection:text-white" dir="rtl">
      {/* Top Notification Announcement Bar */}
      <div className="bg-[#121214] border-b border-white/10 text-xs py-2 px-4 text-center flex items-center justify-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">عرض الموسم</span>
        <span className="text-zinc-300">شحن مجاني على طقم السيارة الكامل (7 قطع) لجميع المحافظات + معاينة قبل الدفع</span>
      </div>

      {/* Main Header Chassis */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-black text-white text-lg tracking-wider border border-red-500/30 shadow-lg shadow-red-900/20">
              R
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white">RED LINE</span>
              <span className="block text-[10px] text-zinc-400 -mt-1 font-medium">ستائر سيارات تفصيل بالمللي</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              <span>ضمان تطابق المقاس 100%</span>
            </div>
            <button
              onClick={scrollToCheckout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-lg transition-all shadow-md shadow-red-600/20"
            >
              اطلب الآن
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-12">
        {/* Hero Product Fold (Asymmetrical Bento) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Visual Gallery Column (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Active Display Stage */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-2">
              <img
                src={GALLERY_IMAGES[activeImageIndex].src}
                alt={GALLERY_IMAGES[activeImageIndex].title}
                className="w-full h-full object-contain rounded-xl transition-all duration-300"
              />
              <span className="absolute top-3 right-3 px-3 py-1 bg-[#09090b]/80 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-white shadow-lg">
                {GALLERY_IMAGES[activeImageIndex].tag}
              </span>
              <div className="absolute bottom-3 inset-x-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 rounded-b-xl text-right">
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {GALLERY_IMAGES[activeImageIndex].title}
                </p>
              </div>
            </div>

            {/* Thumbnail Rails */}
            <div className="grid grid-cols-5 gap-2">
              {GALLERY_IMAGES.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden border p-1 bg-[#121214] transition-all ${
                    activeImageIndex === idx
                      ? 'border-red-600 ring-2 ring-red-600/30 shadow-md'
                      : 'border-white/10 hover:border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.src} alt={img.title} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Trust highlights under gallery */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-3 bg-[#121214] border border-white/5 rounded-xl">
                <Truck className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <span className="font-bold text-white block">شحن سريع</span>
                <span className="text-[11px] text-zinc-400">خلال 24-48 ساعة</span>
              </div>
              <div className="p-3 bg-[#121214] border border-white/5 rounded-xl">
                <Eye className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <span className="font-bold text-white block">معاينة قبل الاستلام</span>
                <span className="text-[11px] text-zinc-400">جرب مع المندوب وادفع</span>
              </div>
              <div className="p-3 bg-[#121214] border border-white/5 rounded-xl">
                <RotateCcw className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <span className="font-bold text-white block">استبدال مجاني</span>
                <span className="text-[11px] text-zinc-400">لو المقاس مش مضبوط</span>
              </div>
            </div>
          </div>

          {/* Configurator & Buybox Column (5 cols) */}
          <div className="lg:col-span-5 bg-[#121214] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl">
            {/* Product Meta Header */}
            <div className="space-y-2 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-red-600/20 text-red-400 border border-red-500/30 rounded">
                  تفصيل خاص
                </span>
                <div className="flex items-center text-amber-400 text-xs gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-zinc-400 font-medium">(4.9/5 • أكثر من 2,400 مالك سيارة)</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                ستائر سيارات تفصيل بالمللي عازلة للشمس والحرارة
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                حماية داخلية الصالون من التشقق، خفض حرارة التكييف، وخصوصية كاملة لجميع موديلات السيارات في مصر بدون أي تخريم أو مسامير.
              </p>

              {/* Price Banner */}
              <div className="pt-2 flex items-baseline gap-3">
                <span className="text-3xl font-black text-white tabular-nums">{unitPrice} ج.م</span>
                {currentKit.saveAmount && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                    وفر {currentKit.saveAmount} ج.م مع الطقم الكامل
                  </span>
                )}
              </div>
            </div>

            {/* Step 1: Mechanism Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-200 block">
                1. اختر نظام الستارة:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSystem('fixed')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    selectedSystem === 'fixed'
                      ? 'border-red-600 bg-red-950/20 text-white shadow-sm'
                      : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">كبس ثابت كلاسيكي</span>
                    {selectedSystem === 'fixed' && <Check className="w-4 h-4 text-red-500" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    شبك ألماني مخرم، كبس فريم، يسمح بنزول الزجاج والتهوية.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSystem('movable')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    selectedSystem === 'movable'
                      ? 'border-red-600 bg-red-950/20 text-white shadow-sm'
                      : 'border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">جرار سحاب متحرك</span>
                    {selectedSystem === 'movable' && <Check className="w-4 h-4 text-red-500" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    قماش بليسيه فاخر، يفتح ويقفل مثل الستارة المنزلية.
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Kit Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-200 block">
                2. اختر الطقم والقطع المطلوبة:
              </label>
              <div className="space-y-2">
                {KIT_OPTIONS.map((kit) => {
                  const price = selectedSystem === 'fixed' ? kit.fixedPrice : kit.movablePrice;
                  const isSelected = selectedKit === kit.id;
                  return (
                    <div
                      key={kit.id}
                      onClick={() => setSelectedKit(kit.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-red-600 bg-red-950/20 text-white'
                          : 'border-white/10 bg-zinc-900/40 text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-red-500' : 'border-zinc-600'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-red-500" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{kit.name}</span>
                            {kit.popular && (
                              <span className="mr-2 px-2 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded">
                                موصى به
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-black text-sm text-white tabular-nums">{price} ج.م</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 mr-6 leading-normal">
                        {kit.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Tint Darkness Level */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-200 block">
                3. درجة العزل والتعتيم:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TINT_LEVELS.map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    onClick={() => setSelectedTint(tint.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedTint === tint.id
                        ? 'border-red-600 bg-red-950/30 text-white font-bold'
                        : 'border-white/10 bg-zinc-900/40 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs">{tint.title.split(' ')[1]}</span>
                    <span className="text-[9px] block text-zinc-400 mt-0.5">{tint.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Trigger */}
            <button
              onClick={scrollToCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
            >
              <span>أدخل بيانات سيارتك للشحن</span>
              <span className="text-xs font-normal opacity-90">(الدفع عند الاستلام)</span>
            </button>
          </div>
        </section>

        {/* Feature Comparison Section */}
        <section className="bg-[#121214] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">الفرق العملي</span>
            <h2 className="text-xl sm:text-2xl font-black text-white">مقارنة بين نظام الكبس الثابت والسحاب المتحرك</h2>
            <p className="text-xs text-zinc-400">
              اختر ما يناسب طبيعة استخدامك اليومي للسيارة، وكلاهما يفصل بنفس الدقة على فريم الشباك الأصلي.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-zinc-900/70 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">الكبس الثابت (شبك ألماني)</h3>
                <span className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md">الأكثر مبيعاً للشباب والسفر</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>تثبيت كبس على إطار الشباك الأصلي دون مسامير أو لزق.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>إمكانية فتح الشباك وتهوية السيارة أثناء السير مع ثبات الستارة في مكانها وحجب الحشرات والأتربة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>شاسيه صلب مرن مكسو بالجلد الطبيعي المعالج ضد الصدأ.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 bg-zinc-900/70 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-base">الجرار السحاب (قماش بليسيه فاخر)</h3>
                <span className="text-xs px-2.5 py-1 bg-red-950/40 text-red-400 border border-red-800/30 rounded-md">المفضل للعائلات والأطفال</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>نظام سحاب مرن يمكنك من فتح وإغلاق الستارة يدويًا كلياً أو جزئياً.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>قماش بليسيه متعرج أنيق يعطي فخامة لصالون السيارة مثل صالونات الـ VIP.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>عزل ممتاز للشمس والحرارة مع إمكانية إزاحتها في ثانية عند دفع الكارتة أو التحدث للخارج.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Specs & Value Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#121214] border border-white/10 rounded-xl space-y-1 text-right">
            <Wrench className="w-5 h-5 text-red-500 mb-2" />
            <h4 className="font-bold text-white text-sm">تركيب بدون أي أدوات</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              تصلك جاهزة ومصممة على شكل زوايا باب سيارتك لتركب في أقل من دقيقة.
            </p>
          </div>
          <div className="p-4 bg-[#121214] border border-white/10 rounded-xl space-y-1 text-right">
            <Sun className="w-5 h-5 text-red-500 mb-2" />
            <h4 className="font-bold text-white text-sm">عزل 98% من أشعة UV</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              تحمي التابلوه والجلد من التشقق وتقلل استهلاك التكييف بنسبة ملحوظة.
            </p>
          </div>
          <div className="p-4 bg-[#121214] border border-white/10 rounded-xl space-y-1 text-right">
            <Car className="w-5 h-5 text-red-500 mb-2" />
            <h4 className="font-bold text-white text-sm">جميع موديلات السيارات</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              قاعدة بيانات لمقاسات أكثر من 850 موديل سيارة سيدان، SUV، وهاتشباك في مصر.
            </p>
          </div>
          <div className="p-4 bg-[#121214] border border-white/10 rounded-xl space-y-1 text-right">
            <ShieldCheck className="w-5 h-5 text-red-500 mb-2" />
            <h4 className="font-bold text-white text-sm">ضمان Red Line الرسمي</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              معاينة وتجربة على سيارتك في وجود المندوب قبل دفع أي مليم.
            </p>
          </div>
        </section>

        {/* 1-Step Fast COD Order Form (Anchor) */}
        <section id="order-form-anchor" className="bg-[#121214] border-2 border-red-600/60 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="px-3 py-1 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-black rounded-full uppercase">
              طلب سريع • دفع عند الاستلام
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              أدخل بياناتك وسيارتك لتأكيد التفصيل
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              لا يتطلب الأمر بطاقة بنكية. ادفع فقط عند استلام الستارة ومعاينتها على باب سيارتك.
            </p>
          </div>

          <form onSubmit={handleOrderSubmit} className="max-w-2xl mx-auto space-y-5">
            {/* Selected Summary Badge */}
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-zinc-400 block">الطقم المختار:</span>
                <span className="font-bold text-white text-sm">
                  {currentKit.name} — {selectedSystem === 'fixed' ? 'كبس ثابت' : 'جرار سحاب'} ({selectedTint === 'tint-80' ? 'تظليل 80%' : selectedTint === 'tint-100' ? '100% بلاك آوت' : '50% خفيف'})
                </span>
              </div>
              <div className="text-left">
                <span className="text-zinc-400 block">إجمالي المستحق:</span>
                <span className="text-lg font-black text-red-500 tabular-nums">
                  {grandTotal} ج.م
                </span>
              </div>
            </div>

            {/* Crucial Car Specification Input Field */}
            <div className="space-y-1.5 bg-red-950/20 border border-red-600/30 rounded-xl p-4">
              <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                <span>نوع وموديل وسنة صنع سيارتك (إجباري): *</span>
              </label>
              <input
                type="text"
                required
                value={carSpecification}
                onChange={(e) => setCarSpecification(e.target.value)}
                placeholder="مثال: هيونداي إلنترا 2021 شكل جديد (CN7) أو كيا سيراتو 2017"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
              />
              <p className="text-[11px] text-zinc-400 leading-normal">
                سيقوم فني المتجر بمراجعة الموديل ومطابقة الفئة (شكل قديم أم جديد) عبر واتساب قبل القص والتفصيل.
              </p>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-300">الاسم ثلاثي: *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="محمد أحمد إبراهيم"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-300">رقم الموبايل (واتساب متاح): *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all tabular-nums text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Governorate & Alt Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-300">المحافظة: *</label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
                >
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov.id} value={gov.nameAr} className="bg-zinc-900 text-white">
                      {gov.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-zinc-300">رقم هاتف إضافي (احتياطي):</label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="رقم آخر في حال انشغال الأول"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all tabular-nums text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Full Address */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-zinc-300">عنوان التوصيل بالتفصيل: *</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المدينة / الحي، اسم الشارع، رقم العمارة، علامة مميزة بجوارك"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all"
              />
            </div>

            {/* Price Ledger */}
            <div className="bg-[#09090b] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>سعر الطقم:</span>
                <span className="text-white font-medium tabular-nums">{unitPrice} ج.م</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>مصاريف الشحن والتوصيل ({governorate}):</span>
                <span className="text-white font-medium tabular-nums">
                  {shippingCost === 0 ? <span className="text-emerald-400 font-bold">مجاني (عرض الطقم الكامل)</span> : `${shippingCost} ج.م`}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-black text-white">
                <span>الإجمالي المطلوب عند الاستلام:</span>
                <span className="text-red-500 text-base tabular-nums">{grandTotal} ج.م</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-base rounded-xl transition-all shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري تسجيل الطلب...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد الطلب الآن — ادفع {grandTotal} ج.م عند الاستلام</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-zinc-400">
              🔒 طلبك مؤمّن بالكامل. لن تدفع أي مبالغ إلا بعد وصول المندوب ومعاينة الستارة على سيارتك.
            </p>
          </form>
        </section>

        {/* FAQ Accordion */}
        <section className="bg-[#121214] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">الأسئلة الشائعة</span>
            <h2 className="text-xl sm:text-2xl font-black text-white">كل ما يهمك معرفته قبل الشراء</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {[
              {
                q: 'هل ينفع أنزل الشباك والستارة راكبة؟',
                a: 'نعم بكل تأكيد! نظام الكبس الثابت مصمم بحيث يركب الفريم في الحلق الثابت لباب السيارة، وبالتالي يمكنك إنزال الزجاج ورفعه بكل حرية، مع الاستمتاع بالهواء النقي وحجب الشمس والأتربة.',
              },
              {
                q: 'هل الستائر مخالفة للمرور في مصر؟',
                a: 'الستائر القماشية والشبك غير مخالفة للمرور لأنها ليست فاميه كيميائي أو ستيكر لاصق على الزجاج، ويمكن فكها وإزالتها يدوياً في ثوانٍ معدودة بدون أي أثر.',
              },
              {
                q: 'هل سأحتاج لتخريم أو فك فرش الباب؟',
                a: 'إطلاقاً! لا يوجد أي مسمار أو دبل فيس أو تخريم. الفريم مصمم بسلك صلب مرن يكبس كبس محكم في مجرى زجاج الباب بالمللي.',
              },
              {
                q: 'إزاي بتضمنوا إن المقاس هيطلع مظبوط لعربيتي؟',
                a: 'لدينا أرشيف مقاسات لجميع الموديلات التي نزلت مصر. وفوق ذلك، بعد إتمامك للطلب يقوم فني متخصص بمراسلتك عبر واتساب لمراجعة موديل وسنة وفئة السيارة بالصور للتأكيد قبل إخراج الأوردر للشحن.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="border border-white/5 bg-zinc-900/50 rounded-xl p-4 cursor-pointer transition-all hover:border-white/15"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white">
                  <span>{faq.q}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                </div>
                {expandedFaq === idx && (
                  <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-white/5 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#09090b] py-8 px-4 text-center text-xs text-zinc-500 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center font-bold text-white text-xs">
            R
          </div>
          <span className="font-bold text-zinc-300">RED LINE CAR ACCESSORIES</span>
        </div>
        <p>مصنع وورشة ريد لاين — القليوبية، مصر • خدمة وتوصيل لجميع المحافظات</p>
        <p className="text-[11px] text-zinc-600">© 2026 جميع الحقوق محفوظة لـ Red Line على منصة MaxP.</p>
      </footer>

      {/* Sticky Mobile Buy Trigger Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[#121214]/95 backdrop-blur-lg border-t border-white/10 p-3 sm:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div className="text-right">
          <span className="text-[10px] text-zinc-400 block">{currentKit.name.split('(')[0]}</span>
          <span className="text-base font-black text-white tabular-nums">{grandTotal} ج.م</span>
        </div>
        <button
          onClick={scrollToCheckout}
          className="flex-1 py-2.5 bg-red-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 text-center"
        >
          اطلب الآن (دفع عند الاستلام)
        </button>
      </div>
    </div>
  );
};

export default RedLineProductPage;
