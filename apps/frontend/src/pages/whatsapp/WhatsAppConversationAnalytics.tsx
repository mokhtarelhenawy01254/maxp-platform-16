import React from "react";
import { BarChart3, Calendar, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { WhatsAppPageShell } from "./components/WhatsAppPageShell";
import {
  ConversationAnalyticsHeroCards,
  DailyTrafficChartCard,
  HourlyDistributionCard,
  OutgoingBreakdownCard,
  presetLabels,
  presetOrder,
  RecentConversationsCard,
  StatusDistributionCard,
  TopTagsCard,
  useWhatsAppConversationAnalyticsController,
} from "./conversation-analytics";
import { DateInput } from '../../components/ui/DateInput';

export const WhatsAppConversationAnalytics: React.FC<{ companyId?: string }> = ({
  companyId,
}) => {
  const {
    loading,
    refreshing,
    preset,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handlePresetChange,
    loadData,
    summary,
    statusDist,
    hourlyDist,
    dailyDist,
    tagDist,
    recentConvs,
    userMap,
    hourlyChartData,
    statusChartData,
    formatTime,
  } = useWhatsAppConversationAnalyticsController({ companyId });

  if (loading) {
    return (
      <WhatsAppPageShell
        title="تحليل المحادثات"
        description="نظرة شاملة على حركة المحادثات وتوزيعها وأوقات الذروة"
        icon={BarChart3}
        backHref="/whatsapp/employee-analytics"
        backLabel="رجوع"
        eyebrow="WhatsApp Analytics"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Skeleton className="h-72 rounded-2xl lg:col-span-1" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title="تحليل المحادثات"
      description="نظرة شاملة على حركة المحادثات وتوزيعها وأوقات الذروة"
      icon={BarChart3}
      backHref="/whatsapp/employee-analytics"
      backLabel="رجوع"
      eyebrow="WhatsApp Analytics"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {presetOrder.map((p) => (
              <Button
                key={p}
                variant={preset === p ? "default" : "outline"}
                size="sm"
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => handlePresetChange(p)}
              >
                {presetLabels[p]}
              </Button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                <DateInput
                  
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 w-auto text-xs font-mono"
                />
              </div>
              <span className="text-xs text-muted-foreground">إلى</span>
              <DateInput
                
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 w-auto text-xs font-mono"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <ConversationAnalyticsHeroCards summary={summary} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <OutgoingBreakdownCard summary={summary} />
          <DailyTrafficChartCard dailyDist={dailyDist} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatusDistributionCard
            statusChartData={statusChartData}
            statusDist={statusDist}
          />
          <HourlyDistributionCard
            hourlyChartData={hourlyChartData}
            hourlyDist={hourlyDist}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TopTagsCard
            tagDist={tagDist}
            totalConversations={summary?.totalConversations ?? 0}
          />
          <RecentConversationsCard
            recentConvs={recentConvs}
            userMap={userMap}
            formatTime={formatTime}
            hasTags={tagDist.length > 0}
          />
        </div>
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppConversationAnalytics;
