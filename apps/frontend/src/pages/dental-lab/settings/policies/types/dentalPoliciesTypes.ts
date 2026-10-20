export interface DentalPoliciesData {
  assignment: {
    mode: "SUGGEST" | "AUTO" | "OFF";
    strategy: "LEAST_LOADED" | "ROUND_ROBIN" | "BY_ROLE_MATCH" | "OLDEST_WAITING";
    respectSchedule: boolean;
    dailyCapPerTechnician: number;
    stageScope?: string;
    fallbackMode?: string;
  };
  dueDate: {
    fromWorkType?: boolean;
    defaultLeadDays: number;
    urgentRule: "PERCENT" | "FIXED_DAYS";
    urgentValue: number;
    minDays: number;
  };
  fields: {
    patientPhoneRequired: boolean;
    requireToothAndShade: boolean;
  };
  escalation: {
    enabled: boolean;
    afterHoursInStage: number;
    target: "BACKUP_ROLE" | "SUPERVISOR";
    maxLevels?: number;
    notify: boolean;
  };
  notify: {
    doctorEnabled: boolean;
    patientEnabled: boolean;
  };
}

export const DEFAULT_POLICIES: DentalPoliciesData = {
  assignment: {
    mode: "SUGGEST",
    strategy: "LEAST_LOADED",
    respectSchedule: true,
    dailyCapPerTechnician: 0,
    stageScope: "STAGE",
    fallbackMode: "SUGGEST",
  },
  dueDate: {
    fromWorkType: true,
    defaultLeadDays: 5,
    urgentRule: "PERCENT",
    urgentValue: 50,
    minDays: 1,
  },
  fields: {
    patientPhoneRequired: false,
    requireToothAndShade: false,
  },
  escalation: {
    enabled: true,
    afterHoursInStage: 24,
    target: "BACKUP_ROLE",
    maxLevels: 2,
    notify: true,
  },
  notify: {
    doctorEnabled: true,
    patientEnabled: false,
  },
};
