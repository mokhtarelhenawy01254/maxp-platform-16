import React from "react";

// Fallback div if motion is not used
const StaticMotionDiv: React.FC<React.HTMLAttributes<HTMLDivElement> & { initial?: any; animate?: any; transition?: any }> = ({
  initial,
  animate,
  transition,
  className,
  children,
  ...rest
}) => (
  <div className={className} {...rest}>
    {children}
  </div>
);

export const SpecsGrid: React.FC<{
  specs: Array<{ label: string; value: string }>;
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variantSelector?: React.ReactNode;
  emptyStateText?: string;
}> = ({
  specs,
  header,
  price,
  actions,
  variantSelector,
  emptyStateText = 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.',
}) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        {header}
        {price}
      </div>

      {variantSelector}

      <div className="grid grid-cols-2 gap-4 py-8 border-y border-border/50">
        {specs.length > 0 ? (
          specs.map((spec, i) => (
            <StaticMotionDiv
              key={i}
              className="flex flex-col gap-1 p-4 rounded-2xl bg-secondary/30 border border-border/5"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                {spec.label}
              </span>
              <span className="text-sm font-black text-foreground">
                {spec.value}
              </span>
            </StaticMotionDiv>
          ))
        ) : (
          <div className="col-span-2 py-4 text-center text-muted-foreground text-sm italic">
            {emptyStateText}
          </div>
        )}
      </div>

      {actions}
    </div>
  );
};

SpecsGrid.displayName = 'SpecsGrid';

export const BentoSpecs: React.FC<{
  specs: Array<{ label: string; value: string }>;
  header: React.ReactNode;
  price: React.ReactNode;
  actions: React.ReactNode;
  variantSelector?: React.ReactNode;
  emptyStateText?: string;
}> = ({
  specs,
  header,
  price,
  actions,
  variantSelector,
  emptyStateText = 'لا توجد مواصفات تقنية مضافة لهذا المنتج حتى الآن.',
}) => {
  const mainSpec = specs[0];
  const otherSpecs = specs.slice(1, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        {header}
        {price}
      </div>

      {variantSelector}

      <div className="grid grid-cols-4 gap-3">
        {specs.length > 0 ? (
          <>
            {/* Hero Spec */}
            {mainSpec && (
              <StaticMotionDiv
                className="col-span-4 p-6 rounded-3xl bg-primary text-primary-foreground flex flex-col justify-between min-h-[160px] relative overflow-hidden group"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                  <span className="text-xs font-black uppercase tracking-widest opacity-70">{mainSpec.label}</span>
                  <p className="text-3xl font-black mt-2 leading-none">{mainSpec.value}</p>
                </div>
                <div className="relative z-10 mt-4">
                  <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-2/3" />
                  </div>
                </div>
              </StaticMotionDiv>
            )}

            {/* Other Specs */}
            {otherSpecs.map((spec, i) => (
              <StaticMotionDiv
                key={i}
                className="col-span-2 p-4 rounded-2xl bg-secondary/30 border border-border/10 flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{spec.label}</span>
                <span className="text-base font-black text-foreground mt-2">{spec.value}</span>
              </StaticMotionDiv>
            ))}
          </>
        ) : (
          <div className="col-span-4 py-8 text-center text-muted-foreground text-sm italic">
            {emptyStateText}
          </div>
        )}
      </div>

      {actions}
    </div>
  );
};

BentoSpecs.displayName = 'BentoSpecs';
