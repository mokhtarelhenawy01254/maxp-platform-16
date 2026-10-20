import type { ComponentType } from "react";

export interface NotificationRecipient {
  employeeId?: string;
  name: string;
  phone: string;
  types: string[];
}

export interface NotificationRecipientEmployeeOption {
  id: string;
  name: string;
  phone: string;
  employeeNumber?: string;
  department?: string;
}

export interface NotificationHealth {
  aiOwnerNotificationsEnabled: boolean;
  hasPrimaryRecipientConfigured: boolean;
  hasCompanyPhoneFallback: boolean;
  additionalRecipientsCount: number;
  hasAnyRecipientConfigured: boolean;
  connectedSessionCount: number;
  hasConnectedSession: boolean;
  isReadyForWhatsAppDelivery: boolean;
  issues: string[];
}

export interface LateWarningLevel {
  count: number;
  deductionFactor: number;
}

export interface HRSettingsData {
  // Working Hours
  workingDays: string[];

  // Leave Settings
  annualLeaveDefault: number;
  sickLeaveDefault: number;
  carryOverLimit: number;
  requireApproval: boolean;
  minAdvanceNotice: number;

  // Additional Leave Types
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  marriageLeaveDays: number;
  bereavementLeaveDays: number;
  hajjLeaveDays: number;
  unpaidLeaveAllowed: boolean;

  // Payroll Settings
  payrollDay: number;
  currency: string;
  taxRate: number;
  socialInsuranceRate: number;
  overtimeRate: number;

  // Allowances
  transportationAllowance: number;
  housingAllowance: number;
  phoneAllowance: number;
  mealAllowance: number;

  // Advance Settings
  maxAdvancePercentage: number;
  maxActiveAdvances: number;
  minMonthsForAdvance: number;
  advanceRepaymentMonths: number;

  // Attendance Settings
  allowRemoteCheckIn: boolean;
  requireLocation: boolean;
  lateThreshold: number;
  earlyLeaveThreshold: number;
  autoAbsentMarking: boolean;
  monthlyLateLimit: number;
  lateWarningThreshold: number;
  lateWarningLevels: LateWarningLevel[];

  // Geofencing Settings
  geofenceEnabled: boolean;
  officeLatitude: string;
  officeLongitude: string;
  geofenceRadius: number;

  // Auto Deduction Settings
  autoDeductionEnabled: boolean;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  maxDailyDeductionDays: number;
  earlyCheckoutEnabled: boolean;
  earlyCheckoutThresholdMinutes: number;
  firstViolationMultiplier: number;
  secondViolationMultiplier: number;
  thirdViolationMultiplier: number;
  notifyAtPercentage: number;
  notifyOnDeduction: boolean;
  notifyOnGraceReset: boolean;
  deductionCalculationMethod: string;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  requireDeductionReview: boolean;
  absencePenaltyRate: number;
  delayPenaltyTiers: string;

  // Discipline & Warnings
  verbalWarningThreshold: number;
  writtenWarningThreshold: number;
  deductionWarningThreshold: number;
  suspensionThreshold: number;
  terminationThreshold: number;
  warningExpiryMonths: number;
  autoWarningOnLateness: boolean;
  autoWarningOnAbsence: boolean;

  // Probation Settings
  probationPeriodMonths: number;
  probationEvaluationRequired: boolean;
  reducedLeavesDuringProbation: boolean;
  probationLeavePercentage: number;

  // Employment Policies
  noticePeriodDays: number;
  endOfServiceCalculation: string;
  contractRenewalNoticeDays: number;
  retirementAge: number;
  requireClearance: boolean;

  // Remote Work
  remoteWorkAllowed: boolean;
  maxRemoteDaysPerWeek: number;
  remoteWorkApprovalRequired: boolean;
  remoteWorkEquipmentProvided: boolean;

  // Security & Privacy
  dataRetentionYears: number;
  employeeDataAccessLevel: string;
  requireTwoFactorAuth: boolean;
  sessionTimeoutMinutes: number;

  // Notifications
  notifyOnLeaveRequest: boolean;
  notifyOnAttendanceIssue: boolean;
  notifyOnPayrollGeneration: boolean;
  notifyManagers: boolean;
  notifyOnWarning: boolean;
  notifyOnProbationEnd: boolean;
  notifyOnContractExpiry: boolean;

