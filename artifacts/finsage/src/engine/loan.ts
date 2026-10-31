export function emi(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const months = years * 12;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const growth = (1 + r) ** months;
  return principal * r * growth / (growth - 1);
}
export function outstandingBalance(principal: number, annualRate: number, years: number, months: number): number {
  if (principal <= 0 || years <= 0 || months >= years * 12) return 0;
  const elapsed = Math.max(0, months);
  if (annualRate === 0) return principal * (1 - elapsed / (years * 12));
  const r = annualRate / 12;
  const growth = (1 + r) ** (years * 12);
  return Math.max(0, principal * (growth - (1 + r) ** elapsed) / (growth - 1));
}
