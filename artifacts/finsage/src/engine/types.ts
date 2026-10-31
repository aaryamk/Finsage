export type Profile = {
  name: string;
  age: number;
  city: string;
  monthlyTakeHome: number;
  monthlyExpenses: number;
  monthlyRent: number;
  liquidSavings: number;
  investedCorpus: number;
  monthlySIP: number;
  sipStepUpPct: number;
  existingEMIs: number;
  dependents: number;
  healthCoverEmployer: number;
  healthCoverPersonal: number;
  termCover: number;
};
export type HomeDecision = { price: number; downPct: number; annualRate: number; years: number };
export type FutureProfile = Profile & {
  newEMI: number;
  homeValue: number;
  loan: { principal: number; annualRate: number; years: number };
  cashNeeded: number;
  cashShortfall: number;
};
export type Status = 'strong' | 'watch' | 'act';
export type Finding = {
  id: string;
  title: string;
  status: Status;
  evidence: string;
  consequence: string;
  nextStep: string;
  link?: 'studio' | 'simulator';
};
export type Allocation = { emergency: number; insurance: number; prepayment: number; shortTerm: number; longTerm: number };
export type ScenarioProfile = Profile | FutureProfile;
