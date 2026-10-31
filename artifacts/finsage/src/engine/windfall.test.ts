import { describe, expect, it } from 'vitest';
import {
  addWindfallToProfile, compareWindfall, emergencyBuffer, equityTax,
  seededRandom, simulateWindfall, swpPlan, taxAtExit, withdrawalBounds,
} from './windfall';
import { DEFAULT_PROFILE } from './constants';
import { WINDFALL_OPTIONS } from './windfallConstants';

describe('Extra Money required acceptance tests', () => {
  it('same inputs and seed produce exactly identical output', () => {
    const first = simulateWindfall(200000, 'index_lump', 5, 2000, 42, { afterTax: true, taxSlab: .3 });
    const second = simulateWindfall(200000, 'index_lump', 5, 2000, 42, { afterTax: true, taxSlab: .3 });
    expect(first).toEqual(second);
    const randomA = seededRandom(42), randomB = seededRandom(42);
    expect(Array.from({ length: 10 }, randomA)).toEqual(Array.from({ length: 10 }, randomB));
    expect(simulateWindfall(200000, 'index_lump', 5, 2000, 43).horizon.p50).not.toBe(first.horizon.p50);
  });
  it('FD has no range, no nominal loss and the specified annual growth', () => {
    const fd = simulateWindfall(200000, 'fd', 5);
    for (const year of fd.yearly) {
      expect(year.p10).toBe(year.p50);
      expect(year.p50).toBe(year.p90);
      expect(year.lossProbability).toBe(0);
      expect(year.p50).toBeCloseTo(200000 * 1.0675 ** year.year, 5);
    }
  });
  it('equity loss probability decreases from 1 to 5 to 10 years', () => {
    const equity = simulateWindfall(200000, 'index_lump', 10);
    expect(equity.yearly[0]!.lossProbability).toBeGreaterThan(equity.yearly[4]!.lossProbability);
    expect(equity.yearly[4]!.lossProbability).toBeGreaterThan(equity.yearly[9]!.lossProbability);
  });
  it('equity LTCG grants ₹1.25 lakh exemption, then taxes at 12.5%', () => {
    expect(equityTax(100000, 24)).toBe(0);
    expect(equityTax(225000, 24)).toBe(12500);
    expect(taxAtExit(225000, 'index_lump', 24)).toBe(12500);
    expect(taxAtExit(225000, 'stocks', 24)).toBe(12500);
    expect(taxAtExit(225000, 'hybrid', 24)).toBe(12500);
    expect(equityTax(100000, 12)).toBe(20000);
    expect(equityTax(100000, 13)).toBe(0);
  });
  it('zero-volatility STP earns liquid returns on all money while parked', () => {
    const original = WINDFALL_OPTIONS.find(option => option.id === 'index_stp')!;
    const sameRate = { ...original, expectedReturn: .065, volatility: 0 };
    const result = simulateWindfall(200000, sameRate, 5, 30);
    // Equal liquid and equity rates must equal a fully invested deterministic account.
    expect(result.horizon.p50).toBeCloseTo(200000 * 1.065 ** 5, 5);
    expect(result.horizon.p10).toBe(result.horizon.p90);
    const higherReturn = simulateWindfall(200000, { ...original, expectedReturn: .11, volatility: 0 }, 1, 30);
    const q = 1.065 ** (1 / 12), f = 1.11 ** (1 / 12), transfer = 200000 / 12;
    let parked = 200000, deployed = 0;
    for (let month = 1; month <= 12; month++) {
      deployed *= f;
      parked *= q;
      parked -= transfer;
      deployed += transfer;
    }
    expect(higherReturn.horizon.p50).toBeCloseTo(parked + deployed, 5);
    expect(higherReturn.horizon.p50).toBeLessThan(200000 * 1.11);
    expect(higherReturn.horizon.p50).toBeGreaterThan(200000 * 1.065);
  });
  it('SWP zero withdrawal lasts forever and oversized withdrawal lasts under one month', () => {
    const zero = swpPlan(200000, 0, 'liquid', { paths: 100 });
    expect(zero.monthsP50).toBe(Infinity);
    expect(zero.monthsP10).toBe(Infinity);
    const depleted = swpPlan(200000, 400000, 'liquid', { paths: 100 });
    expect(depleted.monthsP50).toBeLessThan(1);
    expect(depleted.monthsP10).toBeLessThan(1);
    expect(depleted.yearly[1]!.p50).toBe(0);
  });
});

