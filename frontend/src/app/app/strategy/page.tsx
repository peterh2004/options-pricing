"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Plot } from "@/components/charts/Plot";
import { StatusFooter } from "@/components/shell/StatusFooter";
import { AnimatedGreek } from "@/components/strategy/AnimatedGreek";
import { useStrategyPnl, useStrategyPriceMutation } from "@/lib/api/queries";
import { useAnimatedNumber } from "@/lib/hooks/useAnimatedNumber";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { fmtMoney, fmtMs, fmtNum, fmtPct, fmtSigned } from "@/lib/format";
import { TEMPLATES, useStrategyStore } from "@/stores/strategyStore";

export default function StrategyPage() {
  const { legs, S, r, q, ticker, template, addLeg, removeLeg, updateLeg, setLegs, setTemplate } =
    useStrategyStore();
  const [tab, setTab] = useState<"payoff" | "heatmap">("payoff");

  const dLegs = useDebounce(legs, 180);
  const priceMutation = useStrategyPriceMutation();

  // Re-price whenever legs or S change
  useEffect(() => {
    priceMutation.mutate({ legs: dLegs, S, r, q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dLegs, S, r, q]);

  const priced = priceMutation.data;

  // P&L grid for heatmap
  const pnlReq = useMemo(() => {
    const maxExp = Math.max(...legs.map((l) => l.expiry_years));
    return {
      legs: dLegs,
      S,
      r,
      q,
      S_min: S * 0.9,
      S_max: S * 1.1,
      n_S: 40,
      t_max_years: maxExp,
      n_t: 20,
    };
  }, [dLegs, S, r, q, legs]);
  const pnl = useStrategyPnl(pnlReq, tab === "heatmap");

  const netGreeks = priced?.net_greeks ?? { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };

  return (
    <>
      <div className="h-14 shrink-0 border-b flex items-center gap-4 px-5 bg-ink-900">
        <div className="focus-ring flex items-center gap-2 h-9 px-3 bg-ink-850 border rounded-sm w-[180px]">
          <span className="text-ink-400 text-[11px]">Underlier</span>
          <span className="mono text-[13px] text-ink-50 font-semibold w-full">{ticker}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="mono text-[16px] text-ink-50 font-semibold">{S.toFixed(2)}</span>
          <span className="mono text-[11px] text-up-400">+0.42</span>
        </div>

        <div className="w-px h-7 bg-ink-700/60 mx-1" />

        <div className="flex gap-1">
          {Object.keys(TEMPLATES).map((name) => (
            <button
              key={name}
              onClick={() => {
                setTemplate(name);
                setLegs(TEMPLATES[name]!);
              }}
              className={`seg-btn ${template === name ? "seg-active" : ""}`}
            >
              {name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="text-[11px] text-ink-400">
          r <span className="mono text-ink-200">{fmtPct(r)}</span>
        </span>
        <button
          onClick={() => downloadStrategyJson({ legs, S, r, q, ticker, template })}
          className="h-7 px-2.5 bg-ink-850 border rounded-sm text-ink-200 hover:border-ink-600 flex items-center gap-1.5 text-[11px]"
          title="Download strategy as JSON"
        >
          <Save className="w-3 h-3" strokeWidth={2} />
          Save
        </button>
        <button
          onClick={() =>
            addLeg({
              option_type: "call",
              strike: Math.round(S / 5) * 5,
              expiry_years: 30 / 365,
              quantity: 1,
              sigma: 0.18,
            })
          }
          className="h-7 px-2.5 bg-accent-500/15 border border-accent-500/30 text-accent-400 hover:bg-accent-500/25 rounded-sm flex items-center gap-1.5 text-[11px] font-medium"
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
          Add Leg
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_440px]">
        {/* LEFT: leg editor + footer KPIs */}
        <section className="flex flex-col min-w-0">
          <div className="h-12 flex items-center justify-between px-5 border-b bg-ink-900/50">
            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-ink-300">{legs.length} legs</span>
              <span className="text-ink-500">·</span>
              <span className="text-ink-300">
                {priced && (
                  <>
                    Net{" "}
                    {priced.net_price < 0 ? (
                      <span className="mono text-up-400">credit {fmtMoney(Math.abs(priced.net_price), 2)}</span>
                    ) : (
                      <span className="mono text-down-400">debit {fmtMoney(priced.net_price, 2)}</span>
                    )}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              {priced && (
                <>
                  <span className={`chip mono ${priced.net_greeks.vega < 0 ? "bg-up-950/50 text-up-400" : "bg-down-950/50 text-down-400"}`}>
                    {priced.net_greeks.vega < 0 ? "short vol" : "long vol"}
                  </span>
                  <span className={`chip mono ${priced.net_greeks.gamma < 0 ? "bg-down-950/50 text-down-400" : "bg-up-950/50 text-up-400"}`}>
                    {priced.net_greeks.gamma < 0 ? "short gamma" : "long gamma"}
                  </span>
                  <span className={`chip mono ${priced.net_greeks.theta > 0 ? "bg-up-950/50 text-up-400" : "bg-ink-800 text-ink-300"}`}>
                    θ {priced.net_greeks.theta > 0 ? "positive" : "negative"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-[12px] mono">
              <thead className="sticky top-0 bg-ink-950 z-10">
                <tr className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
                  <th className="text-left font-medium w-8 px-3 py-2.5"></th>
                  <th className="text-left font-medium px-2">Action</th>
                  <th className="text-left font-medium px-2">Type</th>
                  <th className="text-right font-medium px-2">Strike</th>
                  <th className="text-right font-medium px-2">DTE</th>
                  <th className="text-right font-medium px-2">Qty</th>
                  <th className="text-right font-medium px-2">σ</th>
                  <th className="text-right font-medium px-2">Mid</th>
                  <th className="text-right font-medium px-2">Δ</th>
                  <th className="text-right font-medium px-2">Γ</th>
                  <th className="text-right font-medium px-2">ν</th>
                  <th className="text-right font-medium px-2">Θ</th>
                  <th className="text-right font-medium px-2 pr-4">P/L</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => {
                  const pricedLeg = priced?.legs[i];
                  const isLong = leg.quantity > 0;
                  return (
                    <tr key={i} className="border-b border-ink-800 hover:bg-ink-800/40">
                      <td className="px-3 py-2 text-ink-500">{i + 1}</td>
                      <td className="px-2">
                        <button
                          onClick={() => updateLeg(i, { quantity: -leg.quantity })}
                          className={`pill border ${isLong ? "bg-up-950/60 text-up-400 border-up-500/20" : "bg-down-950/60 text-down-400 border-down-500/20"}`}
                        >
                          {isLong ? "LONG" : "SHORT"}
                        </button>
                      </td>
                      <td className="px-2">
                        <button
                          onClick={() => updateLeg(i, { option_type: leg.option_type === "call" ? "put" : "call" })}
                          className={`pill border ${leg.option_type === "call" ? "bg-up-950/60 text-up-400 border-up-500/20" : "bg-down-950/60 text-down-400 border-down-500/20"}`}
                        >
                          {leg.option_type.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-2 text-right">
                        <input
                          type="number"
                          value={leg.strike}
                          onChange={(e) => updateLeg(i, { strike: parseFloat(e.target.value) || 0 })}
                          className="bg-transparent outline-none text-ink-50 w-16 text-right focus:bg-ink-800 px-1 py-0.5 rounded-sm"
                          step="1"
                        />
                      </td>
                      <td className="px-2 text-right">
                        <input
                          type="number"
                          value={Math.round(leg.expiry_years * 365)}
                          onChange={(e) => {
                            const d = parseInt(e.target.value) || 1;
                            updateLeg(i, { expiry_years: Math.max(d, 1) / 365 });
                          }}
                          className="bg-transparent outline-none text-ink-200 w-10 text-right focus:bg-ink-800 px-1 py-0.5 rounded-sm"
                          min="1"
                          step="1"
                          title="Days to expiry"
                        />
                        <span className="text-ink-500 text-[10px] ml-0.5">d</span>
                      </td>
                      <td className="px-2 text-right">
                        <input
                          type="number"
                          value={Math.abs(leg.quantity)}
                          onChange={(e) => updateLeg(i, { quantity: (parseFloat(e.target.value) || 1) * Math.sign(leg.quantity || 1) })}
                          className="bg-transparent outline-none text-ink-50 w-10 text-right focus:bg-ink-800 px-1 py-0.5 rounded-sm"
                          min="1"
                        />
                      </td>
                      <td className="px-2 text-right">
                        <input
                          type="number"
                          value={(leg.sigma * 100).toFixed(2)}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value);
                            if (!Number.isNaN(pct) && pct > 0) {
                              updateLeg(i, { sigma: pct / 100 });
                            }
                          }}
                          className="bg-transparent outline-none text-ink-300 w-14 text-right focus:bg-ink-800 px-1 py-0.5 rounded-sm"
                          min="0.01"
                          step="0.1"
                          title="Implied volatility (annualized)"
                        />
                        <span className="text-ink-500 text-[10px]">%</span>
                      </td>
                      <td className="px-2 text-right text-ink-50">{pricedLeg ? `${pricedLeg.price.toFixed(2)}` : "…"}</td>
                      <td className="px-2 text-right"><Cell v={pricedLeg?.greeks.delta} d={3} /></td>
                      <td className="px-2 text-right"><Cell v={pricedLeg?.greeks.gamma} d={4} /></td>
                      <td className="px-2 text-right"><Cell v={pricedLeg?.greeks.vega} d={3} /></td>
                      <td className="px-2 text-right"><Cell v={pricedLeg?.greeks.theta} d={4} /></td>
                      <td className="px-2 pr-4 text-right">
                        <Cell v={pricedLeg ? leg.quantity * pricedLeg.price * 100 : null} d={2} money />
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => removeLeg(i)}
                          className="text-ink-500 hover:text-down-400"
                          title="remove leg"
                        >
                          <Trash2 className="w-3 h-3 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {priced && (
                  <tr className="bg-ink-900 border-t border-ink-600 border-b border-ink-600">
                    <td className="px-3 py-3"></td>
                    <td colSpan={6} className="px-2 text-ink-200 font-medium uppercase text-[10px] tracking-wider">
                      Net Position
                    </td>
                    <td className="px-2 text-right text-ink-50 font-semibold">{priced.net_price.toFixed(2)}</td>
                    <td className="px-2 text-right font-semibold"><Cell v={priced.net_greeks.delta} d={3} /></td>
                    <td className="px-2 text-right font-semibold"><Cell v={priced.net_greeks.gamma} d={4} /></td>
                    <td className="px-2 text-right font-semibold"><Cell v={priced.net_greeks.vega} d={3} /></td>
                    <td className="px-2 text-right font-semibold"><Cell v={priced.net_greeks.theta} d={4} /></td>
                    <td className="px-2 pr-4 text-right font-semibold">
                      <Cell v={priced.net_price * 100} d={2} money />
                    </td>
                    <td></td>
                  </tr>
                )}

                <tr>
                  <td colSpan={14} className="px-3 py-2">
                    <button
                      onClick={() =>
                        addLeg({
                          option_type: "call",
                          strike: Math.round(S / 5) * 5,
                          expiry_years: 30 / 365,
                          quantity: 1,
                          sigma: 0.18,
                        })
                      }
                      className="w-full h-9 border border-dashed border-ink-600 rounded-sm text-ink-400 hover:text-ink-100 hover:border-accent-500/40 hover:bg-accent-500/5 flex items-center justify-center gap-2 text-[12px]"
                    >
                      <Plus className="w-3 h-3" strokeWidth={2} />
                      Add leg
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer KPIs */}
          <div className="border-t border-ink-600 bg-ink-950 px-5 py-4">
            <div className="grid grid-cols-5 gap-6">
              <Kpi label="Max Profit" value={priced ? fmtMoney(priced.max_profit * 100, 0) : "…"} color="text-up-400" />
              <Kpi label="Max Loss" value={priced ? fmtMoney(priced.max_loss * 100, 0) : "…"} color="text-down-400" />
              <Kpi
                label="Breakevens"
                value={priced && priced.breakevens.length ? priced.breakevens.map((b) => b.toFixed(2)).join(" · ") : "…"}
                color="text-ink-100"
                small
              />
              <Kpi label="Reward / Risk" value={priced && priced.max_loss !== 0 ? Math.abs(priced.max_profit / priced.max_loss).toFixed(2) : "…"} color="text-ink-50" />
              <Kpi label="Compute" value={priced ? fmtMs(priced.compute_ms) : "…"} color="text-ink-200" small />
            </div>
          </div>
        </section>

        {/* RIGHT: net Greeks + payoff/heatmap */}
        <aside className="border-l bg-ink-950 flex flex-col min-h-0">
          <div className="border-b">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="label">Net Greeks · live</div>
              <span className="text-[10px] mono text-ink-500">
                {priced ? `re-priced ${fmtMs(priced.compute_ms)}` : "…"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-ink-700/50">
              <AnimatedGreek
                label="Delta" symbol="Δ" value={netGreeks.delta} format={(v) => fmtNum(v, 3)}
                helper={<>dP/dS · spot {S.toFixed(2)}</>}
                spark={<MiniSpark seed={1} />}
              />
              <AnimatedGreek
                label="Gamma" symbol="Γ" value={netGreeks.gamma} format={(v) => fmtNum(v, 4)}
                helper={netGreeks.gamma < 0 ? <>short gamma · pin risk</> : <>long gamma · convexity</>}
                spark={<MiniBell flip={netGreeks.gamma < 0} />}
              />
              <AnimatedGreek
                label="Vega" symbol="ν" value={netGreeks.vega} format={(v) => fmtNum(v, 3)}
                helper={<>per +1 vol pt</>}
                spark={<MiniBar value={netGreeks.vega} max={1} />}
              />
              <AnimatedGreek
                label="Theta" symbol="Θ" value={netGreeks.theta} format={(v) => fmtNum(v, 4)}
                helper={netGreeks.theta > 0 ? <>earn / day</> : <>decay / day</>}
                spark={<MiniSpark seed={3} />}
              />
              <div className="col-span-2 bg-ink-950 px-4 py-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-ink-400 uppercase tracking-wider">Rho</span>
                  <span className="text-[10px] mono text-ink-500">ρ · per 1% rate</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div className="mono text-[18px] text-ink-100 leading-none">
                    <AnimatedRho value={netGreeks.rho} />
                  </div>
                  <MiniSpark seed={5} width={128} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-b">
            <button onClick={() => setTab("payoff")} className={`px-3.5 py-2 text-[12px] border-b ${tab === "payoff" ? "text-ink-50 border-accent-400" : "text-ink-400 border-transparent"}`}>
              Payoff · expiry
            </button>
            <button onClick={() => setTab("heatmap")} className={`px-3.5 py-2 text-[12px] border-b ${tab === "heatmap" ? "text-ink-50 border-accent-400" : "text-ink-400 border-transparent"}`}>
              P&L heatmap
            </button>
            <div className="flex-1 border-b" />
          </div>

          <div className="flex-1 min-h-0 p-3">
            {tab === "payoff" ? (
              <PayoffPlot legs={dLegs} S={S} cost={priced?.cost_basis ?? 0} />
            ) : (
              <HeatmapPlot data={pnl.data} />
            )}
          </div>
        </aside>
      </div>

      <StatusFooter computeMs={priced?.compute_ms} endpoint="/api/v1/strategy/price" />
    </>
  );
}

function Cell({ v, d, money }: { v: number | null | undefined; d: number; money?: boolean }) {
  if (v == null) return <span className="text-ink-500">…</span>;
  const cls = v > 0 ? "text-up-400" : v < 0 ? "text-down-400" : "text-ink-200";
  return <span className={cls}>{money ? fmtSigned(v, d) : fmtSigned(v, d)}</span>;
}

function Kpi({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mono leading-tight mt-1 ${color} ${small ? "text-[14px]" : "text-[20px]"}`}>{value}</div>
    </div>
  );
}

function AnimatedRho({ value }: { value: number }) {
  const animated = useAnimatedNumber(value, { duration: 300 });
  return <>{fmtSigned(animated, 4)}</>;
}

function downloadStrategyJson(args: {
  legs: ReadonlyArray<{ option_type: "call" | "put"; strike: number; expiry_years: number; quantity: number; sigma: number }>;
  S: number;
  r: number;
  q: number;
  ticker: string;
  template: string;
}) {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    ticker: args.ticker,
    template: args.template,
    spot: args.S,
    risk_free_rate: args.r,
    dividend_yield: args.q,
    legs: args.legs.map((l) => ({
      ...l,
      dte_days: Math.round(l.expiry_years * 365),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = args.template.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.download = `vollab-${args.ticker.toLowerCase()}-${safe}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function MiniSpark({ seed, width = 100 }: { seed: number; width?: number }) {
  // Deterministic squiggle so SSR + CSR match
  const h = 20;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const x = (i / 7) * width;
    const y = h / 2 + Math.sin(i * 0.7 + seed) * (h / 3);
    return `${x},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${h}`} className="w-full h-5">
      <polyline points={pts.join(" ")} stroke="#5a5a66" strokeWidth="1" fill="none" />
      <line x1={width / 2} y1="0" x2={width / 2} y2={h} stroke="#26262d" strokeDasharray="2 2" strokeWidth="0.75" />
    </svg>
  );
}

function MiniBell({ flip }: { flip: boolean }) {
  return (
    <svg viewBox="0 0 100 20" className="w-full h-5">
      <path
        d={flip ? "M0,5 Q50,22 100,5" : "M0,18 Q50,2 100,18"}
        fill="none"
        stroke={flip ? "#f87171" : "#34d399"}
        strokeWidth="1"
      />
      <line x1="50" y1="0" x2="50" y2="20" stroke="#26262d" strokeDasharray="2 2" strokeWidth="0.75" />
    </svg>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const w = Math.min(Math.abs(value) / max, 1) * 100;
  const color = value >= 0 ? "bg-up-400" : "bg-down-400";
  return (
    <svg viewBox="0 0 100 20" className="w-full h-5">
      <rect x="0" y="9" width="100" height="2" fill="#26262d" />
      <rect x="0" y="6" width={w} height="8" className={value >= 0 ? "fill-up-400" : "fill-down-400"} />
      <line x1="50" y1="0" x2="50" y2="20" stroke="#26262d" strokeDasharray="2 2" strokeWidth="0.75" />
    </svg>
  );
}

function PayoffPlot({ legs, S, cost }: { legs: { option_type: "call" | "put"; strike: number; quantity: number }[]; S: number; cost: number }) {
  const xs = useMemo(() => {
    const out: number[] = [];
    const lo = S * 0.85, hi = S * 1.15;
    const step = (hi - lo) / 200;
    for (let s = lo; s <= hi; s += step) out.push(s);
    return out;
  }, [S]);
  const ys = xs.map((s) => {
    let v = 0;
    for (const leg of legs) {
      const intrinsic = leg.option_type === "call" ? Math.max(s - leg.strike, 0) : Math.max(leg.strike - s, 0);
      v += leg.quantity * intrinsic;
    }
    return (v - cost) * 100;
  });
  const profitMask = ys.map((v) => (v >= 0 ? v : null));
  const lossMask = ys.map((v) => (v < 0 ? v : null));
  return (
    <Plot
      className="w-full h-full min-h-[260px]"
      data={[
        { x: xs, y: lossMask, type: "scatter", mode: "lines", fill: "tozeroy",
          line: { color: "#ef4444", width: 1.5 }, fillcolor: "rgba(239,68,68,0.15)",
          hovertemplate: "S %{x:.2f} · P/L $%{y:.0f}<extra></extra>" },
        { x: xs, y: profitMask, type: "scatter", mode: "lines", fill: "tozeroy",
          line: { color: "#10b981", width: 1.5 }, fillcolor: "rgba(16,185,129,0.15)",
          hovertemplate: "S %{x:.2f} · P/L $%{y:.0f}<extra></extra>" },
        { x: [S, S], y: [-1e9, 1e9], type: "scatter", mode: "lines",
          line: { color: "#60a5fa", width: 1, dash: "dot" }, hoverinfo: "skip" },
      ]}
      layout={{
        margin: { l: 50, r: 14, t: 14, b: 32 },
        xaxis: { tickformat: ".0f", title: { text: "Spot at expiry", font: { color: "#5a5a66", size: 10 } } },
        yaxis: { tickformat: "$,.0f", title: { text: "P&L", font: { color: "#5a5a66", size: 10 } } },
      }}
    />
  );
}

function HeatmapPlot({ data }: { data?: { S_axis: number[]; t_axis: number[]; grid: number[][] } }) {
  if (!data) return <div className="w-full h-full skeleton" />;
  return (
    <Plot
      className="w-full h-full min-h-[260px]"
      data={[{
        z: data.grid,
        x: data.S_axis,
        y: data.t_axis.map((t) => `${(t * 365).toFixed(0)}d`),
        type: "heatmap",
        showscale: true,
        colorscale: [[0, "#7f1d1d"], [0.35, "#451a03"], [0.5, "#0a0a0b"], [0.65, "#064e3b"], [1, "#10b981"]],
        hovertemplate: "S %{x:.0f} · t %{y} · P/L $%{z:.2f}<extra></extra>",
        // zmid is a valid plotly heatmap attribute though missing from the typedef
      } as any]}
      layout={{
        margin: { l: 40, r: 6, t: 4, b: 32 },
        xaxis: { gridcolor: "transparent", tickformat: ".0f" },
        yaxis: { gridcolor: "transparent" },
      } as any}
    />
  );
}
