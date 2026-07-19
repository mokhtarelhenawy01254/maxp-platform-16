import { apiClient } from "./apiClient";

export interface CompanySkill {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  triggerPhrases: string;
  instructions: string;
  tools: string;
  channels: string;
  priority: number;
  enabled: boolean;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillPayload {
  name: string;
  description?: string;
  triggerPhrases?: string;
  instructions: string;
  tools?: string;
  channels?: string;
  priority?: number;
}

export interface UpdateSkillPayload {
  name?: string;
  description?: string;
  triggerPhrases?: string;
  instructions?: string;
  tools?: string;
  channels?: string;
  priority?: number;
  enabled?: boolean;
}

export const skillManagementService = {
  async list(companyId: string): Promise<CompanySkill[]> {
    const response = await apiClient.get<{ skills: CompanySkill[] }>(
      `/skills?companyId=${encodeURIComponent(companyId)}`,
    );
    return response.data?.data?.skills || [];
  },

  async create(payload: CreateSkillPayload): Promise<CompanySkill> {
    const response = await apiClient.post<{ skill: CompanySkill }, CreateSkillPayload>(
      "/skills", payload,
    );
    return response.data.skill;
  },

  async update(id: string, payload: UpdateSkillPayload): Promise<CompanySkill> {
    const response = await apiClient.put<{ skill: CompanySkill }, UpdateSkillPayload>(
      `/skills/${id}`, payload,
    );
    return response.data.skill;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/skills/${id}`);
  },
};
