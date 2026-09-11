import React from 'react';
import type { HeroVariantProps } from './heroTypes';
import { renderHeroAction } from './heroActions';
import { ShieldCheck, Cpu, CheckCircle2, Zap } from 'lucide-react';

export const DentalPrecisionHero: React.FC<HeroVariantProps> = (props) => {
  const leadImage = props.backgroundImage || props.panel?.image || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200';
  const eyebrow = props.eyebrow || 'معمل ومختبر أسنان رقمي فائق التطور • CAD/CAM 2026';
  const title = props.title || 'دقة هندسية وجمال طبيعي لأرقى عيادات الأسنان';
  const subtitle = props.subtitle || 'نحول مسحاتك الفموية الرقمية إلى تركيبات زيركون وإيماكس متناهية الدقة بهندسة خماسية المحاور، لتضمن انطباقاً ميكرونياً خالياً من التعديل من أول جلسة.';

  const clinicalMetrics = [
    { label: 'دقة التفريز', value: '±4.5 µm', desc: 'مطابقة رقمية تامة' },
    { label: 'صلابة الزيركون', value: '1250 MPa', desc: 'متعدد الطبقات Multilayer' },
    { label: 'انطباق الجلسة الأولى', value: '99.8%', desc: 'بدون تعديلات سريرية' },
  ];

  const scannerBadges = ['3Shape TRIOS', 'iTero Element', 'Medit i700', 'CEREC Primescan'];

  return (
    <section id="dental-hero" className="relative w-full overflow-hidden bg-gradient-to-b from-[#060913] via-[#0A101E] to-[#060913] pt-12 pb-20 sm:py-20 lg:py-24 text-white">
      {/* Precision Blueprint Grid Background */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Atmospheric Radial Light Accents */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[150px]" />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-[480px] w-[480px] rounded-full bg-blue-600/10 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          
          {/* Left Column: Clinical Brand Proposition (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-cyan-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span>{eyebrow}</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-white leading-[1.25] lg:leading-[1.2]">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300 font-normal leading-relaxed">
              {subtitle}
            </p>

            {/* Primary & Secondary Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              {renderHeroAction(
                props.primaryHref || '/contact',
                props.ctaText || 'طلب كيت عينات مجاني للعيادة 📦',
                'inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold px-6 py-3 text-sm sm:text-base shadow-[0_10px_35px_-10px_rgba(6,182,212,0.6)] transition-all transform hover:-translate-y-0.5'
              )}
              {renderHeroAction(
                props.secondaryHref || '/dental-portal',
                props.secondaryCtaText || 'دخول بوابة الأطباء 🩺',
                'inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/80 text-white font-medium px-6 py-3 text-sm sm:text-base backdrop-blur-md transition-all'
              )}
            </div>

            {/* Clinical Telemetry Stats Strip */}
            <div className="pt-6 border-t border-slate-800/70 grid grid-cols-3 gap-3 sm:gap-6">
              {clinicalMetrics.map((metric, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    {metric.label}
                  </div>
                  <div className="text-lg sm:text-2xl font-bold font-mono text-cyan-300">
                    {metric.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                    {metric.desc}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Interactive Clinical Media Card (5 Cols) */}
          <div className="lg:col-span-5 relative">
            
            {/* Visual Glass Frame */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 sm:p-5 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.2)] backdrop-blur-xl">
              
              {/* Card Header */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
                    CAD/CAM RESTORATION SPEC
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  ISO 13485 Certified
                </span>
              </div>

              {/* Main Photo Showcase */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-950">
                <img
                  src={leadImage}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="eager"
                  fetchpriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20" />
                
                {/* Floating Micro Badge on image */}
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between rounded-lg bg-black/75 px-3 py-2 border border-slate-700/80 backdrop-blur-md">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono">Restoration Material</div>
                    <div className="text-xs font-bold text-white">Multilayer Zirconia 5Y-PSZ</div>
                  </div>
                  <div className="rounded bg-cyan-500/20 px-2 py-1 text-[11px] font-mono font-bold text-cyan-300">
                    0.3mm Margin Fit
                  </div>
                </div>
              </div>

              {/* Supported Scanner Ecosystem Badges */}
              <div className="mt-4 pt-3 border-t border-slate-800/60">
                <div className="mb-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span>دعم مباشر لجميع ملفات الماسحات الفموية (STL / PLY):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scannerBadges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[10px] font-mono font-medium text-slate-300"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Soft Floating Trust Seal Card */}
            <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white">ضمان استبدال معتمد 5 سنوات</div>
                <div className="text-[10px] text-slate-400">شهادة مطابقة بيولوجية معتمدة لكل حالة</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
