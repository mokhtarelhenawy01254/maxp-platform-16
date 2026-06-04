export type WorkReportCadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type WorkReportFieldSourceType = "SYSTEM" | "MANUAL" | "CALCULATED";
export type WorkReportFieldDataType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "PERCENT"
  | "SELECT";

export interface WorkReportField {
  id?: string;
  key: string;
  label: string;
  helpText?: string | null;
  sourceType: WorkReportFieldSourceType;
  dataType: WorkReportFieldDataType;
  isRequired: boolean;
  isVisible: boolean;
  placeholder?: string | null;
  orderIndex: number;
  systemKey?: string | null;
  formula?: string | null;
  options: string[];
}

export interface WorkReportForm {
  id: string;
  title: string;
  description?: string | null;
  cadence: WorkReportCadence;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
  createdAt?: string;
  updatedAt?: string;
  fields: WorkReportField[];
}

export interface WorkReportFormSummary extends WorkReportForm {
  fieldsCount?: number;
  submissionsCount?: number;
  lastSubmittedAt?: string | null;
}

export interface WorkReportFieldValue {
  valueText?: string | null;
  valueNumber?: number | null;
  valueJson?: unknown;
  displayValue: string;
}

export interface WorkReportFillContext {
  form: WorkReportForm;
  period: {
    cadence: WorkReportCadence;
    periodKey: string;
    label: string;
    reportDate: string;
    periodStart: string;
    periodEnd: string;
  };
  values: {
    byFieldId: Record<string, WorkReportFieldValue>;
    byFieldKey: Record<string, WorkReportFieldValue>;
  };
  existingSubmission: {
    id: string;
    submittedAt: string;
    status: string;
  } | null;
}

export interface WorkReportRecord {
  id: string;
  userId: string;
  userDisplayName: string;
  employeeId?: string | null;
  reportDate: string;
  submittedAt: string;
  status: string;
  valuesByFieldKey: Record<string, WorkReportFieldValue>;
}

export interface WorkReportMetricCard {
  key: string;
  label: string;
  dataType: WorkReportFieldDataType;
  total: number;
  average: number;
  max: number;
  min: number;
}

export interface WorkReportEmployeeMetric {
  key: string;
  label: string;
  total: number;
  average: number;
}

export interface WorkReportEmployeeBreakdown {
  userId: string;
  userDisplayName: string;
  submissionsCount: number;
  lastSubmittedAt: string;
  metrics: WorkReportEmployeeMetric[];
}

export interface WorkReportDailyTrendRow {
  date: string;
  submissions: number;
  metrics: Record<string, number | string>;
}

export interface WorkReportAnalytics {
  summary: {
    totalSubmissions: number;
    uniqueEmployees: number;
  };
  metricCards: WorkReportMetricCard[];
  employeeBreakdown: WorkReportEmployeeBreakdown[];
  dailyTrend: WorkReportDailyTrendRow[];
}

export interface WorkReportRecordsResponse {
  form: WorkReportForm;
  records: WorkReportRecord[];
  analytics: WorkReportAnalytics;
}

export interface WorkReportTemplateDraft {
  title: string;
  description: string;
  cadence: WorkReportCadence;
  isActive: boolean;
  allowMultipleSubmissions: boolean;
  fields: WorkReportField[];
}
