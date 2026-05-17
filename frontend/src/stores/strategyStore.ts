import { create } from "zustand";

import type { Leg } from "@/lib/api/schemas";

export interface StrategyState {
  legs: Leg[];
  S: number;
  r: number;
  q: number;
  ticker: string;
  template: string;
  addLeg: (leg: Leg) => void;
  removeLeg: (idx: number) => void;
  updateLeg: (idx: number, patch: Partial<Leg>) => void;
  setLegs: (legs: Leg[]) => void;
  setS: (S: number) => void;
  setTicker: (t: string) => void;
  setTemplate: (name: string) => void;
}

// Default = iron condor on SPY 34 DTE
const IRON_CONDOR: Leg[] = [
  { option_type: "put",  strike: 440, expiry_years: 34 / 365, quantity: 1,  sigma: 0.2214 },
  { option_type: "put",  strike: 450, expiry_years: 34 / 365, quantity: -1, sigma: 0.1986 },
  { option_type: "call", strike: 470, expiry_years: 34 / 365, quantity: -1, sigma: 0.1642 },
  { option_type: "call", strike: 480, expiry_years: 34 / 365, quantity: 1,  sigma: 0.1578 },
];

export const useStrategyStore = create<StrategyState>((set) => ({
  legs: IRON_CONDOR,
  S: 459.30,
  r: 0.04288,
  q: 0.0135,
  ticker: "SPY",
  template: "Iron Condor",
  addLeg: (leg) => set((s) => ({ legs: [...s.legs, leg] })),
  removeLeg: (idx) => set((s) => ({ legs: s.legs.filter((_, i) => i !== idx) })),
  updateLeg: (idx, patch) =>
    set((s) => ({
      legs: s.legs.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    })),
  setLegs: (legs) => set({ legs }),
  setS: (S) => set({ S }),
  setTicker: (ticker) => set({ ticker }),
  setTemplate: (template) => set({ template }),
}));

// Template presets
export const TEMPLATES: Record<string, Leg[]> = {
  "Iron Condor": IRON_CONDOR,
  "Vertical Call Spread": [
    { option_type: "call", strike: 455, expiry_years: 30 / 365, quantity: 1,  sigma: 0.20 },
    { option_type: "call", strike: 470, expiry_years: 30 / 365, quantity: -1, sigma: 0.18 },
  ],
  "Long Straddle": [
    { option_type: "call", strike: 460, expiry_years: 30 / 365, quantity: 1, sigma: 0.18 },
    { option_type: "put",  strike: 460, expiry_years: 30 / 365, quantity: 1, sigma: 0.18 },
  ],
  "Long Strangle": [
    { option_type: "call", strike: 470, expiry_years: 30 / 365, quantity: 1, sigma: 0.17 },
    { option_type: "put",  strike: 450, expiry_years: 30 / 365, quantity: 1, sigma: 0.19 },
  ],
  "Butterfly": [
    { option_type: "call", strike: 450, expiry_years: 30 / 365, quantity: 1,  sigma: 0.20 },
    { option_type: "call", strike: 460, expiry_years: 30 / 365, quantity: -2, sigma: 0.18 },
    { option_type: "call", strike: 470, expiry_years: 30 / 365, quantity: 1,  sigma: 0.17 },
  ],
  "Calendar": [
    { option_type: "call", strike: 460, expiry_years: 30 / 365,  quantity: -1, sigma: 0.18 },
    { option_type: "call", strike: 460, expiry_years: 90 / 365,  quantity: 1,  sigma: 0.20 },
  ],
};
