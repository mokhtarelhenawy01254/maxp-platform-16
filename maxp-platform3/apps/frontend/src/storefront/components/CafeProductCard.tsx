import React, { useState } from 'react';

export interface CafeProductCardProps {
  id?: string | number;
  title: string;
  subtitlePrefix?: string;
  subtitleCursive: string;
  subtitleSuffix?: string;
  imageUrl: string;
  bgColorClass: string;
  price?: number;
  className?: string;
  onAddToCart?: () => void;
}

/**
 * A specialized aesthetic card component inspired by modern, minimalist cafe designs.
 */
export const CafeProductCard: React.FC<CafeProductCardProps> = ({
  title,
  subtitlePrefix = '',
  subtitleCursive,
  subtitleSuffix = '',
  imageUrl,
  bgColorClass,
  price = 12,
  className = '',
  onAddToCart
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`group relative flex flex-col items-center justify-between p-8 rounded-[40px] transition-all duration-500 w-[300px] h-[380px] ${bgColorClass} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Title */}
      <h3 className="text-[28px] text-gray-900 tracking-wide mt-2 relative z-10" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      
      {/* Product Image */}
      <div className="flex-1 w-full flex items-center justify-center relative mt-2 mb-2">
        <img 
          src={imageUrl} 
          alt={title} 
          className="max-w-[80%] max-h-[80%] object-cover transform rotate-3 drop-shadow-2xl group-hover:-translate-y-4 group-hover:scale-110 transition-transform duration-500 ease-out rounded-full shadow-lg"
        />
        {/* Glow/ring */}
        <div className="absolute inset-0 max-w-[75%] max-h-[75%] m-auto rounded-full border-4 border-white/30 pointer-events-none scale-105 transition-all duration-500 group-hover:scale-110 group-hover:border-white/50"></div>
      </div>

      {/* Floating Add to Cart Button replacing footer on hover */}
      <div 
        className={`absolute bottom-8 left-0 w-full flex justify-center transition-all duration-300 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
          className="bg-white/90 backdrop-blur-sm text-[#7A5A54] px-6 py-2.5 rounded-full font-bold text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-[#7A5A54] hover:text-white transition-colors"
        >
          <span>ADD TO CART</span>
          <span>${price.toFixed(2)}</span>
        </button>
      </div>

      {/* Footer Typography Elements (Fades out when Add to Cart comes in) */}
      <div className={`w-full flex justify-between items-center px-2 mt-4 space-x-2 relative z-10 block pb-2 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        {/* Left tiny text */}
        <span className="font-bold text-gray-500 text-[10px] tracking-[0.2em] uppercase">
          {subtitlePrefix}
        </span>
        
        {/* Center cursive/signature text */}
        <span 
          style={{ fontFamily: "'Great Vibes', cursive" }} 
          className="text-4xl text-pink-500/80 drop-shadow-sm flex-1 text-center -mb-2 transform -rotate-2"
        >
          {subtitleCursive}
        </span>
        
        {/* Right tiny text */}
        <span className="font-bold text-gray-400 text-[10px] tracking-[0.2em] uppercase">
          {subtitleSuffix}
        </span>
      </div>
    </div>
  );
};
