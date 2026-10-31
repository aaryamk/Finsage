import { describe, expect, it } from 'vitest';
import { simulateMixedPortfolio, simulateWindfall } from './windfall';
import { getGroupedWindfall, chanceOfLossLabel, groupTimelineWarning } from './windfallGroups';
import { GROUPED_WINDFALL_OPTIONS, WINDFALL_RISK_GROUPS } from './windfallGroupsConstants';

describe('simplified Extra Money', () => {
  const result = getGroupedWindfall(200000, 10);

  it('FD and PPF have identical low, likely and high values and no nominal capital loss', () => {
    for (const id of ['fd', 'ppf']) {
      const option = result.groups[0]!.options.find(option => option.definition.id === id)!;
      for (const year of option.result.yearly) {
        expect(year.p10).toBe(year.p50);
        expect(year.p50).toBe(year.p90);
      }
      expect(option.lossLabel).toBe('None');
    }
  });

  it('higher-risk portfolios have higher median and wider range at ten years', () => {
    for (let index = 1; index < result.groups.length; index++) {
      const lower = result.groups[index - 1]!.result.horizon;
      const higher = result.groups[index]!.result.horizon;
      expect(higher.p50).toBeGreaterThan(lower.p50);
      expect(higher.p90 - higher.p10).toBeGreaterThan(lower.p90 - lower.p10);
    }
  });

  it('risk is a presentation choice, not an input into the simulation', () => {
    const original = JSON.stringify(result);
    for (const selection of WINDFALL_RISK_GROUPS) {
      const highlighted = result.groups.filter(group => group.definition.id === selection.id);
      expect(highlighted).toHaveLength(1);
      expect(getGroupedWindfall(200000, 10)).toBe(result);
      expect(JSON.stringify(result)).toBe(original);
    }
  });

  it('all fixed mixes sum to 100%', () => {
    for (const group of WINDFALL_RISK_GROUPS) {
      expect(group.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
      expect(group.optionIds).toHaveLength(3);
    }
  });

  it('aggregates path outcomes, not a weighted average of option medians', () => {
    const medium = result.groups[1]!;
    const weightedMedians = medium.options.reduce((sum, option, index) =>
      sum + option.result.horizon.p50 * medium.definition.weights[index]!, 0);
    expect(Math.abs(medium.result.horizon.p50 - weightedMedians)).toBeGreaterThan(100);
  });

  it('a single mixed component exactly matches the existing simulator', () => {
    const option = GROUPED_WINDFALL_OPTIONS.find(option => option.id === 'hybrid')!.model;
    const settings = { afterTax: true, taxSlab: .3, todayRupees: true };
    const mixed = simulateMixedPortfolio(200000, [{ option, weight: 1, seedOffset: 0 }], 5, 100, 42, settings);
    const single = simulateWindfall(200000, option, 5, 100, 42, settings);
    expect(mixed.horizon).toEqual(single.horizon);
  });

  it('tax-free PPF retains its fixed return before the common inflation adjustment', () => {
    const ppf = result.groups[0]!.options.find(option => option.definition.id === 'ppf')!;
    expect(ppf.result.horizon.p50).toBeCloseTo(200000 * (1.071 / 1.06) ** 10, 5);
    expect(ppf.taxNote).toMatch(/Tax-free/);
  });

  it('shares one equity exemption across portfolio components, rather than granting one per holding', () => {
    const model = { ...GROUPED_WINDFALL_OPTIONS.find(option => option.id === 'hybrid')!.model, volatility: 0 };
    const mixed = simulateMixedPortfolio(200000, [{ option: model, weight: .5 }, { option: model, weight: .5 }], 10, 30, 42, { afterTax: true });
    const single = simulateWindfall(200000, model, 10, 30, 42, { afterTax: true });
    expect(mixed.horizon.p50).toBeCloseTo(single.horizon.p50, 8);
  });

  it('keeps short-horizon and PPF lock-in warnings', () => {
    expect(groupTimelineWarning('medium', 4)).toBe('Needs 5+ years');
    expect(groupTimelineWarning('medium', 5)).toBeNull();
    expect(groupTimelineWarning('high', 2)).toBe('Needs 7+ years');
    expect(getGroupedWindfall(200000, 5, 50).groups[0]!.options[2]!.tag).toBe('Locked till year 15');
    expect(getGroupedWindfall(200000, 15, 50).groups[0]!.options[2]!.tag).toBe('15-yr lock-in');
  });

  it('changing amount and horizon recalculates values and permits zero', () => {
    const short = getGroupedWindfall(50000, 1, 50);
    const long = getGroupedWindfall(500000, 20, 50);
    expect(short.groups[1]!.result.horizon.p50).not.toBe(long.groups[1]!.result.horizon.p50);
    expect(getGroupedWindfall(0, 5, 50).groups.every(group => group.result.horizon.p50 === 0)).toBe(true);
  });

  it('validates weights and horizons rather than silently substituting defaults', () => {
    const option = GROUPED_WINDFALL_OPTIONS[0]!.model;
    expect(() => simulateMixedPortfolio(200000, [{ option, weight: .5 }], 5)).toThrow(/100%/);
    expect(() => simulateMixedPortfolio(200000, [{ option, weight: 1 }], 0)).toThrow(/horizon/);
    expect(() => getGroupedWindfall(-1, 5)).toThrow(/Amount/);
  });

  it('formats loss odds with the required threshold', () => {
    expect(chanceOfLossLabel(.02)).toBe('Very low');
    expect(chanceOfLossLabel(.25)).toBe('1 in 4');
    expect(chanceOfLossLabel(0)).toBe('Very low');
    expect(chanceOfLossLabel(0, true)).toBe('None');
  });
});
