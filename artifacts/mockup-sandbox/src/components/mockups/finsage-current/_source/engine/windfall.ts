import { derive } from './profile';
import type { Profile } from './types';
import { WINDFALL_OPTIONS, TAX_FY_2026_27 as TAX, WINDFALL_ASSUMPTIONS as A, type WindfallOption, type WindfallOptionId, type Comfort } from './windfallConstants';

export type { WindfallOption, WindfallOptionId, Comfort } from './windfallConstants';
export type WindfallSettings = { afterTax?: boolean; taxSlab?: number; todayRupees?: boolean };
export type YearOutcome = {
  year: number; p10: number; p25: number; p50: number; p75: number; p90: number;
  lossProbability: number;
};
export type WindfallResult = {
  option: WindfallOption; amount: number; years: number; yearly: YearOutcome[];
  horizon: YearOutcome; yearsToDouble: number | null; firstLowLossYear: number | null;
  gainPct: number; grossMedianGain: number; netMedianGain: number;
};
export type SWPSettings = WindfallSettings & { startAfterYears?: number; paths?: number; seed?: number };
export type SWPResult = {
  monthsP50: number; monthsP10: number; yearly: YearOutcome[];
  safeMonthlyWithdrawal: number; fdMonthlyIncome: number; monthlyWithdrawal: number;
  startAfterYears: number;
};

export function seededRandom(seed = 42): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGenerator(seed: number): () => number {
  const random = seededRandom(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const result = spare; spare = null; return result; }
    const radius = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random())));
    const theta = 2 * Math.PI * random();
    spare = radius * Math.sin(theta);
    return radius * Math.cos(theta);
  };
}

function resolveOption(input: WindfallOptionId | WindfallOption): WindfallOption {
  const option = typeof input === 'string' ? WINDFALL_OPTIONS.find(item => item.id === input) : input;
  if (!option || option.expectedReturn <= -1 || option.volatility < 0 || !Number.isFinite(option.expectedReturn) || !Number.isFinite(option.volatility)) throw new Error('Invalid illustrative option');
  return option;
}
function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a finite, non-negative number');
}
function quantile(sorted: readonly number[], probability: number): number {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const a = sorted[lower]!, b = sorted[Math.ceil(index)]!;
  return a === b ? a : a + (b - a) * (index - lower);
}
function summary(values: number[], year: number, starting: number): YearOutcome {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    year, p10: quantile(sorted, .1), p25: quantile(sorted, .25), p50: quantile(sorted, .5),
    p75: quantile(sorted, .75), p90: quantile(sorted, .9),
    lossProbability: values.filter(value => value < starting - 1e-7).length / values.length,
  };
}
function settings(input: WindfallSettings) {
  return { afterTax: input.afterTax ?? false, taxSlab: Math.min(.3, Math.max(0, input.taxSlab ?? .3)), todayRupees: input.todayRupees ?? false };
}
export function equityTax(gain: number, heldMonths: number, exemption = TAX.annualEquityExemption): number {
  return heldMonths > TAX.equityLongTermMonths
    ? Math.max(0, gain - exemption) * TAX.equityLongTermRate
    : Math.max(0, gain) * TAX.equityShortTermRate;
}
export function taxAtExit(gain: number, option: WindfallOptionId | WindfallOption, heldMonths: number, taxSlab = .3): number {
  return resolveOption(option).taxTreatment === 'equity' ? equityTax(gain, heldMonths) : Math.max(0, gain) * taxSlab;
}
const resultsCache = new Map<string, WindfallResult>();
type PathData = { values: number[][]; shortGains: number[][]; longGains: number[][]; liquidGains: number[][] };
const rawCache = new Map<string, PathData>();
function remember<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): V {
  if (cache.size >= limit) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}
