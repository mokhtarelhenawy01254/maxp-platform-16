import { useSearchParams } from "react-router-dom";

export const useAbout = () => {
  const [searchParams] = useSearchParams();
  const companyId =
    searchParams.get("companyId") || localStorage.getItem("currentCompanyId");

  return {
    companyId,
  };
};
