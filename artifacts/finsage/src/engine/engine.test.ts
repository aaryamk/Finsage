import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE as p, ASSUMPTIONS as A } from './constants';
import { emi, outstandingBalance } from './loan';
import { applyHomePurchase } from './decision';
import { derive } from './profile';
import { runXRay } from './xray';
import { allocationOutcomes, allocationPreset, allocationTotal, clampAllocation, monthsToGoal, updateBucket } from './allocation';
import { formatINR, formatLakhCr } from './format';
import { corpusRange, fireAge, netWorthTimeline } from './projection';

const home = (price: number) => applyHomePurchase(p, { price, downPct: .2, annualRate: .085, years: 20 });

describe('PRD section 9 acceptance tests', () => {
  it('1. ₹60 lakh loan at 8.5% for 20 years has EMI ₹52,069 ±1', () => {
    expect(Math.abs(emi(6000000, .085, 20) - 52069)).toBeLessThanOrEqual(1);
  });
  it('2. ₹1 crore purchase needs ₹27 lakh upfront and is ₹9 lakh short', () => {
    expect(home(10000000).cashNeeded).toBeCloseTo(2700000, 5);
    expect(home(10000000).cashShortfall).toBeCloseTo(900000, 5);
    expect(formatINR(home(10000000).cashShortfall)).toBe('₹9,00,000');
  });
  it('3. ₹55 lakh purchase has ₹14.85 lakh upfront, ₹3.15 lakh left, ₹38,185 EMI and 4.6 months buffer', () => {
    const future = home(5500000);
    expect(future.cashNeeded).toBeCloseTo(1485000, 5);
    expect(future.liquidSavings).toBeCloseTo(315000, 5);
    expect(Math.abs(future.newEMI - 38185)).toBeLessThanOrEqual(1);
    expect(derive(future).emergencyMonths).toBeCloseTo(4.6, 1);
    expect(runXRay(future).find(f => f.id === 'emergency')?.status).toBe('watch');
  });
  it('4. ₹40 lakh purchase leaves ₹7.2 lakh and 12.3 months buffer', () => {
    const future = home(4000000);
    expect(future.liquidSavings).toBeCloseTo(720000, 5);
    expect(derive(future).emergencyMonths).toBeCloseTo(12.3, 1);
    expect(runXRay(future).find(f => f.id === 'emergency')?.status).toBe('strong');
  });
  it('5. sample X-Ray findings use actual persona numbers and correct statuses', () => {
    const findings = runXRay(p);
    const status = (id: string) => findings.find(f => f.id === id)?.status;
    expect(derive(p).emergencyMonths).toBeCloseTo(32.7, 1);
    expect(status('emergency')).toBe('strong');
    expect(status('idle')).toBe('watch');
    expect(Math.round(derive(p).savingsRate * 100)).toBe(54);
    expect(status('savings')).toBe('strong');
    expect(derive(p).unallocated).toBe(35000);
    expect(status('unallocated')).toBe('watch');
    expect(status('health')).toBe('act');
    expect(status('life')).toBe('strong');
    expect(findings).toHaveLength(8);
  });
  it('6. increasing home price never increases buffer or surplus', () => {
    let previous = derive(home(3000000));
    for (let price = 3500000; price <= 15000000; price += 500000) {
      const next = derive(home(price));
      expect(next.emergencyMonths).toBeLessThanOrEqual(previous.emergencyMonths);
      expect(next.monthlySurplus).toBeLessThanOrEqual(previous.monthlySurplus);
      previous = next;
    }
  });
  it('7. allocation never exceeds available surplus', () => {
    for (const surplus of [-1000, 0, 1500, 65000, 120000]) {
      let allocation = allocationPreset('balanced', surplus, false);
      for (const key of ['emergency', 'insurance', 'prepayment', 'shortTerm', 'longTerm'] as const) {
        allocation = updateBucket(allocation, key, 99999999, surplus, false);
        expect(allocationTotal(allocation)).toBeLessThanOrEqual(Math.max(0, surplus) + 1e-8);
        expect(allocation.prepayment).toBe(0);
      }
    }
  });
  it('8. formats money using Indian digit groups and crore units', () => {
    expect(formatINR(1485000)).toBe('₹14,85,000');
    expect(formatLakhCr(12000000)).toBe('₹1.2 Cr');
    expect(formatLakhCr(1485000)).toBe('₹14.85 L');
  });
});