function monthlyFactor(option: WindfallOption, z: number): number {
  const sigma = option.volatility;
  return Math.exp((Math.log(1 + option.expectedReturn) - sigma * sigma / 2) / 12 + sigma / Math.sqrt(12) * z);
}
function pathData(amount: number, option: WindfallOption, paths: number, seed: number): PathData {
  const key = JSON.stringify([amount, option, paths, seed]);
  const cached = rawCache.get(key);
  if (cached) return cached;
  const arrays = () => Array.from({ length: 20 }, () => [] as number[]);
  const result: PathData = { values: arrays(), shortGains: arrays(), longGains: arrays(), liquidGains: arrays() };
  const normal = normalGenerator(seed);
  const liquidOption = { ...option, expectedReturn: A.liquidReturn, volatility: option.volatility === 0 ? 0 : A.liquidVolatility };
  for (let path = 0; path < paths; path++) {
    let value = option.id === 'index_stp' ? 0 : amount;
    let liquid = option.id === 'index_stp' ? amount : 0;
    let liquidCost = liquid;
    let realisedParkingGain = 0;
    const lots: { value: number; principal: number; month: number }[] = [];
    for (let month = 1; month <= 240; month++) {
      const z = normal();
      const growth = monthlyFactor(option, z);
      if (option.id === 'index_stp') {
        // Reuse common market draws for a paired lump-sum/STP comparison.
        liquid *= monthlyFactor(liquidOption, z);
        for (const lot of lots) lot.value *= growth;
        if (month <= A.stpMonths) {
          const transfer = Math.min(amount / A.stpMonths, liquid);
          const costRemoved = liquid > 0 ? liquidCost * transfer / liquid : 0;
          realisedParkingGain += Math.max(0, transfer - costRemoved);
          liquidCost -= costRemoved;
          liquid -= transfer;
          lots.push({ value: transfer, principal: transfer, month });
        }
        value = liquid + lots.reduce((sum, lot) => sum + lot.value, 0);
      } else value *= growth;
      if (month % 12 === 0) {
        const index = month / 12 - 1;
        let shortGain = 0, longGain = 0, parkingGain = 0;
        if (option.id === 'index_stp') {
          for (const lot of lots) {
            const gain = lot.value - lot.principal;
            if (month - lot.month > TAX.equityLongTermMonths) longGain += gain;
            else shortGain += gain;
          }
          parkingGain = realisedParkingGain + Math.max(0, liquid - liquidCost);
        }
        result.values[index]!.push(value);
        result.shortGains[index]!.push(shortGain);
        result.longGains[index]!.push(longGain);
        result.liquidGains[index]!.push(parkingGain);
      }
    }
  }
  return remember(rawCache, key, result, 12);
}
function exitValue(amount: number, option: WindfallOption, data: PathData, year: number, path: number, config: ReturnType<typeof settings>) {
  const index = year - 1;
  const value = data.values[index]![path]!;
  let tax = 0;
  if (config.afterTax) {
    tax = option.id === 'index_stp'
      ? Math.max(0, data.shortGains[index]![path]!) * TAX.equityShortTermRate
        + Math.max(0, data.longGains[index]![path]! - TAX.annualEquityExemption) * TAX.equityLongTermRate
        + data.liquidGains[index]![path]! * config.taxSlab
      : taxAtExit(value - amount, option, year * 12, config.taxSlab);
  }
  return (value - tax) / (config.todayRupees ? (1 + A.inflation) ** year : 1);
}
export function simulateWindfall(amount: number, input: WindfallOptionId | WindfallOption, years: number, paths = 2000, seed = 42, inputSettings: WindfallSettings = {}): WindfallResult {
  validateAmount(amount);
  if (!Number.isInteger(paths) || paths < 1 || paths > 10000) throw new Error('Paths must be between 1 and 10,000');
  if (!Number.isInteger(years) || years < 1 || years > 20) throw new Error('Choose a horizon between 1 and 20 years');
  const option = resolveOption(input), config = settings(inputSettings);
  const key = JSON.stringify([amount, option, years, paths, seed, config]);
  const cached = resultsCache.get(key);
  if (cached) return cached;
  const raw = pathData(amount, option, paths, seed);
  const yearly = raw.values.map((values, i) => summary(values.map((_, path) => exitValue(amount, option, raw, i + 1, path, config)), i + 1, amount));
  const doubling = yearly.find(point => point.p50 >= amount * 2);
  const previousMedian = doubling && doubling.year > 1 ? yearly[doubling.year - 2]!.p50 : amount;
  const yearsToDouble = !amount || !doubling ? null : doubling.year - 1 + (amount * 2 - previousMedian) / (doubling.p50 - previousMedian);
  const horizon = yearly[years - 1]!;
  const grossMedian = summary(raw.values[years - 1]!, years, amount).p50;
  return remember(resultsCache, key, {
    option, amount, years, yearly, horizon, yearsToDouble,
    firstLowLossYear: yearly.find(point => point.lossProbability < .05)?.year ?? null,
    gainPct: amount > 0 ? (horizon.p50 / amount - 1) * 100 : 0,
    grossMedianGain: grossMedian - amount,
    netMedianGain: horizon.p50 - amount,
  }, 72);
}

