import React from 'react';
import { formatStorefrontCurrency } from '../../../utils/currency';
import { StaticMotionButton, StaticMotionDiv } from '../../../components/StaticMotion';

export const StickyMobileCTA = ({
  activePrice,
  currency,
  onAddToCart,
  isVisible,
  label = '???? ????',
}: {
  activePrice: number;
  currency: string;
  onAddToCart: () => void;
  isVisible: boolean;
  label?: string;
}) => {
  const displayPrice = formatStorefrontCurrency(activePrice, currency);

  return (
    <StaticMotionDiv
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 sm:hidden pointer-events-none"
    >
      <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-3 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 pointer-events-auto max-w-md mx-auto">
        <div className="flex flex-col pl-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</span>
          <span className="text-lg font-black text-foreground">{displayPrice}</span>
        </div>

        <StaticMotionButton
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 0 0 0px hsl(var(--primary)/0.4)",
              "0 0 0 10px hsl(var(--primary)/0)",
              "0 0 0 0px hsl(var(--primary)/0)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          onClick={onAddToCart}
          className="flex-1 h-14 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
        >
          ??? ?????
        </StaticMotionButton>
      </div>
    </StaticMotionDiv>
  );
};

StickyMobileCTA.displayName = 'StickyMobileCTA';
export default StickyMobileCTA;