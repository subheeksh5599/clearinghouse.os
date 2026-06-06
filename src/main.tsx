import { StrictMode, Component, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "#1a1a1a", color: "#eee", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", padding: "2rem"
        }}>
          <div>
            <h2 style={{ color: "#00ff41", marginBottom: "1rem" }}>ClearingHouse.OS</h2>
            <pre style={{ color: "#ff4444", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
