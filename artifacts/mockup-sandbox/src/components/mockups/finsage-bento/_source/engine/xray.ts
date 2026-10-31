import { derive } from './profile';
import { fireAge } from './projection';
import { formatINR } from './format';
import type { Finding, ScenarioProfile, Status } from './types';

export function runXRay(p: ScenarioProfile): Finding[] {
  const d = derive(p);
  const fire = fireAge(p);
  const age = fire === '70+' ? Infinity : fire;
  const findings: Finding[] = [];
  const add = (id: string, title: string, status: Status, evidence: string, consequence: string, nextStep: string, link?: Finding['link']) => findings.push({ id, title, status, evidence, consequence, nextStep, link });
  add('emergency', 'Emergency fund', d.emergencyMonths >= 6 ? 'strong' : d.emergencyMonths >= 3 ? 'watch' : 'act',
    `${formatINR(p.liquidSavings)} covers ${Number.isFinite(d.emergencyMonths) ? d.emergencyMonths.toFixed(1) : 'unlimited'} months of ${formatINR(d.essentialOutflow)} essential outflow.`,
    d.emergencyMonths >= 6 ? 'You have room to handle an unexpected income gap.' : 'An income gap could force you to sell investments.',
    d.emergencyMonths >= 6 ? 'Keep six months of essentials accessible.' : 'Prioritise rebuilding your six-month buffer.', 'studio');
  add('idle', 'Idle cash', d.idleCash > 6 * d.essentialOutflow ? 'watch' : 'strong',
    `${formatINR(d.idleCash)} sits beyond your six-month emergency buffer.`,
    d.idleCash > 6 * d.essentialOutflow ? `${formatINR(d.idleCash)} sitting beyond your buffer may be losing to 6% inflation.` : 'Your cash reserve is proportionate to your essential spending.',
    'Separate near-term goals from money you can invest for the long term.', 'studio');
  add('savings', 'Savings rate', d.savingsRate >= .3 ? 'strong' : d.savingsRate >= .15 ? 'watch' : 'act',
    `${Math.round(d.savingsRate * 100)}% of take-home income remains after essentials: ${formatINR(d.monthlySurplus)} per month.`,
    d.savingsRate >= .3 ? 'Your income leaves meaningful room for future goals.' : 'Limited headroom makes new commitments harder to absorb.',
    'Revisit essential spending before taking on another commitment.');
  add('unallocated', 'Unallocated surplus', d.unallocated < 0 ? 'act' : d.unallocated > .1 * Math.max(0, d.monthlySurplus) ? 'watch' : 'strong',
    `${formatINR(d.unallocated)} remains after your ${formatINR(p.monthlySIP)} monthly SIP.`,
    d.unallocated < 0 ? 'Spending and planned investing exceed income.' : 'Without a plan, this money may not move you towards your goals.',
    'Plan it in Allocation Studio →', 'studio');
  add('debt', 'Debt load', d.debtRatio < .3 ? 'strong' : d.debtRatio <= .4 ? 'watch' : 'act',
    `${Math.round(d.debtRatio * 100)}% of take-home income goes to EMIs (${formatINR(p.existingEMIs + ('newEMI' in p ? p.newEMI : 0))} monthly).`,
    d.debtRatio < .3 ? 'Debt repayments leave breathing room in your budget.' : 'Debt repayments reduce flexibility if your income changes.',
    'Compare the full impact before adding a home loan.', 'simulator');
  add('health', 'Personal health cover', p.healthCoverPersonal >= 500000 ? 'strong' : p.healthCoverPersonal > 0 ? 'watch' : 'act',
    `${formatINR(p.healthCoverPersonal)} personal cover, plus ${formatINR(p.healthCoverEmployer)} through your employer.`,
    p.healthCoverPersonal === 0 ? 'Your only cover ends if you change or lose your job.' : p.healthCoverPersonal < 500000 ? 'Your independent cover is below the illustrative ₹5 lakh baseline.' : 'Your personal cover is independent of your employment.',
    'Review a personal policy, its exclusions and your family’s needs.', 'studio');
  add('life', 'Life cover', p.dependents === 0 || p.termCover >= 10 * 12 * p.monthlyTakeHome ? 'strong' : p.termCover === 0 ? 'act' : 'watch',
    p.dependents === 0 ? 'No one currently depends on your income.' : `${p.dependents} dependent(s), ${formatINR(p.termCover)} term cover; illustrative baseline ${formatINR(10 * 12 * p.monthlyTakeHome)}.`,
    p.dependents === 0 ? 'Not needed yet — revisit when someone depends on your income.' : 'Dependents may need income protection if you are no longer around.',
    p.dependents === 0 ? 'Revisit after a change in family responsibilities.' : 'Review adequate term cover with a qualified professional.');
  add('fire', 'FIRE trajectory', age < 50 ? 'strong' : age <= 60 ? 'watch' : 'act',
    `Projected financial independence at ${fire === '70+' ? 'age 70+' : `age ${fire.toFixed(1)}`} with a ${formatINR(p.monthlySIP)} monthly SIP.`,
    'This is a projection, not a promise: returns and inflation change the result.',
    'Explore how allocating more towards investing changes your timeline.', 'studio');
  return findings;
}
