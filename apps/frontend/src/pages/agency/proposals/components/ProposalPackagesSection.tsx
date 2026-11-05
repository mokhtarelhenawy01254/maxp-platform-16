import React from "react";
import { Check, CheckCircle2, Sparkles } from "lucide-react";
import { ProposalPackage } from "../types";
import { Band, SectionTitle, Lead, Marker, stripParens, money } from "./ProposalUi";

interface ProposalPackagesSectionProps {
  packages: ProposalPackage[];
  currency?: string;
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
    <Band tone="graphite" id="packages">
      <div className="space-y-4 max-w-3xl pb-10 border-b border-white/10">
        <Marker>خيارات الاستثمار والشراكة</Marker>
        <SectionTitle>
          اختر نموذج التعاقد الأنسب لمرحلة نمو كود تريبس
        </SectionTitle>
        <Lead>
          بدون أي مصاريف خفية. يشمل الاشتراك الترخيص الكامل لمنصة MaxP، وإدارة الحملات الإعلانية، وتدريب فريق فرع
          فؤاد على إدارة الحجوزات والطلاب.
        </Lead>
      </div>

      {/* Side-by-Side Clean Comparison — Single Surface */}
      <div className="py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {packages.map((pkg) => {
          const isThisAccepted = isAccepted && acceptedPackageId === pkg.id;
          const isPopular = pkg.isPopular;

          return (
            <div
              key={pkg.id}
              className={`p-8 rounded-2xl flex flex-col justify-between transition-all ${
                isPopular
                  ? "bg-[#181818] border-2 border-[#FFD368]/60 shadow-2xl shadow-[#FFD368]/5"
                  : "bg-white/[0.02] border border-white/10"
              }`}
            >
              <div className="space-y-6">
                {/* Header & Tagline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#FFD368] uppercase tracking-wider">
                      {isPopular ? "الخيار الموصى به" : "خيار الانطلاق"}
                    </span>
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFD368] text-black">
                        <Sparkles className="size-3" />
                        الأعلى عائداً
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {stripParens(pkg.name)}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {pkg.tagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-4 border-y border-white/10 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-black text-[#FFD368] tabular-nums">
                    {money(pkg.price)}
                  </span>
                  <span className="text-xs font-bold text-white/60">
                    {currency} / {pkg.period}
                  </span>
                </div>

                {/* Scope Feature List */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    ما تتضمنه الباقة شهرياً:
                  </div>
                  <ul className="space-y-2.5 text-xs text-white/80">
                    {pkg.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="p-0.5 rounded-full bg-[#FFD368]/20 text-[#FFD368] mt-0.5 shrink-0">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {isThisAccepted ? (
                  <div className="w-full h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span>تم اعتماد هذا الخيار بنجاح</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectPackage(pkg)}
                    disabled={isAccepted}
                    className={`w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isPopular
                        ? "bg-gradient-to-r from-[#FFD368] to-[#D99518] text-black hover:opacity-95 shadow-lg shadow-[#FFD368]/15"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
                    }`}
                  >
                    <span>{isAccepted ? "الخطة معتمدة" : `اعتماد ${pkg.name}`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Band>
  );
};
