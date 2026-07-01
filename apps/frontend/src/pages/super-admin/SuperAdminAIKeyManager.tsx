import React from "react";

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
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => { setOk(true); }, []);
  return React.createElement("div", { className: "p-4" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "AI Key Manager"),
    React.createElement("p", null, `Status: ${ok ? "✅ Working" : "⏳ Loading..."}`),
  );
};

const SuperAdminAIKeyManager = () => {
  return React.createElement(KeyManagerErrorBoundary, null,
    React.createElement(Inner, null)
  );
};

export default SuperAdminAIKeyManager;
