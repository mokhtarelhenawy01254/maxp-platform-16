import React from "react";
import { ProposalTargets } from "../types";
import { Band, SectionTitle, Lead, Marker, money } from "./ProposalUi";

interface ProposalTargetsSectionProps {
  targets?: ProposalTargets;
  currency?: string;
}

/**
 * The commitment ladder: what "400 children" actually means month by month,
 * and which three engines produce it. Numbers only — no invented ROAS.
 */
export const ProposalTargetsSection: React.FC<ProposalTargetsSectionProps> = ({
  targets,
  currency = "ج.م",
}) => {
  if (!targets || !targets.rows?.length) return null;

  const last = targets.rows[targets.rows.length - 1]!;
  const totalNew = targets.rows.reduce((sum, row) => sum + row.newStudents, 0);

  return (
    <Band tone="gold" id="targets">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-black/20">
        <div className="space-y-4 max-w-3xl">
          <Marker dark>التارجت المتفق عليه</Marker>
          <SectionTitle>{targets.headline}</SectionTitle>
          {targets.subline && <Lead muted>{targets.subline}</Lead>}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-5xl sm:text-6xl font-black tabular-nums leading-none">
            {last.activeStudents}
          </div>
          <div className="text-xs font-bold mt-2">
            طفل مشترك بحلول {last.month} — إيراد شهري {money(last.revenue)} {currency}
          </div>
        </div>
      </div>

      {/* Month-by-month ledger */}
      <div className="pt-10 overflow-x-auto">
        <table className="w-full min-w-[620px] text-right">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider border-b border-black/20">
              <th className="py-3 pr-2 font-bold">الشهر</th>
              <th className="py-3 font-bold">طلاب جدد</th>
              <th className="py-3 font-bold">إجمالي المشتركين</th>
              <th className="py-3 font-bold">ميزانية الإعلانات</th>
              <th className="py-3 font-bold">الإيراد الشهري</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {targets.rows.map((row, idx) => (
              <tr key={idx} className={idx === targets.rows.length - 1 ? "font-black" : ""}>
                <td className="py-3 pr-2 text-sm font-bold">{row.month}</td>
                <td className="py-3 font-mono tabular-nums text-sm">{row.newStudents}</td>
                <td className="py-3 font-mono tabular-nums text-sm">{row.activeStudents}</td>
                <td className="py-3 font-mono tabular-nums text-sm">{money(row.media)}</td>
                <td className="py-3 font-mono tabular-nums text-sm">{money(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black/40">
              <td className="py-3 pr-2 text-xs font-bold">الإجمالي</td>
              <td className="py-3 font-mono tabular-nums text-xs font-bold">{totalNew}</td>
              <td className="py-3 text-xs font-bold" colSpan={3}>
                طالب جديد خلال {targets.rows.length} شهور — بمتوسط ثبات ٩٢٪ شهرياً
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {targets.engines && targets.engines.length > 0 && (
        <div className="pt-10 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-black/20 mt-8">
          {targets.engines.map((engine, idx) => (
            <div key={idx} className="space-y-2 border-r-2 border-black/30 pr-4">
              <div className="font-mono text-3xl font-black tabular-nums leading-none">{engine.perMonth}</div>
              <div className="text-sm font-black">{engine.name}</div>
              <div className="text-xs leading-relaxed opacity-80">{engine.detail}</div>
            </div>
          ))}
        </div>
      )}

      {targets.note && (
        <p className="pt-8 mt-8 border-t border-black/20 text-xs leading-relaxed opacity-80 max-w-3xl">
          {targets.note}
        </p>
      )}
    </Band>
  );
};
