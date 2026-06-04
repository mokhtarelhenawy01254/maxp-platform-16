import { useEffect } from "react";
import { useGeolocation } from "../contexts/GeolocationContext";

/**
 * Custom hook to automatically fill a governorate/city field in a form
 * based on the global detected geolocation.
 * 
 * @param currentValue The current value of the form field
 * @param setter Function to update the form field state
 * @param enabled Whether auto-detection is locally enabled for this form
 */
export function useAutoGeolocation(
  currentValue: string, 
  setter: (value: string) => void,
  enabled: boolean = true
) {
  const { detectedGovernorate, loading } = useGeolocation();

  useEffect(() => {
    // Only proceed if:
    // 1. Not currently loading geolocation
    // 2. Local form has city field enabled
    // 3. A governorate was actually detected
    // 4. The current form field is still empty (don't overwrite user input)
    if (!loading && enabled && detectedGovernorate && !currentValue) {
      setter(detectedGovernorate.nameAr);
    }
  }, [loading, enabled, detectedGovernorate, currentValue, setter]);
}
