// Extrae el mensaje más útil de un error de API
// El interceptor en axios.ts ya adjunta error.data = response.data y error.status
export function extractApiError(error: unknown): string {
  const err = error as Error & {
    status?: number;
    data?: { errors?: Record<string, string[]>; message?: string };
  };

  // Un 5xx es una falla no controlada del servidor, no una validación — nunca
  // mostrar el body crudo (puede traer excepciones SQL, stack traces, hosts internos, etc.)
  if (err?.status && err.status >= 500) {
    return 'Ocurrió un error inesperado en el servidor. Intentá de nuevo en unos minutos.';
  }

  // Si tiene errors de validación, juntar el primer mensaje de CADA campo — un solo
  // campo puede perder detalle útil que backend puso en otro (ej. mensaje genérico
  // en un campo + detalle específico de qué falta en otro).
  const errors = err?.data?.errors;
  if (errors) {
    const messages = Object.keys(errors)
      .map((key) => errors[key]?.[0])
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(' · ');
  }

  // Fallback al message general
  return err?.message || 'Ocurrió un error inesperado';
}