export function compareWindfall(amount: number, years: number, config: WindfallSettings = {}, comfort: Comfort = 'some') {
  return WINDFALL_OPTIONS.map(option => {
    const result = simulateWindfall(amount, option, years, A.paths, A.seed, config);
    const matchesComfort = comfort === 'calm' ? option.volatility <= .01 : comfort === 'some' ? option.volatility <= .16 : true;
    return { ...result, riskier: result.horizon.lossProbability > .15, fitsTimeline: matchesComfort && result.horizon.lossProbability <= .15 };
  }).sort((a, b) => b.horizon.p50 - a.horizon.p50);
}
export function windfallInsights(amount: number, years: number, config: WindfallSettings = {}) {
  const equity = simulateWindfall(amount, 'index_lump', years, A.paths, A.seed, config);
  const fd = simulateWindfall(amount, 'fd', years, A.paths, A.seed, config);
  const rawEquity = pathData(amount, resolveOption('index_lump'), A.paths, A.seed);
  const rawFd = pathData(amount, resolveOption('fd'), A.paths, A.seed);
  const set = settings(config);
  let beats = 0;
  for (let path = 0; path < A.paths; path++) if (exitValue(amount, equity.option, rawEquity, years, path, set) > exitValue(amount, fd.option, rawFd, years, path, set)) beats++;
  const nominalAfterTax = simulateWindfall(amount, 'index_lump', years, A.paths, A.seed, { ...config, todayRupees: false, afterTax: true });
  return { beatFDProbability: beats / A.paths, equityDouble: equity.yearsToDouble, fdDouble: fd.yearsToDouble, grossGain: equity.grossMedianGain, netGain: nominalAfterTax.netMedianGain, oneYearLoss: equity.yearly[0]!.lossProbability, sevenYearLoss: equity.yearly[6]!.lossProbability };
}
export function emergencyBuffer(profile: Profile, available: number) {
  const derived = derive(profile);
  const gap = Math.max(0, 6 * derived.essentialOutflow - profile.liquidSavings);
  const useAmount = Math.min(Math.max(0, available), gap);
  return { months: derived.emergencyMonths, gap, useAmount, remaining: Math.max(0, available - useAmount) };
}
export function addWindfallToProfile(profile: Profile, amount: number, destination: 'savings' | 'investments'): Profile {
  validateAmount(amount);
  const key = destination === 'savings' ? 'liquidSavings' : 'investedCorpus';
  return { ...profile, [key]: profile[key] + amount };
}
export function withdrawalBounds(corpus: number) {
  return { min: Math.min(1000, Math.max(0, corpus * .02)), max: Math.max(0, corpus * .02) };
}

