// Currency codes and Q1 2025 average exchange rates to USD
export const CURRENCY_CONFIG = {
  USA: { code: 'USD', symbol: '$', rate: 1.00, locale: 'en-US' },
  Canada: { code: 'CAD', symbol: 'C$', rate: 1.35, locale: 'en-CA' },
  Mexico: { code: 'MXN', symbol: '₱', rate: 17.25, locale: 'es-MX' },
  UK: { code: 'GBP', symbol: '£', rate: 0.79, locale: 'en-GB' },
  Germany: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
  France: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'fr-FR' },
  Italy: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'it-IT' },
  Spain: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'es-ES' },
  China: { code: 'CNY', symbol: '¥', rate: 7.15, locale: 'zh-CN' },
  Japan: { code: 'JPY', symbol: '¥', rate: 148.50, locale: 'ja-JP' },
  India: { code: 'INR', symbol: '₹', rate: 83.25, locale: 'en-IN' },
  Brazil: { code: 'BRL', symbol: 'R$', rate: 5.10, locale: 'pt-BR' },
  Australia: { code: 'AUD', symbol: 'A$', rate: 1.52, locale: 'en-AU' },
};

export const DEFAULT_CURRENCY = CURRENCY_CONFIG.USA;

export function getCurrencyConfig(country: string) {
  return CURRENCY_CONFIG[country as keyof typeof CURRENCY_CONFIG] || DEFAULT_CURRENCY;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
  locale: string;
}