import React from "react";

const integrations = [
  { name: "WhatsApp Cloud API", tag: "رسمي", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30" },
  { name: "Meta Messenger", tag: "محادثات", color: "from-blue-500/20 to-blue-500/5 text-blue-300 border-blue-500/30" },
  { name: "Instagram Direct", tag: "أتمتة", color: "from-pink-500/20 to-pink-500/5 text-pink-300 border-pink-500/30" },
  { name: "WooCommerce", tag: "تزامن متجر", color: "from-purple-500/20 to-purple-500/5 text-purple-300 border-purple-500/30" },
  { name: "Shopify", tag: "ربط كتالوج", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30" },
  { name: "Paymob & Fawry", tag: "مدفوعات", color: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30" },
  { name: "Facebook Ads API", tag: "حملات", color: "from-blue-600/20 to-blue-600/5 text-blue-300 border-blue-500/30" },
  { name: "Google Analytics 4", tag: "تتبع", color: "from-amber-600/20 to-amber-600/5 text-amber-300 border-amber-500/30" },
  { name: "Telegram Bot API", tag: "بث فوري", color: "from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/30" },
  { name: "Microsoft Clarity", tag: "تحليل سلوك", color: "from-orange-500/20 to-orange-500/5 text-orange-300 border-orange-500/30" },
  { name: "REST APIs & Webhooks", tag: "مطورين", color: "from-indigo-500/20 to-indigo-500/5 text-indigo-300 border-indigo-500/30" },
];

export const LandingMarquee: React.FC = () => {
  return (
    <section id="integrations" className="relative py-10 border-y border-white/10 bg-slate-950/80 overflow-hidden">
      {/* Side Fade Mask */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      <div className="mx-auto max-w-6xl px-4 text-center mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          يرتبط بسلاسة مع أدواتك وأنظمتك الحالية بدون كتابة كود
        </p>
      </div>

      <div className="flex select-none overflow-hidden group">
        <div className="flex min-w-full shrink-0 animate-marquee items-center justify-around gap-4 group-hover:[animation-play-state:paused]">
          {integrations.concat(integrations).map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full border bg-gradient-to-b backdrop-blur-md transition-all hover:scale-105 ${item.color}`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              <span className="text-xs font-bold text-white whitespace-nowrap">
                {item.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono">
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
