import type { WindfallOption } from './windfallConstants';

export type RiskGroupId = 'safer' | 'medium' | 'high';
export type GroupOptionId = 'fd' | 'liquid' | 'ppf' | 'index_stp' | 'hybrid' | 'large_cap' | 'mid_cap' | 'small_cap' | 'direct_stocks';
export const GROUP_OPTION_MIX_LABELS: Record<GroupOptionId, string> = {
  fd: 'FD', liquid: 'Liquid', ppf: 'PPF', index_stp: 'Index', hybrid: 'Hybrid',
  large_cap: 'Large-cap', mid_cap: 'Mid-cap', small_cap: 'Small-cap', direct_stocks: 'Stocks',
};
export type GroupOption = {
  id: GroupOptionId;
  name: string;
  description: string;
  explanation: readonly [string, string];
  model: WindfallOption;
  taxExempt?: boolean;
  tag?: string;
  seedOffset: number;
};
export type RiskGroup = {
  id: RiskGroupId;
  name: string;
  level: number;
  weights: readonly [number, number, number];
  optionIds: readonly [GroupOptionId, GroupOptionId, GroupOptionId];
};

export const GROUPED_WINDFALL_ASSUMPTIONS = {
  taxSlab: .30,
  afterTax: true,
  todayRupees: true,
  inflation: .06,
  paths: 2000,
  seed: 42,
  ppfLockYears: 15,
  caption: "Today's ₹, after tax · Loss: nominal capital",
} as const;

const model = (id: WindfallOption['id'], name: string, expectedReturn: number, volatility: number, taxTreatment: WindfallOption['taxTreatment'] = 'equity'): WindfallOption => ({
  id, name, expectedReturn, volatility, taxTreatment,
  deployment: id === 'index_stp' ? '12 equal monthly transfers' : 'Lump sum',
});

export const GROUPED_WINDFALL_OPTIONS: readonly GroupOption[] = [
  { id: 'fd', name: 'Fixed deposit', description: 'Fixed rate from a bank', explanation: ['A bank deposit with an illustrative fixed rate.', 'The model assumes no principal default.'], model: model('fd', 'Fixed deposit', .0675, 0, 'slab'), seedOffset: 11 },
  { id: 'liquid', name: 'Liquid / debt fund', description: 'Low-risk, easy to withdraw', explanation: ['A category of short-term debt investments.', 'Values can fluctuate; returns are not guaranteed.'], model: model('liquid', 'Liquid / debt fund', .065, .01, 'slab'), seedOffset: 23 },
  { id: 'ppf', name: 'PPF', description: 'Government-backed, tax-free', explanation: ['A government-backed, tax-free savings category.', 'The model does not permit early access.'], model: model('fd', 'PPF', .071, 0, 'slab'), taxExempt: true, tag: '15-yr lock-in', seedOffset: 37 },
  { id: 'index_stp', name: 'Nifty 50 index fund via STP', description: 'Top 50 companies, invested monthly', explanation: ['An index investment spread across twelve months.', 'Money earns liquid returns while awaiting transfer.'], model: model('index_stp', 'Nifty 50 index fund via STP', .11, .16), tag: 'Spread over 12 months', seedOffset: 51 },
  { id: 'hybrid', name: 'Balanced hybrid fund', description: 'Mix of stocks and bonds', explanation: ['A category combining equity and debt investments.', 'Equity taxation is an illustrative simplification.'], model: model('hybrid', 'Balanced hybrid fund', .09, .09), seedOffset: 71 },
  { id: 'large_cap', name: 'Large-cap stocks basket', description: 'Handful of big companies', explanation: ['A diversified basket of larger listed businesses.', 'Outcomes depend on the actual companies selected.'], model: model('stocks', 'Large-cap stocks basket', .115, .20), seedOffset: 89 },
  { id: 'mid_cap', name: 'Mid-cap fund', description: 'Growing mid-sized companies', explanation: ['A category focused on mid-sized listed businesses.', 'Larger price swings may require a longer horizon.'], model: model('index_lump', 'Mid-cap fund', .13, .22), seedOffset: 107 },
  { id: 'small_cap', name: 'Small-cap fund', description: 'Small companies, big swings', explanation: ['A category focused on smaller listed businesses.', 'Liquidity and market swings can widen outcomes.'], model: model('index_lump', 'Small-cap fund', .14, .28), seedOffset: 127 },
  { id: 'direct_stocks', name: 'Direct small/mid stocks', description: 'You pick the companies', explanation: ['A personally selected basket of smaller businesses.', 'The model cannot assess individual stock choices.'], model: model('stocks', 'Direct small/mid stocks', .15, .35), seedOffset: 149 },
] as const;

export const WINDFALL_RISK_GROUPS: readonly RiskGroup[] = [
  { id: 'safer', name: 'SAFER', level: 1, weights: [.5, .3, .2], optionIds: ['fd', 'liquid', 'ppf'] },
  { id: 'medium', name: 'MEDIUM', level: 2, weights: [.5, .3, .2], optionIds: ['index_stp', 'hybrid', 'large_cap'] },
  { id: 'high', name: 'HIGH', level: 3, weights: [.4, .4, .2], optionIds: ['mid_cap', 'small_cap', 'direct_stocks'] },
] as const;

export const RISK_DESCRIPTIONS = {
  safer: 'Steady growth, small dips',
  medium: 'Some ups and downs',
  high: 'Big swings for higher growth',
} as const;
