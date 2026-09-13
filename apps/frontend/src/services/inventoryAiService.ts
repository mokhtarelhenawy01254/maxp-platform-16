import { apiClient } from "./apiClient";
import type { StudioSession } from "../components/agent-studio/types";

export interface InventoryAgentResponse {
  success: boolean;
  reply: string;
  status: string;
  tool_calls?: any[];
  agentId?: string;
  error?: string;
}

/**
 * محادثة إيجنت إدارة المنتجات والمخزون والتسعير
 */
export async function chatWithInventoryAgent(
  message: string,
  threadId?: string,
  activeProduct?: any,
  agentId?: string
): Promise<InventoryAgentResponse> {
  const response = await apiClient.post<InventoryAgentResponse>("/inventory/ai/chat", {
    message,
    threadId,
    activeProduct,
    agentId,
  });
  return response.data;
}

/**
 * جلب الوكيل الذكي النشط والموجه لاستوديو المخزون والتسعير
 */
export async function getInventoryActiveAgent(): Promise<{
  success: boolean;
  agent: { id: string; name: string; role: string; isRouted?: boolean } | null;
  availableAgents?: Array<{ id: string; name: string; role: string }>;
}> {
  const response = await apiClient.get<{
    success: boolean;
    agent: { id: string; name: string; role: string; isRouted?: boolean } | null;
    availableAgents?: Array<{ id: string; name: string; role: string }>;
  }>("/inventory/ai/active-agent");
  return response.data;
}

/**
 * جلب جلسات استوديو المخزون السحابية
 */
export async function getInventoryStudioSessions(
  limit = 50
): Promise<{ success: boolean; data: StudioSession[] }> {
  const response = await apiClient.get<{ success: boolean; data: StudioSession[] }>(
    "/inventory/ai/sessions",
    { params: { limit } }
  );
  return response.data;
}

/**
 * حفظ أو تحديث جلسة استوديو المخزون سحابياً
 */
export async function saveInventoryStudioSession(
  session: StudioSession
): Promise<{ success: boolean; data: any }> {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    "/inventory/ai/sessions",
    session
  );
  return response.data;
}

/**
 * حذف جلسة استوديو المخزون
 */
export async function deleteInventoryStudioSession(
  sessionId: string
): Promise<{ success: boolean }> {
  const response = await apiClient.delete<{ success: boolean }>(
    `/inventory/ai/sessions/${sessionId}`
  );
  return response.data;
}

/**
 * تطبيق إجراء تعديل معتمد من لوحة العمليات (سعر أو رصيد مخزون أو نقطة إعادة طلب)
 */
export async function applyInventoryStudioAction(payload: {
  type: "PRICE_CHANGE" | "STOCK_ADJUSTMENT" | "REORDER_POINT";
  productId: string;
  newValue: number | string;
  reason?: string;
}): Promise<{ success: boolean; message?: string; error?: string; product?: any }> {
  const response = await apiClient.post<{
    success: boolean;
    message?: string;
    error?: string;
    product?: any;
  }>("/inventory/ai/apply-action", payload);
  return response.data;
}
