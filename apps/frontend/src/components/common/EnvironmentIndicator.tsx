/**
 * Environment Indicator Component
 * مؤشر البيئة الحالية (تطوير أم إنتاج)
 */

import React from "react";
import { Server, Radio } from "lucide-react";
import { envConfig } from "../../config/environment";

interface EnvironmentIndicatorProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showInProduction?: boolean;
}

const EnvironmentIndicator: React.FC<EnvironmentIndicatorProps> = ({
  position = "bottom-left",
  showInProduction = false,
}) => {
  if (envConfig.isProduction && !showInProduction) {
    return null;
  }

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  const isDev = envConfig.environment === "development";

  return (
    <div
      className={`
        fixed z-50 px-2.5 py-1 rounded-md text-[11px] font-mono tabular-nums font-medium shadow-sm
        ${positionClasses[position]}
        border border-border/70 bg-card/90 backdrop-blur-md text-card-foreground
        flex items-center gap-2 select-none
      `}
      title={`البيئة: ${envConfig.environment}\nAPI: ${envConfig.apiUrl}\nWS: ${envConfig.wsUrl}`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`size-2 rounded-full ${
            isDev ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
        />
        <Server className="size-3 text-muted-foreground" />
        <span className="font-semibold">{isDev ? "تطوير" : "إنتاج"}</span>
      </span>

      {envConfig.isDevelopment && (
        <span className="text-[10px] text-muted-foreground border-r border-border/60 pr-1.5 mr-0.5">
          :{typeof window !== "undefined" ? window.location.port || "3000" : "3000"}
        </span>
      )}
    </div>
  );
};

export default EnvironmentIndicator;
