export type WindfallOptionId = 'fd' | 'liquid' | 'hybrid' | 'index_lump' | 'index_stp' | 'stocks';
export type Comfort = 'calm' | 'some' | 'comfortable';
export type WindfallOption = {
  id: WindfallOptionId;
  name: string;
  expectedReturn: number;
  volatility: number;
  deployment: string;
  taxTreatment: 'slab' | 'equity';
};

export const WINDFALL_OPTIONS: readonly WindfallOption[] = [
  { id: 'fd', name: 'Fixed deposit', expectedReturn: .0675, volatility: 0, deployment: 'Lump sum', taxTreatment: 'slab' },
  { id: 'liquid', name: 'Liquid / debt fund', expectedReturn: .065, volatility: .01, deployment: 'Lump sum', taxTreatment: 'slab' },
  { id: 'hybrid', name: 'Balanced hybrid fund', expectedReturn: .09, volatility: .09, deployment: 'Lump sum', taxTreatment: 'equity' },
  { id: 'index_lump', name: 'Equity index fund, lump sum', expectedReturn: .11, volatility: .16, deployment: 'All today', taxTreatment: 'equity' },
  { id: 'index_stp', name: 'Equity index fund via STP', expectedReturn: .11, volatility: .16, deployment: '12 equal monthly transfers from liquid', taxTreatment: 'equity' },
  { id: 'stocks', name: 'Direct stocks (diversified basket)', expectedReturn: .12, volatility: .24, deployment: 'All today', taxTreatment: 'equity' },
] as const;

// Illustrative user-supplied tax model; not a statement of verified tax law.
export const TAX_FY_2026_27 = {
  version: 'FY 2026–27',
  equityLongTermMonths: 12,
  equityLongTermRate: .125,
  equityShortTermRate: .20,
  annualEquityExemption: 125000,
  slabChoices: [0, .05, .10, .15, .20, .30],
  hybridTreatedAsEquity: true,
} as const;

export const WINDFALL_ASSUMPTIONS = {
  paths: 2000,
  seed: 42,
  projectionYears: 20,
  swpYears: 30,
  stpMonths: 12,
  liquidReturn: .065,
  liquidVolatility: .01,
  inflation: .06,
  label: 'Illustrative, not forecasts',
} as const;
