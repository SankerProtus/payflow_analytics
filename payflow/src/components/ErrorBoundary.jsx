import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          className="error-fallback"
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "0.5rem",
            margin: "2rem",
          }}
        >
          <h2 style={{ color: "#dc3545", marginBottom: "1rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#6c757d", marginBottom: "1.5rem" }}>
            We're sorry, but something unexpected happened. Please refresh the
            page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && (
            <details style={{ marginTop: "1rem", textAlign: "left" }}>
              <summary>Error Details (Development Mode)</summary>
              <pre
                style={{
                  backgroundColor: "#f8f9fa",
                  padding: "1rem",
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  overflow: "auto",
                }}
              >
                {this.state.error && this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
