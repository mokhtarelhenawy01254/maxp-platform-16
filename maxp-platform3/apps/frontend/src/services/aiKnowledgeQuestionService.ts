import apiClient from "./api";

export interface KnowledgeQuestion {
  id: string;
  company_id: string;
  conversation_id: string | null;
  channel: string | null;
  customer_question: string;
  context: Record<string, unknown> | null;
  status: "pending" | "answered";
  merchant_answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  knowledge_embedding_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ListResponse {
  success: boolean;
  questions: KnowledgeQuestion[];
  count: number;
}

export interface CountResponse {
  success: boolean;
  count: number;
}

export interface AnswerResponse {
  success: boolean;
  question: { id: string; status: string; message: string };
}

export const aiKnowledgeQuestionService = {
  async list({ status = "pending" }: { status?: string } = {}) {
    const response = await apiClient.get<ListResponse>(
      "/ai/knowledge-questions",
      { params: { status }, _skipErrorToast: true },
    );
    return response.data;
  },

  async count() {
    const response = await apiClient.get<CountResponse>(
      "/ai/knowledge-questions/count",
      { _skipErrorToast: true },
    );
    return response.data;
  },

  async answer(questionId: string, answer: string) {
    const response = await apiClient.post<AnswerResponse>(
      `/ai/knowledge-questions/${questionId}/answer`,
      { answer },
    );
    return response.data;
  },
};

export default aiKnowledgeQuestionService;
