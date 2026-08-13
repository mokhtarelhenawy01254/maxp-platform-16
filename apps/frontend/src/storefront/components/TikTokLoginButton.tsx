import React from "react";
import { getTiktokLoginUrl } from "../../services/tiktokAuthService";
import { getCompanyId } from "../../utils/storefrontApi";

declare global {
  interface Window {
    __MAXP_COMPANY_ID__?: string;
  }
}

interface TikTokLoginButtonProps {
  companyId?: string;
  redirectPath?: string;
  className?: string;
  label?: string;
}

function resolveCompanyId(companyId?: string): string | null {
  if (companyId && companyId.trim()) {
    return companyId.trim();
  }

  if (typeof window !== "undefined" && window.__MAXP_COMPANY_ID__) {
    return window.__MAXP_COMPANY_ID__;
  }

  const globalCompanyId = getCompanyId();
  if (globalCompanyId) {
    return globalCompanyId;
  }

  try {
    const stored = window.localStorage.getItem("maxp_companyId");
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch {
    return null;
  }

  return null;
}

const TikTokLoginButton: React.FC<TikTokLoginButtonProps> = ({
  companyId,
  redirectPath,
  className = "",
  label = "تسجيل الدخول بحساب TikTok",
}) => {
  const handleClick = () => {
    const resolvedCompanyId = resolveCompanyId(companyId);
    if (!resolvedCompanyId) {
      alert("لا يمكن تحديد المتجر");
      return;
    }
    window.location.href = getTiktokLoginUrl(resolvedCompanyId, redirectPath);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
      style={{ backgroundColor: "#010101" }}
    >
      {label}
    </button>
  );
};

export default TikTokLoginButton;
