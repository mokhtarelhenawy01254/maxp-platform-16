export const isCapacitorNative = (): boolean => false;

export const envConfig = {
  apiUrl: "http://localhost:5000/api",
  wsUrl: "ws://localhost:5000",
  appUrl: "http://localhost:5173",
  backendUrl: "http://localhost:5000",
  isDevelopment: true,
  isProduction: false,
  environment: "development" as const,
  googleMapsApiKey: "",
};

export const isLocal = () => envConfig.isDevelopment;
export const isProduction = () => envConfig.isProduction;
export const getApiUrl = () => envConfig.apiUrl;
export const getWsUrl = () => envConfig.wsUrl;
export const getAppUrl = () => envConfig.appUrl;
export const getBackendUrl = () => envConfig.backendUrl;
