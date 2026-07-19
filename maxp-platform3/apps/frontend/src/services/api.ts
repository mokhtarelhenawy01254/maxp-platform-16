/**
 * API Service Export
 * Re-exports apiClient as default for compatibility
 */

import { apiClient } from "./apiClient";
export type { ApiRequestConfig } from "./apiClient";

export default apiClient;
export { apiClient };