describe('Extra Money boundaries and integration math', () => {
  it('tax views preserve gross outcomes and lower taxable exit values', () => {
    const before = simulateWindfall(200000, 'fd', 5, 100, 42);
    const after = simulateWindfall(200000, 'fd', 5, 100, 42, { afterTax: true, taxSlab: .3 });
    expect(after.horizon.p50).toBeCloseTo(200000 + (before.horizon.p50 - 200000) * .7, 5);
    expect(after.horizon.p50).toBeLessThan(before.horizon.p50);
    expect(taxAtExit(-1000, 'fd', 12, .3)).toBe(0);
    expect(taxAtExit(100000, 'liquid', 24, .3)).toBe(30000);
  });
  it('STP tax views include parking gains and never add value through taxes', () => {
    const before = simulateWindfall(200000, 'index_stp', 5, 100);
    const after = simulateWindfall(200000, 'index_stp', 5, 100, 42, { afterTax: true, taxSlab: .3 });
    expect(after.horizon.p50).toBeLessThanOrEqual(before.horizon.p50);
    const zeroSlab = simulateWindfall(200000, 'index_stp', 1, 100, 42, { afterTax: true, taxSlab: 0 });
    expect(zeroSlab.horizon.p50).toBeLessThanOrEqual(simulateWindfall(200000, 'index_stp', 1, 100).horizon.p50);
  });
  it('shows inflation-adjusted values rather than just relabeling nominal values', () => {
    const nominal = simulateWindfall(200000, 'index_lump', 5, 100);
    const real = simulateWindfall(200000, 'index_lump', 5, 100, 42, { todayRupees: true });
    expect(real.horizon.p50).toBeCloseTo(nominal.horizon.p50 / 1.06 ** 5, 5);
    expect(real.horizon.lossProbability).toBeGreaterThanOrEqual(nominal.horizon.lossProbability);
  });
  it('returns ordered percentile summaries for every year and matches the chosen horizon', () => {
    const result = simulateWindfall(200000, 'stocks', 15, 100);
    expect(result.yearly).toHaveLength(20);
    expect(result.horizon).toEqual(result.yearly[14]);
    for (const point of result.yearly) {
      expect(point.p10).toBeLessThanOrEqual(point.p25);
      expect(point.p25).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p75);
      expect(point.p75).toBeLessThanOrEqual(point.p90);
      expect(point.lossProbability).toBeGreaterThanOrEqual(0);
      expect(point.lossProbability).toBeLessThanOrEqual(1);
    }
  });
  it('computes doubling and low-loss milestones from actual results', () => {
    const result = simulateWindfall(200000, 'fd', 5, 20);
    expect(result.yearsToDouble).toBeCloseTo(Math.log(2) / Math.log(1.0675), 1);
    expect(result.firstLowLossYear).toBe(1);
  });
  it('sorts comparisons by actual median and derives comfort labels', () => {
    const calm = compareWindfall(200000, 1, {}, 'calm');
    expect(calm).toHaveLength(6);
    for (let i = 1; i < calm.length; i++) expect(calm[i - 1]!.horizon.p50).toBeGreaterThanOrEqual(calm[i]!.horizon.p50);
    expect(calm.find(row => row.option.id === 'fd')!.fitsTimeline).toBe(true);
    expect(calm.find(row => row.option.id === 'stocks')!.fitsTimeline).toBe(false);
    expect(calm.find(row => row.option.id === 'stocks')!.riskier).toBe(true);
  });
  it('buffers only the available amount and preserves the original profile', () => {
    const profile = { ...DEFAULT_PROFILE, liquidSavings: 100000 };
    const buffer = emergencyBuffer(profile, 50000);
    expect(buffer.gap).toBe(230000);
    expect(buffer.useAmount).toBe(50000);
    expect(buffer.remaining).toBe(0);
    const withBuffer = addWindfallToProfile(profile, buffer.useAmount, 'savings');
    expect(withBuffer.liquidSavings).toBe(150000);
    expect(profile.liquidSavings).toBe(100000);
    expect(emergencyBuffer(DEFAULT_PROFILE, 200000).useAmount).toBe(0);
  });
  it('adds money atomically to the chosen profile bucket only', () => {
    const savings = addWindfallToProfile(DEFAULT_PROFILE, 200000, 'savings');
    const investments = addWindfallToProfile(DEFAULT_PROFILE, 200000, 'investments');
    expect(savings.liquidSavings).toBe(2000000);
    expect(savings.investedCorpus).toBe(DEFAULT_PROFILE.investedCorpus);
    expect(investments.investedCorpus).toBe(800000);
    expect(investments.liquidSavings).toBe(DEFAULT_PROFILE.liquidSavings);
    expect(DEFAULT_PROFILE.liquidSavings).toBe(1800000);
  });
  it('deferred SWP grows before withdrawals and returns full yearly paths', () => {
    const immediate = swpPlan(200000, 1000, 'fd', { paths: 20 });
    const deferred = swpPlan(200000, 1000, 'fd', { paths: 20, startAfterYears: 5 });
    expect(deferred.yearly).toHaveLength(31);
    expect(deferred.yearly[0]!.p50).toBeCloseTo(200000 * 1.0675 ** 5, 5);
    expect(deferred.safeMonthlyWithdrawal).toBeGreaterThan(immediate.safeMonthlyWithdrawal);
    expect(immediate.fdMonthlyIncome).toBe(1125);
    expect(swpPlan(200000, 1000, 'fd', { paths: 20, afterTax: true, taxSlab: .3 }).fdMonthlyIncome).toBe(787.5);
  });
  it('safe monthly withdrawal survives twenty years in at least 90% of paths', () => {
    const first = swpPlan(200000, 1000, 'hybrid', { paths: 200, seed: 12, afterTax: true });
    const safe = swpPlan(200000, first.safeMonthlyWithdrawal, 'hybrid', { paths: 200, seed: 12, afterTax: true });
    expect(safe.monthsP10).toBeGreaterThanOrEqual(240);
    expect(first.safeMonthlyWithdrawal).toBeGreaterThan(0);
  });
  it('validates invalid inputs and handles empty corpus', () => {
    expect(() => simulateWindfall(-1, 'fd', 5)).toThrow();
    expect(() => simulateWindfall(100, 'fd', 0)).toThrow();
    expect(() => simulateWindfall(100, 'fd', 5, 0)).toThrow();
    expect(simulateWindfall(0, 'fd', 5, 5).horizon.p50).toBe(0);
    expect(simulateWindfall(0, 'fd', 5, 5).yearsToDouble).toBeNull();
    expect(swpPlan(0, 0, 'liquid', { paths: 10 }).safeMonthlyWithdrawal).toBe(0);
    expect(withdrawalBounds(200000)).toEqual({ min: 1000, max: 4000 });
    expect(withdrawalBounds(0)).toEqual({ min: 0, max: 0 });
  });
});
