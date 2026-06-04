import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { detectUserGovernorate } from "../utils/geolocation";
import { Governorate } from "../constants/egyptGovernorates";
import { getCompanyId } from "../utils/storefrontApi";
import { checkoutFormSettingsService } from "../services/checkoutFormSettingsService";

interface GeolocationContextType {
  detectedGovernorate: Governorate | null;
  loading: boolean;
  refreshLocation: () => Promise<void>;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export const GeolocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [detectedGovernorate, setDetectedGovernorate] = useState<Governorate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      
      // 1. Check if city detection is enabled in settings
      const companyId = getCompanyId();
      if (companyId) {
        const settingsResponse = await checkoutFormSettingsService.getPublicSettings(companyId);
        if (settingsResponse?.success && settingsResponse.data && !settingsResponse.data.showCity) {
          setDetectedGovernorate(null);
          return;
        }
      }

      // 2. Detect location
      const gov = await detectUserGovernorate();
      setDetectedGovernorate(gov);
    } catch (error) {
      console.error("Error in GeolocationProvider:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLocation();
  }, []);

  return (
    <GeolocationContext.Provider value={{ detectedGovernorate, loading, refreshLocation: fetchLocation }}>
      {children}
    </GeolocationContext.Provider>
  );
};

export const useGeolocation = () => {
  const context = useContext(GeolocationContext);
  if (context === undefined) {
    throw new Error("useGeolocation must be used within a GeolocationProvider");
  }
  return context;
};
