import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Allocation, HomeDecision, Profile } from '../engine/types';
import { DEFAULT_PROFILE } from '../engine/constants';

const STORAGE_KEY = 'finsage.profile.v1';

export const DEFAULT_DECISION: HomeDecision = { price: 5500000, downPct: 0.2, annualRate: 0.085, years: 20 };

type Ctx = {
  profile: Profile;
  setField: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
  updateProfile: (updater: (p: Profile) => Profile) => void;
  reset: () => void;
  decision: HomeDecision;
  setDecision: (d: HomeDecision) => void;
  allocation: Allocation | null;
  setAllocation: (a: Allocation | null) => void;
  goalName: string;
  setGoalName: (s: string) => void;
  goalAmount: number;
  setGoalAmount: (n: number) => void;
  storageOk: boolean;
  extraMoneyAmount: number;
  setExtraMoneyAmount: (amount: number) => void;
  /** UI-only: rupee basis. Drives Extra Money's existing todayRupees setting. */
  todayRupees: boolean;
  setTodayRupees: (b: boolean) => void;
  /** UI-only list of named goals (no calculations). */
  goals: UserGoal[];
  addGoal: (name: string, amount: number) => void;
  removeGoal: (id: number) => void;
};
export type UserGoal = { id: number; name: string; amount: number };

const ProfileContext = createContext<Ctx | null>(null);

function validate(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_PROFILE };
  for (const key of Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]) {
    const def = DEFAULT_PROFILE[key];
    const v = src[key];
    if (typeof def === 'number') {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
    } else if (typeof def === 'string') {
      if (typeof v === 'string') out[key] = v.slice(0, 60);
    }
  }
  const p = out as Profile;
  if (p.age < 18 || p.age > 69) p.age = DEFAULT_PROFILE.age;
  return p;
}

function load(): { profile: Profile; ok: boolean } {
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    if (!s) return { profile: { ...DEFAULT_PROFILE }, ok: true };
    return { profile: validate(JSON.parse(s)) ?? { ...DEFAULT_PROFILE }, ok: true };
  } catch {
    return { profile: { ...DEFAULT_PROFILE }, ok: false };
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const [profile, setProfile] = useState<Profile>(initial.profile);
  const [storageOk, setStorageOk] = useState(initial.ok);
  const [decision, setDecision] = useState<HomeDecision>(DEFAULT_DECISION);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [goalName, setGoalName] = useState('Car down payment');
  const [goalAmount, setGoalAmount] = useState(300000);
  const [extraMoneyAmount, setExtraMoneyAmount] = useState(200000);
  const [todayRupees, setTodayRupees] = useState(false);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const addGoal = useCallback((name: string, amount: number) => {
    setGoals((g) => [...g, { id: Date.now() + g.length, name: name.slice(0, 40), amount }]);
  }, []);
  const removeGoal = useCallback((id: number) => setGoals((g) => g.filter((x) => x.id !== id)), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [profile]);

  const setField = useCallback(<K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  }, []);

  const updateProfile = useCallback((updater: (p: Profile) => Profile) => {
    setProfile((p) => updater(p));
  }, []);

  const reset = useCallback(() => {
    setProfile({ ...DEFAULT_PROFILE });
    setAllocation(null);
  }, []);

  const value = useMemo(
    () => ({ profile, setField, updateProfile, reset, decision, setDecision, allocation, setAllocation, goalName, setGoalName, goalAmount, setGoalAmount, storageOk, extraMoneyAmount, setExtraMoneyAmount, todayRupees, setTodayRupees, goals, addGoal, removeGoal }),
    [profile, setField, updateProfile, reset, decision, allocation, goalName, goalAmount, storageOk, extraMoneyAmount, todayRupees, goals, addGoal, removeGoal],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
