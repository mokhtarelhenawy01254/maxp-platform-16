import { useCallback } from "react";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { storefrontApi } from "../../utils/storefrontApi";

/**
 * ╪¼┘ä╪¿ ┘à╪│╪¬┘ê┘ë ╪º┘ä╪╣┘à┘è┘ä + ╪º┘ä┘à╪▓╪º┘è╪º + ╪º┘ä╪¬┘é╪»┘à (╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ┘ü┘è ┘å┘à┘ê╪░╪¼ ╪º┘ä╪»┘ü╪╣)
 */
export function useTierProgress() {
  const tierProgress = useCheckoutStore((s) => s.tierProgress);
  const setTierProgress = useCheckoutStore((s) => s.setTierProgress);

  const refreshTierProgress = useCallback(
    async (phone: string) => {
      const normalized = String(phone || "").trim();
      if (!/^01[0-9]{9}$/.test(normalized)) {
        setTierProgress(null);
        return null;
      }
      try {
        const res = await storefrontApi.getTierProgress(normalized);
        const data = res?.data ?? null;
        setTierProgress(data);
        return data;
      } catch (e) {
        setTierProgress(null);
        return null;
      }
    },
    [setTierProgress],
  );

  const clearTierProgress = useCallback(() => {
    setTierProgress(null);
  }, [setTierProgress]);

  return { tierProgress, refreshTierProgress, clearTierProgress };
}
