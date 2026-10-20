import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import { AgentListing } from "../agentMarketplaceData";
import { handleInsufficientWalletBalance } from "../../../../utils/marketplaceWalletHelper";

export interface UseAgentHireModalProps {
  agent: AgentListing | null;
  open: boolean;
  onClose: () => void;
  onHired: (agentSlug: string, agentName: string) => void;
}

export function useAgentHireModal({
  agent,
  open,
  onClose,
  onHired,
}: UseAgentHireModalProps) {
  const navigate = useNavigate();
  const [customName, setCustomName] = useState<string>(agent?.name || "");
  const [department, setDepartment] = useState<string>("general");
  const [safetyMode, setSafetyMode] = useState<"draft" | "autonomous">("draft");
  const [loading, setLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Commercial wallet balance guard
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);

  useEffect(() => {
    if (agent) {
      setCustomName(agent.name);
      setImgError(false);
      if (agent.category === "marketing") setDepartment("marketing");
      else if (agent.category === "sales") setDepartment("sales");
      else if (agent.category === "operations") setDepartment("operations");
      else if (agent.category === "healthcare") setDepartment("medical");
      else setDepartment("executive");
    }
  }, [agent]);

  useEffect(() => {
    if (open) {
      setWalletLoading(true);
      apiClient
        .get("/wallet/balance")
        .then((res) => {
          const bal =
            res.data?.data?.balance ?? res.data?.balance ?? res.data?.wallet?.balance;
          if (typeof bal === "number") {
            setWalletBalance(bal);
          } else if (typeof bal === "string" && !isNaN(parseFloat(bal))) {
            setWalletBalance(parseFloat(bal));
          } else {
            setWalletBalance(2400); // graceful default
          }
        })
        .catch(() => {
          setWalletBalance(2400);
        })
        .finally(() => {
          setWalletLoading(false);
        });
    }
  }, [open]);

  const isPro = agent?.tier === "pro";
  const requiredAmount = isPro ? agent?.priceMonthly || 0 : 0;
  const hasEnoughBalance = walletBalance === null || walletBalance >= requiredAmount;

  const navigateToRecharge = () => {
    if (!agent) return;
    handleInsufficientWalletBalance(
      {
        response: {
          status: 402,
          data: {
            code: "INSUFFICIENT_WALLET_BALANCE",
            requiredAmount,
            currentBalance: walletBalance,
            currency: agent.currency || "EGP",
            message: `رصيد المحفظة غير كافٍ. المطلوب: ${requiredAmount} ${agent.currency || "ج.م"}، المتوفر: ${walletBalance ?? 0} ${agent.currency || "ج.م"}`,
          },
        },
      },
      navigate,
      {
        returnUrl: window.location.pathname + window.location.search,
        appName: agent.name,
        itemType: "agent",
      }
    );
    onClose();
  };

  const handleConfirmHire = async () => {
    if (!agent) return;

    if (isPro && !hasEnoughBalance) {
      navigateToRecharge();
      return;
    }

    setLoading(true);
    try {
      // Call backend hire endpoint
      const res = await apiClient.post("/agent-manager/hire", {
        templateSlug: agent.slug,
        name: customName.trim() || agent.name,
        description: agent.position,
        department,
        safetyMode,
      });

      if (res.data?.success || res.status === 200 || res.status === 201) {
        toast.success(`تم توظيف الإيجنت ${customName || agent.name} بنجاح في فريق عملك.`);
        onHired(agent.slug, customName || agent.name);
        onClose();
      } else {
        const errorMsg = res.data?.error || res.data?.message || "تعذر إتمام التوظيف";
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "تعذر توظيف الإيجنت حالياً";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    customName,
    setCustomName,
    department,
    setDepartment,
    safetyMode,
    setSafetyMode,
    loading,
    imgError,
    setImgError,
    walletBalance,
    walletLoading,
    isPro,
    requiredAmount,
    hasEnoughBalance,
    navigateToRecharge,
    handleConfirmHire,
  };
}
