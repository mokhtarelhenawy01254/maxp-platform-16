import { apiClient } from "./apiClient";
import { normalizeCancellationReasonOptions } from "./cancellationReasonUtils";

let cachedReasonOptions: string[] | null = null;
let pendingReasonOptionsRequest: Promise<string[]> | null = null;

const cloneOptions = (options: string[]) => [...options];

const cancellationReasonService = {
  async getReasonOptions(forceRefresh = false): Promise<string[]> {
    if (!forceRefresh && cachedReasonOptions) {
      return cloneOptions(cachedReasonOptions);
    }

    if (!forceRefresh && pendingReasonOptionsRequest) {
      return pendingReasonOptionsRequest;
    }

    pendingReasonOptionsRequest = (async () => {
      const response = await apiClient.get("/analytics/cancellations/settings");
      const reasonOptions = normalizeCancellationReasonOptions(
        response.data?.data?.reasonOptions,
      );
      cachedReasonOptions = reasonOptions;
      return cloneOptions(reasonOptions);
    })();

    try {
      return await pendingReasonOptionsRequest;
    } finally {
      pendingReasonOptionsRequest = null;
    }
  },

  async saveReasonOptions(reasonOptions: string[]): Promise<string[]> {
    const normalizedReasonOptions =
      normalizeCancellationReasonOptions(reasonOptions);

    const response = await apiClient.put("/analytics/cancellations/settings", {
      reasonOptions: normalizedReasonOptions,
    });

    const savedReasonOptions = normalizeCancellationReasonOptions(
      response.data?.data?.reasonOptions,
    );

    cachedReasonOptions = savedReasonOptions;
    return cloneOptions(savedReasonOptions);
  },

  clearCache() {
    cachedReasonOptions = null;
    pendingReasonOptionsRequest = null;
  },
};

export default cancellationReasonService;
