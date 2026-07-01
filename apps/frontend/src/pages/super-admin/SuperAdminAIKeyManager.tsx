import React from "react";
import tokenManager from "../../utils/tokenManager";

class KeyManagerErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("🔴 KMEB caught:", error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return React.createElement("div", { className: "p-8" },
        React.createElement("h2", { className: "text-xl font-bold text-red-600" }, "Error Caught"),
        React.createElement("pre", { className: "mt-4 text-sm whitespace-pre-wrap max-w-full overflow-auto bg-gray-100 p-4 rounded" },
          `Message: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}`
        )
      );
    }
    return this.props.children;
  }
}

const Inner = () => {
  const getAuthHeaders = React.useCallback(
    (extra: Record<string, string> = {}) => tokenManager.createAuthHeaders(extra), []
  );

  const [ok, setOk] = React.useState(false);
  const [count, setCount] = React.useState(0);
  React.useEffect(() => { setOk(true); setCount(c => c + 1); }, []);

  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement("p", null, `Status: ${ok ? "✅ Working" : "⏳ Loading..."} (${count})`),
    React.createElement("p", null, `Headers: ${getAuthHeaders() ? "ok" : "no"}`),
  );
};

const SuperAdminAIKeyManager = () => {
  return React.createElement(KeyManagerErrorBoundary, null,
    React.createElement(Inner, null)
  );
};

export default SuperAdminAIKeyManager;
