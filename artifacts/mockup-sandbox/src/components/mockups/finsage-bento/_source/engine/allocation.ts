import { ASSUMPTIONS as A } from './constants';
import { derive } from './profile';
import { corpusRange, fireAge } from './projection';
import type { Allocation, Profile } from './types';

const keys: (keyof Allocation)[] = ['emergency', 'insurance', 'prepayment', 'shortTerm', 'longTerm'];
export function allocationTotal(allocation: Allocation): number {
  return keys.reduce((sum, key) => sum + allocation[key], 0);
}
export function allocationRemaining(allocation: Allocation, surplus: number): number {
  return Math.max(0, surplus - allocationTotal(allocation));
}
export function clampAllocation(allocation: Allocation, surplus: number, hasLoans = true): Allocation {
  let remaining = Math.max(0, surplus);
  const result = { emergency: 0, insurance: 0, prepayment: 0, shortTerm: 0, longTerm: 0 };
  for (const key of keys) {
    result[key] = key === 'prepayment' && !hasLoans ? 0 : Math.min(remaining, Math.max(0, Number.isFinite(allocation[key]) ? allocation[key] : 0));
    remaining -= result[key];
  }
  return result;
}
export function updateBucket(allocation: Allocation, key: keyof Allocation, value: number, surplus: number, hasLoans = true): Allocation {
  const current = clampAllocation(allocation, surplus, hasLoans);
  const available = Math.max(0, surplus - allocationTotal(current) + current[key]);
  return { ...current, [key]: key === 'prepayment' && !hasLoans ? 0 : Math.min(available, Math.max(0, value)) };
}
export function allocationPreset(name: 'safety' | 'balanced' | 'growth', surplus: number, hasLoans = true): Allocation {
  const percentages = { safety: [.4, .1, 0, .2, .3], balanced: [.15, .1, 0, .2, .55], growth: [.05, .1, 0, .1, .75] }[name];
  const result = { emergency: 0, insurance: 0, prepayment: 0, shortTerm: 0, longTerm: 0 };
  keys.forEach((key, i) => { result[key] = Math.max(0, surplus) * percentages[i]!; });
  return clampAllocation(result, surplus, hasLoans);
}
export function monthsToGoal(monthly: number, amount: number): number | null {
  if (amount <= 0) return 0;
  if (monthly <= 0) return null;
  const r = A.cashReturn / 12;
  return Math.ceil(Math.log(1 + amount * r / monthly) / Math.log(1 + r));
}
export function allocationOutcomes(profile: Profile, allocation: Allocation, goalAmount = 300000) {
  const d = derive(profile);
  const safe = clampAllocation(allocation, d.monthlySurplus, profile.existingEMIs > 0);
  const invested = { ...profile, monthlySIP: safe.longTerm };
  let cash = profile.liquidSavings;
  for (let month = 0; month < 12; month++) cash = cash * (1 + A.cashReturn / 12) + safe.emergency;
  return {
    fireAge: fireAge(invested), corpus40: corpusRange(invested, 40), corpus60: corpusRange(invested, 60),
    emergencyMonths12: d.essentialOutflow > 0 ? cash / d.essentialOutflow : Infinity,
    goalMonths: monthsToGoal(safe.shortTerm, goalAmount),
    healthCoverPlanned: safe.insurance > 0,
  };
}
