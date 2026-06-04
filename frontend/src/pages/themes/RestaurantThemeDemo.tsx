import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Product, useProducts } from '../../storefront/hooks/useProducts';

type DemoProduct = Product & {
  badge?: string;
  eta?: string;
};

type OrderSummary = {
  orderId: string;
  customerName: string;
  total: number;
  eta: string;
  itemCount: number;
};

type DemoCartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

const DISPLAY_FONT = {
  fontFamily: "'Teko', 'Cairo', sans-serif",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const CATEGORY_LABELS: Record<string, string> = {
  All: 'الكل',
  Combos: 'الكومبوهات',
  Burgers: 'البرجر',
  Sides: 'الإضافات',
  Drinks: 'المشروبات',
  Desserts: 'الحلو',
  'Chef Picks': 'اختيارات الشيف',
};

const categoryName = (name?: string | null) => {
  const value = name?.trim();
  if (!value) return 'اختيارات الشيف';
  return CATEGORY_LABELS[value] || value;
};

const PRODUCT_NAME_OVERRIDES: Record<string, string> = {
  'rush-combo': 'راش كومبو',
  firebird: 'فايربيرد تشيكن',
  'volcano-fries': 'فولكانو فرايز',
  'citrus-fizz': 'سيتروس فيز',
  'cookie-bomb': 'كوكي بومب',
  'family-rush': 'فاميلي راش ميل',
};

const productDisplayName = (product: Pick<Product, 'id' | 'slug' | 'name'>) =>
  PRODUCT_NAME_OVERRIDES[product.slug || product.id] || product.name;

const fallbackProducts: DemoProduct[] = [
  {
    id: 'rush-combo',
    slug: 'rush-combo',
    name: 'راش كومبو',
    description: 'دابل سماش برجر مع فرايز وكولا في كومبو سريع ومشبع من أول ضغطة.',
    price: 235,
    comparePrice: 275,
    images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'combos', name: 'الكومبوهات' },
    badge: 'أفضل عرض',
    eta: '18-22 دقيقة',
  },
  {
    id: 'firebird',
    slug: 'firebird',
    name: 'فايربيرد تشيكن',
    description: 'دجاج كرسبي بصوص مدخن ومخلل وآيولي ثوم بطعم قوي لآخر اليوم.',
    price: 185,
    comparePrice: 210,
    images: ['https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'burgers', name: 'البرجر' },
    badge: 'الأكثر طلبًا',
    eta: '20-25 دقيقة',
  },
  {
    id: 'volcano-fries',
    slug: 'volcano-fries',
    name: 'فولكانو فرايز',
    description: 'فرايز محمّلة بجبنة وجلابينو وبصل مقرمش تكمل أي طلب صح.',
    price: 95,
    comparePrice: 115,
    images: ['https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'sides', name: 'الإضافات' },
    badge: 'إضافة جامدة',
    eta: '10-12 دقيقة',
  },
  {
    id: 'citrus-fizz',
    slug: 'citrus-fizz',
    name: 'سيتروس فيز',
    description: 'مشروب لايم منعش بالنعناع يوازن الطلب ويكمل الكومبو.',
    price: 55,
    images: ['https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'drinks', name: 'المشروبات' },
    badge: 'منعش',
    eta: '6-8 دقائق',
  },
  {
    id: 'cookie-bomb',
    slug: 'cookie-bomb',
    name: 'كوكي بومب',
    description: 'كوكي دافئة مع فانيلا وكراميل لنهاية حلوة بعد الوجبة.',
    price: 88,
    images: ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'desserts', name: 'الحلو' },
    badge: 'تحلية',
    eta: '8-10 دقائق',
  },
  {
    id: 'family-rush',
    slug: 'family-rush',
    name: 'فاميلي راش ميل',
    description: 'أربع ساندوتشات مع فرايز ومشروبات تكفي الشلة في طلب واحد.',
    price: 540,
    comparePrice: 610,
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'],
    category: { id: 'combos', name: 'الكومبوهات' },
    badge: 'توصيل مجاني',
    eta: '30-35 دقيقة',
  },
];

const lanes = [
  {
    title: 'مسار الكومبوهات',
    description: 'وجبات جاهزة تشبع بسرعة وتخلّي القرار أسهل من أول ثانية.',
    category: 'الكومبوهات',
    accent: 'bg-[#171717] text-white',
  },
  {
    title: 'مسار البرجر',
    description: 'ساندوتشات BiteRush الأساسية بطعم قوي ولمسة نار واضحة.',
    category: 'البرجر',
    accent: 'bg-[#ff6b2c] text-white',
  },
  {
    title: 'مسار الإضافات',
    description: 'فرايز ومشروبات وحلو تكمل الطلب من غير ما تثقله.',
    category: 'الإضافات',
    accent: 'bg-white text-[#171717]',
  },
];

const zones = [
  { name: 'مدينة نصر', eta: '18-22 دقيقة' },
  { name: 'القاهرة الجديدة', eta: '25-30 دقيقة' },
  { name: 'الشيخ زايد', eta: '28-34 دقيقة' },
];

const heroStats = [
  ['سرعة التوصيل', '18-22 دقيقة'],
  ['متوسط الطلب', '245 ج.م+'],
  ['الدفع', 'كاش أو أونلاين'],
] as const;

const emptyForm = {
  name: '',
  phone: '',
  address: '',
  paymentMethod: 'الدفع عند الاستلام',
  eta: '20-30 دقيقة',
};

const toDemoProduct = (product: Product): DemoProduct => ({
  ...product,
  name: productDisplayName(product),
  description:
    product.description || 'وجبة جاهزة بطابع BiteRush السريع والسخن.',
  images: product.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80'],
  category: product.category || {
    id: categoryName(product.category?.name).toLowerCase().replace(/\s+/g, '-'),
    name: categoryName(product.category?.name),
  },
  badge:
    typeof product.comparePrice === 'number' && product.comparePrice > product.price
      ? 'عرض مباشر'
      : 'اختيار سريع',
  eta: '20-30 دقيقة',
});

export default function RestaurantThemeDemo() {
  const { products, isLoading } = useProducts({ limit: 20 });

  const [activeCat, setActiveCat] = useState('الكل');
  const [cartItems, setCartItems] = useState<DemoCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  const catalogProducts = useMemo(
    () => (products.length > 0 ? products.map(toDemoProduct) : fallbackProducts),
    [products],
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['الكل']);
    catalogProducts.forEach((product) => set.add(categoryName(product.category?.name)));
    return Array.from(set);
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    if (activeCat === 'الكل') return catalogProducts;
    return catalogProducts.filter((product) => categoryName(product.category?.name) === activeCat);
  }, [activeCat, catalogProducts]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const deliveryFee = totalItems === 0 || subtotal >= 450 ? 0 : 35;
  const total = subtotal + deliveryFee;
  const featuredDeal =
    catalogProducts.find((product) => categoryName(product.category?.name) === 'الكومبوهات') ||
    catalogProducts[0];

  useEffect(() => {
    if (activeCat !== 'الكل' && !categories.includes(activeCat)) {
      setActiveCat('الكل');
    }
  }, [activeCat, categories]);

  useEffect(() => {
    const shouldLock = isCartOpen || showCheckout;
    if (!shouldLock) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCartOpen, showCheckout]);

  const addToCart = (product: DemoProduct) => {
    setCartItems((current) => {
      const existingIndex = current.findIndex((item) => item.id === `${product.id}-default`);
      if (existingIndex === -1) {
        return [
          {
            id: `${product.id}-default`,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            imageUrl: product.images?.[0] || '',
          },
          ...current,
        ];
      }

      return current.map((item, index) =>
        index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
    setIsCartOpen(true);
  };

  const removeCartItem = (id: string) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  };

  const updateCartQuantity = (id: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      removeCartItem(id);
      return;
    }

    setCartItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, nextQuantity) } : item,
      ),
    );
  };

  const jumpToDeal = () => {
    if (featuredDeal) {
      setActiveCat(categoryName(featuredDeal.category?.name));
    }
    scrollToSection('menu');
  };

  const startCheckout = () => {
    if (!cartItems.length) return;
    setIsCartOpen(false);
    setShowCheckout(true);
  };

  const placeOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartItems.length) return;
    setOrderSummary({
      orderId: `BR-${String(Date.now()).slice(-6)}`,
      customerName: form.name.trim() || 'ضيف BiteRush',
      total,
      eta: form.eta,
      itemCount: totalItems,
    });
    setCartItems([]);
    setForm(emptyForm);
    setShowCheckout(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      lang="ar"
      dir="rtl"
      className="min-h-screen bg-[#FFFDFB] font-sans text-[#1D1D1F] selection:bg-orange-500 selection:text-white"
    >
      <nav className="sticky top-0 z-[100] border-b-4 border-orange-500 bg-white/95 px-6 py-4 shadow-lg backdrop-blur md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 text-right"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-xl transition-transform hover:rotate-12">
              <span className="text-xl font-black italic leading-none text-white">B</span>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-500">
                طلب سريع
              </div>
              <h1
                className="text-3xl font-black uppercase italic tracking-tighter text-red-600"
                style={DISPLAY_FONT}
              >
                Bite<span className="text-orange-500">Rush</span>
              </h1>
            </div>
          </button>

          <div className="hidden items-center gap-10 text-xs font-black uppercase tracking-widest md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('menu')}
              className="underline decoration-orange-500 decoration-2 underline-offset-4 transition hover:text-red-600"
            >
              المنيو
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('deals')}
              className="transition hover:text-red-600"
            >
              العروض
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('zones')}
              className="transition hover:text-red-600"
            >
              مناطق التوصيل
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 rounded-full bg-gray-900 px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 hover:bg-red-600"
          >
            <span>سلة الطلب</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
              {totalItems}
            </span>
          </button>
        </div>
      </nav>

      {orderSummary && (
        <section className="relative overflow-hidden bg-[#171717] px-6 py-6 text-white md:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,44,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(220,38,38,0.25),_transparent_35%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.45em] text-orange-200">
                تم تأكيد الطلب
              </div>
              <h2
                className="mt-4 text-5xl font-black uppercase italic tracking-tighter text-white md:text-6xl"
                style={DISPLAY_FONT}
              >
                {orderSummary.customerName}، طلبك اتحرك.
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium text-white/75 md:text-base">
                طلب رقم {orderSummary.orderId} اتأكد وفيه {orderSummary.itemCount} منتج. وقت الوصول
                المتوقع {orderSummary.eta}.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 px-6 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-200">
                  الإجمالي
                </div>
                <div className="mt-2 text-4xl font-black italic text-white" style={DISPLAY_FONT}>
                  {formatCurrency(orderSummary.total)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('menu')}
                className="rounded-full bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-red-600 shadow-xl transition hover:scale-[1.02]"
              >
                اطلب مرة تانية
              </button>
            </div>
          </div>
        </section>
      )}

      <main>
        <section className="relative overflow-hidden bg-orange-500 py-24 md:py-32">
          <div className="absolute left-[-100px] top-[-100px] h-96 w-96 rounded-full bg-red-600 opacity-40 blur-[120px]" />
          <div className="absolute bottom-[-100px] right-[-100px] h-96 w-96 rounded-full bg-yellow-400 opacity-40 blur-[120px]" />

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row md:px-12">
            <div className="text-center text-white md:w-1/2 md:text-right">
              <div className="inline-block animate-bounce rounded-full bg-white px-4 py-1 text-xs font-black uppercase tracking-widest text-red-600 shadow-md">
                عرض محدود
              </div>
              <h2
                className="mb-6 mt-6 text-7xl font-black uppercase italic leading-[0.8] tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.2)] md:text-9xl"
                style={DISPLAY_FONT}
              >
                سماش.
                <br />
                نار.
                <br />
                كرنش.
              </h2>
              <p className="mx-auto mb-10 max-w-md text-lg font-bold text-white/90 md:mx-0">
                برجر طازج يوميًا، نار واضحة، وطعم يوصل سخن من أول لقمة.
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:justify-end">
                <button
                  type="button"
                  onClick={jumpToDeal}
                  className="rounded-full bg-white px-12 py-5 text-xl font-black uppercase italic text-red-600 shadow-2xl transition hover:scale-105"
                >
                  اطلب العرض
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('zones')}
                  className="rounded-full border-2 border-white/30 bg-[#171717]/15 px-8 py-5 text-sm font-black uppercase tracking-[0.3em] text-white transition hover:bg-[#171717]/30"
                >
                  شوف مناطق التوصيل
                </button>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroStats.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[2rem] border border-white/20 bg-white/10 px-5 py-4 text-right shadow-xl backdrop-blur"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70">
                      {label}
                    </div>
                    <div className="mt-2 text-3xl font-black italic text-white" style={DISPLAY_FONT}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center md:w-1/2">
              <div className="relative">
                <div className="absolute -left-4 top-10 rotate-[-8deg] rounded-[2rem] bg-white px-5 py-4 shadow-2xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-red-600">
                    راش كومبو
                  </div>
                  <div className="mt-1 text-3xl font-black italic text-[#171717]" style={DISPLAY_FONT}>
                    أفضل عرض
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 rotate-[6deg] rounded-[2rem] bg-[#171717] px-5 py-4 text-white shadow-2xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300">
                    لسه سخن
                  </div>
                  <div className="mt-1 text-3xl font-black italic" style={DISPLAY_FONT}>
                    20-30 دقيقة
                  </div>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80"
                  className="w-full max-w-lg rounded-full border-[10px] border-white/20 object-cover drop-shadow-[0_50px_50px_rgba(0,0,0,0.4)] transition duration-500 hover:scale-110"
                  alt="برجر BiteRush"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="deals" className="bg-[#FFF4EC] px-6 py-16 md:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.45em] text-red-600 shadow-md">
                عروض اليوم
              </div>
              <h3
                className="mt-5 text-5xl font-black uppercase italic tracking-tighter text-[#171717] md:text-6xl"
                style={DISPLAY_FONT}
              >
                3 طرق سريعة للطلب.
              </h3>
              <p className="mt-4 text-base font-medium leading-7 text-[#5f5f5f]">
                اختَر المسار اللي يناسب مزاجك وكمّل الطلب في أقل وقت.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {lanes.map((lane, index) => (
                <article
                  key={lane.title}
                  className={`rounded-[2.5rem] border-4 border-orange-100 px-6 py-7 shadow-xl transition-transform hover:-translate-y-1 ${lane.accent}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.45em] opacity-70">
                    0{index + 1}
                  </div>
                  <h4
                    className="mt-3 text-4xl font-black uppercase italic tracking-tighter"
                    style={DISPLAY_FONT}
                  >
                    {lane.title}
                  </h4>
                  <p className="mt-4 text-sm font-medium leading-6 opacity-80">{lane.description}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCat(lane.category);
                      scrollToSection('menu');
                    }}
                    className={`mt-8 rounded-full px-6 py-3 text-xs font-black uppercase tracking-[0.28em] transition ${
                      lane.accent.includes('bg-white')
                        ? 'bg-[#171717] text-white hover:bg-red-600'
                        : 'bg-white text-red-600 hover:bg-orange-100'
                    }`}
                  >
                    افتح المسار
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="sticky top-[78px] z-[90] border-y border-gray-100 bg-white/85 py-6 shadow-sm backdrop-blur-md">
          <div className="mx-auto max-w-7xl overflow-x-auto px-6 md:px-12">
            <div className="flex justify-center gap-4">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCat(category)}
                  className={`flex-shrink-0 rounded-full border-2 px-8 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                    activeCat === category
                      ? 'border-[#ff6b2c] bg-[#ff6b2c] text-white shadow-lg shadow-orange-500/30'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pt-8 md:px-12">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-orange-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-[#5f5f5f]">
              {products.length > 0
                ? 'المنيو محدث تلقائيًا بأحدث المنتجات المتاحة الآن.'
                : 'ابدأ بالكومبو المناسب وكمل طلبك بإضافة ومشروب على مزاجك.'}
            </p>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-6 py-20 md:px-12">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-500">
                المنيو
              </div>
              <h3
                className="mt-3 text-5xl font-black uppercase italic tracking-tighter text-[#171717] md:text-6xl"
                style={DISPLAY_FONT}
              >
                جاهز يتطلب بسرعة.
              </h3>
            </div>
            <p className="max-w-xl text-sm font-medium leading-7 text-[#5f5f5f] md:text-right">
              كومبوهات وبرجر وإضافات معمولين عشان تختار بسرعة وتكمّل الطلب من غير لفة طويلة.
            </p>
          </div>

          {isLoading && products.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-2xl font-bold uppercase italic text-gray-400">
              مفيش منتجات في القسم ده دلوقتي.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <article key={product.id} className="group flex flex-col items-center text-center">
                  <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-[3rem] bg-orange-50 transition-colors duration-500 group-hover:bg-red-600">
                    <div className="absolute left-6 top-6 z-10 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-red-600 shadow-md">
                        {product.badge || 'BiteRush'}
                      </span>
                      <span className="rounded-full bg-[#171717] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-md">
                        {product.eta || '20-30 دقيقة'}
                      </span>
                    </div>
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80'}
                      className="h-full w-full object-cover transition-all duration-700 group-hover:-rotate-6 group-hover:scale-110"
                      alt={product.name}
                    />
                    <div className="absolute inset-x-0 bottom-0 hidden translate-y-full p-6 transition-transform duration-500 group-hover:translate-y-0 md:block">
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className="w-full rounded-2xl bg-white py-4 text-xs font-black uppercase tracking-widest text-red-600 shadow-xl transition-colors hover:bg-orange-50"
                      >
                        أضف للسلة
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                    {categoryName(product.category?.name)}
                  </div>
                  <h4
                    className="mt-2 text-3xl font-black uppercase italic tracking-tighter text-[#171717]"
                    style={DISPLAY_FONT}
                  >
                    {product.name}
                  </h4>
                  <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-[#666666]">
                    {product.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <p className="text-2xl font-black italic text-orange-500" style={DISPLAY_FONT}>
                      {formatCurrency(product.price)}
                    </p>
                    {typeof product.comparePrice === 'number' && product.comparePrice > product.price && (
                      <p className="text-sm font-bold italic text-gray-400 line-through">
                        {formatCurrency(product.comparePrice)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="mt-5 w-full rounded-2xl bg-white py-4 text-xs font-black uppercase tracking-widest text-red-600 shadow-xl transition-colors hover:bg-orange-50 md:hidden"
                  >
                    أضف للسلة
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="zones" className="relative overflow-hidden bg-[#171717] px-6 py-16 text-white md:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,107,44,0.24),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(220,38,38,0.18),_transparent_32%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-300">
                مناطق التوصيل
              </div>
              <h3
                className="mt-3 text-5xl font-black uppercase italic tracking-tighter md:text-6xl"
                style={DISPLAY_FONT}
              >
                بنوصل لحد بابك.
              </h3>
              <p className="mt-4 text-base font-medium leading-7 text-white/70">
                اختار منطقتك واعرف وقت الوصول المتوقع قبل ما تأكد الطلب.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {zones.map((zone) => (
                <article
                  key={zone.name}
                  className="rounded-[2.5rem] border border-white/10 bg-white/5 px-6 py-6 shadow-xl backdrop-blur"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300">
                    {zone.eta}
                  </div>
                  <h4 className="mt-3 text-4xl font-black uppercase italic" style={DISPLAY_FONT}>
                    {zone.name}
                  </h4>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {totalItems > 0 && !isCartOpen && !showCheckout && (
        <div className="fixed bottom-4 left-4 right-4 z-[140] mx-auto max-w-3xl rounded-[2rem] border-4 border-orange-100 bg-white px-5 py-4 shadow-[0_25px_55px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#4f4f4f]">
              {totalItems} منتج جاهز. الإجمالي {formatCurrency(total)}.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="rounded-full border-2 border-gray-100 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#171717] transition hover:border-orange-200 hover:text-red-600"
              >
                راجع السلة
              </button>
              <button
                type="button"
                onClick={startCheckout}
                className="rounded-full bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-white shadow-xl transition hover:scale-[1.02]"
              >
                كمّل الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
            aria-label="اقفل السلة"
          />
          <aside
            className="relative flex h-full w-full max-w-md flex-col bg-white px-8 py-8 shadow-2xl md:px-10"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-500">
                  سلة الطلب
                </div>
                <h3
                  className="mt-2 text-5xl font-black uppercase italic tracking-tighter"
                  style={DISPLAY_FONT}
                >
                  سلة الطلب
                </h3>
              </div>
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-[0.25em] text-red-600"
                onClick={() => setIsCartOpen(false)}
              >
                إغلاق
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="rounded-[2.5rem] border-2 border-dashed border-orange-100 px-6 py-14 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-500">
                    السلة فاضية
                  </div>
                  <h4
                    className="mt-4 text-4xl font-black uppercase italic tracking-tighter text-[#171717]"
                    style={DISPLAY_FONT}
                  >
                    لسه ما ضفتش حاجة.
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      scrollToSection('menu');
                    }}
                    className="mt-8 rounded-full bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-white shadow-xl"
                  >
                    ارجع للمنيو
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <article key={item.id} className="items-start rounded-[2rem] border border-orange-100 bg-orange-50/40 p-4">
                    <div className="flex gap-4">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80'}
                        className="h-24 w-24 rounded-[1.75rem] object-cover bg-gray-50"
                        alt={item.name}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-3xl font-black uppercase italic tracking-tighter" style={DISPLAY_FONT}>
                              {item.name}
                            </h4>
                            <p className="mt-1 text-sm font-semibold text-orange-500">
                              {formatCurrency(item.price)} للوحدة
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="text-[11px] font-black uppercase tracking-[0.25em] text-red-600 transition hover:opacity-75"
                          >
                            احذف
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="inline-flex items-center rounded-full border-2 border-orange-100 bg-white p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="h-10 w-10 rounded-full text-lg font-black text-[#171717]"
                            >
                              -
                            </button>
                            <span className="min-w-10 text-center text-sm font-black text-[#171717]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="h-10 w-10 rounded-full text-lg font-black text-[#171717]"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-3xl font-black italic text-red-600" style={DISPLAY_FONT}>
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-8 border-t-8 border-orange-100 pt-8">
              <div className="space-y-3 text-sm font-semibold text-[#5f5f5f]">
                <div className="flex items-center justify-between">
                  <span>المجموع</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>التوصيل</span>
                  <span>{deliveryFee === 0 ? 'مجاني' : formatCurrency(deliveryFee)}</span>
                </div>
                {subtotal > 0 && subtotal < 450 && (
                  <p className="text-red-600">ضيف {formatCurrency(450 - subtotal)} كمان وخد التوصيل مجانًا.</p>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between text-4xl font-black italic tracking-tighter">
                <span style={DISPLAY_FONT}>الإجمالي</span>
                <span className="text-red-600" style={DISPLAY_FONT}>
                  {formatCurrency(total)}
                </span>
              </div>
              <button
                type="button"
                onClick={startCheckout}
                disabled={cartItems.length === 0}
                className="mt-8 w-full rounded-[2rem] bg-red-600 py-5 text-xl font-black uppercase italic text-white shadow-2xl shadow-red-600/30 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-red-200 disabled:shadow-none"
              >
                كمّل الطلب
              </button>
            </div>
          </aside>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-gray-900/70 px-4 py-6 backdrop-blur-sm">
          <div className="grid max-h-full w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
            <form className="overflow-y-auto bg-[#FFF9F4] px-6 py-6 md:px-8 md:py-8" onSubmit={placeOrder}>
              <div className="flex items-start justify-between gap-4 border-b-4 border-orange-100 pb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-500">
                    تأكيد الطلب
                  </div>
                  <h3
                    className="mt-2 text-5xl font-black uppercase italic tracking-tighter text-[#171717]"
                    style={DISPLAY_FONT}
                  >
                    كمّل بيانات الطلب
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="text-xs font-bold uppercase tracking-[0.25em] text-red-600"
                >
                  كمل تصفح
                </button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="text-sm font-bold text-[#171717]">
                  الاسم الكامل
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                    placeholder="اسم المستلم"
                  />
                </label>
                <label className="text-sm font-bold text-[#171717]">
                  رقم الموبايل
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                    placeholder="0100 000 0000"
                  />
                </label>
              </div>

              <label className="mt-5 block text-sm font-bold text-[#171717]">
                العنوان
                <input
                  required
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="mt-2 w-full rounded-[1.5rem] border-2 border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                  placeholder="الشارع، العمارة، المنطقة"
                />
              </label>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="text-sm font-bold text-[#171717]">
                  طريقة الدفع
                  <select
                    value={form.paymentMethod}
                    onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                  >
                    <option>الدفع عند الاستلام</option>
                    <option>بطاقة عند الاستلام</option>
                    <option>محفظة إلكترونية</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-[#171717]">
                  وقت التوصيل
                  <select
                    value={form.eta}
                    onChange={(event) => setForm((current) => ({ ...current, eta: event.target.value }))}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                  >
                    <option>20-30 دقيقة</option>
                    <option>30-40 دقيقة</option>
                    <option>45-55 دقيقة</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="mt-8 w-full rounded-[2rem] bg-red-600 py-5 text-lg font-black uppercase italic text-white shadow-2xl shadow-red-600/30 transition hover:scale-[1.01]"
              >
                أكد الطلب الآن
              </button>
            </form>

            <aside className="overflow-y-auto bg-[#171717] px-6 py-6 text-white md:px-8 md:py-8">
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-300">
                ملخص الطلب
              </div>
              <h3 className="mt-2 text-5xl font-black uppercase italic tracking-tighter" style={DISPLAY_FONT}>
                طلبك جاهز للتأكيد.
              </h3>
              <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/70">
                راجع الأصناف والمجموع قبل ما نبدأ التحضير.
              </p>

              <div className="mt-8 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <div className="text-lg font-black uppercase italic tracking-tight" style={DISPLAY_FONT}>
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                        الكمية {item.quantity}
                      </div>
                    </div>
                    <div className="text-lg font-black italic text-orange-300" style={DISPLAY_FONT}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-sm font-semibold text-white/70">
                  <span>المجموع</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm font-semibold text-white/70">
                  <span>التوصيل</span>
                  <span>{deliveryFee === 0 ? 'مجاني' : formatCurrency(deliveryFee)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-4xl font-black italic tracking-tighter">
                  <span style={DISPLAY_FONT}>الإجمالي</span>
                  <span className="text-orange-300" style={DISPLAY_FONT}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