describe('engine edge cases and linked outcomes', () => {
  it('handles zero-interest loans and maturity', () => {
    expect(emi(120000, 0, 1)).toBe(10000);
    expect(outstandingBalance(120000, 0, 1, 6)).toBe(60000);
    expect(outstandingBalance(120000, .085, 1, 12)).toBe(0);
    expect(outstandingBalance(120000, .085, 1, 0)).toBeCloseTo(120000);
    expect(emi(0, .085, 20)).toBe(0);
  });
  it('retains impossible-purchase risk rather than hiding negative cash', () => {
    const future = home(10000000);
    expect(future.liquidSavings).toBeLessThan(0);
    expect(derive(future).emergencyMonths).toBeLessThan(0);
    expect(runXRay(future).find(f => f.id === 'emergency')?.status).toBe('act');
  });
  it('uses owner maintenance, removes rent and adjusts the sustainable SIP', () => {
    const future = home(5500000);
    expect(future.monthlyRent).toBe(0);
    expect(future.monthlyExpenses).toBeCloseTo(30000 + 5500000 * A.homeMaintenance / 12);
    expect(future.monthlySIP).toBeLessThanOrEqual(Math.max(0, derive(future).monthlySurplus));
  });
  it('uses the same X-Ray logic for current and future profiles', () => {
    expect(runXRay(p).map(f => f.id)).toEqual(runXRay(home(5500000)).map(f => f.id));
  });
  it('marks life cover according to dependents and coverage', () => {
    const status = (cover: number) => runXRay({ ...p, dependents: 1, termCover: cover }).find(f => f.id === 'life')?.status;
    expect(status(0)).toBe('act');
    expect(status(500000)).toBe('watch');
    expect(status(p.monthlyTakeHome * 120)).toBe('strong');
  });
  it('supports no-income and zero-outflow profiles without NaN', () => {
    const empty = { ...p, monthlyTakeHome: 0, monthlyExpenses: 0, monthlyRent: 0, monthlySIP: 0 };
    expect(derive(empty).emergencyMonths).toBe(Infinity);
    expect(runXRay(empty)).toHaveLength(8);
    expect(runXRay(empty).every(f => !f.evidence.includes('NaN'))).toBe(true);
  });
  it('projects monthly contribution timing and a step-up after twelve contributions', () => {
    const profile = { ...p, age: 39, investedCorpus: 0, monthlySIP: 1000, sipStepUpPct: 10 };
    const expected = 1000 * (((1 + .1 / 12) ** 12 - 1) / (.1 / 12));
    expect(corpusRange(profile, 40).base).toBeCloseTo(expected, 5);
  });
  it('corpus ranges are ordered and past target ages do not project backwards', () => {
    const range = corpusRange(p, 60);
    expect(range.pess).toBeLessThan(range.base);
    expect(range.base).toBeLessThan(range.opt);
    expect(corpusRange({ ...p, age: 50 }, 40)).toEqual({ pess: 0, base: 0, opt: 0 });
  });
  it('FIRE is already achieved at the target and unreachable without savings', () => {
    expect(fireAge({ ...p, investedCorpus: p.monthlyExpenses * 12 * 30 })).toBe(p.age);
    expect(fireAge({ ...p, investedCorpus: 0, monthlySIP: 0 })).toBe('70+');
  });
  it('net worth starts with home equity and ends at age 70', () => {
    const future = home(5500000);
    const timeline = netWorthTimeline(future);
    expect(timeline[0]?.netWorth).toBeCloseTo(future.liquidSavings + future.investedCorpus + future.homeValue - future.loan.principal);
    expect(timeline.at(-1)?.age).toBe(70);
    expect(timeline.every(point => Number.isFinite(point.netWorth))).toBe(true);
  });
  it('all three presets allocate the specified percentages', () => {
    for (const name of ['safety', 'balanced', 'growth'] as const) {
      expect(allocationTotal(allocationPreset(name, 65000, false))).toBeCloseTo(65000);
    }
    expect(allocationPreset('growth', 65000, false).longTerm).toBe(48750);
    expect(clampAllocation({ emergency: -100, insurance: NaN, prepayment: 10, shortTerm: 0, longTerm: 100 }, 50, false)).toEqual({ emergency: 0, insurance: 0, prepayment: 0, shortTerm: 0, longTerm: 50 });
  });
  it('allocation outcomes use long-term SIP and only plan insurance, not buy it', () => {
    const allocation = allocationPreset('growth', 65000, false);
    const outcomes = allocationOutcomes(p, allocation);
    expect(outcomes.fireAge).toEqual(fireAge({ ...p, monthlySIP: allocation.longTerm }));
    expect(outcomes.emergencyMonths12).toBeGreaterThan(derive(p).emergencyMonths);
    expect(outcomes.healthCoverPlanned).toBe(true);
    expect(p.healthCoverPersonal).toBe(0);
    expect(outcomes.goalMonths).toBeGreaterThan(0);
  });
  it('goal timing handles zero contributions and includes cash interest', () => {
    expect(monthsToGoal(0, 300000)).toBeNull();
    expect(monthsToGoal(1000, 0)).toBe(0);
    expect(monthsToGoal(10000, 300000)).toBeLessThanOrEqual(30);
  });
});
