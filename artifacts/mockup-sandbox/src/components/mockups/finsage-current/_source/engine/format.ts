const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return value === Infinity ? 'Unlimited' : '—';
  return `${value < 0 ? '−' : ''}₹${inr.format(Math.abs(value))}`;
}
export function formatLakhCr(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (magnitude >= 10000000) return `${sign}₹${Number((magnitude / 10000000).toFixed(2))} Cr`;
  if (magnitude >= 100000) return `${sign}₹${Number((magnitude / 100000).toFixed(2))} L`;
  return formatINR(value);
}
