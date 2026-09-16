import React from "react";
import { ShieldCheck, RefreshCw, Layers, Zap } from "lucide-react";

export const EnterpriseSpecsBanner: React.FC = () => {
  const specs = [
    {
      icon: RefreshCw,
      title: "تحديثات صامتة وتلقائية",
      subtitle: "Silent Background Sync",
      desc: "تحديث شفاف لواجهات وتطبيقات المنظومة بدون مقاطعة جلسات العمل أو إعادة التثبيت.",
    },
    {
      icon: Zap,
      title: "تطبيق ويب تقدمي (PWA)",
      subtitle: "Instant Standalone App",
      desc: "تثبيت فوري على الهواتف وأجهزة الكمبيوتر مع عمل فوري وتخزين كاش محلي فائق السرعة.",
    },
    {
      icon: ShieldCheck,
      title: "أمان وتشفير مركزي",
      subtitle: "TLS 1.3 & Encrypted Ingestion",
      desc: "حماية تامة لبيانات المنشأة وسجلات النشاط مع عزل كامل لكل منشأة وحفظ أمان المعاملات.",
    },
    {
      icon: Layers,
      title: "مزامنة لحظية مباشرة",
      subtitle: "Realtime WebSocket Engine",
      desc: "ربط فوري بين فروع البيع ومحطات العمل وتطبيقات الموظفين دون تأخير في تحديث السجلات.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {specs.map((spec, idx) => {
        const Icon = spec.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-border/40 bg-card p-3.5 sm:p-4 transition-all hover:border-border"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{spec.title}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground block truncate">{spec.subtitle}</span>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground text-pretty">{spec.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnterpriseSpecsBanner;
