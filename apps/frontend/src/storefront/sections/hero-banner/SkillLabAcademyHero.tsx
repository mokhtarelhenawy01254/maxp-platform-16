import React, { useState } from 'react';
import type { HeroVariantProps } from './heroTypes';
import { renderHeroAction } from './heroActions';
import { Terminal, Bot, Sparkles, CheckCircle2, PlayCircle, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';

export const SkillLabAcademyHero: React.FC<HeroVariantProps> = (props) => {
  const eyebrow = props.eyebrow || 'أكاديمية النخبة البرمجية • مسارات 2026 المتقدمة';
  const title = props.title || 'تعلّم مهارات هندسية فائقة وانضم إلى صفوة المطورين';
  const subtitle = props.subtitle || 'مسارات مكثفة لنقلك من مرحلة المطور التقليدي إلى بناء أنظمة معقدة، شبكات وكلاء الذكاء الاصطناعي، وواجهات موشن فائقة الأداء (60 FPS) تنافس عالمياً.';

  // Interactive Tab State for Sandbox Cockpit
  const [activeTab, setActiveTab] = useState<'agent' | 'motion' | 'architecture'>('agent');

  // 3D Tilt Physics State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = Number((((y - centerY) / centerY) * -8).toFixed(2));
    const rotateY = Number((((x - centerX) / centerX) * 8).toFixed(2));

    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const metrics = [
    { label: 'مهندس وخريج تم تأهيلهم', value: '4,200+', desc: 'سوق العمل المحلي والدولي' },
    { label: 'نسبة إتمام المسارات', value: '96.4%', desc: 'إشراف ومراجعة كود أسبوعية' },
    { label: 'مشروع عملي Production-Ready', value: '38+', desc: 'أنظمة متكاملة قابلة للنشر' },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-[#07090E] pt-10 pb-16 sm:py-20 lg:py-24 text-white">
      {/* Background Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[150px]" />
      
      {/* Precision Grid Blueprint */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #22c55e 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12">
          
          {/* Left Column: Academy Narrative & Value Proposition (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* Live Batch Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-emerald-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>{eyebrow}</span>
            </div>

            {/* Headline with Brand Gradient */}
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-[3.4rem] font-black tracking-tight text-white leading-[1.2] lg:leading-[1.15]">
              اصنع برمجيات{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                فائقة الأداء
              </span>{' '}
              وتجاوز الحدود التقليدية
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-slate-300 font-normal leading-relaxed">
              {subtitle}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              {renderHeroAction(
                props.primaryHref || '/shop',
                props.ctaText || 'استكشف المسارات واشترك الآن',
                'inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-7 py-3 text-sm sm:text-base shadow-[0_12px_36px_-12px_rgba(34,197,94,0.5)] transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer'
              )}
              {renderHeroAction(
                props.secondaryHref || '/collections',
                props.secondaryCtaText || 'مشاهدة المنهج والمشاريع',
                'inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-700/90 bg-slate-900/70 hover:bg-slate-800/90 text-white font-bold px-6 py-3 text-sm sm:text-base backdrop-blur-md transition-all active:scale-95 cursor-pointer'
              )}
            </div>

            {/* Verified Student Metrics Bar */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 sm:gap-6">
              {metrics.map((metric, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                    {metric.label}
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                    {metric.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">
                    {metric.desc}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: 3D Mouse Tilt Sandbox Cockpit (5 Cols) */}
          <div className="lg:col-span-5 relative">
            <div
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
                transition: isHovered ? 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)' : 'transform 0.5s ease',
              }}
              className="relative rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl will-change-transform"
            >
              {/* Cockpit Window Top Header */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/90 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span>skill-lab-kernel.ts</span>
                </div>
                <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800/60">
                  60 FPS Live
                </span>
              </div>

              {/* Interactive Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950/80 border border-slate-800/80 mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('agent')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'agent' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>وكلاء الذكاء</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('motion')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'motion' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GSAP Motion</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('architecture')}
                  className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'architecture' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>معمارية النظم</span>
                </button>
              </div>

              {/* Live Sandbox Terminal Code Block */}
              <div className="rounded-xl bg-[#05070B] p-3.5 font-mono text-[11px] leading-relaxed text-slate-300 border border-slate-800/80 text-left overflow-x-auto min-h-[140px] flex flex-col justify-center">
                {activeTab === 'agent' && (
                  <div>
                    <div className="text-slate-500">// Microsoft Agent & MCP Protocol Swarm</div>
                    <div><span className="text-purple-400">const</span> swarm = <span className="text-purple-400">new</span> <span className="text-amber-300">MultiAgentSwarm</span>({'{'} concurrency: <span className="text-rose-400">4</span> {'}'});</div>
                    <div><span className="text-blue-400">await</span> swarm.<span className="text-amber-300">delegate</span>({'{'} task: <span className="text-emerald-400">'Autonomous Code Audit'</span> {'}'});</div>
                    <div className="text-emerald-400 mt-2">✓ 0 Blast-Radius Verified across all modules</div>
                    <div className="text-sky-400">✓ Context Memory Tier-3 synced successfully</div>
                  </div>
                )}
                {activeTab === 'motion' && (
                  <div>
                    <div className="text-slate-500">// Lenis + GSAP 60 FPS Hardware Engine</div>
                    <div><span className="text-purple-400">const</span> lenis = <span className="text-purple-400">new</span> <span className="text-amber-300">Lenis</span>({'{'} duration: <span className="text-rose-400">1.2</span>, smooth: <span className="text-teal-400">true</span> {'}'});</div>
                    <div>ScrollTrigger.<span className="text-amber-300">sync</span>(lenis);</div>
                    <div className="text-emerald-400 mt-2">✓ 3D Tilt perspective locked at 1000px</div>
                    <div className="text-sky-400">✓ GPU Transform3D acceleration: ON</div>
                  </div>
                )}
                {activeTab === 'architecture' && (
                  <div>
                    <div className="text-slate-500">// Enterprise Microservices & Multi-Tenancy</div>
                    <div><span className="text-purple-400">const</span> tenant = <span className="text-blue-400">await</span> db.<span className="text-amber-300">resolveTenant</span>({'{'} companyId {'}'});</div>
                    <div><span className="text-purple-400">const</span> queue = <span className="text-purple-400">new</span> <span className="text-amber-300">BullMQWorker</span>({'{'} concurrency: <span className="text-rose-400">20</span> {'}'});</div>
                    <div className="text-emerald-400 mt-2">✓ Zero-Downtime Hot Reloading Active</div>
                    <div className="text-sky-400">✓ Redis Cluster P99 Latency: 1.2ms</div>
                  </div>
                )}
              </div>

              {/* Student Live Progress Card */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">مراجعة كود فردية معتمدة</span>
                    <span className="text-[10px] text-slate-400">ملاحظات دقيقة على كل Pull Request</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                  Passed 100%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
