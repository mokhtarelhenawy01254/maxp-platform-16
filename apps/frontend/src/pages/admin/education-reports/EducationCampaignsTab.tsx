import React, { useState, useMemo } from "react";
import { Sparkles, Target, Search, Users, ExternalLink } from "lucide-react";
import { EducationAttributionData } from "./types";

interface EducationCampaignsTabProps {
  attribution: EducationAttributionData | null;
  loading: boolean;
  isEn: boolean;
}

export const EducationCampaignsTab: React.FC<EducationCampaignsTabProps> = ({
  attribution,
  loading,
  isEn,
}) => {
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const summary = attribution?.summary;
  const rawCampaigns = attribution?.campaigns || [];

  const filteredCampaigns = useMemo(() => {
    return rawCampaigns.filter((camp) => {
      if (channelFilter !== "all" && camp.channel !== channelFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = camp.campaignName?.toLowerCase().includes(q);
      const matchAdId = camp.adId ? String(camp.adId).toLowerCase().includes(q) : false;
      const matchPostId = camp.postId ? String(camp.postId).toLowerCase().includes(q) : false;
      return matchName || matchAdId || matchPostId;
    });
  }, [rawCampaigns, channelFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Attribution KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            {isEn ? "Total Leads Registered" : "إجمالي الليدات المسجلة"}
          </div>
          <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
            {summary?.totalLeads ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isEn ? "From campaigns & messages" : "من حملات الرسائل والإعلانات"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            {isEn ? "Attended Demo Day" : "حضروا اليوم التجريبي (ديمو داي)"}
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums flex items-baseline gap-1.5">
            <span>{summary?.totalAttended ?? 0}</span>
            <span className="text-xs text-muted-foreground font-normal">
              ({summary?.overallAttendanceRate ?? 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isEn ? "Actual show-up rate" : "نسبة الحضور الفعلي"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            {isEn ? "Converted to Enrolled" : "تحولوا لطلاب مقيدين"}
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums flex items-baseline gap-1.5">
            <span>{summary?.totalConverted ?? 0}</span>
            <span className="text-xs text-muted-foreground font-normal">
              ({summary?.overallConversionRate ?? 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isEn ? "Enrolled into packages" : "اشتركوا في باقات وحصص"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
          <div className="text-[11px] text-muted-foreground font-medium">
            {isEn ? "Direct Generated Revenue" : "العائد المالي المباشر"}
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
            {summary?.totalRevenue ?? 0} ج.م
          </div>
          <div className="text-[10px] text-muted-foreground">
            {isEn ? "Revenue from campaign leads" : "عائد الاشتراكات الناتجة"}
          </div>
        </div>
      </div>

      {/* Campaigns Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Controls: Channel Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {isEn ? "Campaigns & Ads Attribution Analysis" : "تحليل الحملات والإعلانات ومصدر الليدات"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEn
                ? "Track leads from WhatsApp, Messenger, Facebook Ads, and Website with attendance and ROI"
                : "تتبع نتائج كل إعلان وحملة رسائل، ونسب الحضور باليوم التجريبي والتحويل إلى اشتراكات مدفوعة"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Search */}
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
                  isEn ? "left-2.5" : "right-2.5"
                }`}
              />
              <input
                className={`bg-background border border-input rounded-lg py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-48 ${
                  isEn ? "pl-8 pr-2.5" : "pr-8 pl-2.5"
                }`}
                placeholder={isEn ? "Search campaign or ad..." : "بحث باسم الحملة أو الإعلان..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Channel filter pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/60">
              {(["all", "WHATSAPP", "FACEBOOK", "WEBSITE"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    channelFilter === ch
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ch === "all"
                    ? isEn
                      ? "All"
                      : "الكل"
                    : ch === "WHATSAPP"
                    ? isEn
                      ? "WhatsApp"
                      : "واتساب"
                    : ch === "FACEBOOK"
                    ? isEn
                      ? "Facebook"
                      : "فيسبوك"
                    : isEn
                    ? "Website"
                    : "الموقع"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="w-full overflow-hidden rounded-xl border border-border/70 bg-background shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-border/60">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {isEn ? "Campaign / Ad / Post" : "اسم الحملة / الإعلان / البوست"}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{isEn ? "Channel" : "القناة"}</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isEn ? "Leads" : "المسجلين"}
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isEn ? "Attended" : "الحضور الفعلي"}
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isEn ? "Enrolled Students" : "المشتركين"}
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isEn ? "Conversion %" : "نسبة التحويل"}
                  </th>
                  <th className="py-2.5 px-3 text-left whitespace-nowrap">
                    {isEn ? "Revenue" : "العائد المالي"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{camp.campaignName}</span>
                          {camp.adId && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ({camp.adId})
                            </span>
                          )}
                        </div>
                        {camp.postId && (
                          <div className="text-[10px] text-muted-foreground/80 font-mono">
                            بوست: #{camp.postId}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            camp.channel === "WHATSAPP"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : camp.channel === "FACEBOOK" || camp.channel === "MESSENGER"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {camp.channelLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {camp.leadsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {camp.attendedCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground mr-1">
                          ({camp.attendanceRate}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
                        {camp.convertedCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
                          {camp.conversionRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-foreground tabular-nums">
                        {camp.revenueGenerated} ج.م
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs space-y-2">
                      <Target className="w-6 h-6 text-muted-foreground/50 mx-auto" />
                      <div>
                        {loading
                          ? isEn
                            ? "Loading attribution data..."
                            : "جاري تحميل بيانات تتبع الحملات..."
                          : isEn
                          ? "No campaign attribution data for this period"
                          : "لا توجد بيانات حملات مسجلة لهذه الفترة"}
                      </div>
                      <div className="text-[11px] text-muted-foreground/80">
                        {isEn
                          ? "Leads tagged with WhatsApp, Facebook ad_id, or UTMs will appear here automatically."
                          : "أي ليد أو طالب يسجل عبر إعلانات رسائل الواتساب أو فيسبوك أو الموقع سيظهر مصدره وحملته هنا تلقائياً."}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
