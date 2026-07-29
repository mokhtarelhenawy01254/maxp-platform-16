import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";

export function DefaultPageRedirect() {
  const { user } = useAuth();

  let defaultPath = "/apps";

  if (user) {
    try {
      const settings =
        typeof user.settings === "string"
          ? JSON.parse(user.settings)
          : user.settings || {};
      if (settings.defaultPage && settings.defaultPage !== "/apps") {
        defaultPath = settings.defaultPage;
      }
    } catch {
      // ignore parse errors
    }
  }

  return <Navigate to={defaultPath} replace />;
}
