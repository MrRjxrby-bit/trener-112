import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("REACT ERROR:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>Ошибка в приложении</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
            {"\n\n"}
            {String((this.state.error as any).stack || "")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster position="top-right" />
    </ErrorBoundary>
  </React.StrictMode>
);