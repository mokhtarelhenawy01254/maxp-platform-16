import React, { useState, useMemo } from 'react';
import { useProducts } from '../../storefront/hooks/useProducts';
import { useCartStore } from '../../storefront/store/useCartStore';
import { useNavigate } from 'react-router-dom';

export default function ElectronicsThemeDemo() {
  const { products, isLoading } = useProducts({ limit: 20 });
  const { items: cartStoreItems, addItem, removeItem, setIsOpen, isOpen } = useCartStore();
  const navigate = useNavigate();

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.images?.[0] || product.mainImage || '',
    }, { openCart: true });
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500 selection:text-black">
      
      {/* Glow Backgrounds */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Cyber Navbar */}
      <nav className="sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg skew-x-[-12deg] flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <span className="font-black text-black transform skew-x-[12deg]">T</span>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter">TECH<span className="text-cyan-400">ZONE</span></h1>
        </div>
        
        <div className="hidden lg:flex gap-10 text-[10px] font-bold tracking-widest uppercase text-slate-400">
          <a href="#" className="hover:text-cyan-400 transition">Computers</a>
          <a href="#" className="hover:text-cyan-400 transition">Mobile</a>
          <a href="#" className="hover:text-cyan-400 transition">Gaming</a>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
             <svg className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
             {cartStoreItems.length > 0 && <span className="absolute -top-1 -right-1 bg-cyan-500 text-black text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{cartStoreItems.reduce((acc, item) => acc + item.quantity, 0)}</span>}
          </div>
          <button className="bg-white text-black text-[10px] font-black uppercase px-6 py-2.5 rounded-md hover:bg-cyan-500 transition-all border border-transparent active:scale-95">Sign In</button>
        </div>
      </nav>

      {/* Hero Display */}
      <section className="container mx-auto px-6 py-20 flex flex-col items-center text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Limited Edition Release</div>
        <h2 className="text-6xl md:text-9xl font-black mb-8 leading-[0.8] tracking-tighter uppercase italic">
          Power Without<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">Precedent.</span>
        </h2>
        <p className="max-w-xl text-slate-400 text-lg mb-12">Engineered for the bold. Experience the combined speed of Neural Processing and Gen-Z architecture.</p>
        <div className="relative group">
           <div className="absolute inset-0 bg-cyan-500/30 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200" className="relative z-10 rounded-[2rem] border border-slate-700/50 shadow-2xl skew-x-[-1deg] hover:skew-x-0 transition-transform duration-700" alt="Tech hero" />
        </div>
      </section>

      {/* Modern Grid */}
      <section className="container mx-auto px-6 py-32">
        <div className="flex items-center justify-between mb-16">
           <h3 className="text-3xl font-black italic tracking-tight">HACK THE SYSTEM</h3>
           <div className="h-[2px] flex-1 mx-10 bg-gradient-to-r from-slate-800/0 via-slate-800 to-slate-800/0"></div>
           <button className="text-[10px] font-bold text-cyan-400 hover:text-white transition uppercase tracking-widest underline underline-offset-8">View Archive</button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products?.map(p => (
              <div key={p.id} className="group bg-slate-900/50 border border-slate-800/80 p-6 rounded-3xl hover:border-cyan-500/50 transition-all duration-500 relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity z-20">
                  {p.comparePrice && p.comparePrice > p.price && (
                     <span className="text-[8px] font-black px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-400">SALE</span>
                  )}
                </div>
                <div className="h-48 mb-6 flex items-center justify-center relative">
                   <div className="absolute w-24 h-24 bg-cyan-500/10 blur-[40px] rounded-full group-hover:bg-cyan-500/20 transition-all"></div>
                   <img src={p.images?.[0] || p.mainImage || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600'} className="h-40 object-contain relative z-10 transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 drop-shadow-[0_0_20px_rgba(6,182,212,0.2)]" alt={p.name} />
                </div>
                <div className="space-y-1 mb-6 flex-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.category?.name || 'TECH'}</p>
                  <h4 className="text-xl font-black italic line-clamp-2" title={p.name}>{p.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-cyan-400 font-bold">${p.price}</p>
                    {p.comparePrice && p.comparePrice > p.price && (
                      <p className="text-slate-600 font-bold text-xs line-through">${p.comparePrice}</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleAddToCart(p)}
                  className="w-full bg-slate-100 text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/0 group-hover:shadow-cyan-500/20 mt-auto"
                >
                  Assemble To Cart
                </button>
              </div>
            ))}
            {!products || products.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-10 tracking-[0.3em] text-xs">NO ASSETS DETECTED</div>
            )}
          </div>
        )}
      </section>

      {/* Tech Cart Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#020617] border-l border-slate-800/50 h-full p-10 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black italic text-cyan-500">SYSTEM_CART.LOG</h3>
              <button className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 uppercase tracking-widest" onClick={() => setIsOpen(false)}>EXIT</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cartStoreItems.map((item) => (
                <div key={item.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex gap-4 items-center group hover:border-cyan-500/30 transition-colors">
                   <img src={item.imageUrl} className="w-16 h-16 object-contain grayscale group-hover:grayscale-0 transition-all" alt={item.name} />
                   <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate" title={item.name}>{item.name}</p>
                      <p className="text-cyan-400 font-bold text-xs">${item.price} <span className="text-slate-600">x{item.quantity}</span></p>
                   </div>
                   <button onClick={() => removeItem(item.id)} className="text-red-500/50 hover:text-red-500 text-[10px] font-black transition-colors">DEL</button>
                </div>
              ))}
              {cartStoreItems.length === 0 && <p className="text-center py-20 text-slate-500 text-sm italic opacity-50 tracking-[0.2em]">NO_DATA_FOUND</p>}
            </div>
            {cartStoreItems.length > 0 && (
              <div className="pt-8 border-t border-slate-800 mt-auto">
                 <div className="flex justify-between text-xl font-black mb-6 italic tracking-tighter">
                   <span>TOTAL_PAYABLE</span>
                   <span className="text-cyan-400 font-black">
                     ${cartStoreItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </span>
                 </div>
                 <button onClick={handleCheckout} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-transform">INITIALIZE_PAYMENT</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
