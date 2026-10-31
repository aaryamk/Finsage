import { simulateMixedPortfolio, simulateWindfall, type WindfallResult } from './windfall';
import {
  GROUPED_WINDFALL_ASSUMPTIONS as A, GROUPED_WINDFALL_OPTIONS, WINDFALL_RISK_GROUPS,
  type GroupOption, type RiskGroupId,
} from './windfallGroupsConstants';

export type GroupOptionResult = {
  definition: GroupOption;
  result: WindfallResult;
  lossLabel: string;
  tag?: string;
  taxNote: string;
};
export function chanceOfLossLabel(probability: number, deterministic = false): string {
  if (deterministic) return 'None';
  if (probability < .03) return 'Very low';
  return `1 in ${Math.max(1, Math.round(1 / probability))}`;
}
export function groupTimelineWarning(id: RiskGroupId, years: number): string | null {
  if (id === 'medium' && years < 5) return 'Needs 5+ years';
  if (id === 'high' && years < 3) return 'Needs 7+ years';
  return null;
}
const cache = new Map<string, ReturnType<typeof calculateGroups>>();
function calculateGroups(amount: number, years: number, paths: number, seed: number) {
  const options = GROUPED_WINDFALL_OPTIONS.map(definition => {
    const taxSlab = definition.taxExempt ? 0 : A.taxSlab;
    const result = simulateWindfall(amount, definition.model, years, paths, seed + definition.seedOffset, {
      afterTax: true, taxSlab, todayRupees: true,
    });
    const nominal = simulateWindfall(amount, definition.model, years, paths, seed + definition.seedOffset, {
      afterTax: true, taxSlab, todayRupees: false,
    });
    return {
      definition, result,
      lossLabel: chanceOfLossLabel(nominal.horizon.lossProbability, definition.model.volatility === 0),
      tag: definition.id === 'ppf' && years < A.ppfLockYears ? 'Locked till year 15' : definition.tag,
      taxNote: definition.taxExempt ? 'Tax-free; statutory limits and lock-in apply.' : definition.model.taxTreatment === 'slab'
        ? 'Gains taxed at 30%; simplified to exit tax.'
        : 'Equity exit tax; annual ₹1.25 L LTCG allowance.',
    } satisfies GroupOptionResult;
  });
  const groups = WINDFALL_RISK_GROUPS.map(definition => {
    const groupOptions = definition.optionIds.map(id => options.find(option => option.definition.id === id)!);
    const result = simulateMixedPortfolio(amount, groupOptions.map((option, index) => ({
      option: option.definition.model,
      weight: definition.weights[index]!,
      taxExempt: option.definition.taxExempt,
      seedOffset: option.definition.seedOffset,
    })), years, paths, seed, { afterTax: true, taxSlab: A.taxSlab, todayRupees: true });
    return {
      definition, options: groupOptions, result,
      gain: result.horizon.p50 - amount,
      mixAmounts: definition.weights.map(weight => amount * weight),
      warning: groupTimelineWarning(definition.id, years),
    };
  });
  return { amount, years, groups };
}
export function getGroupedWindfall(amount: number, years: number, paths: number = A.paths, seed: number = A.seed) {
  const key = JSON.stringify([amount, years, paths, seed]);
  const hit = cache.get(key);
  if (hit) return hit;
  const result = calculateGroups(amount, years, paths, seed);
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
