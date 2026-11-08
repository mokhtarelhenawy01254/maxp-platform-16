// AI Video Studio — unified single-surface cockpit (Higgsfield)
// Tabs: مشهد مفرد | قصة | شخصيات | المكتبة — each an isolated error boundary.
import React, { useState } from "react";
import { Clapperboard, KeyRound, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Button } from "../../../components/ui/button";
import TabErrorBoundary from "../../admin/OrderWorkflow/TabErrorBoundary";
import { StudioSettingsDrawer } from "./components/StudioSettingsDrawer";
import { SingleSceneTab } from "./SingleSceneTab";
import { StoryComposerTab } from "./StoryComposerTab";
import { CharactersTab } from "./CharactersTab";
import { LibraryTab } from "./LibraryTab";
import { useStudioConfig } from "./useVideoStudioQueries";
import { formatEgp } from "./presets";

const VideoStudioPage: React.FC = () => {
  const { data: config, isLoading } = useStudioConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="video-studio-root flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Unified top bar */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
        <Clapperboard className="size-4 text-primary" />
        <h1 className="text-sm font-semibold">استوديو الفيديو</h1>
        {config?.simulation && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            محاكاة
          </span>
        )}
        {config?.byok.configured && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <KeyRound className="size-3" />
            مفتاحك
          </span>
        )}
        <div className="ms-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs tabular-nums">
                  <Wallet className="size-3.5 text-muted-foreground" />
                  {isLoading ? "…" : formatEgp(config?.walletBalance ?? 0)}
                </span>
              </TooltipTrigger>
              <TooltipContent>رصيد محفظة الشركة — يُخصم تلقائيًا لكل توليد</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <KeyRound className="size-3.5" />
            المفتاح والرصيد
          </Button>
        </div>
      </header>

      {/* Tabs chassis */}
      <Tabs defaultValue="scene" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="h-9 w-full shrink-0 justify-start gap-0 rounded-none border-b border-border bg-card p-0">
          <TabsTrigger value="scene" className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[selected]:border-primary">
            مشهد مفرد
          </TabsTrigger>
          <TabsTrigger value="story" className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[selected]:border-primary">
            قصة
          </TabsTrigger>
          <TabsTrigger value="characters" className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[selected]:border-primary">
            شخصيات
          </TabsTrigger>
          <TabsTrigger value="library" className="h-full rounded-none border-b-2 border-transparent px-4 text-xs data-[selected]:border-primary">
            المكتبة
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-hidden">
          <TabsContent value="scene" className="h-full min-h-0 pt-0 data-[state=open]:animate-none">
            <TabErrorBoundary tabLabel="مشهد مفرد">
              <SingleSceneTab />
            </TabErrorBoundary>
          </TabsContent>
          <TabsContent value="story" className="h-full min-h-0 pt-0">
            <TabErrorBoundary tabLabel="قصة">
              <StoryComposerTab />
            </TabErrorBoundary>
          </TabsContent>
          <TabsContent value="characters" className="h-full min-h-0 pt-0">
            <TabErrorBoundary tabLabel="شخصيات">
              <CharactersTab />
            </TabErrorBoundary>
          </TabsContent>
          <TabsContent value="library" className="h-full min-h-0 pt-0">
            <TabErrorBoundary tabLabel="المكتبة">
              <LibraryTab />
            </TabErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>

      <StudioSettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default VideoStudioPage;
