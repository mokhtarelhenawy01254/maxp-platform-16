import { Navigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuthSimple";
import CustomerWallet from "./CustomerWallet";
import CompanyWallet from "../marketplace/Wallet";

const LoadingState = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center text-gray-600 dark:text-gray-300">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      <p className="mt-4">جاري تحميل المحفظة...</p>
    </div>
  </div>
);

export default function CustomerWalletRouteEntry() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (user?.role !== "CUSTOMER") {
    return <Navigate to="/billing/wallet" replace />;
  }

  return <CustomerWallet />;
}

export function BillingWalletRouteEntry() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (user?.role === "CUSTOMER") {
    return <Navigate to="/wallet" replace />;
  }

  return <CompanyWallet />;
}
