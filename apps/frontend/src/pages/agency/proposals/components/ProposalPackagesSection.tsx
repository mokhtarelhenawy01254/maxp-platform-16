import React from "react";
import { Check, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { ProposalPackage } from "../types";

interface ProposalPackagesSectionProps {
  packages: ProposalPackage[];
  currency: string;
  isAccepted: boolean;
  acceptedPackageId?: string | null;
  onSelectPackage: (pkg: ProposalPackage) => void;
}

export const ProposalPackagesSection: React.FC<ProposalPackagesSectionProps> = ({
  packages,
  currency = "ج.م",
  isAccepted,
  acceptedPackageId,
  onSelectPackage,
}) => {
  if (!packages || packages.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">باقات الاستثمار ونموذج التعاقد (Investment Options)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            اختر الباقة الأنسب لأهداف كود تريبس التشغيلية والتوسعية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {packages.map((pkg) => {
          const isThisAccepted = isAccepted && acceptedPackageId === pkg.id;

          return (
            <div
              key={pkg.id}
              className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all relative ${
                pkg.isPopular
                  ? "border-primary bg-card shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                  : "border-border/70 bg-card shadow-xs"
              }`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1 flex items-center gap-1 shadow-xs">
                    <Sparkles className="size-3" />
                    الباقة الموصى بها للأكاديمية
                  </Badge>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkg.tagline}
                  </p>
                </div>

                <div className="pt-2 pb-1 border-y border-border/50">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground tabular-nums">
                      {pkg.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">
                      {currency} / {pkg.period}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <span className="text-xs font-bold text-foreground">يشمل هذا الخيار:</span>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {pkg.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 leading-relaxed">
                        <span className="flex items-center justify-center size-4 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                          <Check className="size-2.5" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                {isThisAccepted ? (
                  <Button
                    disabled
                    className="w-full bg-emerald-600 text-white font-black h-11 text-xs sm:text-sm rounded-xl cursor-default"
                  >
                    <CheckCircle2 className="size-4 ml-2" />
                    تم اختيار هذه الباقة
                  </Button>
                ) : (
                  <Button
                    onClick={() => onSelectPackage(pkg)}
                    disabled={isAccepted}
                    className={`w-full font-black h-11 text-xs sm:text-sm rounded-xl transition-all shadow-sm ${
                      pkg.isPopular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    }`}
                  >
                    {isAccepted ? "تم اعتماد الخطة مسبقاً" : "اعتماد الخطة واختيار هذه الباقة"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
