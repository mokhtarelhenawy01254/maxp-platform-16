import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { resolvePostAuthDestination } from "../../utils/postAuthRouting";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBack?: boolean;
}

/**
 * Unified "no access" screen used by every route guard. Gives the user a
 * working escape route (their allowed home) instead of a dead-end page.
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "┘à┘à┘å┘ê╪╣ ╪º┘ä┘ê╪╡┘ê┘ä",
  message = "┘ä┘è╪│ ┘ä╪»┘è┘â ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ ┘ä┘ä┘ê╪╡┘ê┘ä ┘ä┘ç╪░┘ç ╪º┘ä╪╡┘ü╪¡╪⌐",
  showBack = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedHome = resolvePostAuthDestination(user);
  // Never offer the page the user is currently denied from ΓÇö avoid a bounce loop.
  const homePath =
    resolvedHome === location.pathname ? "/marketplace" : resolvedHome;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <h3 className="text-red-800 font-semibold mb-2">{title}</h3>
        <p className="text-red-700 mb-4">{message}</p>
        <button
          type="button"
          onClick={() => navigate(homePath, { replace: true })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-2"
        >
          ╪º┘ä╪º┘å╪¬┘é╪º┘ä ┘ä╪╡┘ü╪¡╪¬┘â ╪º┘ä╪▒╪ª┘è╪│┘è╪⌐
        </button>
        {showBack && (
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ╪º┘ä╪╣┘ê╪»╪⌐
          </button>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;
