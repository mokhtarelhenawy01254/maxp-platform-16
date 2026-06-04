import React, { useEffect, useState } from 'react';
import { CafeProductCard } from '../storefront/components/CafeProductCard';
import { TornPaperDivider } from '../storefront/components/TornPaperDivider';

// Fixed Images for high quality presentation
const HERO_IMG = 'https://images.unsplash.com/photo-1563514986877-e854157d6bb0?auto=format&fit=crop&q=80&w=600&fm=png&bg=transparent'; 
const IMG_MOC_1 = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=400';
const IMG_MOC_2 = 'https://images.unsplash.com/photo-1627834377411-8da5f4f09de8?auto=format&fit=crop&q=80&w=400';
const IMG_MOC_3 = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400';
const IMG_MOC_4 = 'https://images.unsplash.com/photo-1495474472201-43222d4f20b3?auto=format&fit=crop&q=80&w=400'; 
const IMG_MOC_5 = 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400'; 

// Categories
const CATEGORIES = ['All', 'Signature Cakes', 'Hot Brews', 'Pastries'];

// Mock Data
const STORE_PRODUCTS = [
  { id: 1, title: 'Aatis Cake', category: 'Signature Cakes', cursive: 'Cousr Nud', img: IMG_MOC_1, bg: 'bg-[#FCD8DF]', prefix: 'BERRY', suffix: 'ANDRE', price: 14.50 },
  { id: 2, title: 'Lermi Delight', category: 'Signature Cakes', cursive: 'Grags Jaluo', img: IMG_MOC_2, bg: 'bg-[#EFE3DB]', prefix: 'VANILLA', suffix: 'ARE', price: 12.00 },
  { id: 3, title: 'Flitre Choco', category: 'Signature Cakes', cursive: 'Hotns Tind', img: IMG_MOC_3, bg: 'bg-[#DFCEE0]', prefix: 'DARK', suffix: 'LILL', price: 18.25 },
  { id: 4, title: 'Classic Blend', category: 'Hot Brews', cursive: 'Espresso', img: IMG_MOC_4, bg: 'bg-[#DFCEE0]', prefix: 'STRONG', suffix: 'ROAST', price: 5.50 },
  { id: 5, title: 'Butter Croissant', category: 'Pastries', cursive: 'Freshly Baked', img: IMG_MOC_5, bg: 'bg-[#FCD8DF]', prefix: 'WARM', suffix: 'FLAKY', price: 4.00 },
];

