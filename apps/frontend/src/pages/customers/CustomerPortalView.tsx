import { useParams } from "react-router-dom";

import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";
import CustomerAccountDashboard from "../account/CustomerAccountDashboard";

export default function CustomerPortalView() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useCustomerLoyaltySummary(id);

  return (
    <CustomerAccountDashboard
      data={data}
      loading={loading}
      error={error}
      isAdminView
    />
  );
}
