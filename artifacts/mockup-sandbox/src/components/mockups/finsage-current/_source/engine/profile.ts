import { formatINR } from './format';
import { fireAge, netWorthAtAge } from './projection';
import type { ScenarioProfile } from './types';

export function derive(p: ScenarioProfile) {
  const newEMI = 'newEMI' in p ? p.newEMI : 0;
  const essentialOutflow = p.monthlyExpenses + p.existingEMIs + newEMI;
  const monthlySurplus = p.monthlyTakeHome - essentialOutflow;
  return {
    essentialOutflow, monthlySurplus, unallocated: monthlySurplus - p.monthlySIP,
    emergencyMonths: essentialOutflow > 0 ? p.liquidSavings / essentialOutflow : Infinity,
    jobLossRunway: essentialOutflow > 0 ? (p.liquidSavings + p.investedCorpus) / essentialOutflow : Infinity,
    savingsRate: p.monthlyTakeHome > 0 ? monthlySurplus / p.monthlyTakeHome : 0,
    debtRatio: p.monthlyTakeHome > 0 ? (p.existingEMIs + newEMI) / p.monthlyTakeHome : (p.existingEMIs + newEMI > 0 ? Infinity : 0),
    idleCash: Math.max(0, p.liquidSavings - 6 * essentialOutflow),
  };
}
export function compareOutcomes(a: ScenarioProfile, b: ScenarioProfile) {
  const da = derive(a), db = derive(b);
  const fa = fireAge(a), fb = fireAge(b);
  const rows: { id: string; label: string; a: number | string; b: number | string; delta: number; better: boolean; format: 'money' | 'months' | 'age' }[] = [];
  const add = (id: string, label: string, av: number | string, bv: number | string, format: 'money' | 'months' | 'age', lower = false) => {
    const delta = (typeof bv === 'number' ? bv : 71) - (typeof av === 'number' ? av : 71);
    rows.push({ id, label, a: av, b: bv, delta, better: lower ? delta <= 0 : delta >= 0, format });
  };
  add('surplus', 'Monthly surplus', da.monthlySurplus, db.monthlySurplus, 'money');
  add('emergency', 'Emergency fund', da.emergencyMonths, db.emergencyMonths, 'months');
  add('sip', 'SIP you can sustain', a.monthlySIP, b.monthlySIP, 'money');
  add('fire', 'FIRE age', fa, fb, 'age', true);
  add('runway', 'Job-loss runway', da.jobLossRunway, db.jobLossRunway, 'months');
  add('networth', 'Net worth at 40', netWorthAtAge(a, 40), netWorthAtAge(b, 40), 'money');
  return rows;
}
export function decisionVerdict(a: ScenarioProfile, b: ScenarioProfile): string {
  const da = derive(a), db = derive(b);
  if ('cashShortfall' in b && b.cashShortfall > 0) return `This purchase needs ${formatINR(b.cashShortfall)} more upfront cash than you have. Build that shortfall before committing.`;
  if (db.monthlySurplus < 0) return `This home creates a monthly deficit of ${formatINR(-db.monthlySurplus)} before any investing. Consider a lower price or larger down payment.`;
  return `You can afford the EMI, but your emergency fund changes from ${da.emergencyMonths.toFixed(1)} to ${db.emergencyMonths.toFixed(1)} months and your job-loss runway from ${da.jobLossRunway.toFixed(1)} to ${db.jobLossRunway.toFixed(1)} months.${db.emergencyMonths < 6 ? ' Rebuild a six-month buffer before buying.' : ' Keep the buffer intact as you plan.'}`;
}