  // WhatsApp owner notification settings
  aiOwnerNotificationsEnabled: boolean;
  ownerWhatsAppNumber: string;
  notificationRecipients: NotificationRecipient[];
  aiNotificationTypes: string[];
  aiNotificationTone: "PROFESSIONAL" | "FRIENDLY" | "URGENT";
}

export interface TabDefinition {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  keywords: string;
}

export interface WeekDayOption {
  value: string;
  label: string;
}

export const defaultHRSettings: HRSettingsData = {
  workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],

  annualLeaveDefault: 21,
  sickLeaveDefault: 15,
  carryOverLimit: 5,
  requireApproval: true,
  minAdvanceNotice: 3,

  maternityLeaveDays: 90,
  paternityLeaveDays: 3,
  marriageLeaveDays: 5,
  bereavementLeaveDays: 3,
  hajjLeaveDays: 15,
  unpaidLeaveAllowed: true,

  payrollDay: 25,
  currency: "EGP",
  taxRate: 0,
  socialInsuranceRate: 0,
  overtimeRate: 1.0,

  transportationAllowance: 0,
  housingAllowance: 0,
  phoneAllowance: 0,
  mealAllowance: 0,

  maxAdvancePercentage: 50,
  maxActiveAdvances: 1,
  minMonthsForAdvance: 3,
  advanceRepaymentMonths: 6,

  allowRemoteCheckIn: true,
  requireLocation: false,
  lateThreshold: 15,
  earlyLeaveThreshold: 15,
  autoAbsentMarking: true,
  monthlyLateLimit: 3,
  lateWarningThreshold: 3,
  lateWarningLevels: [
    { count: 1, deductionFactor: 0.25 },
    { count: 2, deductionFactor: 0.5 },
    { count: 3, deductionFactor: 1.0 },
  ],

  geofenceEnabled: false,
  officeLatitude: "",
  officeLongitude: "",
  geofenceRadius: 200,

  autoDeductionEnabled: false,
  gracePeriodMinutes: 60,
  lateThresholdMinutes: 10,
  maxDailyDeductionDays: 1.0,
  earlyCheckoutEnabled: true,
  earlyCheckoutThresholdMinutes: 0,
  firstViolationMultiplier: 1.0,
  secondViolationMultiplier: 2.0,
  thirdViolationMultiplier: 3.0,
  notifyAtPercentage: 75,
  notifyOnDeduction: true,
  notifyOnGraceReset: true,
  deductionCalculationMethod: "minute",
  workingDaysPerMonth: 22,
  workingHoursPerDay: 8,
  requireDeductionReview: true,
  absencePenaltyRate: 1.0,
  delayPenaltyTiers: "[]",

  verbalWarningThreshold: 3,
  writtenWarningThreshold: 5,
  deductionWarningThreshold: 7,
  suspensionThreshold: 10,
  terminationThreshold: 15,
  warningExpiryMonths: 12,
  autoWarningOnLateness: true,
  autoWarningOnAbsence: true,

  probationPeriodMonths: 3,
  probationEvaluationRequired: true,
  reducedLeavesDuringProbation: true,
  probationLeavePercentage: 50,

  noticePeriodDays: 30,
  endOfServiceCalculation: "half_month_per_year",
  contractRenewalNoticeDays: 30,
  retirementAge: 60,
  requireClearance: true,

  remoteWorkAllowed: false,
  maxRemoteDaysPerWeek: 2,
  remoteWorkApprovalRequired: true,
  remoteWorkEquipmentProvided: false,

  dataRetentionYears: 7,
  employeeDataAccessLevel: "own_data_only",
  requireTwoFactorAuth: false,
  sessionTimeoutMinutes: 30,

  notifyOnLeaveRequest: true,
  notifyOnAttendanceIssue: true,
  notifyOnPayrollGeneration: true,
  notifyManagers: true,
  notifyOnWarning: true,
  notifyOnProbationEnd: true,
  notifyOnContractExpiry: true,

  aiOwnerNotificationsEnabled: false,
  ownerWhatsAppNumber: "",
  notificationRecipients: [],
  aiNotificationTypes: [
    "PROMOTION",
    "DEDUCTION",
    "WARNING",
    "KUDOS",
    "TRAINING",
    "ADVANCE",
    "LEAVE",
    "ATTENDANCE",
    "PAYROLL",
    "PROBATION_END",
    "CONTRACT_EXPIRY",
  ],
  aiNotificationTone: "PROFESSIONAL",
};

export const weekDaysList: WeekDayOption[] = [
  { value: "saturday", label: "السبت" },
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
];
