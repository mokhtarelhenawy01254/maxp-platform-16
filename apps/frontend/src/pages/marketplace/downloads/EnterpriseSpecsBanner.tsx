import React from "react";
import { ShieldCheck, RefreshCw, Layers, Zap } from "lucide-react";

export const EnterpriseSpecsBanner: React.FC = () => {
  const specs = [
    {
      icon: RefreshCw,
      title: "تحديثات صامتة وتلقائية",
      subtitle: "Continuous Service Worker Updates",
      desc: "تحديث مستمر وشفاف لواجهات المنظومة والخدمات بدون الحاجة لإعادة التثبيت أو مقاطعة مهام فريق العمل.",
    },
    {
      icon: Zap,
      title: "تطبيق ويب تقدمي (PWA)",
      subtitle: "Instant Standalone Engine",
      desc: "تثبيت بنقرة واحدة على الهواتف وأجهزة الكمبيوتر مع عمل فوري وذاكرة كاش محلية فائقة السرعة.",
    },
    {
      icon: ShieldCheck,
      title: "أمان وتشفير معزول",
      subtitle: "TLS 1.3 & AES Data Ingestion",
      desc: "حماية تامة لبيانات المنشأة، والفواتير، والمحادثات مع عزل كامل لكل منشأة وحفظ أمان المعاملات.",
    },
    {
      icon: Layers,
      title: "مزامنة سحابية لحظية",
      subtitle: "Live Socket.io Realtime Mesh",
      desc: "ربط فوري بين فروع البيع، ومحطات الكاشير، وتطبيقات المناديب والمخازن بدون تأخير في تحديث الأرصدة.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {specs.map((spec, idx) => {
        const Icon = spec.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-4 sm:p-5 transition-all duration-150 hover:border-primary/40 hover:bg-accent/[0.01]"
          >
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shrink-0">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground truncate">{spec.title}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground block truncate">{spec.subtitle}</span>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{spec.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnterpriseSpecsBanner;
