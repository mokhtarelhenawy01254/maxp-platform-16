import React from "react";
import { Play, Pause, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTimer } from "../../contexts/TimerContext";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GlobalTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds, stopTimer, pauseTimer, resumeTimer } = useTimer();
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";

  if (!activeTimer.taskId) return null;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const textColor = isDark ? "#60a5fa" : "#2563eb";

  return (
    <TooltipProvider>
      <div
        className={`flex items-center gap-1.5 rounded-[50px] px-2 py-0.5 border transition-all duration-200 hover:brightness-110`}
        style={{
          backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.05)",
          borderColor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)",
        }}
      >
        <div
          className="flex flex-col cursor-pointer min-w-[80px]"
          onClick={() => navigate(`/super-admin/dev-tasks/${activeTimer.taskId}`)}
        >
          <span
            className="font-extrabold text-sm leading-none text-center"
            style={{
              fontFamily: "monospace",
              fontSize: "0.85rem",
              color: textColor,
            }}
          >
            {formatTime(elapsedSeconds)}
          </span>
          <span
            className="text-[0.65rem] font-semibold max-w-[120px] truncate text-center"
            style={{ color: textColor, opacity: 0.8 }}
          >
            {activeTimer.taskTitle || "مهمة قيد التنفيذ"}
          </span>
        </div>

        <div
          className="flex items-center gap-0.5 pr-1 mr-0.5"
          style={{ borderRight: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.2)"}` }}
        >
          {activeTimer.isPaused ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resumeTimer(activeTimer.taskId!)}
                  style={{ color: textColor, padding: 2 }}
                  className="size-auto"
                >
                  <Play className="size-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>استئناف</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => pauseTimer(activeTimer.taskId!)}
                  style={{ color: textColor, padding: 2 }}
                  className="size-auto"
                >
                  <Pause className="size-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>إيقاف مؤقت</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => stopTimer(activeTimer.taskId!)}
                style={{ color: "#ef4444", padding: 2 }}
                className="size-auto"
              >
                <Square className="size-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>إنهاء المهمة</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GlobalTimer;
