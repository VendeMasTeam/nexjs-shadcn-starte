'use client';

import { Component, type ReactNode } from 'react';
import { notify } from 'src/lib/notify';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error boundary que no bloquea la navegación.
 * - Muestra un toast con el error
 * - Hace auto-reset para que el usuario pueda seguir usando la app
 * - Si el error persiste, se mostrará otro toast (sin bloquear)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error inesperado',
    };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);

    // Clean up any leftover body locks
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    }
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // Cuando se detecta un error, mostrar toast y resetear
    if (this.state.hasError && !prevState.hasError) {
      notify.error('Ocurrió un error en esta sección', {
        description: this.state.errorMessage,
        duration: 5000,
      });

      // Auto-reset para no bloquear la UI
      // Pequeño delay para que React termine el render antes de resetear
      requestAnimationFrame(() => {
        this.setState({ hasError: false, errorMessage: '' });
      });
    }
  }

  render() {
    // Siempre renderizar children — el toast ya informó al usuario.
    // Si el error fue transitorio (ej: dato undefined momentáneo), la UI se recupera sola.
    // Si es persistente, el boundary volverá a capturarlo y mostrará otro toast.
    return this.props.children;
  }
}
