import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../hooks/useAuthSimple";
import CustomerWallet from "./CustomerWallet";

const LoadingState = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center text-gray-500">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-stone-600" />
      <p className="mt-4">جاري تحميل المحفظة...</p>
    </div>
  </div>
);

export default function CustomerWalletRouteEntry() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState />;
  }

  if (user?.role === "CUSTOMER") {
    return <Navigate to={`/account/cashback${location.search}`} state={location.state} replace />;
  }

  if (user?.role !== "CUSTOMER") {
    return <Navigate to={`/payments${location.search}`} state={location.state} replace />;
  }

  return <CustomerWallet />;
}
