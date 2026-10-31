import { ASSUMPTIONS as A } from './constants';
import { emi } from './loan';
import type { FutureProfile, HomeDecision, Profile } from './types';

export function applyHomePurchase(p: Profile, decision: HomeDecision): FutureProfile {
  const { price, downPct, annualRate, years } = decision;
  const cashNeeded = price * (downPct + A.upfrontCosts);
  const principal = price * (1 - downPct);
  const newEMI = emi(principal, annualRate, years);
  const monthlyExpenses = p.monthlyExpenses - p.monthlyRent + price * A.homeMaintenance / 12;
  const newSurplus = p.monthlyTakeHome - monthlyExpenses - p.existingEMIs - newEMI;
  return {
    ...p, liquidSavings: p.liquidSavings - cashNeeded, monthlyExpenses,
    monthlyRent: 0, monthlySIP: Math.min(p.monthlySIP, Math.max(0, newSurplus)),
    newEMI, homeValue: price, loan: { principal, annualRate, years },
    cashNeeded, cashShortfall: Math.max(0, cashNeeded - p.liquidSavings),
  };
}
