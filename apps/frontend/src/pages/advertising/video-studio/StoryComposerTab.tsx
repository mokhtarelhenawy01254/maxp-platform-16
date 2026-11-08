// Story composer: ordered scenes + characters per scene + chaining render
import React, { useMemo, useState } from "react";
import { Film, Loader2, Plus, Play, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { ModelPicker, StabilityDots } from "./components/ModelPicker";
import { CharacterPicker } from "./components/CharacterPicker";
import { StatusChip } from "./components/VideoJobCard";
import { StoryPlayer } from "./components/StoryPlayer";
import { CAMERA_MOTIONS, DEFAULT_VIDEO_MODEL, STORY_RECOMMENDED_MODELS, computeEstimateEgp, formatEgp } from "./presets";
import { useStudioConfig, useStoryMutations, useVideoCharacters, useVideoJobs, useVideoStory, useVideoStories } from "./useVideoStudioQueries";
import { cn } from "@/lib/utils";

export const StoryComposerTab: React.FC = () => {
  const { data: config } = useStudioConfig();
  const { data: stories = [] } = useVideoStories();
  const { data: characters = [] } = useVideoCharacters();
  const { data: jobs = [] } = useVideoJobs();
  const mutations = useStoryMutations();

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const activeStoryId = selectedStoryId ?? stories[0]?.id ?? null;
  const { data: story } = useVideoStory(activeStoryId);

  const [title, setTitle] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneCharacters, setSceneCharacters] = useState<string[]>([]);
  const [sceneDuration, setSceneDuration] = useState(5);
  const [sceneCamera, setSceneCamera] = useState("");

  const videoModels = useMemo(() => (config?.models ?? []).filter((m) => m.kind === "video"), [config]);
  const storyModel = story?.settings?.model ?? DEFAULT_VIDEO_MODEL;
  const selectedModel = videoModels.find((m) => m.id === storyModel);
  const chaining = story?.settings?.chaining !== false;

  const totalEstimate = useMemo(() => {
    if (!story) return 0;
    return story.scenes.reduce((sum, s) => sum + computeEstimateEgp(selectedModel, s.durationSeconds, config?.settings), 0);
  }, [story, selectedModel, config]);

  const activeSceneJobs = new Set(
    jobs.filter((j) => j.status === "QUEUED" || j.status === "PROCESSING").map((j) => j.id),
  );
  const isRendering = story?.status === "RENDERING";
  const isByok = config?.byok.configured ?? false;

  const createStory = () => {
    if (!title.trim()) return;
    mutations.create.mutate(
      { title: title.trim(), model: storyModel, chaining: true },
      { onSuccess: (s) => { setSelectedStoryId(s.id); setTitle(""); } },
    );
  };

  const addScene = () => {
    if (!activeStoryId || !scenePrompt.trim()) return;
    mutations.addScene.mutate(
      {
        storyId: activeStoryId,
        prompt: scenePrompt.trim(),
        characterIds: sceneCharacters,
        durationSeconds: sceneDuration,
        cameraMotion: sceneCamera || undefined,
      },
      { onSuccess: () => { setScenePrompt(""); setSceneCharacters([]); setSceneCamera(""); } },
    );
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-12">
      {/* Scenes column */}
      <div className="min-h-0 overflow-y-auto border-b border-border lg:col-span-7 lg:border-b-0 lg:border-e">
        <div className="space-y-4 p-3 sm:p-4">
          {/* Story selector + create */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeStoryId ?? ""} onValueChange={(v) => { setSelectedStoryId(v ?? null); }}>
              <SelectTrigger className="min-w-40 flex-1"><SelectValue placeholder="اختر قصة" /></SelectTrigger>
              <SelectContent>
                {stories.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="max-w-40 truncate">{s.title}</span>
                      <StatusChip status={s.status} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {story && !isRendering && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => mutations.remove.mutate(story.id)}
                aria-label="حذف القصة"
                title="حذف القصة"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {!activeStoryId && (
            <div className="flex gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان قصة جديدة — مثال: إعلان تشكيلة الشتاء" />
              <Button size="sm" onClick={createStory} disabled={!title.trim() || mutations.create.isPending}>
                {mutations.create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                إنشاء
              </Button>
            </div>
          )}

          {/* Story settings */}
          {story && (
            <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>موديل القصة (كل المشاهد)</Label>
                <ModelPicker
                  models={videoModels.filter((m) => STORY_RECOMMENDED_MODELS.includes(m.id))}
                  value={storyModel}
                  onChange={(m) =>
                    mutations.update.mutate({ id: story.id, settings: { ...(story.settings ?? {}), model: m } })
                  }
                  disabled={isRendering}
                />
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <StabilityDots level={selectedModel?.characterStability ?? 0} />
                  موديلات موصى بها لثبات الشخصيات عبر المشاهد
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>ربط المشاهد (كيفريم)</Label>
                <button
                  type="button"
                  disabled={isRendering}
                  aria-pressed={chaining}
                  onClick={() =>
                    mutations.update.mutate({ id: story.id, settings: { ...(story.settings ?? {}), chaining: !chaining } })
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    chaining ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  <span>{chaining ? "مفعّل — آخر فريم يبدأ المشهد التالي" : "متوقف — مشاهد مستقلة"}</span>
                  <span className={cn("h-2 w-8 rounded-full transition-colors", chaining ? "bg-primary" : "bg-muted-foreground/30")}>
                    <span className={cn("block size-2 rounded-full bg-white transition-transform", chaining ? "translate-x-4" : "translate-x-0")} />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Scenes list */}
          {story?.scenes.map((scene) => {
            const sceneCharacters_ = characters.filter((c) => scene.characterIds.includes(c.id));
            return (
              <div key={scene.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                    {scene.sceneOrder}
                  </span>
                  <p className="min-w-0 flex-1 text-xs">{scene.prompt}</p>
                  <StatusChip status={scene.status} />
                  {scene.status !== "COMPLETED" && !isRendering && (
                    <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => mutations.removeScene.mutate(scene.id)} aria-label="حذف المشهد" title="حذف المشهد">
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{scene.durationSeconds}ث</span>
                  {scene.cameraMotion && <span>· {CAMERA_MOTIONS.find((c) => c.id === scene.cameraMotion)?.label ?? scene.cameraMotion}</span>}
                  {sceneCharacters_.map((c) => (
                    <span key={c.id} className="rounded-full bg-muted px-2 py-0.5">{c.name}</span>
                  ))}
                  {scene.status === "COMPLETED" && scene.job?.outputUrl && (
                    <a href={scene.job.outputUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                      الفيديو
                    </a>
                  )}
                  {scene.status === "RENDERING" && scene.job && activeSceneJobs.has(scene.job.id) && (
                    <span className="tabular-nums">{scene.job.progress}%</span>
                  )}
                  {scene.errorMessage && <span className="text-destructive">{scene.errorMessage}</span>}
                </div>
              </div>
            );
          })}

          {/* Add scene */}
          {story && !isRendering && (
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="scene-prompt">مشهد جديد</Label>
                <Textarea
                  id="scene-prompt"
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  rows={2}
                  className="resize-none"
                  placeholder="مثال: سلمى تفتح علبة العطر وتشمّه بابتسامة، لقطة قريبة"
                />
              </div>
              <CharacterPicker characters={characters} selected={sceneCharacters} onChange={setSceneCharacters} />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="scene-duration" className="text-xs">المدة (ثانية)</Label>
                  <Input
                    id="scene-duration"
                    type="number"
                    min={1}
                    max={15}
                    value={sceneDuration}
                    onChange={(e) => setSceneDuration(Number(e.target.value) || 5)}
                    className="h-8 tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">حركة الكاميرا</Label>
                  <Select value={sceneCamera} onValueChange={(v) => { setSceneCamera(v ?? ""); }}>
                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOTIONS.map((c) => (
                        <SelectItem key={c.id || "none"} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={addScene} disabled={!scenePrompt.trim() || mutations.addScene.isPending}>
                {mutations.addScene.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                إضافة مشهد
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Render + player column */}
      <div className="flex min-h-0 flex-col lg:col-span-5">
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Film className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium">تنفيذ القصة</span>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{isByok ? "على مفتاحك" : formatEgp(totalEstimate)}</span>
            <Button
              size="sm"
              onClick={() => activeStoryId && mutations.render.mutate(activeStoryId)}
              disabled={!activeStoryId || isRendering || !story?.scenes.length || mutations.render.isPending}
            >
              {isRendering ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {isRendering ? "قيد التنفيذ" : "ترندر القصة"}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {story ? (
            <>
              <StoryPlayer story={story} />
              {story.status === "FAILED" && (
                <p className="text-[11px] text-destructive">فشل مشهد — أعد الترندر ليُكمل من المشهد المتوقف</p>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Film className="size-8" />
              <p className="text-sm font-medium text-foreground">مفيش قصص بعد</p>
              <p className="text-xs">أنشئ قصة، ضيف مشاهد بنفس الشخصيات، ونفّذها</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
