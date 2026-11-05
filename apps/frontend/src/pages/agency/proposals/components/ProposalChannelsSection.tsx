import React from "react";
import { ProposalChannel, ProposalContentPlan, ProposalContentWeek } from "../types";
import { Band, SectionTitle, Lead, Marker, money } from "./ProposalUi";

interface ProposalChannelsSectionProps {
  channels?: ProposalChannel[];
  contentPlan?: ProposalContentPlan;
  contentWeeks?: ProposalContentWeek[];
  currency?: string;
}

const BAR_COLORS = ["#FFD368", "#E06A3B", "#5AA9C4", "#9BC17A", "#B78FD6"];

/**
 * Where the media budget goes and why — one allocation bar, one ledger,
 * then the content engine that feeds every channel.
 */
export const ProposalChannelsSection: React.FC<ProposalChannelsSectionProps> = ({
  channels,
  contentPlan,
  contentWeeks,
  currency = "ج.م",
}) => {
  const hasChannels = channels && channels.length > 0;
  const hasContent = contentPlan && (contentPlan.pillars?.length || contentPlan.monthly?.length);
  const hasWeeks = contentWeeks && contentWeeks.length > 0;
  if (!hasChannels && !hasContent && !hasWeeks) return null;

  const total = hasChannels ? channels!.reduce((sum, c) => sum + c.budget, 0) : 0;

  return (
    <Band tone="graphite" id="channels">
      <div className="space-y-4 max-w-3xl pb-8 border-b border-white/10">
        <Marker>خطة الاستقطاب والقنوات</Marker>
        <SectionTitle>كل جنيه في الميزانية — على أي قناة، وبإيه، وليه</SectionTitle>
        <Lead>
          الميزانية مش بتتوزع بالتساوي. كل قناة لها دور محدد في المسار: واحدة بتجيب الوعي، واحدة بتحوّل، وواحدة
          بتقفل الحجز. والنِسب تتعدّل كل ٣٠ يوم على أساس اللي اتحقق فعلاً.
        </Lead>
      </div>

      {hasChannels && (
        <>
          {/* One allocation bar — the whole media plan in a single line */}
          <div className="pt-10">
            <div className="flex h-10 w-full overflow-hidden">
              {channels!.map((channel, idx) => (
                <div
                  key={idx}
                  className="h-full flex items-center justify-center text-[11px] font-black text-black"
                  style={{
                    width: `${Math.max(channel.share, 6)}%`,
                    backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                  }}
                  title={`${channel.name} — ${channel.share}%`}
                >
                  {channel.share}%
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 text-[11px] text-white/60">
              {channels!.map((channel, idx) => (
                <span key={idx} className="inline-flex items-center gap-2">
                  <span
                    className="size-2 rounded-full inline-block"
                    style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                  />
                  {channel.name}
                </span>
              ))}
              <span className="font-mono tabular-nums text-white/40">
                إجمالي الميديا {money(total)} {currency} / شهر
              </span>
            </div>
          </div>

          {/* Channel ledger */}
          <div className="pt-10 overflow-x-auto">
            <table className="w-full min-w-[720px] text-right">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10">
                  <th className="py-3 pr-2 font-bold">القناة</th>
                  <th className="py-3 font-bold">دورها في المسار</th>
                  <th className="py-3 font-bold">الميزانية</th>
                  <th className="py-3 font-bold">المؤشر اللي بنحاسب عليه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {channels!.map((channel, idx) => (
                  <tr key={idx}>
                    <td className="py-4 pr-2 align-top">
                      <div className="text-sm font-black text-white whitespace-nowrap">{channel.name}</div>
                      <div className="font-mono text-[11px] text-white/40 tabular-nums">{channel.share}%</div>
                    </td>
                    <td className="py-4 align-top text-xs text-white/70 leading-relaxed max-w-[280px]">
                      {channel.role}
                    </td>
                    <td className="py-4 align-top font-mono text-sm tabular-nums text-[#FFD368] whitespace-nowrap">
                      {money(channel.budget)}
                    </td>
                    <td className="py-4 align-top text-xs text-white/60 leading-relaxed">{channel.kpi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasContent && (
        <div className="pt-12 mt-4 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-10">
            <div className="lg:w-2/5 space-y-3">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#FFD368]">
                محرك المحتوى
              </div>
              <h3 className="text-2xl sm:text-3xl font-black leading-snug">
                محتوى بيتصور مرة، وبيشتغل على كل قناة
              </h3>
              {contentPlan!.production && (
                <p className="text-sm text-white/60 leading-relaxed">{contentPlan!.production}</p>
              )}
            </div>

            <div className="lg:w-3/5 space-y-6">
              {contentPlan!.monthly && contentPlan!.monthly.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  {contentPlan!.monthly.map((item, idx) => (
                    <div key={idx} className="border-t border-white/15 pt-2">
                      <div className="font-mono text-xl font-black tabular-nums text-[#FFD368] leading-none">
                        {item.value}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {contentPlan!.pillars && contentPlan!.pillars.length > 0 && (
                <ul className="divide-y divide-white/10">
                  {contentPlan!.pillars.map((pillar, idx) => (
                    <li key={idx} className="py-2.5 flex items-start gap-3 text-sm text-white/80">
                      <span className="font-mono text-[11px] text-white/35 tabular-nums pt-0.5">
                        0{idx + 1}
                      </span>
                      <span className="leading-relaxed">{pillar}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {hasWeeks && (
            <div className="pt-10 mt-2 border-t border-white/10 overflow-x-auto">
              <div className="flex items-baseline justify-between gap-4 pb-4 flex-wrap">
                <h4 className="text-base font-black text-white">تقويم شهر كامل — أسبوع بأسبوع</h4>
                <span className="text-[11px] text-white/40">نفس الخطة تتكرر كل شهر بثيمة مختلفة</span>
              </div>
              <table className="w-full min-w-[720px] text-right">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10">
                    <th className="py-3 pr-2 font-bold">الأسبوع</th>
                    <th className="py-3 font-bold">الثيمة</th>
                    <th className="py-3 font-bold">ريلز</th>
                    <th className="py-3 font-bold">بوستات</th>
                    <th className="py-3 font-bold">ستوري</th>
                    <th className="py-3 font-bold">الهدف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {contentWeeks!.map((week, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-3 pr-2 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#FFD368] tabular-nums">
                          {week.week}
                        </span>
                      </td>
                      <td className="py-3 text-xs font-bold text-white/90 max-w-[220px] leading-relaxed">
                        {week.theme}
                      </td>
                      <td className="py-3 text-xs text-white/70 leading-relaxed max-w-[200px]">{week.reels}</td>
                      <td className="py-3 text-xs text-white/70 leading-relaxed max-w-[170px]">{week.posts}</td>
                      <td className="py-3 text-xs text-white/55 tabular-nums whitespace-nowrap">{week.stories}</td>
                      <td className="py-3 text-xs text-white/60 leading-relaxed max-w-[180px]">{week.goal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Band>
  );
};
