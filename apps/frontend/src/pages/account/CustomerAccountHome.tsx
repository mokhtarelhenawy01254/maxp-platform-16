import { useCustomerLoyaltySummary } from "../../hooks/useCustomerLoyaltySummary";
import CustomerAccountDashboard from "./CustomerAccountDashboard";

export default function CustomerAccountHome() {
  const { data, loading, error } = useCustomerLoyaltySummary();

  return (
    <CustomerAccountDashboard data={data} loading={loading} error={error} />
  );
}
