// AI Video Studio — thin API layer over apiClient (baseURL already includes /api/v1)
import apiClient from "../../../services/apiClient";
import type {
  CostEstimate,
  StudioConfig,
  VideoCharacter,
  VideoJob,
  VideoJobType,
  VideoJobParams,
  VideoStory,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const videoStudioApi = {
  getConfig: () => unwrap<StudioConfig>(apiClient.get("/video-studio/config")),

  estimate: (body: { model: string; durationSeconds?: number; quantity?: number }) =>
    unwrap<CostEstimate>(apiClient.post("/video-studio/estimate", body)),

  createJob: (body: { type: VideoJobType; model: string; params: VideoJobParams }) =>
    unwrap<VideoJob>(apiClient.post("/video-studio/jobs", body)),

  listJobs: (params?: { status?: string; limit?: number }) =>
    unwrap<VideoJob[]>(
      apiClient.get("/video-studio/jobs", {
        params: { limit: 60, ...params },
      }),
    ),

  getJob: (id: string) => unwrap<VideoJob>(apiClient.get(`/video-studio/jobs/${id}`)),

  cancelJob: (id: string) => unwrap<VideoJob>(apiClient.post(`/video-studio/jobs/${id}/cancel`, {})),

  // Characters
  listCharacters: () => unwrap<VideoCharacter[]>(apiClient.get("/video-studio/characters")),

  createCharacter: (body: Partial<VideoCharacter> & { referenceImages?: string[] }) =>
    unwrap<VideoCharacter>(apiClient.post("/video-studio/characters", body)),

  updateCharacter: (id: string, body: Partial<VideoCharacter>) =>
    unwrap<VideoCharacter>(apiClient.put(`/video-studio/characters/${id}`, body)),

  deleteCharacter: (id: string) => unwrap<{ deleted: boolean }>(apiClient.delete(`/video-studio/characters/${id}`)),

  generateSheet: (id: string) => unwrap<VideoJob>(apiClient.post(`/video-studio/characters/${id}/generate-sheet`, {})),

  // Stories
  listStories: () => unwrap<VideoStory[]>(apiClient.get("/video-studio/stories")),

  getStory: (id: string) => unwrap<VideoStory>(apiClient.get(`/video-studio/stories/${id}`)),

  createStory: (body: { title: string; model?: string; aspectRatio?: string; chaining?: boolean }) =>
    unwrap<VideoStory>(apiClient.post("/video-studio/stories", body)),

  updateStory: (id: string, body: { title?: string; settings?: Record<string, unknown> }) =>
    unwrap<VideoStory>(apiClient.put(`/video-studio/stories/${id}`, body)),

  deleteStory: (id: string) => unwrap<{ deleted: boolean }>(apiClient.delete(`/video-studio/stories/${id}`)),

  addScene: (storyId: string, body: { prompt: string; characterIds?: string[]; durationSeconds?: number; cameraMotion?: string }) =>
    unwrap<VideoStory["scenes"][number]>(apiClient.post(`/video-studio/stories/${storyId}/scenes`, body)),

  updateScene: (sceneId: string, body: Record<string, unknown>) =>
    unwrap<VideoStory["scenes"][number]>(apiClient.put(`/video-studio/scenes/${sceneId}`, body)),

  deleteScene: (sceneId: string) => unwrap<{ deleted: boolean }>(apiClient.delete(`/video-studio/scenes/${sceneId}`)),

  renderStory: (id: string) => unwrap<VideoStory>(apiClient.post(`/video-studio/stories/${id}/render`, {})),

  // BYOK
  saveByok: (body: { keyId: string; secret: string; name?: string }) =>
    unwrap<StudioConfig["byok"]>(apiClient.put("/video-studio/byok", body)),

  deleteByok: () => unwrap<{ configured: boolean }>(apiClient.delete("/video-studio/byok")),

  // Key test + usage
  testKey: (body?: { keyId: string; secret: string }) =>
    unwrap<KeyTestResult>(apiClient.post("/video-studio/test-key", body ?? {})),

  usage: () => unwrap<UsageSnapshot>(apiClient.get("/video-studio/usage")),

  // Super-admin
  adminGetSettings: () =>
    unwrap<AdminSettings>(apiClient.get("/video-studio/admin/settings")),
  adminSaveSettings: (patch: Partial<AdminSettings>) =>
    unwrap<AdminSettings>(apiClient.put("/video-studio/admin/settings", patch)),
  adminConnectionTest: () =>
    unwrap<KeyTestResult>(apiClient.get("/video-studio/admin/connection-test")),
  adminUsage: () => unwrap<UsageSnapshot>(apiClient.get("/video-studio/admin/usage")),
}

export interface KeyTestResult {
  state: "accepted" | "rejected" | "unreachable" | "no_key" | "invalid_format" | "reachable";
  status?: number;
  message?: string;
  source?: "provided" | "byok" | "central";
  billingMode?: string;
}

export interface UsageSnapshot {
  totalJobs: number;
  jobs30: number;
  completed30: number;
  platform30: number;
  byok30: number;
  revenueEgp: number;
}

export interface AdminSettings {
  usdToEgp: number;
  markupPercent: number;
  minChargeEgp: number;
  maxJobsPerDayPerCompany: number;
  simulationMode: "auto" | "always" | "never";
  baseUrl: string | null;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}
