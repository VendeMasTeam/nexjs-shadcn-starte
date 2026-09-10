import { CurrencyScope, getCurrencyPreferences } from './currency';

/**
 * Parses a date value safely. Handles ISO strings with microsecond precision
 * (6 fractional digits) from Laravel by truncating to milliseconds (3 digits).
 */
function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (!value) return new Date();

  // BUG PREVENTION: date-only strings must be parsed as LOCAL, not UTC.
  //
  // `new Date("2026-07-30")` and `new Date("2026-07-30T00:00:00Z")` both
  // produce midnight UTC. In UTC-3 that becomes 2026-07-29 21:00 local time,
  // so any display function (toLocaleDateString, date-fns format) shows the
  // PREVIOUS day — one day off.
  //
  // The fix: extract YYYY-MM-DD and build the date with new Date(y, m-1, d),
  // which always uses the local timezone. This applies to:
  //   • Pure date strings:  "2026-07-30"
  //   • Laravel date-only:  "2026-07-30T00:00:00.000000Z"  (time is always
  //     midnight UTC because Laravel doesn't store a real hour for date fields)
  //
  // Real timestamps like "2026-07-30T03:06:06.000000Z" have a non-zero time
  // and fall through to the UTC path below — correct behavior for those.

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d+)?Z$/);
  if (dateOnly) {
    const [y, m, d] = dateOnly[1].split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Real timestamps: truncate microseconds → milliseconds
  const safe = value.replace(/\.(\d{3})\d{3}Z$/, '.$1Z');
  return new Date(safe);
}

export { toDate };

/**
 * Returns the number of whole days between a date and now.
 * Always returns a non-negative integer (0 if the date is in the future).
 */
export function diffDays(value: string | number | Date): number {
  const now = Date.now();
  const then = toDate(value).getTime();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

/**
 * Returns the number of whole days between now and a future date.
 * Returns 0 if the date is in the past.
 */
export function daysUntil(value: string | number | Date): number {
  const now = Date.now();
  const then = toDate(value).getTime();
  return Math.max(0, Math.floor((then - now) / 86_400_000));
}

/**
 * Formats a date value as relative time: "Hace 2h", "Hace 3d", etc.
 * Returns "—" if value is null or undefined.
 */
export function formatRelative(value: string | null): string {
  if (!value) return '—';
  const diffMs = Date.now() - toDate(value).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Hace menos de 1h';
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Hace ${diffD}d`;
  return `Hace ${Math.floor(diffD / 30)} mes(es)`;
}

/**
 * Formats a date value using the tenant's (or platform's) locale preference.
 *
 * @example
 * formatDate('2025-03-15')
 * // → "15/03/2025"  (with es-CO locale)
 *
 * formatDate('2025-03-15', { month: 'short' })
 * // → "15 mar. 2025"
 *
 * formatDate('2025-03-15', { month: 'long' })
 * // → "15 de marzo de 2025"
 */
export function formatDate(
  value: string | number | Date,
  options?: {
    /** Scope from which to read locale preferences. Defaults to 'tenant'. */
    scope?: CurrencyScope;
    /** Override locale directly (e.g. 'es-CO'). Skips preferences lookup. */
    locale?: string;
    day?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    year?: 'numeric' | '2-digit';
  }
): string {
  const scope = options?.scope ?? 'tenant';
  const prefs = getCurrencyPreferences(scope);
  const locale = options?.locale ?? prefs.locale;

  const date = toDate(value);

  try {
    return date.toLocaleDateString(locale, {
      day: options?.day ?? '2-digit',
      month: options?.month ?? '2-digit',
      year: options?.year ?? 'numeric',
    });
  } catch {
    return String(value);
  }
}

/**
 * Formats a time value using the tenant's locale preference.
 */
export function formatTime(
  value: string | number | Date,
  options?: {
    scope?: CurrencyScope;
    locale?: string;
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
  }
): string {
  const scope = options?.scope ?? 'tenant';
  const prefs = getCurrencyPreferences(scope);
  const locale = options?.locale ?? prefs.locale;
  const date = toDate(value);

  try {
    return date.toLocaleTimeString(locale, {
      hour: options?.hour ?? '2-digit',
      minute: options?.minute ?? '2-digit',
      second: options?.second,
    });
  } catch {
    return String(value);
  }
}

/**
 * Formats a date and time value using the tenant's locale preference.
 */
export function formatDateTime(
  value: string | number | Date,
  options?: {
    scope?: CurrencyScope;
    locale?: string;
    day?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    year?: 'numeric' | '2-digit';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
  }
): string {
  const scope = options?.scope ?? 'tenant';
  const prefs = getCurrencyPreferences(scope);
  const locale = options?.locale ?? prefs.locale;
  const date = toDate(value);

  try {
    return date.toLocaleString(locale, {
      day: options?.day ?? '2-digit',
      month: options?.month ?? '2-digit',
      year: options?.year ?? 'numeric',
      hour: options?.hour ?? '2-digit',
      minute: options?.minute ?? '2-digit',
    });
  } catch {
    return String(value);
  }
}
