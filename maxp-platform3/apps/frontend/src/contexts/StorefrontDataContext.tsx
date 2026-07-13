import React, { createContext, useContext, useMemo } from "react";

export type StorefrontContextType = "product" | "shop" | "cart" | "checkout";

export interface StorefrontContextState {
  type: StorefrontContextType;
  data: Record<string, any>;
}

const DEFAULT_STATE: StorefrontContextState = {
  type: "product",
  data: {},
};

const StorefrontDataContext = createContext<StorefrontContextState>(DEFAULT_STATE);

interface StorefrontDataProviderProps {
  children: React.ReactNode;
  type?: StorefrontContextType;
  initialData?: Record<string, any> | null;
}

export const StorefrontDataProvider: React.FC<StorefrontDataProviderProps> = ({
  children,
  type = "product",
  initialData,
}) => {
  const value = useMemo(
    () => ({
      type,
      data: initialData || {},
    }),
    [initialData, type],
  );

  return (
    <StorefrontDataContext.Provider value={value}>
      {children}
    </StorefrontDataContext.Provider>
  );
};

export const useStorefrontData = (): StorefrontContextState => {
  return useContext(StorefrontDataContext);
};

export default StorefrontDataContext;
