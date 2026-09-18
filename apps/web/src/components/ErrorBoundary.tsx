/**
 * Catches render-time errors anywhere below it (e.g. an unexpected API shape
 * that slips past apiGet's zod validation) so the app shows a recoverable
 * message instead of a blank white page.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RepOS web crashed while rendering', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main data-testid="app-error" role="alert" className="p-4 text-sm text-red-700">
          Something went wrong showing this page. Reload to try again.
        </main>
      );
    }
    return this.props.children;
  }
}
