// TanStack Query factories. Keeps query keys consistent and types tight.

import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { api } from "./client";
import {
  type ChainResponse,
  chainResponseSchema,
  healthResponseSchema,
  type IVAnalysisResponse,
  ivAnalysisResponseSchema,
  ivResponseSchema,
  type PriceResponse,
  priceResponseSchema,
  strategyPnlResponseSchema,
  strategyPriceResponseSchema,
  type SurfaceResponse,
  surfaceResponseSchema,
} from "./schemas";

// ---------- query keys ----------
export const keys = {
  health: ["health"] as const,
  chain: (ticker: string) => ["chain", ticker.toUpperCase()] as const,
  surface: (ticker: string, opts: SurfaceOpts) => ["surface", ticker.toUpperCase(), opts] as const,
  ivAnalysis: (ticker: string) => ["ivAnalysis", ticker.toUpperCase()] as const,
  price: (req: PriceReq) => ["price", req] as const,
};

// ---------- payload types ----------
export interface PriceReq {
  option_type: "call" | "put";
  style?: "european" | "american";
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  q?: number;
  method?: "black_scholes" | "binomial" | "monte_carlo";
  binomial_steps?: number;
  mc_paths?: number;
  mc_seed?: number | null;
}

export interface SurfaceOpts {
  option_type?: "call" | "put";
  moneyness_min?: number;
  moneyness_max?: number;
  dte_min?: number;
  dte_max?: number;
  n_moneyness?: number;
  n_dte?: number;
  r?: number | null;
}

export interface StrategyPriceReq {
  legs: Array<{
    option_type: "call" | "put";
    strike: number;
    expiry_years: number;
    quantity: number;
    sigma: number;
  }>;
  S: number;
  r: number;
  q?: number;
}

export interface StrategyPnlReq extends StrategyPriceReq {
  S_min: number;
  S_max: number;
  n_S: number;
  t_max_years: number;
  n_t: number;
  cost_basis?: number | null;
}

// ---------- queries ----------
export function useHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: () => api.get("/api/v1/health", healthResponseSchema),
    refetchInterval: 10_000,
    retry: 1,
    staleTime: 5_000,
  });
}

export function useChain(ticker: string, enabled = true) {
  return useQuery<ChainResponse>({
    queryKey: keys.chain(ticker),
    queryFn: () => api.get(`/api/v1/chain/${ticker}`, chainResponseSchema),
    enabled: enabled && ticker.length > 0,
    staleTime: 30_000,
  });
}

export function useSurface(ticker: string, opts: SurfaceOpts, enabled = true) {
  return useQuery<SurfaceResponse>({
    queryKey: keys.surface(ticker, opts),
    queryFn: () => api.post("/api/v1/surface", { ticker, ...opts }, surfaceResponseSchema),
    enabled: enabled && ticker.length > 0,
    staleTime: 30_000,
  });
}

export function useIvAnalysis(ticker: string, enabled = true) {
  return useQuery<IVAnalysisResponse>({
    queryKey: keys.ivAnalysis(ticker),
    queryFn: () => api.get(`/api/v1/iv_analysis/${ticker}`, ivAnalysisResponseSchema),
    enabled: enabled && ticker.length > 0,
    staleTime: 60_000,
  });
}

export function usePrice(req: PriceReq, options?: Partial<UseQueryOptions<PriceResponse>>) {
  return useQuery<PriceResponse>({
    queryKey: keys.price(req),
    queryFn: () => api.post("/api/v1/price", req, priceResponseSchema),
    staleTime: 1_000,
    ...options,
  });
}

// ---------- mutations ----------
export function useIvMutation() {
  return useMutation({
    mutationFn: (body: {
      option_type: "call" | "put";
      S: number; K: number; T: number; r: number; market_price: number; q?: number;
    }) => api.post("/api/v1/iv", body, ivResponseSchema),
  });
}

export function useStrategyPriceMutation() {
  return useMutation({
    mutationFn: (body: StrategyPriceReq) =>
      api.post("/api/v1/strategy/price", body, strategyPriceResponseSchema),
  });
}

export function useStrategyPnl(req: StrategyPnlReq, enabled = true) {
  return useQuery({
    queryKey: ["strategyPnl", req],
    queryFn: () => api.post("/api/v1/strategy/pnl", req, strategyPnlResponseSchema),
    enabled,
    staleTime: 2_000,
  });
}