const swpCache = new Map<string, SWPResult>();
type SwpMarket = { factors: Float64Array[]; deferred: number[] };
const swpMarketCache = new Map<string, SwpMarket>();
function swpMarket(option: WindfallOption, defer: number, paths: number, seed: number): SwpMarket {
  const key = JSON.stringify([option, defer, paths, seed]);
  const cached = swpMarketCache.get(key);
  if (cached) return cached;
  const normal = normalGenerator(seed);
  const factors: Float64Array[] = [];
  const deferred: number[] = [];
  for (let path = 0; path < paths; path++) {
    let growth = 1;
    for (let month = 0; month < defer * 12; month++) growth *= monthlyFactor(option, normal());
    deferred.push(growth);
    const market = new Float64Array(360);
    for (let month = 0; month < 360; month++) market[month] = monthlyFactor(option, normal());
    factors.push(market);
  }
  return remember(swpMarketCache, key, { factors, deferred }, 4);
}
function withdrawalPath(corpus: number, withdrawal: number, option: WindfallOption, factors: Float64Array, initialFactor: number, defer: number, config: ReturnType<typeof settings>, horizon: number, collect = false) {
  let balance = corpus * initialFactor, costBasis = corpus, usedExemption = 0;
  const yearly: number[] = [];
  let duration = Infinity;
  for (let month = 0; month < horizon; month++) {
    if (month % 12 === 0) usedExemption = 0;
    const gainShare = balance > 0 ? Math.max(0, 1 - costBasis / balance) : 0;
    const longTerm = month + defer * 12 > TAX.equityLongTermMonths;
    const rate = !config.afterTax ? 0 : option.taxTreatment === 'slab' ? config.taxSlab : longTerm ? TAX.equityLongTermRate : TAX.equityShortTermRate;
    const remainingExemption = option.taxTreatment === 'equity' && longTerm && config.afterTax ? Math.max(0, TAX.annualEquityExemption - usedExemption) : 0;
    let redemption = withdrawal;
    if (rate > 0 && gainShare > 0 && withdrawal * gainShare > remainingExemption) {
      redemption = (withdrawal - rate * remainingExemption) / (1 - rate * gainShare);
    }
    if (withdrawal > 0 && redemption >= balance) {
      duration = month + (redemption > 0 ? Math.max(0, balance) / redemption : 0);
      if (collect) while (yearly.length < horizon / 12) yearly.push(0);
      return { duration, yearly };
    }
    const costRemoved = balance > 0 ? costBasis * redemption / balance : 0;
    if (remainingExemption > 0) usedExemption += Math.min(remainingExemption, redemption * gainShare);
    costBasis = Math.max(0, costBasis - costRemoved);
    balance = Math.max(0, balance - redemption) * factors[month]!;
    if (collect && (month + 1) % 12 === 0) yearly.push(balance / (config.todayRupees ? (1 + A.inflation) ** (defer + (month + 1) / 12) : 1));
  }
  return { duration, yearly };
}
export function swpPlan(corpus: number, monthlyWithdrawal: number, input: WindfallOptionId | WindfallOption, inputSettings: SWPSettings = {}): SWPResult {
  validateAmount(corpus);
  validateAmount(monthlyWithdrawal);
  const option = resolveOption(input);
  const defer = Math.max(0, Math.min(10, Math.floor(inputSettings.startAfterYears ?? 0)));
  const paths = inputSettings.paths ?? A.paths, seed = inputSettings.seed ?? A.seed;
  if (!Number.isInteger(paths) || paths < 1 || paths > 10000) throw new Error('Paths must be between 1 and 10,000');
  const config = settings(inputSettings);
  const key = JSON.stringify([corpus, monthlyWithdrawal, option, defer, paths, seed, config]);
  const cached = swpCache.get(key);
  if (cached) return cached;
  const market = swpMarket(option, defer, paths, seed);
  const durations: number[] = [];
  const balances = Array.from({ length: 30 }, () => [] as number[]);
  const safeLimit = (withdrawal: number) => {
    let survived = 0;
    for (let path = 0; path < paths; path++) {
      const run = withdrawalPath(corpus, withdrawal, option, market.factors[path]!, market.deferred[path]!, defer, config, 240);
      if (run.duration >= 240) survived++;
    }
    return survived / paths >= .9;
  };
  let low = 0, high = corpus * Math.max(1, ...market.deferred);
  for (let iteration = 0; iteration < 19; iteration++) {
    const middle = (low + high) / 2;
    if (safeLimit(middle)) low = middle;
    else high = middle;
  }
  for (let path = 0; path < paths; path++) {
    const run = withdrawalPath(corpus, monthlyWithdrawal, option, market.factors[path]!, market.deferred[path]!, defer, config, 360, true);
    durations.push(run.duration);
    run.yearly.forEach((value, index) => balances[index]!.push(value));
  }
  durations.sort((a, b) => a - b);
  const initialBalances = market.deferred.map(growth => corpus * growth / (config.todayRupees ? (1 + A.inflation) ** defer : 1));
  const yearly = [summary(initialBalances, 0, corpus), ...balances.map((values, index) => summary(values, index + 1, corpus))];
  return remember(swpCache, key, {
    monthsP50: quantile(durations, .5), monthsP10: quantile(durations, .1), yearly,
    safeMonthlyWithdrawal: Math.floor(low),
    fdMonthlyIncome: corpus * resolveOption('fd').expectedReturn / 12 * (config.afterTax ? 1 - config.taxSlab : 1),
    monthlyWithdrawal, startAfterYears: defer,
  }, 18);
}
