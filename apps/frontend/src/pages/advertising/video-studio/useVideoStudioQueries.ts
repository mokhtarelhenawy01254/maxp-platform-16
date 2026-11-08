// AI Video Studio — react-query hooks (namespaced keys + 5s polling for active jobs)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { videoStudioApi, getApiErrorMessage } from "./videoStudioApi";
import type { VideoJobType, VideoJobParams, VideoCharacter, VideoStory } from "./types";

export const VIDEO_STUDIO_KEYS = {
  all: ["video-studio"] as const,
  config: () => ["video-studio", "config"] as const,
  jobs: (status?: string) => ["video-studio", "jobs", status ?? "all"] as const,
  characters: () => ["video-studio", "characters"] as const,
  stories: () => ["video-studio", "stories"] as const,
  story: (id: string) => ["video-studio", "story", id] as const,
};

const ACTIVE_STATUSES = ["QUEUED", "PROCESSING"];

export function useStudioConfig() {
  return useQuery({
    queryKey: VIDEO_STUDIO_KEYS.config(),
    queryFn: videoStudioApi.getConfig,
    staleTime: 60_000,
  });
}

export function useVideoJobs() {
  return useQuery({
    queryKey: VIDEO_STUDIO_KEYS.jobs(),
    queryFn: () => videoStudioApi.listJobs(),
    refetchInterval: (query) => {
      const jobs = query.state.data;
      const hasActive = Array.isArray(jobs) && jobs.some((j) => ACTIVE_STATUSES.includes(j.status));
      const hasSheetPending = Array.isArray(jobs) && jobs.some((j) => j.type === "CHARACTER_SHEET" && ACTIVE_STATUSES.includes(j.status));
      return hasActive || hasSheetPending ? 5_000 : 30_000;
    },
    staleTime: 2_000,
  });
}

export function useVideoCharacters() {
  return useQuery({
    queryKey: VIDEO_STUDIO_KEYS.characters(),
    queryFn: videoStudioApi.listCharacters,
  });
}

export function useVideoStories() {
  return useQuery({
    queryKey: VIDEO_STUDIO_KEYS.stories(),
    queryFn: videoStudioApi.listStories,
    refetchInterval: (query) => {
      const stories = query.state.data;
      return Array.isArray(stories) && stories.some((s) => s.status === "RENDERING") ? 6_000 : 30_000;
    },
    staleTime: 2_000,
  });
}

export function useVideoStory(storyId: string | null) {
  return useQuery({
    queryKey: VIDEO_STUDIO_KEYS.story(storyId ?? "none"),
    queryFn: () => videoStudioApi.getStory(storyId as string),
    enabled: Boolean(storyId),
    refetchInterval: (query) => (query.state.data?.status === "RENDERING" ? 6_000 : 30_000),
    staleTime: 2_000,
  });
}

export function useCreateJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: VideoJobType; model: string; params: VideoJobParams }) =>
      videoStudioApi.createJob(body),
    onSuccess: () => {
      toast.success("تم إضافة التوليد للطابور");
      qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.jobs() });
      qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.config() });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل إضافة التوليد")),
  });
}

export function useCancelJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => videoStudioApi.cancelJob(id),
    onSuccess: () => {
      toast.success("تم إلغاء التوليد");
      qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.jobs() });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل الإلغاء")),
  });
}

export function useCharacterMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.characters() });

  const create = useMutation({
    mutationFn: (body: Partial<VideoCharacter> & { referenceImages?: string[] }) =>
      videoStudioApi.createCharacter(body),
    onSuccess: () => {
      toast.success("تم إنشاء الشخصية");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل إنشاء الشخصية")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => videoStudioApi.deleteCharacter(id),
    onSuccess: () => {
      toast.success("تم حذف الشخصية");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حذف الشخصية")),
  });

  const generateSheet = useMutation({
    mutationFn: (id: string) => videoStudioApi.generateSheet(id),
    onSuccess: () => {
      toast.success("جاري توليد شيت الشخصية");
      invalidate();
      qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.jobs() });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل بدء التوليد")),
  });

  return { create, remove, generateSheet };
}

export function useStoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.stories() });
    qc.invalidateQueries({ queryKey: ["video-studio", "story"] });
    qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.jobs() });
  };

  const create = useMutation({
    mutationFn: videoStudioApi.createStory,
    onSuccess: () => {
      toast.success("تم إنشاء القصة");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل إنشاء القصة")),
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; settings?: Record<string, unknown> }) =>
      videoStudioApi.updateStory(id, body),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل تحديث القصة")),
  });

  const addScene = useMutation({
    mutationFn: ({ storyId, ...body }: { storyId: string; prompt: string; characterIds?: string[]; durationSeconds?: number; cameraMotion?: string }) =>
      videoStudioApi.addScene(storyId, body),
    onSuccess: () => {
      toast.success("تمت إضافة المشهد");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشلت إضافة المشهد")),
  });

  const removeScene = useMutation({
    mutationFn: (sceneId: string) => videoStudioApi.deleteScene(sceneId),
    onSuccess: () => {
      toast.success("تم حذف المشهد");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حذف المشهد")),
  });

  const render = useMutation({
    mutationFn: (id: string) => videoStudioApi.renderStory(id),
    onSuccess: () => {
      toast.success("بدأ تنفيذ القصة — المشاهد هتترندر بالتتابع");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل بدء القصة")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => videoStudioApi.deleteStory(id),
    onSuccess: () => {
      toast.success("تم حذف القصة");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حذف القصة")),
  });

  return { create, update, addScene, removeScene, render, remove };
}

export function useByokMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: VIDEO_STUDIO_KEYS.config() });

  const save = useMutation({
    mutationFn: videoStudioApi.saveByok,
    onSuccess: () => {
      toast.success("تم حفظ المفتاح — الاستخدام الآن على حسابك لدى Higgsfield");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حفظ المفتاح")),
  });

  const remove = useMutation({
    mutationFn: videoStudioApi.deleteByok,
    onSuccess: () => {
      toast.success("تم حذف المفتاح");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حذف المفتاح")),
  });

  return { save, remove };
}

export type { VideoStory };
