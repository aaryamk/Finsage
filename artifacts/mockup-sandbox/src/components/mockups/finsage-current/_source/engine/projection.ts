import { ASSUMPTIONS as A } from './constants';
import { outstandingBalance } from './loan';
import type { ScenarioProfile } from './types';

function loanAt(p: ScenarioProfile, month: number): number {
  return 'loan' in p ? outstandingBalance(p.loan.principal, p.loan.annualRate, p.loan.years, month) : 0;
}
function monthCount(p: ScenarioProfile, age: number): number {
  return Math.max(0, Math.round((age - p.age) * 12));
}
function corpusAfter(p: ScenarioProfile, months: number, annualReturn: number): number {
  let corpus = p.investedCorpus;
  let sip = p.monthlySIP;
  for (let month = 1; month <= months; month++) {
    corpus = corpus * (1 + annualReturn / 12) + sip;
    if (month % 12 === 0) sip *= 1 + p.sipStepUpPct / 100;
  }
  return corpus;
}
export function fireAge(p: ScenarioProfile, annualReturn: number = A.baselineReturn): number | '70+' {
  let corpus = p.investedCorpus;
  let sip = p.monthlySIP;
  const months = monthCount(p, A.horizonAge);
  for (let month = 0; month <= months; month++) {
    const target = A.fireMultiple * 12 * p.monthlyExpenses * (1 + A.inflation) ** (month / 12) + loanAt(p, month);
    if (corpus >= target) return p.age + month / 12;
    corpus = corpus * (1 + annualReturn / 12) + sip;
    if ((month + 1) % 12 === 0) sip *= 1 + p.sipStepUpPct / 100;
  }
  return '70+';
}
export function netWorthTimeline(p: ScenarioProfile): { age: number; netWorth: number }[] {
  let liquid = p.liquidSavings;
  let corpus = p.investedCorpus;
  let sip = p.monthlySIP;
  const home = 'homeValue' in p ? p.homeValue : 0;
  const loanMonths = 'loan' in p ? p.loan.years * 12 : 0;
  const newEMI = 'newEMI' in p ? p.newEMI : 0;
  const points = [{ age: p.age, netWorth: liquid + corpus + home - loanAt(p, 0) }];
  const months = monthCount(p, A.horizonAge);
  // Salary and recurring expenses stay nominally constant; inflation applies to FIRE targets.
  for (let month = 1; month <= months; month++) {
    const ongoingEMI = month <= loanMonths ? newEMI : 0;
    const surplus = p.monthlyTakeHome - p.monthlyExpenses - p.existingEMIs - ongoingEMI;
    liquid = liquid * (1 + A.cashReturn / 12) + surplus - sip;
    corpus = corpus * (1 + A.baselineReturn / 12) + sip;
    if (month % 12 === 0 || month === months) {
      points.push({
        age: p.age + month / 12,
        netWorth: liquid + corpus + home * (1 + A.homeAppreciation) ** (month / 12) - loanAt(p, month),
      });
    }
    if (month % 12 === 0) sip *= 1 + p.sipStepUpPct / 100;
  }
  return points;
}
export function netWorthAtAge(p: ScenarioProfile, age: number): number {
  if (age < p.age) return 0;
  const points = netWorthTimeline(p);
  const exact = points.find(point => Math.abs(point.age - age) < .01);
  if (exact) return exact.netWorth;
  const nextIndex = points.findIndex(point => point.age > age);
  if (nextIndex <= 0) return points[points.length - 1]!.netWorth;
  const before = points[nextIndex - 1]!;
  const after = points[nextIndex]!;
  return before.netWorth + (after.netWorth - before.netWorth) * (age - before.age) / (after.age - before.age);
}
export function corpusRange(p: ScenarioProfile, age: number): { pess: number; base: number; opt: number } {
  if (age < p.age) return { pess: 0, base: 0, opt: 0 };
  const months = monthCount(p, age);
  return {
    pess: corpusAfter(p, months, A.pessimisticReturn),
    base: corpusAfter(p, months, A.baselineReturn),
    opt: corpusAfter(p, months, A.optimisticReturn),
  };
}
