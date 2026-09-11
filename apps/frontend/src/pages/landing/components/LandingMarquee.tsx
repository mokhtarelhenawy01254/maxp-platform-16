import React from "react";

const integrations = [
  { name: "WhatsApp Cloud API", category: "قنوات التواصل" },
  { name: "Meta Messenger", category: "سوشيال ميديا" },
  { name: "Instagram Direct", category: "أتمتة المحادثات" },
  { name: "WooCommerce", category: "تزامن المتاجر" },
  { name: "Shopify", category: "ربط الكتالوج" },
  { name: "Bosta & Aramex", category: "شركات الشحن" },
  { name: "Paymob & Fawry", category: "بوابات الدفع" },
  { name: "Facebook Ads API", category: "تتبع الحملات" },
  { name: "Google Tag Manager", category: "التحليلات" },
  { name: "Telegram Bot API", category: "إشعارات الفريق" },
  { name: "Microsoft Clarity", category: "سلوك العملاء" },
  { name: "REST APIs & Webhooks", category: "الربط المخصص" },
];

export const LandingMarquee: React.FC = () => {
  return (
    <section id="integrations" className="relative py-12 border-y border-white/[0.06] bg-zinc-950/60 overflow-hidden">
      {/* Side Fade Gradient Masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-[#070606] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-[#070606] to-transparent z-10" />

      <div className="mx-auto max-w-5xl px-4 text-center mb-8">
        <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          يتكامل مباشرة وبدون وسيط مع أدواتك وشبكات الشحن والدفع
        </p>
      </div>

      <div className="flex select-none overflow-hidden group">
        <div className="flex min-w-full shrink-0 animate-marquee items-center justify-around gap-4 group-hover:[animation-play-state:paused]">
          {integrations.concat(integrations).map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span className="text-xs font-bold text-zinc-200 whitespace-nowrap">
                {item.name}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono border-r border-white/10 pr-2 mr-1">
                {item.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
