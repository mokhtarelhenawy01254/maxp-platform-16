import { apiClient } from "./apiClient";

export type CustomerBlockAction =
  | "BLOCK_ORDERS"
  | "REQUIRE_MANAGER_APPROVAL"
  | "BLOCK_COD_ONLY";

export type CustomerBlockReasonCode =
  | "FAKE_ORDERS"
  | "REPEATED_REFUSAL"
  | "ABUSE"
  | "FRAUD"
  | "WRONG_DATA"
  | "OTHER";

export interface RiskScoringSettings {
  enabled: boolean;
  highThreshold: number;
  mediumThreshold: number;
  highValueThreshold: number;
  historyWindowDays: number;
}

export interface CustomerBlockSettings {
  id?: string;
  companyId?: string;
  enabled: boolean;
  blockCheckout: boolean;
  blockManualOrders: boolean;
  blockAffiliateManualOrders: boolean;
  blockAiOrderCreation: boolean;
  matchPhone: boolean;
  matchEmail: boolean;
  matchFacebook: boolean;
  matchWhatsapp: boolean;
  allowManagerOverride: boolean;
  defaultAction: CustomerBlockAction;
  checkoutMessage?: string | null;
  internalWarningMessage?: string | null;
}

export interface CustomerBlockRule {
  id: string;
  companyId: string;
  customerId?: string | null;
  phone?: string | null;
  phoneNormalized?: string | null;
  email?: string | null;
  emailNormalized?: string | null;
  facebookId?: string | null;
  whatsappId?: string | null;
  reasonCode: CustomerBlockReasonCode | string;
  reasonNote?: string | null;
  action: CustomerBlockAction | string;
  status: "ACTIVE" | "LIFTED" | string;
  startsAt: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  liftedAt?: string | null;
  liftedByName?: string | null;
  liftedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
}

export interface CustomerBlockEvaluation {
  blocked: boolean;
  overrideApplied?: boolean;
  code?: string;
  message?: string;
  action?: CustomerBlockAction | string;
  rule?: CustomerBlockRule | null;
}

export interface CustomerBlockRuleInput {
  customerId?: string;
  phone?: string;
  email?: string;
  facebookId?: string;
  whatsappId?: string;
  reasonCode?: CustomerBlockReasonCode | string;
  reasonNote?: string;
  action?: CustomerBlockAction | string;
  startsAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

interface PaginatedRules {
  data: CustomerBlockRule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class CustomerBlocklistService {
  async getSettings(): Promise<CustomerBlockSettings> {
    const response = await apiClient.get("/customer-blocklist/settings");
    return response.data.data;
  }

  async updateSettings(
    settings: Partial<CustomerBlockSettings>,
  ): Promise<CustomerBlockSettings> {
    const response = await apiClient.put(
      "/customer-blocklist/settings",
      settings,
    );
    return response.data.data;
  }

  async listRules(params: {
    page?: number;
    limit?: number;
    status?: "ACTIVE" | "LIFTED" | "ALL";
    search?: string;
  } = {}): Promise<PaginatedRules> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });

    const response = await apiClient.get(
      `/customer-blocklist/rules?${query.toString()}`,
    );

    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  }

  async createRule(input: CustomerBlockRuleInput): Promise<CustomerBlockRule> {
    const response = await apiClient.post("/customer-blocklist/rules", input);
    return response.data.data;
  }

  async liftRule(ruleId: string, reason?: string): Promise<CustomerBlockRule> {
    const response = await apiClient.patch(
      `/customer-blocklist/rules/${ruleId}/lift`,
      { reason },
    );
    return response.data.data;
  }

  async check(input: {
    customerId?: string;
    phone?: string;
    email?: string;
    facebookId?: string;
    whatsappId?: string;
    source?: string;
    paymentMethod?: string;
    allowOverride?: boolean;
  }): Promise<CustomerBlockEvaluation> {
    const response = await apiClient.post("/customer-blocklist/check", input, {
      _skipErrorToast: true,
    });
    return response.data.data;
  }
  async getRiskScoringSettings(companyId: string): Promise<RiskScoringSettings> {
    const response = await apiClient.get(`/customer-blocklist/settings?companyId=${companyId}`);
    const data = (response.data as any)?.riskScoring;
    return (
      data || {
        enabled: false,
        highThreshold: 70,
        mediumThreshold: 40,
        highValueThreshold: 5000,
        historyWindowDays: 180,
      }
    );
  }

  async updateRiskScoringSettings(
    companyId: string,
    patch: Partial<RiskScoringSettings>
  ): Promise<RiskScoringSettings> {
    const response = await apiClient.put("/customer-blocklist/settings", {
      riskScoring: { ...patch, companyId },
    });
    return (response.data as any)?.riskScoring;
  }

}

export const customerBlocklistService = new CustomerBlocklistService();
