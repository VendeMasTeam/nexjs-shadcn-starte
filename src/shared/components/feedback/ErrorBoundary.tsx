'use client';

import { Component, type ReactNode } from 'react';
import { notify } from 'src/lib/notify';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  retries: number;
}

const MAX_AUTO_RETRIES = 3;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '', retries: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: error?.message || 'Error inesperado' };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    }
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (!this.state.hasError || prevState.hasError) return;

    const nextRetries = prevState.retries + 1;

    if (nextRetries <= MAX_AUTO_RETRIES) {
      notify.error('Ocurrió un error en esta sección', {
        description: this.state.errorMessage,
        duration: 4000,
      });

      requestAnimationFrame(() => {
        this.setState({ hasError: false, errorMessage: '', retries: nextRetries });
      });
    }
    // si superó MAX_AUTO_RETRIES, no resetea → muestra el fallback
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', retries: 0 });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.retries >= MAX_AUTO_RETRIES) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
            <p className="text-2xl font-semibold text-foreground">Algo salió mal</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Esta sección encontró un error. Podés volver atrás o navegar a otra sección desde el
              menú lateral.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 max-w-sm font-mono">
                {this.state.errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-2 text-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
            >
              Reintentar
            </button>
          </div>
        );
      }
      // Waiting for componentDidUpdate to trigger the auto-retry — render nothing
      // to avoid re-throwing during render and blocking componentDidUpdate
      return null;
    }

    return this.props.children;
  }
}
