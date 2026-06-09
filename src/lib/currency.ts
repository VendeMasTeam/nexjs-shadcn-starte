export type CurrencyScope = 'platform' | 'tenant';

export interface CurrencyPreferences {
  currency: string;
  locale: string;
}

const STORAGE_KEYS: Record<CurrencyScope, string> = {
  platform: 'crm_currency_platform',
  tenant: 'crm_currency_tenant',
};

const DEFAULT_PREFS: CurrencyPreferences = {
  currency: '',
  locale: '',
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCurrencyPreferences(scope: CurrencyScope = 'tenant'): CurrencyPreferences {
  if (!canUseStorage()) return DEFAULT_PREFS;

  const raw = window.localStorage.getItem(STORAGE_KEYS[scope]);
  if (!raw) return DEFAULT_PREFS;

  try {
    const parsed = JSON.parse(raw) as Partial<CurrencyPreferences>;
    return {
      currency: parsed.currency || DEFAULT_PREFS.currency,
      locale: parsed.locale || DEFAULT_PREFS.locale,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setCurrencyPreferences(
  prefs: Partial<CurrencyPreferences>,
  scope: CurrencyScope = 'tenant'
): CurrencyPreferences {
  const next = { ...getCurrencyPreferences(scope), ...prefs };

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEYS[scope], JSON.stringify(next));
  }

  return next;
}

export function formatCompact(
  value: number,
  options?: {
    scope?: CurrencyScope;
    currency?: string;
    locale?: string;
    currencyDisplay?: 'symbol' | 'code' | 'narrowSymbol' | 'name' | 'codeAndSymbol';
  }
): string {
  const scope = options?.scope ?? 'tenant';
  const prefs = getCurrencyPreferences(scope);
  const currency = options?.currency ?? prefs.currency;
  const locale = options?.locale ?? prefs.locale;

  const display = options?.currencyDisplay;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      currencyDisplay: display === 'codeAndSymbol' ? 'narrowSymbol' : display,
    }).format(value ?? 0);

    if (display === 'codeAndSymbol') {
      return `${currency} ${formatted}`;
    }

    return formatted;
  } catch {
    return `${value ?? 0}`;
  }
}

export function formatCompactNumber(
  value: number,
  options?: { locale?: string; scope?: CurrencyScope }
): string {
  const prefs = getCurrencyPreferences(options?.scope ?? 'tenant');
  const locale = options?.locale ?? prefs.locale;

  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value ?? 0);
  } catch {
    return `${value ?? 0}`;
  }
}

export function formatMoney(
  value: number,
  options?: {
    scope?: CurrencyScope;
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    /** 'symbol' → "$ 1.000" (default) | 'code' → "COP 1.000" | 'narrowSymbol' → "$1.000" */
    currencyDisplay?: 'symbol' | 'code' | 'narrowSymbol' | 'name';
  }
): string {
  const scope = options?.scope ?? 'tenant';
  const prefs = getCurrencyPreferences(scope);
  const currency = options?.currency ?? prefs.currency;
  const locale = options?.locale ?? prefs.locale;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: options?.currencyDisplay ?? 'symbol',
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
    }).format(value ?? 0);
  } catch {
    return `${value ?? 0}`;
  }
}
