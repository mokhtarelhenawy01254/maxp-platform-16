import { useState, useEffect } from "react";
import {
  AgentListing,
  getAgentSamplePrompts,
} from "../agentMarketplaceData";

export interface UseAgentProfileDrawerProps {
  agent: AgentListing | null;
  open: boolean;
  onClose: () => void;
}

export interface SandboxResult {
  toolUsed?: string;
  response: string;
}

export function useAgentProfileDrawer({
  agent,
  open,
  onClose,
}: UseAgentProfileDrawerProps) {
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Touch gesture state for native mobile sheet swipe-down
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [touchStartY, setTouchStartY] = useState<number>(0);

  // Live Interactive Sandbox state
  const [sandboxQuery, setSandboxQuery] = useState<string>("");
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setSandboxQuery("");
    setSandboxResult(null);
    setImgError(false);
    setSimulationStep(0);
    setSimulating(false);
  }, [agent?.slug]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  const handleRunSimulation = () => {
    if (!agent) return;
    setSimulating(true);
    setSimulationStep(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= agent.dossier.executionStream.length) {
        setSimulationStep(agent.dossier.executionStream.length - 1);
        setSimulating(false);
        clearInterval(interval);
      } else {
        setSimulationStep(current);
      }
    }, 600);
  };

  const handleResetSimulation = () => {
    setSimulationStep(0);
    setSimulating(false);
  };

  const handleRunSandbox = () => {
    if (!sandboxQuery.trim() || !agent) return;
    setSandboxLoading(true);

    const samples = getAgentSamplePrompts(agent.slug);
    const matched = samples.find(
      (s) =>
        s.prompt.toLowerCase().includes(sandboxQuery.trim().toLowerCase()) ||
        sandboxQuery.trim().toLowerCase().includes(s.label.toLowerCase())
    );

    setTimeout(() => {
      if (matched) {
        setSandboxResult({
          toolUsed: matched.toolUsed,
          response: matched.response,
        });
      } else {
        const primaryTool = agent.tools[0] || "agent.execute_plan";
        setSandboxResult({
          toolUsed: `${primaryTool}(query='${sandboxQuery.trim().slice(0, 30)}…')`,
          response: `تمت معالجة الطلب وفقاً لاختصاص '${agent.position}'. بناءً على مؤشرات الأداء الحالية ومعايير الحوكمة: تم التحقق من الإجراء بدقة، وسيكون متاحاً للتنفيذ التلقائي فور توظيف الإيجنت في حسابك.`,
        });
      }
      setSandboxLoading(false);
    }, 600);
  };

  return {
    simulationStep,
    simulating,
    imgError,
    setImgError,
    dragY,
    isDragging,
    sandboxQuery,
    setSandboxQuery,
    sandboxLoading,
    sandboxResult,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleRunSimulation,
    handleResetSimulation,
    handleRunSandbox,
  };
}
