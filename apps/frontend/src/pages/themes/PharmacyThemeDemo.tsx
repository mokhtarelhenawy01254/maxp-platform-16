import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useProducts } from '../../storefront/hooks/useProducts';
import { useCartStore } from '../../storefront/store/useCartStore';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1584308666744-24d5e4b9f390?auto=format&fit=crop&q=80&w=400"; 

export default function PharmacyThemeDemo() {
  const { products, isLoading } = useProducts({ limit: 20 });
  const { items: cartStoreItems, addItem, removeItem, setIsOpen, isOpen } = useCartStore();
  const navigate = useNavigate();

  const [toast, setToast] = useState("");

  const handleAddToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.images?.[0] || product.mainImage || '',
    }, { openCart: true });
    
    setToast(`Added ${product.name} to your cart`);
    setTimeout(() => setToast(""), 3000);
  };

  const handleCheckout = () => {
    setIsOpen(false);
    // Directly navigate to standard storefront checkout route
    navigate('/store/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F0F7F9] font-sans text-slate-800 selection:bg-teal-500 selection:text-white relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-teal-300/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-400/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-[100] bg-white/80 backdrop-blur-md border border-teal-100 text-teal-800 px-6 py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(20,184,166,0.3)] flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">✓</div>
          <p className="font-bold text-sm tracking-wide">{toast}</p>
        </div>
      )}

      {/* Ultra Modern Navbar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm mx-auto">
        <div className="px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="relative w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:rotate-[15deg] transition-transform duration-500">
              <span className="font-black text-2xl leading-none">+</span>
              <div className="absolute inset-0 border border-white/40 rounded-2xl"></div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Max Care</h1>
              <p className="text-[9px] font-bold text-teal-600 tracking-[0.2em] uppercase">Premium Pharmacy</p>
            </div>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-12 h-12 bg-white/50 backdrop-blur-md border border-white rounded-full p-1 shadow-inner flex items-center focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
            <input type="text" placeholder="Search exclusively for medical products..." className="w-full bg-transparent border-none text-sm outline-none px-6 text-slate-700 placeholder-slate-400 font-medium" />
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mr-1 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-xs font-bold text-teal-700 uppercase tracking-widest hidden lg:block hover:text-teal-500 transition-colors">Upload RX</button>
            <div className="relative cursor-pointer group" onClick={() => setIsOpen(true)}>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 group-hover:shadow-xl group-hover:border-teal-200 transition-all duration-300">
                <svg className="w-6 h-6 text-slate-700 group-hover:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              </div>
              {cartStoreItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                  {cartStoreItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Futuristic Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-16">
        <div className="md:w-1/2 flex flex-col items-start text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-teal-100 shadow-sm mb-8">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-teal-800 uppercase tracking-widest">24/7 Delivery Available</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
            Advanced Health.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600">Delivered Fast.</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-xl font-medium mb-10 max-w-lg leading-relaxed mix-blend-multiply">
            Experience the next generation of healthcare delivery. Certified pharmaceuticals and premium wellness products at your fingertips.
          </p>
          <div className="flex gap-4">
            <button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-1 transition-all duration-300">
              Browse Pharmacy
            </button>
            <button className="bg-white text-slate-700 px-8 py-4 rounded-2xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
              Read Our Process
            </button>
          </div>
        </div>
        <div className="md:w-1/2 relative w-full aspect-square md:aspect-auto md:h-[600px]">
          {/* Glassmorphic decorative card */}
          <div className="absolute top-10 right-10 w-48 h-48 bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl z-20 animate-float translate-y-4"></div>
          <div className="absolute bottom-20 left-0 w-32 h-32 bg-teal-400/30 backdrop-blur-3xl rounded-full border border-white/50 shadow-2xl z-20 delay-150 animate-float"></div>
          
          <img 
              src="https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80"
            className="w-full h-full object-cover rounded-[3rem] shadow-2xl z-10 relative" 
            alt="Premium healthcare products" 
          />
        </div>
      </section>

      {/* Premium Product Grid */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
           <div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight">Essential Care</h3>
             <p className="text-slate-400 font-medium mt-2">Curated products for your daily wellness</p>
           </div>
           <button className="text-sm font-bold text-teal-600 hover:text-teal-700 uppercase tracking-widest hidden md:inline-flex items-center gap-2">
             View All Catalog <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
           </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-teal-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products?.map(p => (
              <div key={p.id} className="group flex flex-col h-full bg-white rounded-[2.5rem] p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)] hover:border-teal-100 transition-all duration-500 cursor-pointer">
                <div className="relative aspect-square w-full rounded-[2rem] bg-slate-50 mb-6 overflow-hidden flex items-center justify-center p-8 group-hover:bg-teal-50/50 transition-colors">
                  <div className="absolute top-4 left-4 z-10">
                    {p.comparePrice && p.comparePrice > p.price && (
                      <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">Sale</span>
                    )}
                  </div>
                  <img src={p.images?.[0] || p.mainImage || DEFAULT_IMAGE} className="w-full h-full object-contain mix-blend-multiply transform group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                  
                  {/* Hover Overlay Button */}
                  <div className="absolute inset-x-4 bottom-4 translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300 ease-out">
                    <button onClick={(e) => handleAddToCart(p, e)} className="w-full bg-white/90 backdrop-blur-md text-teal-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg border border-white hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors">
                      Quick Add
                    </button>
                  </div>
                </div>

                <div className="px-2 flex-1 flex flex-col">
                  <span className="text-[10px] font-black text-teal-600/60 uppercase tracking-[0.2em] mb-2 block">{p.category?.name || 'Healthcare'}</span>
                  <h4 className="font-bold text-slate-800 text-lg mb-2 leading-tight group-hover:text-teal-600 transition-colors line-clamp-2" title={p.name}>
                    {p.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-auto pt-4">
                    <span className="text-2xl font-black text-slate-900">${p.price}</span>
                    {p.comparePrice && p.comparePrice > p.price && (
                      <span className="text-sm font-bold text-slate-300 line-through decoration-slate-300">${p.comparePrice}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!products || products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6 font-black text-3xl">!</div>
                <p className="text-slate-500 font-medium">No medical stock currently available in this category.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Advanced Cart Slide-over */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl h-full shadow-[0_0_60px_rgba(0,0,0,0.1)] p-8 flex flex-col animate-in slide-in-from-right duration-500 border-l border-white">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Your Cart</h3>
                <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-1">Ready for fulfillment</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {cartStoreItems.map(item => (
                <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-teal-200 transition-colors">
                  <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center p-2">
                    <img src={item.imageUrl} className="max-w-full max-h-full object-contain mix-blend-multiply" alt={item.name} />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h5 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight mb-1">{item.name}</h5>
                    <p className="text-xs font-medium text-slate-400 mb-2">Quantity: {item.quantity}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-black text-teal-600">${(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-[10px] uppercase font-bold tracking-widest text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {cartStoreItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                  <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  <p className="text-sm font-bold tracking-widest uppercase">Cart is empty</p>
                </div>
              )}
            </div>

            {cartStoreItems.length > 0 && (
              <div className="pt-8 mt-auto border-t border-slate-100">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                  <span className="text-3xl font-black text-slate-900">
                    ${cartStoreItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-slate-900 text-white hover:bg-teal-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:shadow-teal-600/30 transition-all duration-300 flex justify-center items-center gap-3">
                  Proceed to Checkout <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global generic animations string for Tailwind JIT */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
