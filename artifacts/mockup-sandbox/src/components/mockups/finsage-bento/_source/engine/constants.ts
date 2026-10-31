import type { Profile } from './types';

export const ASSUMPTIONS = {
  baselineReturn: .10,
  pessimisticReturn: .07,
  optimisticReturn: .12,
  inflation: .06,
  cashReturn: .06,
  homeAppreciation: .05,
  fireMultiple: 30,
  upfrontCosts: .07,
  homeMaintenance: .002,
  horizonAge: 70,
} as const;

export const DEFAULT_PROFILE: Profile = {
  name: 'Aarav', age: 26, city: 'Bangalore', monthlyTakeHome: 120000,
  monthlyExpenses: 55000, monthlyRent: 25000, liquidSavings: 1800000,
  investedCorpus: 600000, monthlySIP: 30000, sipStepUpPct: 10,
  existingEMIs: 0, dependents: 0, healthCoverEmployer: 500000,
  healthCoverPersonal: 0, termCover: 0,
};
