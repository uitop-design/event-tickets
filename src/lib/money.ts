const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: string, locale = "en-GB"): string {
  const key = `${locale}:${currency}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, fmt);
  }
  return fmt.format(cents / 100);
}
