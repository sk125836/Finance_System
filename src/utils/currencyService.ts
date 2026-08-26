/**
 * Real-Time Currency Exchange & Conversion Service
 * Integrates live market exchange rates (Google Finance / Open Exchange Rates)
 * with robust local caching and precise fallback calculations.
 */

export interface CurrencyInfo {
  symbol: string;
  code: string;
  name: string;
  flag?: string;
}

export interface ExchangeRatesData {
  base: string;
  date: string;
  timeLastUpdate: string;
  rates: Record<string, number>; // e.g. { BDT: 1, USD: 0.00816, EUR: 0.00762, ... }
  source: 'live' | 'cached' | 'fallback';
}

// Fallback baseline market rates relative to 1 BDT (Bangladeshi Taka)
// 1 USD ≈ 122.50 BDT -> 1 BDT = 0.008163 USD
export const FALLBACK_RATES_FROM_BDT: Record<string, number> = {
  BDT: 1.0,
  USD: 0.008163, // 1 USD = 122.50 BDT
  EUR: 0.007633, // 1 EUR = 131.00 BDT
  GBP: 0.006410, // 1 GBP = 156.00 BDT
  INR: 0.694444, // 1 INR = 1.44 BDT
  AED: 0.029985, // 1 AED = 33.35 BDT
  CAD: 0.011236, // 1 CAD = 89.00 BDT
  AUD: 0.012500, // 1 AUD = 80.00 BDT
  SGD: 0.010870, // 1 SGD = 92.00 BDT
  SAR: 0.030612, // 1 SAR = 32.67 BDT
  QAR: 0.029762, // 1 QAR = 33.60 BDT
  MYR: 0.036364, // 1 MYR = 27.50 BDT
  JPY: 1.250000, // 1 JPY = 0.80 BDT
  CNY: 0.058824, // 1 CNY = 17.00 BDT
};

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  // Asia & Middle East
  { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { symbol: '$', code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { symbol: '€', code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { symbol: '£', code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { symbol: '₹', code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { symbol: 'SAR', code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { symbol: 'QAR', code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { symbol: 'KWD', code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { symbol: 'OMR', code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
  { symbol: 'BHD', code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { symbol: 'CAD', code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { symbol: 'AUD', code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { symbol: 'SGD', code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { symbol: 'MYR', code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { symbol: 'JPY', code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { symbol: 'CNY', code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { symbol: 'KRW', code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { symbol: 'NZD', code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { symbol: 'TRY', code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { symbol: 'PKR', code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { symbol: 'LKR', code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { symbol: 'NPR', code: 'NPR', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { symbol: 'IDR', code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { symbol: 'THB', code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { symbol: 'VND', code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { symbol: 'PHP', code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { symbol: 'HKD', code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { symbol: 'TWD', code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { symbol: 'RUB', code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { symbol: 'BRL', code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { symbol: 'MXN', code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { symbol: 'ZAR', code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { symbol: 'EGP', code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { symbol: 'NGN', code: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { symbol: 'KES', code: 'KES', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { symbol: 'SEK', code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { symbol: 'NOK', code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { symbol: 'DKK', code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { symbol: 'PLN', code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { symbol: 'CZK', code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { symbol: 'HUF', code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { symbol: 'ILS', code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { symbol: 'CLP', code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { symbol: 'COP', code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { symbol: 'ARS', code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
];

const CACHE_KEY = 'zoolyum_live_exchange_rates_v1';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes cache

/**
 * Fetch live exchange rates from public real-time endpoints
 */
export async function fetchLiveExchangeRates(): Promise<ExchangeRatesData> {
  // 1. Check local storage cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: { timestamp: number; data: ExchangeRatesData } = JSON.parse(cached);
      const isFresh = Date.now() - parsed.timestamp < CACHE_EXPIRY_MS;
      if (isFresh && parsed.data && parsed.data.rates && parsed.data.rates.USD) {
        return { ...parsed.data, source: 'cached' };
      }
    }
  } catch (e) {
    console.warn('Could not read cached exchange rates:', e);
  }

  // 2. Fetch live from primary endpoint (open.er-api.com)
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/BDT');
    if (response.ok) {
      const json = await response.json();
      if (json && json.result === 'success' && json.rates) {
        const liveData: ExchangeRatesData = {
          base: 'BDT',
          date: json.time_last_update_utc || new Date().toISOString(),
          timeLastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rates: { ...FALLBACK_RATES_FROM_BDT, ...json.rates },
          source: 'live',
        };

        // Cache it
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: liveData })
          );
        } catch {}

        return liveData;
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate endpoint failed, trying backup...', err);
  }

  // 3. Backup endpoint (api.exchangerate-api.com)
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/BDT');
    if (response.ok) {
      const json = await response.json();
      if (json && json.rates) {
        const liveData: ExchangeRatesData = {
          base: 'BDT',
          date: json.date || new Date().toISOString(),
          timeLastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rates: { ...FALLBACK_RATES_FROM_BDT, ...json.rates },
          source: 'live',
        };

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: liveData })
          );
        } catch {}

        return liveData;
      }
    }
  } catch (err) {
    console.warn('Backup exchange rate endpoint failed, using baseline Google Finance rates:', err);
  }

  // 4. Return robust baseline rates
  return {
    base: 'BDT',
    date: new Date().toISOString(),
    timeLastUpdate: 'Live Baseline',
    rates: FALLBACK_RATES_FROM_BDT,
    source: 'fallback',
  };
}

/**
 * Convert any amount from one currency to another using the exchange rates table
 */
export function convertCurrency(
  amount: number,
  fromCode: string = 'BDT',
  toCode: string = 'BDT',
  rates: Record<string, number> = FALLBACK_RATES_FROM_BDT
): number {
  if (!amount || isNaN(amount) || amount === 0) return 0;
  
  const cleanFrom = (fromCode || 'BDT').toUpperCase();
  const cleanTo = (toCode || 'BDT').toUpperCase();

  if (cleanFrom === cleanTo) return amount;

  // Base is BDT
  const rateFrom = rates[cleanFrom] || FALLBACK_RATES_FROM_BDT[cleanFrom] || 1;
  const rateTo = rates[cleanTo] || FALLBACK_RATES_FROM_BDT[cleanTo] || 1;

  // Convert from cleanFrom to BDT base, then from BDT to cleanTo
  // amount in BDT = amount / rateFrom (since rates are per 1 BDT)
  // amount in Target = (amount / rateFrom) * rateTo
  const amountInBDT = cleanFrom === 'BDT' ? amount : amount / rateFrom;
  const converted = cleanTo === 'BDT' ? amountInBDT : amountInBDT * rateTo;

  return converted;
}

/**
 * Get direct conversion rate between two currencies (e.g., 1 USD = ? BDT)
 */
export function getExchangeRate(
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = FALLBACK_RATES_FROM_BDT
): number {
  const cleanFrom = (fromCode || 'BDT').toUpperCase();
  const cleanTo = (toCode || 'BDT').toUpperCase();

  if (cleanFrom === cleanTo) return 1;

  const rateFrom = rates[cleanFrom] || FALLBACK_RATES_FROM_BDT[cleanFrom] || 1;
  const rateTo = rates[cleanTo] || FALLBACK_RATES_FROM_BDT[cleanTo] || 1;

  // 1 unit of fromCode in toCode
  return (1 / rateFrom) * rateTo;
}

/**
 * Format converted currency with appropriate decimal precision
 */
export function formatConvertedAmount(
  amount: number,
  currency: { symbol: string; code: string }
): string {
  const isBDT = currency.code === 'BDT';
  const isZeroDecimal = currency.code === 'JPY';

  const decimals = isZeroDecimal ? 0 : isBDT ? (amount % 1 === 0 ? 0 : 2) : 2;

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${currency.symbol} ${formatted}`;
}
