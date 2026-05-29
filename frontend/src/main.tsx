import { runAntiCloneProtection } from "./lib/AntiClone";
runAntiCloneProtection();

import { Component, type ReactNode, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "dseg/css/dseg.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0f172a",
            color: "#f8fafc",
            fontFamily: "monospace",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "2rem" }}>⚠️ Runtime Error</div>
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #ef4444",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              maxWidth: "900px",
              width: "100%",
              wordBreak: "break-word",
            }}
          >
            <div
              style={{
                color: "#ef4444",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              {this.state.error.name}: {this.state.error.message}
            </div>
            <pre
              style={{
                color: "#94a3b8",
                fontSize: "0.75rem",
                overflowX: "auto",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root tidak ditemukan");
}

rootElement.innerHTML = "";

try {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
} catch (error) {
  console.error("[NextVWT] Gagal mount React:", error);
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:monospace;padding:24px">
      <div style="max-width:860px;background:#1e293b;border:1px solid #ef4444;border-radius:12px;padding:24px">
        <h1 style="margin-top:0;color:#ef4444">NextVWT gagal dimuat</h1>
        <p>Refresh dengan Ctrl+F5. Jika tetap gagal, kirim Console Chrome.</p>
        <pre style="white-space:pre-wrap;color:#cbd5e1">${String((error as Error)?.stack || error).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c)}</pre>
      </div>
    </div>`;
}
