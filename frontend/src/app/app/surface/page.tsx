"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Plot } from "@/components/charts/Plot";
import { StatusFooter } from "@/components/shell/StatusFooter";
import { useSurface } from "@/lib/api/queries";
import { fmtMs, fmtPct } from "@/lib/format";

export default function SurfacePage() {
  return (
    <Suspense fallback={null}>
      <SurfacePageInner />
    </Suspense>
  );
}

function SurfacePageInner() {
  const searchParams = useSearchParams();
  const urlTicker = searchParams?.get("ticker")?.toUpperCase();
  const [ticker, setTicker] = useState(urlTicker || "SPY");
  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [view, setView] = useState<"surface" | "smile" | "term">("surface");

  // Sync state if the URL ticker changes (user navigates from the palette
  // while already on this page).
  useEffect(() => {
    if (urlTicker && urlTicker !== ticker) {
      setTicker(urlTicker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTicker]);

  const opts = {
    option_type: optionType,
    moneyness_min: 0.85,
    moneyness_max: 1.15,
    dte_min: 7,
    dte_max: 365,
    n_moneyness: 30,
    n_dte: 30,
  };
  const { data, isLoading, error } = useSurface(ticker, opts);

  // Demo fallback when backend unavailable: synthesize a realistic surface so the page renders
  const demoSurface = useMemo(() => synthesizeDemoSurface(), []);
  const surface = data ?? (error ? demoSurface : null);
  const isDemo = !data && !!error;

  return (
    <>
      <div className="h-14 shrink-0 border-b flex items-center gap-5 px-5 bg-ink-900">
        <div className="focus-ring flex items-center gap-2 h-9 px-3 bg-ink-850 border rounded-sm w-[180px]">
          <span className="text-ink-400 text-[11px]">Ticker</span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="bg-transparent outline-none mono text-[13px] text-ink-50 font-semibold w-full"
          />
        </div>
        {surface && (
          <div className="flex items-baseline gap-2 px-1">
            <span className="mono text-[18px] text-ink-50 font-semibold">{surface.spot.toFixed(2)}</span>
            <span className="text-[10px] mono text-ink-400">{ticker} · spot</span>
          </div>
        )}

        <div className="w-px h-7 bg-ink-700/60 mx-1" />

        <div className="inline-flex bg-ink-850 border rounded-sm overflow-hidden">
          {(["call", "put"] as const).map((t) => (
            <button key={t} onClick={() => setOptionType(t)} className={`seg-btn capitalize ${optionType === t ? "seg-active" : ""}`}>
              {t}s
            </button>
          ))}
        </div>

        <div className="inline-flex bg-ink-850 border rounded-sm overflow-hidden">
          {(["surface", "smile", "term"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`seg-btn capitalize ${view === v ? "seg-active" : ""}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        {isDemo && (
          <span className="chip bg-warn-500/15 text-warn-400 mono">demo data · backend offline</span>
        )}
        <span className="text-[11px] text-ink-400">
          DTE <span className="mono text-ink-200">{opts.dte_min} to {opts.dte_max}d</span>
        </span>
        <span className="text-[11px] text-ink-400">
          Mny <span className="mono text-ink-200">{opts.moneyness_min} to {opts.moneyness_max}</span>
        </span>
        <button
          onClick={() => surface && downloadSurfaceCsv(surface)}
          disabled={!surface}
          className="h-7 px-2.5 bg-ink-850 border rounded-sm text-ink-200 hover:border-ink-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-[11px]"
          title="Download IV grid as CSV"
        >
          <Download className="w-3 h-3" strokeWidth={2} />
          Export CSV
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 grid-overlay relative bg-ink-900">
          <div className="absolute top-4 left-5 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="text-[10px] mono text-ink-400">Implied Volatility Surface</div>
            {surface && (
              <div className="text-[11px] mono text-ink-300">
                {surface.ticker} · USD · Bid-Ask Mid · {surface.contracts_used} contracts
              </div>
            )}
          </div>
          {surface && (
            <div className="absolute top-4 right-5 z-10 flex items-center gap-3 pointer-events-none">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="w-3 h-1.5"
                  style={{ background: "linear-gradient(90deg,#1e3a8a,#3b82f6,#22d3ee,#facc15,#f97316,#ef4444)" }}
                />
                <span className="mono text-ink-300">
                  {fmtPct(surface.iv_min ?? 0)} → {fmtPct(surface.iv_max ?? 0)}
                </span>
              </div>
            </div>
          )}
          {isLoading && !isDemo ? (
            <SurfaceSkeleton ticker={ticker} />
          ) : surface ? (
            view === "surface" ? <Surface3D surface={surface} /> :
            view === "smile" ? <SmilePlot surface={surface} /> :
            <TermPlot surface={surface} />
          ) : (
            <div className="grid place-items-center h-full text-ink-400 text-[13px]">
              Enter a ticker to load the chain.
            </div>
          )}
        </section>

        <aside className="w-[340px] shrink-0 border-l bg-ink-950 flex flex-col overflow-y-auto">
          {surface ? <RightRail surface={surface} /> : <RightRailSkeleton />}
        </aside>
      </div>

      <StatusFooter computeMs={surface?.compute_ms} endpoint={`/api/v1/surface (${ticker})`} />
    </>
  );
}

function Surface3D({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  const data = [
    {
      type: "surface" as const,
      x: surface.moneyness_axis,
      y: surface.dte_axis,
      z: surface.iv_grid,
      showscale: false,
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: "#3b82f6", project: { z: true }, width: 1 },
      },
      colorscale: [
        [0.0, "#1e3a8a"], [0.18, "#1d4ed8"], [0.36, "#3b82f6"],
        [0.52, "#22d3ee"], [0.68, "#facc15"], [0.84, "#f97316"], [1.0, "#ef4444"],
      ],
      opacity: 0.96,
      lighting: { ambient: 0.55, diffuse: 0.65, specular: 0.18, roughness: 0.85 },
      hovertemplate: "mny %{x:.2f} · dte %{y}d · σ %{z:.1%}<extra></extra>",
    },
  ];
  return (
    <Plot
      className="w-full h-full"
      data={data as any}
      layout={{
        margin: { l: 0, r: 0, t: 30, b: 0 },
        scene: {
          aspectratio: { x: 1.4, y: 1, z: 0.55 },
          camera: { eye: { x: 1.7, y: -1.6, z: 0.85 }, center: { x: 0, y: 0, z: -0.05 } },
          xaxis: { title: { text: "Moneyness K/S", font: { color: "#5a5a66", size: 10 } },
            gridcolor: "#1a1a1f", zerolinecolor: "#26262d", linecolor: "#26262d",
            tickfont: { color: "#8a8a96", size: 9 }, showbackground: true, backgroundcolor: "#070708" },
          yaxis: { title: { text: "DTE", font: { color: "#5a5a66", size: 10 } },
            gridcolor: "#1a1a1f", zerolinecolor: "#26262d", linecolor: "#26262d",
            tickfont: { color: "#8a8a96", size: 9 }, showbackground: true, backgroundcolor: "#070708" },
          zaxis: { title: { text: "σ_imp", font: { color: "#5a5a66", size: 10 } },
            gridcolor: "#1a1a1f", zerolinecolor: "#26262d", linecolor: "#26262d",
            tickfont: { color: "#8a8a96", size: 9 }, showbackground: true, backgroundcolor: "#070708",
            tickformat: ".0%" },
        },
      } as any}
    />
  );
}

function SmilePlot({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  // Show the smile at the 30d slice (closest)
  const idx = surface.dte_axis.reduce((best, v, i) =>
    Math.abs(v - 30) < Math.abs((surface.dte_axis[best] ?? 9999) - 30) ? i : best, 0);
  const slice = surface.iv_grid[idx] ?? [];
  return (
    <Plot
      className="w-full h-full"
      data={[
        { x: surface.moneyness_axis, y: slice, type: "scatter", mode: "lines+markers",
          line: { color: "#60a5fa", width: 1.8 },
          marker: { color: "#60a5fa", size: 5, line: { color: "#0a0a0b", width: 1 } },
          hovertemplate: "mny %{x:.2f} · σ %{y:.2%}<extra></extra>" },
        { x: [1, 1], y: [0, 1], type: "scatter", mode: "lines",
          line: { color: "#3b82f6", width: 1, dash: "dot" }, hoverinfo: "skip" },
      ]}
      layout={{
        title: { text: `Smile at DTE ≈ ${surface.dte_axis[idx]}d`, font: { color: "#8a8a96", size: 11 } },
        yaxis: { tickformat: ".1%", title: { text: "IV", font: { color: "#5a5a66", size: 10 } } },
        xaxis: { title: { text: "Moneyness K/S", font: { color: "#5a5a66", size: 10 } } },
      }}
    />
  );
}

function TermPlot({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  // ATM slice across all DTE
  const atmIdx = surface.moneyness_axis.reduce((best, v, i) =>
    Math.abs(v - 1) < Math.abs((surface.moneyness_axis[best] ?? 9999) - 1) ? i : best, 0);
  const ivByDte = surface.iv_grid.map((row) => row[atmIdx] ?? null);
  return (
    <Plot
      className="w-full h-full"
      data={[
        { x: surface.dte_axis, y: ivByDte, type: "scatter", mode: "lines+markers",
          line: { color: "#60a5fa", width: 1.8 },
          marker: { color: "#60a5fa", size: 5, line: { color: "#0a0a0b", width: 1 } },
          fill: "tozeroy", fillcolor: "rgba(96,165,250,0.07)",
          hovertemplate: "DTE %{x} · ATM IV %{y:.2%}<extra></extra>" },
      ]}
      layout={{
        title: { text: "ATM Term Structure", font: { color: "#8a8a96", size: 11 } },
        yaxis: { tickformat: ".1%", title: { text: "IV", font: { color: "#5a5a66", size: 10 } } },
        xaxis: { type: "log", title: { text: "Days to expiry (log)", font: { color: "#5a5a66", size: 10 } } },
      } as any}
    />
  );
}

function RightRail({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  return (
    <>
      <div className="p-5 border-b">
        <div className="label mb-3">Surface Statistics</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="Contracts" value={surface.contracts_used.toLocaleString()} />
          <Stat label="DTE buckets" value={surface.dte_axis.length.toString()} />
          <Stat label="ATM IV (30d)" value={fmtPct(surface.atm_iv_30d ?? 0)} />
          <Stat label="Convergence" value={fmtPct(surface.convergence_rate)} accent={surface.convergence_rate > 0.9 ? "up" : "warn"} />
          <Stat label="IV Min" value={fmtPct(surface.iv_min ?? 0)} small />
          <Stat label="IV Max" value={fmtPct(surface.iv_max ?? 0)} small />
        </div>
      </div>

      <div className="p-5 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="label">Term Structure · ATM</div>
        </div>
        <MiniTermStructure surface={surface} />
      </div>

      <div className="p-5 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="label">Skew · 30 DTE</div>
        </div>
        <MiniSkew surface={surface} />
      </div>

      <div className="p-5 mt-auto">
        <div className="label mb-2">Compute</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] mono">
          <div className="flex justify-between"><span className="text-ink-400">Total</span><span className="text-ink-200">{fmtMs(surface.compute_ms)}</span></div>
          <div className="flex justify-between"><span className="text-ink-400">Conv</span><span className="text-up-400">{fmtPct(surface.convergence_rate)}</span></div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent, small }: { label: string; value: string; accent?: "up" | "down" | "warn"; small?: boolean }) {
  const color = accent === "up" ? "text-up-400" : accent === "down" ? "text-down-400" : accent === "warn" ? "text-warn-400" : "text-ink-50";
  return (
    <div>
      <div className="text-[10px] text-ink-400 uppercase tracking-wider">{label}</div>
      <div className={`mono ${small ? "text-[14px] text-ink-100" : "text-[18px]"} ${color} leading-tight`}>{value}</div>
    </div>
  );
}

function MiniTermStructure({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  const atmIdx = surface.moneyness_axis.reduce((best, v, i) =>
    Math.abs(v - 1) < Math.abs((surface.moneyness_axis[best] ?? 9999) - 1) ? i : best, 0);
  const pts = surface.dte_axis.map((d, i) => ({ d, iv: surface.iv_grid[i]?.[atmIdx] }));
  const valid = pts.filter((p): p is { d: number; iv: number } => p.iv != null);
  if (valid.length < 2) return <div className="h-20 grid place-items-center text-[10px] text-ink-400">Not enough points</div>;
  const maxIv = Math.max(...valid.map((p) => p.iv));
  const minIv = Math.min(...valid.map((p) => p.iv));
  const W = 300, H = 80;
  const x = (d: number) => (Math.log(d) - Math.log(valid[0].d)) / (Math.log(valid[valid.length - 1].d) - Math.log(valid[0].d)) * W;
  const y = (iv: number) => H - ((iv - minIv) / Math.max(maxIv - minIv, 1e-6)) * (H - 10) - 5;
  const path = valid.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.d).toFixed(1)},${y(p.iv).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="rgba(59,130,246,0.18)" />
      <path d={path} stroke="#60a5fa" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function MiniSkew({ surface }: { surface: NonNullable<ReturnType<typeof useSurface>["data"]> }) {
  const idx = surface.dte_axis.reduce((best, v, i) =>
    Math.abs(v - 30) < Math.abs((surface.dte_axis[best] ?? 9999) - 30) ? i : best, 0);
  const slice = surface.iv_grid[idx] ?? [];
  const pts = surface.moneyness_axis
    .map((m, i) => ({ m, iv: slice[i] }))
    .filter((p): p is { m: number; iv: number } => p.iv != null);
  if (pts.length < 2) return <div className="h-20 grid place-items-center text-[10px] text-ink-400">Not enough points</div>;
  const maxIv = Math.max(...pts.map((p) => p.iv));
  const minIv = Math.min(...pts.map((p) => p.iv));
  const W = 300, H = 80;
  const x = (m: number) => (m - pts[0].m) / (pts[pts.length - 1].m - pts[0].m) * W;
  const y = (iv: number) => H - ((iv - minIv) / Math.max(maxIv - minIv, 1e-6)) * (H - 10) - 5;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.m).toFixed(1)},${y(p.iv).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <line x1={W/2} y1="0" x2={W/2} y2={H} stroke="#26262d" strokeDasharray="2 3" />
      <path d={path} stroke="#fbbf24" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function downloadSurfaceCsv(s: NonNullable<ReturnType<typeof useSurface>["data"]>) {
  const header = ["dte_days", ...s.moneyness_axis.map((m) => `mny_${m.toFixed(3)}`)];
  const rows = s.iv_grid.map((row, i) => [
    String(s.dte_axis[i] ?? ""),
    ...row.map((v) => (v == null ? "" : v.toFixed(6))),
  ]);
  const meta = [
    `# Vol Lab · implied volatility surface`,
    `# ticker=${s.ticker} spot=${s.spot.toFixed(4)} option_type=${s.option_type}`,
    `# atm_iv_30d=${s.atm_iv_30d ?? ""} iv_min=${s.iv_min ?? ""} iv_max=${s.iv_max ?? ""}`,
    `# contracts_used=${s.contracts_used} convergence_rate=${s.convergence_rate.toFixed(4)}`,
    `# exported_at=${new Date().toISOString()}`,
  ];
  const csv = [...meta, header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vollab-${s.ticker.toLowerCase()}-surface-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SurfaceSkeleton({ ticker }: { ticker: string }) {
  return (
    <div className="w-full h-full grid place-items-center">
      <div className="text-center space-y-2 max-w-[500px]">
        <div className="text-[13px] mono text-ink-200">
          Fetching <span className="text-accent-400">{ticker}</span> chain
          <span className="ml-1 animate-pulse">…</span>
        </div>
        <div className="text-[11px] mono text-ink-400">
          inverting IVs · interpolating surface · about 1 to 3 seconds on first call · cached 5 min
        </div>
        <div className="skeleton h-[220px] w-[420px] mt-4 mx-auto" />
      </div>
    </div>
  );
}

function RightRailSkeleton() {
  return (
    <div className="p-5 space-y-3">
      <div className="skeleton h-3 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-2 w-16" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Demo synth, used only when backend is unreachable
function synthesizeDemoSurface(): NonNullable<ReturnType<typeof useSurface>["data"]> {
  const moneyness_axis: number[] = [];
  for (let m = 0.85; m <= 1.151; m += 0.01) moneyness_axis.push(parseFloat(m.toFixed(2)));
  const dte_axis = [7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365];
  const iv_grid = dte_axis.map((t) =>
    moneyness_axis.map((m) => {
      const atm = 0.14 + 0.075 * Math.sqrt(t / 365);
      const k = m - 1;
      const skewSlope = -0.55 * Math.exp(-t / 180) - 0.08;
      const smileCurv = 1.6 * Math.exp(-t / 120) + 0.55;
      const wing = k > 0 ? 0.2 : 0.85;
      return atm + skewSlope * k + smileCurv * k * k * wing;
    }),
  );
  return {
    ticker: "SPY",
    spot: 459.30,
    option_type: "call" as const,
    moneyness_axis,
    dte_axis,
    iv_grid,
    atm_iv_30d: 0.1734,
    iv_min: 0.102,
    iv_max: 0.428,
    contracts_used: 1247,
    convergence_rate: 0.994,
    compute_ms: 121.4,
  };
}
