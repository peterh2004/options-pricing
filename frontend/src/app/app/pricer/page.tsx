"use client";

import { useMemo, useState } from "react";

import { GreekCardGrid } from "@/components/charts/GreekCards";
import { Plot } from "@/components/charts/Plot";
import { StatusFooter } from "@/components/shell/StatusFooter";
import { usePrice } from "@/lib/api/queries";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { fmtMoney, fmtMs, fmtNum, fmtPct, fmtSigned } from "@/lib/format";

const DEFAULTS = {
  ticker: "SPY",
  S: 459.30,
  K: 460,
  dte: 34,
  sigma: 0.1734,
  r: 0.04288,
  q: 0.0135,
  option_type: "call" as const,
  style: "european" as const,
};

export default function PricerPage() {
  const [optionType, setOptionType] = useState<"call" | "put">(DEFAULTS.option_type);
  const [style, setStyle] = useState<"european" | "american">(DEFAULTS.style);
  const [S, setS] = useState(DEFAULTS.S);
  const [K, setK] = useState(DEFAULTS.K);
  const [dte, setDte] = useState(DEFAULTS.dte);
  const [sigma, setSigma] = useState(DEFAULTS.sigma);
  const [r, setR] = useState(DEFAULTS.r);
  const [q, setQ] = useState(DEFAULTS.q);
  const [method, setMethod] = useState<"black_scholes" | "binomial" | "monte_carlo">("black_scholes");

  // Debounce slider inputs to avoid spamming the API
  const dSigma = useDebounce(sigma, 150);
  const dR = useDebounce(r, 150);
  const dQ = useDebounce(q, 150);
  const dK = useDebounce(K, 150);
  const dDte = useDebounce(dte, 150);

  const baseReq = useMemo(
    () => ({
      option_type: optionType,
      style,
      S,
      K: dK,
      T: dDte / 365,
      r: dR,
      sigma: dSigma,
      q: dQ,
      method,
    }),
    [optionType, style, S, dK, dDte, dR, dSigma, dQ, method],
  );

  const main = usePrice(baseReq, { refetchOnWindowFocus: false });

  // Method comparison: run all three for the comparison table
  const bs = usePrice({ ...baseReq, method: "black_scholes" });
  const binom = usePrice({ ...baseReq, method: "binomial", binomial_steps: 500 });
  const mc = usePrice({ ...baseReq, method: "monte_carlo", mc_paths: 10000, mc_seed: 42 });

  const data = main.data;

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr] overflow-hidden">
        {/* LEFT: form */}
        <aside className="border-r bg-ink-950 flex flex-col overflow-y-auto">
          <div className="p-5 border-b">
            <div className="label">Contract</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setOptionType("call")}
                className={`flex-1 h-8 rounded-sm text-[12px] font-medium border ${
                  optionType === "call"
                    ? "bg-up-950/40 border-up-500/30 text-up-400"
                    : "bg-ink-850 border-ink-700 text-ink-400"
                }`}
              >
                CALL
              </button>
              <button
                onClick={() => setOptionType("put")}
                className={`flex-1 h-8 rounded-sm text-[12px] font-medium border ${
                  optionType === "put"
                    ? "bg-down-950/40 border-down-500/30 text-down-400"
                    : "bg-ink-850 border-ink-700 text-ink-400"
                }`}
              >
                PUT
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setStyle("european")}
                className={`flex-1 h-8 rounded-sm text-[12px] border ${
                  style === "european"
                    ? "bg-ink-800 border-ink-600 text-ink-100 font-medium"
                    : "bg-ink-850 border-ink-700 text-ink-400"
                }`}
              >
                European
              </button>
              <button
                onClick={() => setStyle("american")}
                className={`flex-1 h-8 rounded-sm text-[12px] border ${
                  style === "american"
                    ? "bg-ink-800 border-ink-600 text-ink-100 font-medium"
                    : "bg-ink-850 border-ink-700 text-ink-400"
                }`}
              >
                American
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 border-b">
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="label">Spot (S)</label>
                <span className="text-[10px] mono text-up-400">live</span>
              </div>
              <div className="focus-ring bg-ink-850 border h-9 px-3 rounded-sm flex items-center">
                <input
                  type="number"
                  value={S}
                  onChange={(e) => setS(parseFloat(e.target.value) || 0)}
                  className="bg-transparent outline-none mono text-[13px] text-ink-50 font-semibold flex-1 text-right"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="label">Strike (K)</label>
                <span className="text-[10px] mono text-ink-300">
                  moneyness <span className="text-ink-100">{(K / S).toFixed(4)}</span>
                </span>
              </div>
              <div className="focus-ring bg-ink-850 border h-9 px-3 rounded-sm flex items-center">
                <input
                  type="number"
                  value={K}
                  onChange={(e) => setK(parseFloat(e.target.value) || 0)}
                  className="bg-transparent outline-none mono text-[13px] text-ink-50 font-semibold flex-1 text-right"
                />
              </div>
              <input
                type="range"
                min={S * 0.7}
                max={S * 1.3}
                step={0.5}
                value={K}
                onChange={(e) => setK(parseFloat(e.target.value))}
                className="slider w-full mt-2.5"
              />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="label">Days to expiry</label>
                <span className="text-[10px] mono text-ink-300">
                  {dte} days · {(dte / 365).toFixed(4)} yr
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={730}
                step={1}
                value={dte}
                onChange={(e) => setDte(parseInt(e.target.value))}
                className="slider w-full"
              />
            </div>
          </div>

          <div className="p-5 space-y-4 border-b">
            <div className="label mb-1">Market</div>
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[11px] text-ink-300">σ · Volatility</label>
                <span className="text-[10px] mono text-ink-300">{fmtPct(sigma)}</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1.5}
                step={0.001}
                value={sigma}
                onChange={(e) => setSigma(parseFloat(e.target.value))}
                className="slider w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[11px] text-ink-300">r · Risk-free rate</label>
                <span className="text-[10px] mono text-ink-300">{fmtPct(r)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.1}
                step={0.0001}
                value={r}
                onChange={(e) => setR(parseFloat(e.target.value))}
                className="slider w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[11px] text-ink-300">q · Dividend yield</label>
                <span className="text-[10px] mono text-ink-300">{fmtPct(q)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.08}
                step={0.0001}
                value={q}
                onChange={(e) => setQ(parseFloat(e.target.value))}
                className="slider w-full"
              />
            </div>
          </div>

          <div className="p-5 mt-auto">
            <div className="label mb-2">Pricing Method</div>
            <div className="space-y-1.5">
              {([
                { id: "black_scholes", label: "Black-Scholes", time: bs.data?.compute_ms },
                { id: "binomial", label: "Binomial (CRR, n=500)", time: binom.data?.compute_ms },
                { id: "monte_carlo", label: "Monte Carlo (10k paths)", time: mc.data?.compute_ms },
              ] as const).map((m) => {
                const active = method === m.id;
                return (
                  <label
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center justify-between p-2 rounded-sm cursor-pointer border ${
                      active
                        ? "bg-ink-850 border-ink-600"
                        : "bg-ink-900 border-ink-700 hover:border-ink-600"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[12px]">
                      <span
                        className={`w-3 h-3 rounded-full border grid place-items-center ${
                          active ? "border-accent-500" : "border-ink-600"
                        }`}
                      >
                        {active && <span className="w-1.5 h-1.5 bg-accent-500 rounded-full" />}
                      </span>
                      <span className={active ? "text-ink-100" : "text-ink-300"}>{m.label}</span>
                    </span>
                    <span className="mono text-[10px] text-up-400">
                      {m.time != null ? fmtMs(m.time) : "…"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT: cards + payoff + comparison */}
        <section className="overflow-y-auto">
          <div className="h-12 flex items-center justify-between px-6 border-b">
            <div className="flex items-baseline gap-3">
              <span className="text-[13px] text-ink-200">
                {DEFAULTS.ticker} {K} {optionType === "call" ? "Call" : "Put"} ·{" "}
                {dte} DTE · {style === "european" ? "European" : "American"}
              </span>
              {data && (
                <span className="text-[10px] mono text-ink-500">computed {fmtMs(data.compute_ms)} ago</span>
              )}
            </div>
            {data && (
              <div className="flex items-center gap-2">
                <span className="chip bg-up-950/50 text-up-400 mono">
                  ✓ {fmtMs(data.compute_ms)}
                </span>
              </div>
            )}
          </div>

          {data ? (
            <GreekCardGrid
              price={data.price}
              greeks={data.greeks}
              S={S}
              K={dK}
              dte={dDte}
              r={dR}
              optionType={optionType}
            />
          ) : (
            <GridSkeleton />
          )}

          {/* Payoff + method comparison */}
          <div className="grid grid-cols-[1fr_440px] gap-px bg-ink-700/40">
            <div className="bg-ink-900 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="label">Payoff Profile</div>
                  <div className="text-[11px] mono text-ink-400 mt-0.5">
                    long 1× {DEFAULTS.ticker} {K} {optionType === "call" ? "Call" : "Put"} · expiry payoff
                  </div>
                </div>
              </div>
              {data && (
                <PayoffPlot S={S} K={dK} premium={data.price} optionType={optionType} />
              )}
            </div>

            <div className="bg-ink-900 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div className="label">Method Comparison</div>
                <span className="text-[10px] mono text-ink-500">tolerances enforced</span>
              </div>
              <table className="w-full text-[12px] mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-ink-500">
                    <th className="text-left font-medium py-2">Method</th>
                    <th className="text-right font-medium py-2">Price</th>
                    <th className="text-right font-medium py-2">Δ vs BS</th>
                    <th className="text-right font-medium py-2 pr-1">Compute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  <MethodRow color="bg-accent-500" label="Black-Scholes" sub="closed-form · numpy"
                             price={bs.data?.price} ref_={bs.data?.price} ms={bs.data?.compute_ms} />
                  <MethodRow color="bg-up-500" label="Binomial CRR" sub="n=500 · backward induction"
                             price={binom.data?.price} ref_={bs.data?.price} ms={binom.data?.compute_ms} />
                  <MethodRow color="bg-warn-500" label="Monte Carlo" sub="10k antithetic · ±stderr"
                             price={mc.data?.price} stderr={mc.data?.stderr} ref_={bs.data?.price}
                             ms={mc.data?.compute_ms} />
                </tbody>
              </table>
              <div className="mt-4 pt-3 border-t text-[11px] mono">
                <KV label="Discount factor" value={Math.exp(-dR * dDte / 365).toFixed(5)} />
                <KV label="Forward" value={(S * Math.exp((dR - dQ) * dDte / 365)).toFixed(4)} />
                {mc.data?.half_ci_95 && (
                  <KV label="MC 95% CI half-width" value={`±${mc.data.half_ci_95.toFixed(4)}`} />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <StatusFooter computeMs={data?.compute_ms} endpoint="/api/v1/price" />
    </>
  );
}

function MethodRow({
  color, label, sub, price, ref_, ms, stderr,
}: {
  color: string; label: string; sub: string;
  price?: number; ref_?: number; ms?: number; stderr?: number | null;
}) {
  const diff = price != null && ref_ != null ? price - ref_ : null;
  return (
    <tr>
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
          <span className="text-ink-50">{label}</span>
        </div>
        <div className="text-[10px] text-ink-500 ml-3.5">{sub}</div>
      </td>
      <td className="text-right text-ink-50">
        {price != null ? `$${price.toFixed(4)}` : "…"}
        {stderr != null && <span className="text-ink-400"> ±{stderr.toFixed(4)}</span>}
      </td>
      <td className={`text-right ${diff == null || Math.abs(diff) < 1e-4 ? "text-ink-400" : diff > 0 ? "text-up-400" : "text-down-400"}`}>
        {diff == null ? "…" : Math.abs(diff) < 1e-10 ? "ref" : fmtSigned(diff, 4)}
      </td>
      <td className="text-right text-ink-200 pr-1">{ms != null ? fmtMs(ms) : "…"}</td>
    </tr>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between mb-1">
      <span className="text-ink-400">{label}</span>
      <span className="text-ink-200">{value}</span>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-px bg-ink-700/40">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-ink-950 p-5 h-[200px]">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-8 w-32 mt-3" />
          <div className="skeleton h-3 w-40 mt-2" />
          <div className="skeleton h-12 w-full mt-4" />
        </div>
      ))}
    </div>
  );
}

function PayoffPlot({
  S, K, premium, optionType,
}: {
  S: number; K: number; premium: number; optionType: "call" | "put";
}) {
  const xs = useMemo(() => {
    const out: number[] = [];
    const lo = Math.min(S, K) * 0.7;
    const hi = Math.max(S, K) * 1.3;
    const step = (hi - lo) / 100;
    for (let s = lo; s <= hi; s += step) out.push(s);
    return out;
  }, [S, K]);
  const ys = useMemo(
    () => xs.map((s) => {
      const intrinsic = optionType === "call" ? Math.max(s - K, 0) : Math.max(K - s, 0);
      return (intrinsic - premium) * 100;
    }),
    [xs, K, premium, optionType],
  );
  const profitMask = ys.map((v) => (v >= 0 ? v : null));
  const lossMask = ys.map((v) => (v < 0 ? v : null));
  const be = optionType === "call" ? K + premium : K - premium;

  return (
    <Plot
      className="w-full h-[260px]"
      data={[
        { x: xs, y: lossMask, type: "scatter", mode: "lines", fill: "tozeroy",
          line: { color: "#ef4444", width: 1.5 }, fillcolor: "rgba(239,68,68,0.13)",
          hovertemplate: "S %{x:.2f} · P/L $%{y:.0f}<extra></extra>" },
        { x: xs, y: profitMask, type: "scatter", mode: "lines", fill: "tozeroy",
          line: { color: "#10b981", width: 1.5 }, fillcolor: "rgba(16,185,129,0.13)",
          hovertemplate: "S %{x:.2f} · P/L $%{y:.0f}<extra></extra>" },
        { x: [S, S], y: [-1e5, 1e5], type: "scatter", mode: "lines",
          line: { color: "#60a5fa", width: 1, dash: "dot" }, hoverinfo: "skip" },
      ]}
      layout={{
        margin: { l: 56, r: 14, t: 14, b: 36 },
        xaxis: { tickformat: ".0f", title: { text: "Underlier price", font: { color: "#5a5a66", size: 10 } } },
        yaxis: { tickformat: "$,.0f", title: { text: "P&L per contract", font: { color: "#5a5a66", size: 10 } } },
        annotations: [
          { x: S, y: ys[Math.floor(ys.length * 0.95)] ?? 0, text: `spot ${S.toFixed(2)}`,
            showarrow: false, font: { color: "#60a5fa", size: 9, family: "JetBrains Mono" } },
          { x: be, y: 0, text: `BE ${be.toFixed(2)}`, showarrow: false,
            font: { color: "#8a8a96", size: 9, family: "JetBrains Mono" }, xanchor: "left" },
        ],
      }}
    />
  );
}
