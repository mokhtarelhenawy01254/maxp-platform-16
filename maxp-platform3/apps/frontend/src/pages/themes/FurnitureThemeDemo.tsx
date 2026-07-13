import React, { useState, useEffect } from 'react';
import { useProducts } from '../../storefront/hooks/useProducts';
import { useCartStore } from '../../storefront/store/useCartStore';
import { useNavigate } from 'react-router-dom';

export default function FurnitureThemeDemo() {
  const { products, isLoading } = useProducts({ limit: 20 });
  const { items: cartStoreItems, addItem, removeItem, setIsOpen, isOpen } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@300;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); }
  }, []);

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
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* Navbar overlay */}
      <nav className="fixed top-0 w-full z-50 py-8 px-6 md:px-20 flex justify-between items-center transition-all bg-white/80 backdrop-blur-md border-b border-gray-100">
        <h1 className="text-3xl tracking-[0.3em] font-bold cursor-pointer" style={{ fontFamily: "'Cinzel', serif" }} onClick={() => navigate('/')}>LUXURE</h1>
        <div className="hidden md:flex gap-10 text-[10px] font-bold tracking-[0.2em] uppercase">
          <a href="#" className="hover:text-amber-600 transition">Collections</a>
          <a href="#" className="hover:text-amber-600 transition">Showroom</a>
          <a href="#" className="hover:text-amber-600 transition">Design Service</a>
        </div>
        <div className="flex gap-8 items-center">
            <div className="relative cursor-pointer group" onClick={() => setIsOpen(true)}>
                <span className="text-[10px] font-bold tracking-widest uppercase">Cart</span>
                <span className="ml-2 bg-amber-600 text-white text-[8px] w-4 h-4 rounded-full inline-flex items-center justify-center -translate-y-1">
                  {cartStoreItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
            </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000" className="absolute inset-0 w-full h-full object-cover" alt="Hero interior" />
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative text-center text-white p-10 max-w-4xl">
          <p className="text-[10px] tracking-[0.5em] mb-6 uppercase opacity-80">Since 1984</p>
          <h2 className="text-5xl md:text-8xl mb-10 leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>Luxury Living Redefined</h2>
          <button className="bg-white text-black px-12 py-5 text-xs font-bold tracking-[0.3em] uppercase hover:bg-amber-600 hover:text-white transition-all transform hover:-translate-y-1">Explore Collection</button>
        </div>
      </section>

      {/* Product List */}
      <section className="py-32 px-6 md:px-20 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6 border-b border-gray-100 pb-10">
          <div>
            <h3 className="text-4xl mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Curated Masterpieces</h3>
            <p className="text-gray-400 text-sm italic">Each piece is handcrafted with precision.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold tracking-[0.1em] uppercase">
            <span className="text-amber-600 cursor-pointer">All</span>
            <span className="cursor-pointer hover:text-amber-600">Seating</span>
            <span className="cursor-pointer hover:text-amber-600">Tables</span>
            <span className="cursor-pointer hover:text-amber-600">Decor</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {products?.map(p => (
              <div key={p.id} className="group cursor-pointer">
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 mb-6 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700">
                  <img src={p.images?.[0] || p.mainImage || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600'} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" alt={p.name} />
                  <div className="absolute top-0 right-0 p-4">
                    {p.comparePrice && p.comparePrice > p.price && (
                      <span className="text-[10px] tracking-widest font-bold uppercase text-amber-600 bg-white px-2 py-1">SALE</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button onClick={(e) => handleAddToCart(p, e)} className="bg-white text-black px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-amber-600 hover:text-white transition">Quick Buy</button>
                  </div>
                </div>
                <h4 className="text-lg mb-1 line-clamp-1" style={{ fontFamily: "'Cinzel', serif" }} title={p.name}>{p.name}</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">{p.category?.name || 'FURNITURE'}</p>
                <div className="flex gap-3 items-center">
                  <span className="text-lg font-bold">${p.price}</span>
                  {p.comparePrice && p.comparePrice > p.price && (
                    <span className="text-sm font-bold text-gray-400 line-through">${p.comparePrice}</span>
                  )}
                </div>
              </div>
            ))}
            {!products || products.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-10 uppercase tracking-widest text-sm">No masterpieces found.</div>
            )}
          </div>
        )}
      </section>

      {/* Cart Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-12 flex flex-col animate-in slide-in-from-right duration-500">
            <h3 className="text-3xl mb-12" style={{ fontFamily: "'Cinzel', serif" }}>Shopping Bag</h3>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {cartStoreItems.map((item) => (
                <div key={item.id} className="flex gap-6 items-center">
                  <img src={item.imageUrl} className="w-20 h-20 object-cover grayscale" alt={item.name} />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold tracking-wider mb-1 truncate" title={item.name}>{item.name}</h5>
                    <p className="text-xs text-slate-400 capitalize">${item.price} x {item.quantity}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-xs opacity-50 hover:opacity-100 uppercase tracking-widest">Remove</button>
                </div>
              ))}
              {cartStoreItems.length === 0 && <p className="text-center text-gray-300 py-20 italic">The bag is empty.</p>}
            </div>
            {cartStoreItems.length > 0 && (
              <div className="pt-10 border-t border-gray-100 mt-auto">
                <div className="flex justify-between text-2xl mb-8" style={{ fontFamily: "'Cinzel', serif" }}>
                  <span>Subtotal</span>
                  <span>${cartStoreItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-[#1A1A1A] text-white py-5 text-xs font-bold tracking-[0.3em] uppercase hover:bg-amber-600 transition-colors shadow-lg">Confirm Order</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
