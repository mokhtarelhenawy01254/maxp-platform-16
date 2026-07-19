import React from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';

interface OrderStepTimelineProps {
  currentStep?: 'placed' | 'preparing' | 'shipped' | 'delivered';
  labels?: {
    placed?: string;
    preparing?: string;
    shipped?: string;
    delivered?: string;
  };
}

const OrderStepTimeline: React.FC<OrderStepTimelineProps> = ({ 
  currentStep = 'placed',
  labels = {
    placed: 'تم الطلب بنجاح',
    preparing: 'قيد التجهيز',
    shipped: 'جاري الشحن',
    delivered: 'تم التوصيل'
  }
}) => {
  const { theme } = useStorefrontTheme();
  const isSoleaFemme = theme.id === 'solea-femme';
  const isPcHub = theme.id === 'pc-hub-eg';

  const steps = [
    { id: 'placed', label: labels.placed },
    { id: 'preparing', label: labels.preparing },
    { id: 'shipped', label: labels.shipped },
    { id: 'delivered', label: labels.delivered },
  ];

  const currentIdx = Math.max(0, steps.findIndex((step) => step.id === currentStep));
  const wrapperClassName = isPcHub
    ? 'mx-auto w-full max-w-2xl py-6'
    : 'mx-auto w-full max-w-lg py-8';
  const backgroundLineClassName = isPcHub
    ? 'absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[#e8ddbb] transition-all duration-500'
    : 'absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-muted transition-all duration-500';
  const progressLineClassName = isPcHub
    ? 'absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#111827_0%,#f5c94b_100%)] transition-all duration-1000'
    : 'absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-1000';

  return (
    <div className={wrapperClassName}>
      <div className="relative flex items-center justify-between">
        <div className={backgroundLineClassName} />
        <div 
          className={progressLineClassName}
          style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const stepCircleClassName = isPcHub
            ? isActive
              ? 'border-[#111827] bg-[#111827] text-[#f8d76a] scale-105 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.5)]'
              : 'border-[#e1d2a0] bg-white text-[#98a2b3]'
            : isActive 
              ? 'border-primary bg-primary text-primary-foreground scale-110 shadow-primary/20' 
              : 'border-muted bg-background text-muted-foreground';
          const stepRingClassName = isCurrent
            ? isPcHub
              ? 'ring-4 ring-[#f5c94b]/30'
              : 'ring-4 ring-primary/20 animate-pulse'
            : '';
          const labelClassName = isPcHub
            ? isActive
              ? 'text-[#111827]'
              : 'text-[#667085] opacity-70'
            : isActive
              ? 'text-foreground'
              : 'text-muted-foreground opacity-60';

          return (
            <div key={step.id} className="relative flex flex-col items-center group">
              <div 
                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 shadow-sm ${stepCircleClassName} ${stepRingClassName}`}
              >
                {isActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <span className={`absolute top-10 whitespace-nowrap text-[10px] font-bold transition-colors duration-500 sm:text-xs ${labelClassName} ${isSoleaFemme ? 'font-heading tracking-tight' : ''}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStepTimeline;
