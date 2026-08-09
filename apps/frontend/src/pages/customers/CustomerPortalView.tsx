import { useParams } from "react-router-dom";

import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";
import CustomerAccountDashboard from "../account/CustomerAccountDashboard";

export default function CustomerPortalView() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data, loading, error } = useCustomerLoyaltySummary(customerId);

  return (
    <CustomerAccountDashboard
      data={data}
      loading={loading}
      error={error}
      isAdminView
    />
  );
}
