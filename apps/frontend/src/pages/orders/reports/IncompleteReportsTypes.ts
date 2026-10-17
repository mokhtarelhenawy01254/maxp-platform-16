export interface CohortDay {
  date: string;
  entered: number;
  enteredValue: number;
  converted: number;
  convertedValue: number;
  byTeamConverted: number;
  byTeamConvertedValue: number;
  naturalConverted: number;
  naturalConvertedValue: number;
  cancelled: number;
  cancelledValue: number;
  lost: number;
  lostValue: number;
  active: number;
  activeValue: number;
  uncompleted?: number;
  uncompletedValue?: number;
  conversionRate: number;
}

export interface SummaryData {
  entered: number;
  enteredValue: number;
  converted: number;
  convertedValue: number;
  byTeam: number;
  byTeamValue: number;
  natural: number;
  naturalValue: number;
  cancelled: number;
  cancelledValue: number;
  lost: number;
  lostValue: number;
  active: number;
  activeValue: number;
  uncompleted?: number;
  uncompletedValue?: number;
  conversionRate: number;
  lostAfterHours?: number;
}

export interface DismissalReason {
  reason: string;
  count: number;
}

export interface TeamMemberReport {
  employeeId: string | null;
  employeeName: string;
  displayName?: string;
  email?: string;
  avatar?: string | null;
  conversions: number;
  value: number;
  avgValue: number;
  contacts: number;
  dismissed?: number;
  handledTotal?: number;
  conversionRate?: number;
  responses: number;
  responseRate: number;
}

export interface OrderSourceReport {
  source: string;
  count: number;
  value: number;
}

export interface ReportData {
  periodDays: number | null;
  summary?: SummaryData;
  cohorts?: CohortDay[];
  dismissalReasons?: DismissalReason[];
  pipeline: {
    total: number;
    windowTotal?: number;
    active: number;
    lost: number;
    totalValue: number;
    activeValue: number;
    lostValue: number;
  };
  recovery: {
    converted: number;
    convertedValue: number;
    avgConvertedValue: number;
    recoveryRate: number;
    funnelBase?: number;
    byTeam: number;
    byTeamValue?: number;
    natural: number;
    naturalValue?: number;
    allConverted?: number;
    allConvertedValue?: number;
  };
  team: TeamMemberReport[];
  orderSources: OrderSourceReport[];
}
