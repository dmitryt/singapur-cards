import React from "react";
import { Message, Button } from "semantic-ui-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Message negative>
          <Message.Header>Something went wrong</Message.Header>
          <p>{this.state.error?.message ?? "An unexpected error occurred."}</p>
          <Button size="small" onClick={this.handleReset}>
            Try again
          </Button>
        </Message>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
