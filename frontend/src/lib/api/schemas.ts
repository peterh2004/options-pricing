// Zod schemas. Mirror backend/app/models/schemas.py exactly.
// Every API response is parsed through these. No `any` in the app.

import { z } from "zod";

export const optionType = z.enum(["call", "put"]);
export const exerciseStyle = z.enum(["european", "american"]);
export const pricingMethod = z.enum(["black_scholes", "binomial", "monte_carlo"]);

export const greeksSchema = z.object({
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  rho: z.number(),
});
export type Greeks = z.infer<typeof greeksSchema>;

export const priceResponseSchema = z.object({
  price: z.number(),
  greeks: greeksSchema,
  method: pricingMethod,
  compute_ms: z.number(),
  stderr: z.number().nullable(),
  half_ci_95: z.number().nullable(),
});
export type PriceResponse = z.infer<typeof priceResponseSchema>;

export const ivResponseSchema = z.object({
  iv: z.number().nullable(),
  iterations: z.number(),
  converged: z.boolean(),
  method: z.enum(["newton", "bisection", "hybrid", "failed"]),
  residual: z.number().nullable(),
  compute_ms: z.number(),
});

export const contractSchema = z.object({
  contract_symbol: z.string(),
  option_type: optionType,
  strike: z.number(),
  expiry: z.string(),
  days_to_expiry: z.number(),
  bid: z.number().nullable(),
  ask: z.number().nullable(),
  last: z.number().nullable(),
  mid: z.number().nullable(),
  volume: z.number().nullable(),
  open_interest: z.number().nullable(),
  implied_volatility: z.number().nullable(),
});
export type Contract = z.infer<typeof contractSchema>;

export const chainResponseSchema = z.object({
  ticker: z.string(),
  spot: z.number(),
  fetched_at: z.string(),
  contracts: z.array(contractSchema),
  compute_ms: z.number(),
});
export type ChainResponse = z.infer<typeof chainResponseSchema>;

export const surfaceResponseSchema = z.object({
  ticker: z.string(),
  spot: z.number(),
  option_type: optionType,
  moneyness_axis: z.array(z.number()),
  dte_axis: z.array(z.number()),
  iv_grid: z.array(z.array(z.number().nullable())),
  atm_iv_30d: z.number().nullable(),
  iv_min: z.number().nullable(),
  iv_max: z.number().nullable(),
  contracts_used: z.number(),
  convergence_rate: z.number(),
  compute_ms: z.number(),
});
export type SurfaceResponse = z.infer<typeof surfaceResponseSchema>;

export const legSchema = z.object({
  option_type: optionType,
  strike: z.number(),
  expiry_years: z.number(),
  quantity: z.number(),
  sigma: z.number(),
});
export type Leg = z.infer<typeof legSchema>;

export const legPricedSchema = z.object({
  leg: legSchema,
  price: z.number(),
  greeks: greeksSchema,
});

export const strategyPriceResponseSchema = z.object({
  legs: z.array(legPricedSchema),
  net_price: z.number(),
  net_greeks: greeksSchema,
  cost_basis: z.number(),
  max_profit: z.number(),
  max_loss: z.number(),
  breakevens: z.array(z.number()),
  compute_ms: z.number(),
});
export type StrategyPriceResponse = z.infer<typeof strategyPriceResponseSchema>;

export const strategyPnlResponseSchema = z.object({
  S_axis: z.array(z.number()),
  t_axis: z.array(z.number()),
  grid: z.array(z.array(z.number())),
  compute_ms: z.number(),
});
export type StrategyPnlResponse = z.infer<typeof strategyPnlResponseSchema>;

export const ivAnalysisResponseSchema = z.object({
  ticker: z.string(),
  spot: z.number(),
  atm_iv_30d: z.number().nullable(),
  rv_30d: z.number().nullable(),
  rv_60d: z.number().nullable(),
  rv_1y: z.number().nullable(),
  vrp: z.number().nullable(),
  term_structure: z.array(z.object({ dte: z.number(), atm_iv: z.number() })),
  skew_at_30d: z.array(z.object({
    strike: z.number(), moneyness: z.number(), iv: z.number(), option_type: optionType,
  })),
  iv_series: z.array(z.object({ date: z.string(), value: z.number() })),
  rv_series: z.array(z.object({ date: z.string(), value: z.number() })),
  compute_ms: z.number(),
});
export type IVAnalysisResponse = z.infer<typeof ivAnalysisResponseSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptime_seconds: z.number(),
});
