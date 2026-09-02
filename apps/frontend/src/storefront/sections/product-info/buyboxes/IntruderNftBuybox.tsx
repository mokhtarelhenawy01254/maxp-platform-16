import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import type { Product } from '../../../hooks/useProducts';
import type { StorefrontTheme } from '../../../types/theme.types';

export interface IntruderNftBuyboxProps {
  product: Product;
  theme: StorefrontTheme;
  homePath: string;
  shopPath: string;
  displayPrice: string;
  commonVariantSelector: React.ReactNode;
  handleAddToCart: () => Promise<void>;
}

export const IntruderNftBuybox: React.FC<IntruderNftBuyboxProps> = ({
  product,
  theme,
  homePath,
  shopPath,
  displayPrice,
  commonVariantSelector,
  handleAddToCart,
}) => {
  return (
      <section className="w-full bg-background font-sans">
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            <Link to={homePath} className="hover:text-white transition-colors opacity-60">Home</Link>
            <span className="opacity-30">/</span>
            <Link to={shopPath} className="hover:text-white transition-colors opacity-60">Market</Link>
            <span className="opacity-30">/</span>
            <span className="text-white">NFT Details</span>
          </div>
          <div className="space-y-2">
             <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Verified Collection
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
               {product.name}
             </h1>
             <div className="flex gap-2">
                <span className="text-sm font-bold text-primary">@{product.category?.name || "Artist"}</span>
                <span className="text-sm font-bold text-muted-foreground opacity-50">|</span>
                <span className="text-sm font-bold text-muted-foreground">Series #84/100</span>
             </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] group-hover:bg-primary/30 transition-all duration-700" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
                <div className="space-y-4">
                   <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-60">Current Offering</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border border-primary/30">Ξ</div>
                         <div className="flex flex-col">
                            <span className="text-3xl font-black text-white leading-tight">{(product.price / 5000).toFixed(2)} ETH</span>
                            <span className="text-sm font-bold text-muted-foreground">({displayPrice})</span>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   {commonVariantSelector}
                   <div className="flex items-center gap-3">
                      <button
                         onClick={handleAddToCart}
                         className="flex-1 bg-primary text-primary-foreground h-14 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] active:scale-[0.98]"
                      >
                         Place Bid Now
                      </button>
                      <button className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group/heart">
                         <Heart size={20} className="group-hover/heart:fill-primary group-hover/heart:text-primary" />
                      </button>
                   </div>
                </div>
             </div>
          </div>
          <div className="space-y-4 pt-4">
             <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Description</h3>
                <Share2 size={18} className="text-muted-foreground cursor-pointer hover:text-white" />
             </div>
             <p className="text-sm leading-relaxed text-muted-foreground/80 max-w-2xl font-medium">
                {product.description?.replace(/<[^>]+>/g, '') || "Futuristic aesthetic digital asset."}
             </p>
          </div>
        </div>
      </section>
    );
};

export default IntruderNftBuybox;