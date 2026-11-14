export interface CampaignAttributionItem {
  campaignName: string;
  adId?: string | null;
  postId?: string | null;
  channel: string;
  channelLabel: string;
  leadsCount: number;
  attendedCount: number;
  convertedCount: number;
  attendanceRate: number;
  conversionRate: number;
  revenueGenerated: number;
}

export interface AttributionSummary {
  totalLeads: number;
  totalAttended: number;
  totalConverted: number;
  totalRevenue: number;
  overallAttendanceRate: number;
  overallConversionRate: number;
}

export interface AttributionChannelSummary {
  channel: string;
  channelLabel: string;
  leadsCount: number;
  attendedCount: number;
  convertedCount: number;
  revenueGenerated: number;
}

export interface EducationAttributionData {
  summary: AttributionSummary;
  campaigns: CampaignAttributionItem[];
  channels: AttributionChannelSummary[];
}

export interface EducationFunnelData {
  totalCustomers: number;
  registeredStudents: number;
  packagesEnrollments: number;
  scheduledSessions: number;
  confirmedSessions: number;
  completedSessions: number;
  totalDemoAttendees?: number;
  attendedDemoAttendees?: number;
  convertedDemoAttendees?: number;
  demoAttendanceRate?: number;
  demoConversionRate?: number;
  rates: {
    customersToStudents: number;
    studentsToEnrollments: number;
    completionRate: number;
    repeatRate: number;
  };
  repeatStats?: {
    singleEnrollmentStudents: number;
    multipleEnrollmentsStudents: number;
  };
}

export type ReportPeriod = "all" | "30d" | "7d" | "today";
export type ReportTab = "campaigns" | "funnel" | "demoday";
