import { useCheckoutStore, StorefrontTierProgress } from "../store/useCheckoutStore";

const METHOD_LABELS: Record<string, string> = {
  POINTS: "┘å┘é╪╖╪⌐",
  SPENT: "╪¼.┘à",
  ITEMS: "┘é╪╖╪╣╪⌐",
  ORDER_COUNT: "╪ú┘ê╪▒╪»╪▒",
};

function benefitsSummary(tier: any): string[] {
  const out: string[] = [];
  const b = tier?.benefits;
  if (!b) return out;
  if (b.freeShipping) out.push("╪┤╪¡┘å ┘à╪¼╪º┘å┘è");
  const pct = Number(b.discountPercent || 0);
  if (pct > 0) out.push(`╪«╪╡┘à ${pct}%`);
  return out;
}

function TierProgressCard({ progress }: { progress: StorefrontTierProgress }) {
  const tier = progress.tier;
  const next = progress.nextTier;
  const tierBenefits = benefitsSummary(tier);
  const nextBenefits = benefitsSummary(next);
  const unit = METHOD_LABELS[progress.method] || progress.metricLabel || "┘ê╪¡╪»╪⌐";

  return (
    <div
      className="rounded-xl border bg-gradient-to-l from-emerald-50 to-white px-4 py-3 shadow-sm"
      style={tier?.color ? { borderColor: `${tier.color}55` } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tier?.color || '#10b981' }}
          />
          {tier?.nameAr || tier?.name || "╪╣┘à┘è┘ä ┘à┘à┘è╪▓"}
        </span>
        {tierBenefits.length > 0 && (
          <span className="text-xs font-semibold text-emerald-700">
            {tierBenefits.join(" ┬╖ ")}
          </span>
        )}
      </div>

      {next && (
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-bold text-emerald-700">
            ┘ü╪º╪╢┘ä {next.remainingMetric} {unit}
          </span>{" "}
          ┘ê╪¬╪¬╪▒┘é┘ë ┘ä┘à╪│╪¬┘ê┘ë{" "}
          <span className="font-bold">{next.nameAr || next.name}</span>
          {nextBenefits.length > 0 && (
            <>
              {" "}
              ┘ê╪¬╪¡╪╡┘ä ╪╣┘ä┘ë <span className="font-semibold">{nextBenefits.join(" ┘ê")}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * ╪¿╪º┘å╪▒ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä ΓÇö ╪¿┘è╪╕┘ç╪▒ ┘ä┘à╪º ╪º┘ä╪╣┘à┘è┘ä ┘è╪»╪«┘ä ╪▒┘é┘à┘ç ┘ü┘è ╪╡┘ü╪¡╪⌐ ╪º┘ä╪»┘ü╪╣
 */
export default function TierProgressBanner() {
  const tierProgress = useCheckoutStore((s) => s.tierProgress);
  if (!tierProgress) return null;
  // ╪¿╪º┘å╪▒ ╪º┘ä┘à╪│╪¬┘ê┘ë ┘è╪╕┘ç╪▒ ┘ä┘ê ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘à┘ü╪╣┘æ┘ä (┘à╪│╪¬┘é┘ä ╪╣┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è)
  if (tierProgress.tiersEnabled !== true) return null;
  return <TierProgressCard progress={tierProgress} />;
}
