import React from "react";
import { Play, Pause, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTimer } from "../../contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GlobalTimer: React.FC = () => {
  const { t } = useTranslation();
  const { activeTimer, elapsedSeconds, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const navigate = useNavigate();

  if (!activeTimer.taskId) return null;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1 border border-primary/30 bg-primary/10 text-primary shadow-xs transition-colors hover:bg-primary/15">
        <div
          className="flex flex-col cursor-pointer min-w-[76px] text-center"
          onClick={() => navigate(`/super-admin/dev-tasks/${activeTimer.taskId}`)}
        >
          <span className="font-mono tabular-nums text-xs font-bold leading-none">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-[10px] font-medium max-w-[110px] truncate opacity-85 mt-0.5">
            {activeTimer.taskTitle || t("globalTimer.taskRunning")}
          </span>
        </div>

        <div className="flex items-center gap-1 border-r border-primary/25 pr-1.5 mr-0.5">
          {activeTimer.isPaused ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resumeTimer(activeTimer.taskId!)}
                  className="size-6 p-0 text-primary hover:bg-primary/20 rounded-md"
                  aria-label={t("globalTimer.resume")}
                >
                  <Play className="size-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("globalTimer.resume")}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => pauseTimer(activeTimer.taskId!)}
                  className="size-6 p-0 text-primary hover:bg-primary/20 rounded-md"
                  aria-label={t("globalTimer.pause")}
                >
                  <Pause className="size-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("globalTimer.pause")}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => stopTimer(activeTimer.taskId!)}
                className="size-6 p-0 text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 rounded-md"
                aria-label={t("globalTimer.stop")}
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("globalTimer.stop")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GlobalTimer;
