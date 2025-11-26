import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * Error Boundary for Workflow pages
 *
 * Catches React errors in workflow run components and displays
 * a user-friendly fallback UI with retry mechanism.
 *
 * Usage:
 * ```tsx
 * <WorkflowErrorBoundary>
 *   <WorkflowRunDetail />
 * </WorkflowErrorBoundary>
 * ```
 */
export class WorkflowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log error with context
    console.error("Workflow Error Boundary caught error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      errorInfo: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An error occurred while rendering the workflow interface
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-md bg-muted p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">
                    {this.state.error.name}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {import.meta.env.DEV &&
                this.state.errorInfo && (
                  <details className="rounded-md bg-muted p-4">
                    <summary className="cursor-pointer font-medium">
                      Component Stack
                    </summary>
                    <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