export default function CafeThemeDemo() {
  // Global States
  const [cart, setCart] = useState<{ id: number; quantity: number; title: string; price: number; img: string; options?: string }[]>([]);
  
  // Navigation States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutView, setIsCheckoutView] = useState(false); // TRUE WHEN IN CHECKOUT PAGE
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false); // Final success
  
  // Logic States
  const [activeCategory, setActiveCategory] = useState('All');
  const [quickViewProduct, setQuickViewProduct] = useState<typeof STORE_PRODUCTS[0] | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [milkOption, setMilkOption] = useState('Regular');
  const [isScrolled, setIsScrolled] = useState(false);

  // Inject Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { 
        document.head.removeChild(link); 
        window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const showToast = (message: string) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddToCart = (product: typeof STORE_PRODUCTS[0], options?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.options === options);
      if (existing) {
        return prev.map(item => (item.id === product.id && item.options === options) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, title: product.title, price: product.price, img: product.img, quantity: 1, options }];
    });
    setQuickViewProduct(null);
    showToast(`Added ${product.title} to cart`);
  };

  const handleProceedToCheckout = () => {
      setIsCartOpen(false);
      setIsCheckoutView(true);
      window.scrollTo(0,0);
  };

  const filteredProducts = activeCategory === 'All' ? STORE_PRODUCTS : STORE_PRODUCTS.filter(p => p.category === activeCategory);
  
  const cartSubTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotalItems = cart.reduce((total, item) => total + item.quantity, 0);
  
  const taxAmount = cartSubTotal * 0.14; // 14% simulated VAT
  const shippingFee = cartTotalItems > 0 ? 5.00 : 0;
  const grandTotal = cartSubTotal + taxAmount + shippingFee;

  // Render the FULL SCREEN CHECKOUT PAGE if isCheckoutView is true
  if (isCheckoutView) {
      return (
        <div className="min-h-screen bg-[#FCFBF8] text-gray-800 flex flex-col font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
            
            {/* Minimal Sticky Navbar for Checkout */}
            <nav className="bg-white border-b border-gray-100 py-6 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setIsCheckoutView(false)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        <span className="text-sm font-semibold tracking-wider uppercase">Return to Store</span>
                    </div>
                    <div className="text-3xl text-[#947771] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Coffee</div>
                    <div className="opacity-0 hidden md:block">Placeholder</div> {/* Balance layout */}
                </div>
            </nav>

            <div className="container mx-auto px-6 py-12 flex-1">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-20">
                    
                    {/* LEFT COLUMN: User Details Form */}
                    <div className="lg:w-3/5 space-y-12 animate-in slide-in-from-left duration-500">
                        {/* Title */}
                        <div>
                           <h1 className="text-4xl md:text-5xl text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Secure Checkout</h1>
                           <p className="text-gray-500 text-sm">Please finalize your details to get your daily brew.</p>
                        </div>
                        
                        {/* Contact Info */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>1. Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">First Name</label>
                                    <input type="text" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Last Name</label>
                                    <input type="text" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="Doe" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                                    <input type="email" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="hello@example.com" />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>2. Delivery Address</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Street Address</label>
                                    <input type="text" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="123 Coffee Lane" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">City</label>
                                        <input type="text" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="Cairo" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                                        <input type="tel" className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#947771] focus:ring-4 focus:ring-[#947771]/10 rounded-xl px-4 py-3 outline-none transition-all" placeholder="+20 100 000 0000" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b border-gray-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>3. Payment Method</h3>
                            <div className="space-y-4">
                                <label className="flex items-center p-4 border-2 border-[#947771] bg-[#947771]/5 rounded-2xl cursor-pointer transition-colors">
                                    <input type="radio" name="payment" className="w-5 h-5 text-[#947771] focus:ring-[#947771] border-gray-300" defaultChecked />
                                    <span className="ml-4 font-semibold text-gray-800">Credit or Debit Card</span>
                                    <div className="ml-auto flex gap-2">
                                        <div className="px-2 py-1 bg-white border rounded shadow-sm text-[10px] font-bold">VISA</div>
                                        <div className="px-2 py-1 bg-white border rounded shadow-sm text-[10px] font-bold">MASTER</div>
                                    </div>
                                </label>
                                <label className="flex items-center p-4 border border-gray-200 hover:border-gray-300 rounded-2xl cursor-pointer transition-colors opacity-70 hover:opacity-100">
                                    <input type="radio" name="payment" className="w-5 h-5 text-[#947771] focus:ring-[#947771] border-gray-300" />
                                    <span className="ml-4 font-semibold text-gray-800">Cash on Delivery (COD)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Order Summary */}
                    <div className="lg:w-2/5 animate-in slide-in-from-right duration-500">
                        <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-50 sticky top-32">
                           <h3 className="text-2xl font-bold mb-8 text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Order Summary</h3>
                           
                           {/* Items */}
                           <div className="space-y-4 mb-8">
                               {cart.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                          <div className="relative">
                                              <img src={item.img} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                                              <span className="absolute -top-2 -right-2 bg-gray-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">{item.quantity}</span>
                                          </div>
                                          <div>
                                              <h5 className="font-bold text-gray-800 text-sm">{item.title}</h5>
                                              {item.options && <p className="text-[10px] text-gray-400 uppercase">{item.options}</p>}
                                          </div>
                                      </div>
                                      <span className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                               ))}
                           </div>

                           {/* Math */}
                           <div className="space-y-3 text-sm text-gray-500 border-t border-gray-100 pt-6 mb-6">
                               <div className="flex justify-between"><span>Subtotal</span><span className="text-gray-800 font-medium">${cartSubTotal.toFixed(2)}</span></div>
                               <div className="flex justify-between"><span>Shipping</span><span className="text-gray-800 font-medium">${shippingFee.toFixed(2)}</span></div>
                               <div className="flex justify-between"><span>Estimated Taxes (14%)</span><span className="text-gray-800 font-medium">${taxAmount.toFixed(2)}</span></div>
                           </div>

                           {/* Grand Total */}
                           <div className="flex justify-between items-center text-xl font-bold text-gray-900 border-t border-gray-900 pt-6 mb-10">
                               <span>Total</span>
                               <span>${grandTotal.toFixed(2)}</span>
                           </div>

                           <button 
                             className="w-full bg-[#947771] text-white py-4 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-[#7A5A54] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-[1.02]"
                             onClick={() => setSuccessModalOpen(true)}
                           >
                               Place Full Order
                           </button>
                           <p className="text-center text-[11px] text-gray-400 mt-4 flex items-center justify-center gap-1">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                               Secure SSL Encrypted Checkout
                           </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Final Order Success Modal */}
            {isSuccessModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-[#947771]/60 backdrop-blur-md" onClick={() => {}}></div>
                  <div className="relative bg-white rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-50 duration-500 transform">
                      <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50/50">
                          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h3 className="text-4xl text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Thank You!</h3>
                      <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">
                          Your order <strong className="text-gray-900">#MAX-8842</strong> has been placed successfully. We'll send an email confirmation shortly!
                      </p>
                      <button 
                        className="w-full border-2 border-[#947771] text-[#947771] hover:bg-[#947771] hover:text-white py-4 rounded-full font-bold tracking-widest text-xs transition-colors uppercase"
                        onClick={() => {
                          setSuccessModalOpen(false);
                          setCart([]); 
                          setIsCheckoutView(false); // Go back home empty
                          window.scrollTo(0,0);
                        }}
                      >
                          Continue Shopping
                      </button>
                  </div>
              </div>
            )}
        </div>
      );
  }

  /* ------------------------------------------------------------- 
   * MAIN STORE LAYOUT (If not in Checkout View)
   * ------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 selection:bg-pink-100 flex flex-col overflow-x-hidden relative scroll-smooth" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Toast Notification */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[110] transition-all duration-500 ease-out ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-3">
             <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             {toastMessage}
          </div>
      </div>

      <section className="bg-[#947771] relative text-[#F2ECE6]">
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#947771]/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-6'}`}>
          <div className="container mx-auto px-6 flex items-center justify-between">
              <div className="text-3xl md:text-5xl tracking-tight cursor-pointer" style={{ fontFamily: "'Playfair Display', serif" }}>Coffee</div>
              
              <div className="hidden md:flex space-x-12 text-sm font-medium tracking-wide">
                <a href="#" className="border-b-[1.5px] border-[#F2ECE6] pb-1">Home</a>
                <a href="#menu" className="opacity-80 hover:opacity-100 transition-opacity">Menu</a>
                <a href="#about" className="opacity-80 hover:opacity-100 transition-opacity">About</a>
              </div>
              
              <div className="flex space-x-5 md:space-x-6 items-center">
                <svg className="w-5 h-5 cursor-pointer hover:opacity-80 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  {cartTotalItems > 0 && (
                    <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">
                      {cartTotalItems}
                    </div>
                  )}
                </div>
                <div className="md:hidden cursor-pointer p-1" onClick={() => setIsMobileMenuOpen(true)}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </div>
              </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 pt-32 pb-32 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-xl z-20 text-center md:text-left">
            <h1 className="text-5xl md:text-7xl leading-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Sweet Moments<br />Start Here.
            </h1>
            <p className="opacity-80 text-[13px] leading-relaxed mb-8 max-w-sm mx-auto md:mx-0" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
              The art of crafting perfect coffee moments starts from selecting the finest beans and transforming them into your daily bliss.
            </p>
            <a href="#menu" className="px-7 py-3 rounded-full border border-[#F2ECE6]/30 bg-[#745B56] hover:bg-[#5E4743] transition-colors text-xs font-bold tracking-[0.15em] uppercase shadow-lg mx-auto md:mx-0 inline-block">
              EXPLORE MORE
            </a>
          </div>
          
          <div className="relative mt-16 md:mt-0 z-20 w-full md:w-1/2 flex justify-center md:justify-end">
            <div className="relative inline-block drop-shadow-2xl hover:-translate-y-2 transition-transform duration-500">
                <div className="w-[280px] h-[280px] md:w-[450px] md:h-[450px] rounded-full overflow-hidden border-[10px] border-[#FDFBF7]/90 shadow-2xl relative bg-[#FCFBF8]">
                    <img src={HERO_IMG} className="w-full h-full object-cover transform scale-110" alt="Hero Coffee Cup" />
                </div>
                <div className="absolute top-10 -right-2 md:-right-6 w-14 h-14 md:w-16 md:h-16 bg-[#F8D2D7] rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                   <div className="text-[10px] md:text-xs font-bold text-pink-700 text-center leading-tight">CAFE<br/>VIBE</div>
                </div>
            </div>
          </div>
        </div>
        <TornPaperDivider colorClass="text-[#FDFBF7]" className="absolute -bottom-[1px] left-0 right-0 z-30 pointer-events-none" />
      </section>

      <section id="menu" className="container mx-auto px-6 pb-28 pt-20">
        <div className="text-center mb-10">
           <h2 className="text-5xl text-gray-800 mb-4" style={{ fontFamily: "'Great Vibes', cursive" }}>Our Menu</h2>
           <div className="flex flex-wrap justify-center gap-3 mt-8">
              {CATEGORIES.map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-[#947771] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                 >
                   {cat}
                 </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 justify-items-center max-w-6xl mx-auto mt-12 transition-all">
            {filteredProducts.map((product, idx) => (
              <CafeProductCard 
                key={product.id}
                id={product.id}
                title={product.title}
                subtitleCursive={product.cursive}
                subtitlePrefix={product.prefix}
                subtitleSuffix={product.suffix}
                imageUrl={product.img}
                bgColorClass={product.bg}
                price={product.price}
                onAddToCart={() => setQuickViewProduct(product)}
                className="animate-in fade-in zoom-in-95 duration-500"
              />
            ))}
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setQuickViewProduct(null)}></div>
            <div className="relative bg-white rounded-[32px] overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                <button className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/10 rounded-full text-gray-600 hover:bg-black/20" onClick={() => setQuickViewProduct(null)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className={`w-full md:w-1/2 p-10 ${quickViewProduct.bg} flex items-center justify-center`}>
                    <img src={quickViewProduct.img} alt={quickViewProduct.title} className="w-[80%] h-auto rounded-full drop-shadow-2xl max-h-[300px] object-cover" />
                </div>
                
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
                    <p className="text-pink-500 text-xs font-bold tracking-widest mb-2 uppercase">{quickViewProduct.category}</p>
                    <h3 className="text-4xl text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{quickViewProduct.title}</h3>
                    <p className="text-3xl text-gray-500 mb-6" style={{ fontFamily: "'Great Vibes', cursive" }}>{quickViewProduct.cursive}</p>
                    
                    <div className="mb-8">
                       <p className="text-sm font-bold text-gray-700 mb-3">Choice of Preparation:</p>
                       <div className="flex flex-wrap gap-2 text-sm">
                           {['Regular', 'Almond Milk (+$1)', 'Extra Sugar'].map(opt => (
                               <button 
                                 key={opt}
                                 onClick={() => setMilkOption(opt)}
                                 className={`px-4 py-2 border rounded-xl transition-all ${milkOption === opt ? 'border-[#947771] bg-[#947771]/5 text-[#947771] font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                               >
                                 {opt}
                               </button>
                           ))}
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
                        <span className="text-2xl font-bold text-gray-900">${quickViewProduct.price.toFixed(2)}</span>
                        <button 
                          className="bg-[#947771] hover:bg-[#7A5A54] text-white px-8 py-3.5 rounded-full font-bold tracking-widest text-xs transition-transform hover:-translate-y-1 shadow-xl"
                          onClick={() => handleAddToCart(quickViewProduct, milkOption)}
                        >
                            ADD TO CART
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <section id="about" className="container mx-auto px-6 pb-32 flex flex-col md:flex-row items-center gap-16 md:gap-24 relative max-w-6xl pt-10">
          <div className="md:w-1/2 flex justify-center relative">
              <div className="w-[280px] h-[280px] sm:w-80 sm:h-80 md:w-[400px] md:h-[400px] rounded-full overflow-hidden border-[16px] border-white shadow-xl relative z-10 transition-transform duration-500 hover:scale-105">
                <img src={HERO_IMG} alt="Latte Art" className="w-full h-full object-cover transform scale-125" />
              </div>
              <div className="absolute w-64 h-64 bg-[#FCD8DF] rounded-full -bottom-8 left-10 blur-3xl opacity-60 z-0"></div>
          </div>
          
          <div className="md:w-1/2 relative z-10 pl-0 md:pl-8 text-center md:text-left">
              <h2 className="text-6xl md:text-7xl text-gray-800 mb-8" style={{ fontFamily: "'Great Vibes', cursive" }}>Müt Coffee</h2>
              <div className="space-y-6">
                <p className="text-gray-500 text-[15px] leading-relaxed max-w-md mx-auto md:mx-0 text-justify" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Discover a new dimension of taste where precision meets artistry. Our skilled baristas ensure every cup highlights the natural complexity of the beans. Carefully extracted, beautifully presented, waiting for you to enjoy.
                </p>
              </div>
          </div>
      </section>

      <div className="flex-1"></div>

      <footer className="bg-[#947771] relative text-[#F2ECE6] pt-28 pb-10 mt-auto">
        <TornPaperDivider colorClass="text-[#FDFBF7]" className="absolute -top-[1px] left-0 right-0 z-30 pointer-events-none" direction="up" />
        
        <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-[#F2ECE6]/20 pb-12 gap-8">
                <div className="text-center md:text-left">
                    <h3 className="text-3xl mb-2" style={{ fontFamily: "'Great Vibes', cursive" }}>Join our newsletter</h3>
                    <p className="text-xs opacity-70">Get 10% off your next daily brew when you subscribe.</p>
                </div>
                <div className="flex w-full md:w-auto">
                   <input type="email" placeholder="Your email address" className="bg-white/10 border border-white/20 rounded-l-full px-6 py-3 text-sm focus:outline-none focus:bg-white/20 text-white placeholder-white/50 w-full md:w-72" />
                   <button className="bg-[#5E4743] hover:bg-[#4A3834] px-6 py-3 rounded-r-full text-xs font-bold tracking-widest uppercase transition-colors">Subscribe</button>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-6 mb-8 md:mb-0">
                    <div className="text-xs opacity-70 leading-relaxed text-center md:text-left" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
                        Designed beautifully for Max_p<br className="hidden md:block"/>Coffee lovers everywhere.
                    </div>
                </div>
                
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-90">
                    <div className="flex items-center gap-4">
                        <a href="#" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg></a>
                    </div>
                </div>
            </div>
        </div>
      </footer>

      {/* OVERLAYS */}
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative w-72 max-w-[80vw] bg-[#FDFBF7] h-full shadow-2xl flex flex-col pt-10 px-6 animate-in slide-in-from-left duration-300">
               <button className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
               <div className="text-4xl mb-12 text-[#947771]" style={{ fontFamily: "'Playfair Display', serif" }}>Coffee</div>
               <div className="flex flex-col space-y-6 text-lg font-medium text-gray-700" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <a href="#" className="border-b border-gray-100 pb-2 hover:text-[#947771] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
                  <a href="#menu" className="border-b border-gray-100 pb-2 hover:text-[#947771] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Signature Menu</a>
                  <a href="#about" className="border-b border-gray-100 pb-2 hover:text-[#947771] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Our Story</a>
                  <a href="#" className="border-b border-gray-100 pb-2 hover:text-[#947771] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Contact Us</a>
               </div>
            </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
             <div className="relative w-[380px] max-w-full bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#FCFBF8]">
                    <h3 className="text-2xl text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>Your Order</h3>
                    <button className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors" onClick={() => setIsCartOpen(false)}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            <p style={{ fontFamily: "'Playfair Display', serif" }}>Your cart is empty.</p>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={`${item.id}-${item.options || idx}`} className="flex items-center gap-4 bg-[#FDFBF7] p-3 rounded-2xl border border-gray-50 relative group">
                                <button className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setCart(prev => prev.filter(p => !(p.id === item.id && p.options === item.options)))}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                    <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>{item.title}</h4>
                                    {item.options && <p className="text-[10px] text-gray-400 uppercase tracking-widest">{item.options}</p>}
                                    <p className="text-[#947771] text-sm font-bold mt-1">${item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
                                    <button className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => setCart(prev => prev.map(p => (p.id === item.id && p.options === item.options) ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p).filter(p => p.quantity > 0))}>-</button>
                                    <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                                    <button className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => setCart(prev => prev.map(p => (p.id === item.id && p.options === item.options) ? { ...p, quantity: p.quantity + 1 } : p))}>+</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {cart.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-[#FCFBF8] space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center text-gray-600 mb-2">
                           <span>Subtotal</span>
                           <span className="font-bold">${cartSubTotal.toFixed(2)}</span>
                        </div>
                        <button 
                          className="w-full bg-[#947771] text-white py-4 rounded-full font-bold tracking-widest uppercase text-xs hover:bg-[#7A5A54] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                          onClick={handleProceedToCheckout}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                )}
             </div>
        </div>
      )}

    </div>
  );
}
