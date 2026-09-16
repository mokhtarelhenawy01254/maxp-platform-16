import React from "react";
import { ShieldCheck, RefreshCw, Cpu, Radio } from "lucide-react";

export const EnterpriseSpecsBanner: React.FC = () => {
  const specs = [
    {
      icon: RefreshCw,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      title: "تحديثات صامتة وتلقائية",
      subtitle: "Background Delta Updates",
      desc: "فحص دوري كل ساعتين وتنزيل الحزم التراكمية في الخلفية مع تطبيقها تلقائياً دون مقاطعة عمل الموظف.",
    },
    {
      icon: Cpu,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      title: "كفاءة واستهلاك فائق الصغر",
      subtitle: "P95 CPU < 0.5% • RAM < 65MB",
      desc: "محرك مراقبة محلي مبرمج بتقنيات Win32 الأصلية مع تخزين SQLite لا يؤثر إطلاقاً على سرعة جهاز الموظف.",
    },
    {
      icon: ShieldCheck,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      title: "أمان وتشفير معتمد",
      subtitle: "TLS 1.3 + AES-256 Cloud Ingest",
      desc: "تشفير تام لكل الحركات ولوحة المفاتيح التراكمية مع مطابقة التوكن المعتمد للشركة لمنع أي تلاعب.",
    },
    {
      icon: Radio,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      title: "تدقيق الحضور والتأخير الذكي",
      subtitle: "First Physical Activity Audit",
      desc: "حساب دقيق لفرق الثواني بين بصمة الدخول الرسمية وأول نشاط فعلي على لوحة المفاتيح لمنع التحايل.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {specs.map((spec, idx) => {
        const Icon = spec.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-border/40 bg-card/60 p-4 transition-all hover:border-border"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className={`flex size-8 items-center justify-center rounded-lg border ${spec.border} ${spec.bg} ${spec.color} shrink-0`}
                >
                  <Icon className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{spec.title}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground">{spec.subtitle}</span>
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
