// Single scene composer: workflow → model → prompt → refs → estimate → generate
import React, { useMemo, useState } from "react";
import { Loader2, Sparkles, Video } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Slider } from "../../../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { ReferenceImagesInput } from "./components/ReferenceImagesInput";
import { ModelPicker } from "./components/ModelPicker";
import { CharacterPicker } from "./components/CharacterPicker";
import { VideoJobCard } from "./components/VideoJobCard";
import { CAMERA_MOTIONS, DEFAULT_VIDEO_MODEL, WORKFLOWS, computeEstimateEgp, formatEgp } from "./presets";
import { useCancelJobMutation, useCreateJobMutation, useStudioConfig, useVideoCharacters, useVideoJobs } from "./useVideoStudioQueries";
import type { VideoJobType } from "./types";
import { cn } from "@/lib/utils";

export const SingleSceneTab: React.FC = () => {
  const { data: config } = useStudioConfig();
  const { data: jobs = [] } = useVideoJobs();
  const { data: characters = [] } = useVideoCharacters();
  const createJob = useCreateJobMutation();
  const cancelJob = useCancelJobMutation();

  const [workflow, setWorkflow] = useState<VideoJobType>("TEXT_TO_VIDEO");
  const [model, setModel] = useState(DEFAULT_VIDEO_MODEL);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [cameraMotion, setCameraMotion] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");

  const videoModels = useMemo(() => (config?.models ?? []).filter((m) => m.kind === "video"), [config]);
  const selectedModel = videoModels.find((m) => m.id === model);
  const activeWorkflow = WORKFLOWS.find((w) => w.id === workflow);

  // Inject character references automatically when characters are selected
  const effectiveRefs = useMemo(() => {
    const charRefs = characters
      .filter((c) => characterIds.includes(c.id))
      .flatMap((c) => (Array.isArray(c.referenceImages) ? c.referenceImages : []));
    return Array.from(new Set([...referenceImages, ...charRefs])).slice(0, 4);
  }, [characters, characterIds, referenceImages]);

  const estimateEgp = computeEstimateEgp(selectedModel, duration, config?.settings);
  const isByok = config?.byok.configured ?? false;
  const canGenerate =
    prompt.trim().length > 3 &&
    !createJob.isPending &&
    (workflow !== "MOTION_TRANSFER" || sourceVideoUrl.trim().length > 3);

  const generate = () => {
    createJob.mutate({
      type: workflow,
      model,
      params: {
        prompt: prompt.trim(),
        durationSeconds: duration,
        aspectRatio,
        cameraMotion: cameraMotion || undefined,
        referenceImages: effectiveRefs,
        characterIds,
        sourceVideoUrl: workflow === "MOTION_TRANSFER" ? sourceVideoUrl.trim() : undefined,
      },
    });
  };

  const activeJobs = jobs.filter((j) => j.status === "QUEUED" || j.status === "PROCESSING").slice(0, 8);
  const recentFailed = jobs
    .filter((j) => j.status === "FAILED" || j.status === "CANCELLED")
    .slice(0, 5);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-12">
      {/* Composer */}
      <div className="min-h-0 overflow-y-auto border-b border-border lg:col-span-5 lg:border-b-0 lg:border-e">
        <div className="space-y-4 p-3 sm:p-4">
          {/* Workflow */}
          <div className="space-y-1.5">
            <Label>نوع العمل</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {WORKFLOWS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWorkflow(w.id)}
                  aria-pressed={workflow === w.id}
                  title={w.hint}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    workflow === w.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label htmlFor="vs-model">الموديل</Label>
            <ModelPicker id="vs-model" models={videoModels} value={model} onChange={setModel} />
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="vs-prompt">الوصف (البرومبت)</Label>
            <Textarea
              id="vs-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: فتاة ترتدي فستان الصيف الجديد تمشي في شارع مقاهي، إضاءة ذهبية، حركة كاميرا ناعمة"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Source video for motion transfer */}
          {workflow === "MOTION_TRANSFER" && (
            <div className="space-y-1.5">
              <Label htmlFor="vs-source-video">رابط الفيديو المرجعي (الحركة)</Label>
              <Input
                id="vs-source-video"
                value={sourceVideoUrl}
                onChange={(e) => setSourceVideoUrl(e.target.value)}
                placeholder="https://... رابط فيديو 4 ثواني على الأقل"
                dir="ltr"
              />
            </div>
          )}

          {/* References */}
          <ReferenceImagesInput
            images={referenceImages}
            onChange={setReferenceImages}
            label={workflow === "MOTION_TRANSFER" ? "صور الشخصية/المنتج" : "صور مرجعية (اختياري)"}
          />

          {/* Characters */}
          <div className="space-y-1.5">
            <Label>شخصيات من المكتبة</Label>
            <CharacterPicker characters={characters} selected={characterIds} onChange={setCharacterIds} />
          </div>

          {/* Duration / Aspect / Camera */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vs-duration">المدة</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{duration} ث</span>
              </div>
              <Slider
                id="vs-duration"
                value={[duration]}
                min={1}
                max={selectedModel?.maxDurationSeconds ?? 15}
                step={1}
                onValueChange={(v) => {
                  const next = Array.isArray(v) ? v[0] : v;
                  setDuration(next ?? 5);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>الأبعاد</Label>
              <Select value={aspectRatio} onValueChange={(v) => { if (v !== null) setAspectRatio(v); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(selectedModel?.aspectRatios ?? ["9:16", "16:9", "1:1"]).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>حركة الكاميرا</Label>
            <Select value={cameraMotion} onValueChange={(v) => { setCameraMotion(v ?? ""); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMERA_MOTIONS.map((c) => (
                  <SelectItem key={c.id || "none"} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Queue + generate bar */}
      <div className="flex min-h-0 flex-col lg:col-span-7">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Video className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">طابور التنفيذ</span>
          <span className="text-xs tabular-nums text-muted-foreground">({activeJobs.length})</span>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {isByok ? "على مفتاحك" : formatEgp(estimateEgp)}
            </span>
            <Button size="sm" onClick={generate} disabled={!canGenerate}>
              {createJob.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              توليد
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeJobs.length === 0 && recentFailed.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium text-foreground">مفيش وظائف شغالة</p>
              <p className="text-xs">اضبط المشهد واضغط «توليد»</p>
            </div>
          ) : (
            <>
              {activeJobs.map((j) => (
                <VideoJobCard key={j.id} job={j} onCancel={(id) => cancelJob.mutate(id)} cancelling={cancelJob.isPending} />
              ))}
              {recentFailed.map((j) => (
                <VideoJobCard key={j.id} job={j} onCancel={(id) => cancelJob.mutate(id)} cancelling={cancelJob.isPending} />
              ))}
            </>
          )}
        </div>
        {activeWorkflow && (
          <p className="border-t border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
            {activeWorkflow.hint}
          </p>
        )}
      </div>
    </div>
  );
};
