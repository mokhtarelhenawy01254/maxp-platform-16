import { useState, useCallback } from "react";
import { apiClient } from "../../../../services/apiClient";
import { toast } from "sonner";
import { extractApiErrorMessage } from "../apiError";
import type { TeamWorkloadData } from "../types";

export interface UseWorkspaceSupervisorParams {
  isManager: boolean;
  isArabic: boolean;
  fetchOrders: (options?: { silent?: boolean; assignedTo?: string | null }) => Promise<void>;
}

export interface UseWorkspaceSupervisorReturn {
  teamWorkload: TeamWorkloadData;
  loadingWorkload: boolean;
  isDistributing: boolean;
  selectedAgentId: string | null;
  setSelectedAgentId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchTeamWorkload: () => Promise<void>;
  handleSelectAgent: (agentId: string | null) => void;
  handleAutoDistribute: () => Promise<void>;
  handleAssignOrder: (orderId: string, targetUserId: string) => Promise<void>;
}

export const useWorkspaceSupervisor = ({
  isManager,
  isArabic,
  fetchOrders,
}: UseWorkspaceSupervisorParams): UseWorkspaceSupervisorReturn => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadData>({
    unassignedCount: 0,
    agents: [],
  });
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  const fetchTeamWorkload = useCallback(async () => {
    if (!isManager) return;
    try {
      setLoadingWorkload(true);
      const response = await apiClient.get("/agent-workspace/team-workload");
      if (response.data?.success && response.data?.data) {
        setTeamWorkload(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load team workload telemetry:", err);
    } finally {
      setLoadingWorkload(false);
    }
  }, [isManager]);

  const handleSelectAgent = useCallback(
    (agentId: string | null) => {
      setSelectedAgentId(agentId);
      void fetchOrders({ silent: true, assignedTo: agentId });
    },
    [fetchOrders],
  );

  const handleAutoDistribute = useCallback(async () => {
    try {
      setIsDistributing(true);
      const res = await apiClient.post("/agent-workspace/auto-distribute", { limit: 50 });
      if (res.data?.success) {
        toast.success(
          res.data.message || (isArabic ? "تم توزيع الطلبات بنجاح" : "Orders distributed successfully"),
        );
        await Promise.all([fetchTeamWorkload(), fetchOrders({ silent: true })]);
      } else {
        toast.error(
          extractApiErrorMessage(res.data) || (isArabic ? "فشل التوزيع التلقائي" : "Auto distribute failed"),
        );
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err) || (isArabic ? "فشل التوزيع التلقائي" : "Auto distribute failed"),
      );
    } finally {
      setIsDistributing(false);
    }
  }, [isArabic, fetchTeamWorkload, fetchOrders]);

  const handleAssignOrder = useCallback(
    async (orderId: string, targetUserId: string) => {
      try {
        const res = await apiClient.post("/agent-workspace/assign", { orderId, targetUserId });
        if (res.data?.success) {
          toast.success(isArabic ? "تم تعيين الطلب بنجاح" : "Order assigned");
          await Promise.all([fetchTeamWorkload(), fetchOrders({ silent: true })]);
        } else {
          toast.error(
            extractApiErrorMessage(res.data) || (isArabic ? "فشل تعيين الطلب" : "Failed to assign order"),
          );
        }
      } catch (err) {
        toast.error(
          extractApiErrorMessage(err) || (isArabic ? "فشل تعيين الطلب" : "Failed to assign order"),
        );
      }
    },
    [isArabic, fetchTeamWorkload, fetchOrders],
  );

  return {
    teamWorkload,
    loadingWorkload,
    isDistributing,
    selectedAgentId,
    setSelectedAgentId,
    fetchTeamWorkload,
    handleSelectAgent,
    handleAutoDistribute,
    handleAssignOrder,
  };
};
