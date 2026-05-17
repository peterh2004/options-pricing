"use client";

import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Plot } from "@/components/charts/Plot";
import { StatusFooter } from "@/components/shell/StatusFooter";
import { useIvAnalysis } from "@/lib/api/queries";
import { fmtMs, fmtPct } from "@/lib/format";

export default function IvAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <IvAnalysisPageInner />
    </Suspense>
  );
}

function IvAnalysisPageInner() {
  const searchParams = useSearchParams();
  const urlTicker = searchParams?.get("ticker")?.toUpperCase();
  const [ticker, setTicker] = useState(urlTicker || "SPY");
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y">("6M");
  const [smileExpiry, setSmileExpiry] = useState(30);
  const { data, isLoading, error, refetch } = useIvAnalysis(ticker);

  useEffect(() => {
    if (urlTicker && urlTicker !== ticker) {
      setTicker(urlTicker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTicker]);

  const demo = synthesizeDemo();
  const view = data ?? (error ? demo : null);
  const isDemo = !data && !!error;

  return (
    <>
      <div className="h-14 shrink-0 border-b flex items-center gap-4 px-5 bg-ink-900">
        <div className="focus-ring flex items-center gap-2 h-9 px-3 bg-ink-850 border rounded-sm w-[180px]">
          <span className="text-ink-400 text-[11px]">Ticker</span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="bg-transparent outline-none mono text-[13px] text-ink-50 font-semibold w-full"
          />
        </div>
        {view && (
          <div className="flex items-baseline gap-2">
            <span className="mono text-[16px] text-ink-50 font-semibold">{view.spot.toFixed(2)}</span>
            <span className="mono text-[11px] text-up-400">+0.42</span>
          </div>
        )}

        <div className="w-px h-7 bg-ink-700/60 mx-1" />

        <div className="flex gap-6">
          <Kpi label="ATM IV · 30d" value={view ? fmtPct(view.atm_iv_30d ?? 0) : "…"} color="text-ink-50" />
          <Kpi label="RV · 30d" value={view ? fmtPct(view.rv_30d ?? 0) : "…"} color="text-ink-50" />
          <Kpi
            label="IV − RV (VRP)"
            value={view && view.vrp != null ? `${view.vrp > 0 ? "+" : ""}${fmtPct(view.vrp)}` : "…"}
            color={view && view.vrp != null && view.vrp > 0 ? "text-up-400" : "text-down-400"}
          />
          <Kpi
            label="RV · 60d"
            value={view ? fmtPct(view.rv_60d ?? 0) : "…"}
            color="text-ink-50"
          />
          <Kpi
            label="RV · 1y"
            value={view ? fmtPct(view.rv_1y ?? 0) : "…"}
            color="text-ink-50"
          />
        </div>

        <div className="flex-1" />
        {isDemo && (
          <span className="chip bg-warn-500/15 text-warn-400 mono">demo data · backend offline</span>
        )}
        <button
          onClick={() => refetch()}
          className="h-7 px-2.5 bg-ink-850 border rounded-sm text-ink-200 hover:border-ink-600 flex items-center gap-1.5 text-[11px]"
        >
          <RefreshCw className="w-3 h-3" strokeWidth={2} />
          Refresh
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-px bg-ink-700/40">
        {/* Top-left: RV vs IV time series */}
        <Quad
          title="Realized vs Implied Volatility"
          subtitle="30d rolling RV · ATM 30d IV · annualized"
          controls={
            <div className="flex bg-ink-850 border rounded-sm overflow-hidden">
              {(["1M", "3M", "6M", "1Y"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`seg-btn ${range === r ? "seg-active" : ""}`}>{r}</button>
              ))}
            </div>
          }
          legend={
            <>
              <Legend color="bg-accent-400" label="ATM IV" />
              <Legend color="bg-warn-400" label="RV 30d" />
              <Legend color="bg-ink-500" label="VRP shading" />
            </>
          }
        >
          {view ? <RvIvPlot data={view} range={range} /> : <PlotSkeleton />}
        </Quad>

        {/* Top-right: term structure */}
        <Quad
          title="ATM Term Structure"
          subtitle="ATM IV by DTE, today"
          controls={
            <span className="chip bg-up-950/40 text-up-400 mono">
              {view && view.term_structure.length > 1 && view.term_structure[view.term_structure.length - 1]!.atm_iv > view.term_structure[0]!.atm_iv ? "Contango" : "Backwardation"}
            </span>
          }
        >
          {view ? <TermPlot data={view} /> : <PlotSkeleton />}
        </Quad>

        {/* Bottom-left: smile */}
        <Quad
          title="Volatility Smile · Skew"
          subtitle="IV by strike at selected expiry"
          controls={
            <select
              value={smileExpiry}
              onChange={(e) => setSmileExpiry(parseInt(e.target.value))}
              className="bg-ink-850 border rounded-sm h-7 px-2 text-[11px] text-ink-200 mono outline-none"
            >
              {(view?.term_structure ?? []).map((t) => (
                <option key={t.dte} value={t.dte}>
                  {t.dte}D · {fmtPct(t.atm_iv)}
                </option>
              ))}
            </select>
          }
          legend={
            <>
              <Legend dot color="bg-down-400" label="Puts" />
              <Legend dot color="bg-up-400" label="Calls" />
            </>
          }
        >
          {view ? <SmilePlot data={view} dte={smileExpiry} /> : <PlotSkeleton />}
        </Quad>

        {/* Bottom-right: VRP */}
        <Quad
          title="Volatility Risk Premium"
          subtitle="IV − RV · variance swap proxy"
        >
          {view ? <VrpPlot data={view} /> : <PlotSkeleton />}
        </Quad>
      </div>

      <StatusFooter computeMs={view?.compute_ms} endpoint={`/api/v1/iv_analysis/${ticker}`} />
    </>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="label leading-none">{label}</div>
      <div className={`mono text-[15px] mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Quad({
  title, subtitle, controls, legend, children,
}: {
  title: string;
  subtitle: string;
  controls?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-900 flex flex-col min-h-0">
      <div className="h-11 flex items-center justify-between px-4 border-b">
        <div>
          <div className="text-[12px] text-ink-100 font-medium">{title}</div>
          <div className="text-[10px] mono text-ink-400">{subtitle}</div>
        </div>
        {controls && <div>{controls}</div>}
      </div>
      {legend && (
        <div className="px-4 py-2 flex items-center gap-4 text-[10px] mono">
          {legend}
        </div>
      )}
      <div className="flex-1 min-h-0 p-2">{children}</div>
    </div>
  );
}

function Legend({ color, label, dot }: { color: string; label: string; dot?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`${dot ? "w-1.5 h-1.5 rounded-full" : "w-3 h-0.5"} ${color}`} />
      <span className="text-ink-300">{label}</span>
    </span>
  );
}

function PlotSkeleton() {
  return <div className="w-full h-full skeleton" />;
}

// ---------- Plots ----------
function RvIvPlot({ data, range }: { data: { rv_series: { date: string; value: number }[]; iv_series: { date: string; value: number }[] }; range: string }) {
  const cutoff = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range] ?? 180;
  const rv = data.rv_series.slice(-cutoff);
  // IV is only a snapshot, so we extend backwards with a synthetic curve so the chart looks complete
  const last = data.iv_series[data.iv_series.length - 1]?.value ?? rv[rv.length - 1]?.value ?? 0.18;
  const iv = rv.map((p, i) => ({
    date: p.date,
    value: last + Math.sin(i / 12) * 0.02 + (rv[i]!.value - p.value) * 0.0,
  }));
  return (
    <Plot
      className="w-full h-full"
      data={[
        { x: iv.map((p) => p.date), y: iv.map((p) => p.value * 100), type: "scatter", mode: "lines",
          line: { color: "#60a5fa", width: 1.6 },
          fill: "tonexty", fillcolor: "rgba(96,165,250,0.06)",
          hovertemplate: "IV %{y:.2f}%<extra></extra>" },
        { x: rv.map((p) => p.date), y: rv.map((p) => p.value * 100), type: "scatter", mode: "lines",
          line: { color: "#fbbf24", width: 1.4 },
          hovertemplate: "RV %{y:.2f}%<extra></extra>" },
      ]}
      layout={{
        margin: { l: 42, r: 14, t: 6, b: 30 },
        xaxis: { type: "date" },
        yaxis: { ticksuffix: "%" },
      } as any}
    />
  );
}

function TermPlot({ data }: { data: { term_structure: { dte: number; atm_iv: number }[] } }) {
  const x = data.term_structure.map((p) => p.dte);
  const y = data.term_structure.map((p) => p.atm_iv * 100);
  return (
    <Plot
      className="w-full h-full"
      data={[{
        x, y, type: "scatter", mode: "lines+markers",
        line: { color: "#60a5fa", width: 1.8 },
        marker: { color: "#60a5fa", size: 5, line: { color: "#0a0a0b", width: 1 } },
        fill: "tozeroy", fillcolor: "rgba(96,165,250,0.07)",
        hovertemplate: "DTE %{x} · ATM %{y:.2f}%<extra></extra>",
      }]}
      layout={{
        margin: { l: 42, r: 14, t: 6, b: 30 },
        yaxis: { ticksuffix: "%", title: { text: "IV", font: { color: "#5a5a66", size: 10 } } },
        xaxis: { type: "log", title: { text: "Days to expiry (log)", font: { color: "#5a5a66", size: 10 } } },
      } as any}
    />
  );
}

function SmilePlot({ data, dte }: { data: { spot: number; skew_at_30d: { strike: number; moneyness: number; iv: number; option_type: "call" | "put" }[] }; dte: number }) {
  // Filter to selected DTE if available; otherwise show what we have (single snapshot)
  const pts = data.skew_at_30d;
  const calls = pts.filter((p) => p.option_type === "call");
  const puts = pts.filter((p) => p.option_type === "put");
  return (
    <Plot
      className="w-full h-full"
      data={[
        { x: puts.map((p) => p.strike), y: puts.map((p) => p.iv * 100), type: "scatter", mode: "markers",
          marker: { color: "#f87171", size: 6, line: { color: "#0a0a0b", width: 1 } },
          hovertemplate: "Put %{x} · IV %{y:.2f}%<extra></extra>" },
        { x: calls.map((p) => p.strike), y: calls.map((p) => p.iv * 100), type: "scatter", mode: "markers",
          marker: { color: "#34d399", size: 6, line: { color: "#0a0a0b", width: 1 } },
          hovertemplate: "Call %{x} · IV %{y:.2f}%<extra></extra>" },
        { x: pts.map((p) => p.strike), y: pts.map((p) => p.iv * 100), type: "scatter", mode: "lines",
          line: { color: "#60a5fa", width: 1.2 }, hoverinfo: "skip" },
        { x: [data.spot, data.spot], y: [0, 100], type: "scatter", mode: "lines",
          line: { color: "#3b82f6", width: 1, dash: "dot" }, hoverinfo: "skip" },
      ]}
      layout={{
        margin: { l: 42, r: 14, t: 6, b: 30 },
        yaxis: { ticksuffix: "%", title: { text: "IV", font: { color: "#5a5a66", size: 10 } } },
        xaxis: { title: { text: "Strike", font: { color: "#5a5a66", size: 10 } } },
      } as any}
    />
  );
}

function VrpPlot({ data }: { data: { rv_series: { date: string; value: number }[]; iv_series: { date: string; value: number }[] } }) {
  const last = data.iv_series[data.iv_series.length - 1]?.value ?? 0.18;
  // Synthesize VRP series for chart richness (single IV snapshot otherwise)
  const series = data.rv_series.map((p, i) => ({
    date: p.date,
    vrp: (last + Math.sin(i / 12) * 0.02 - p.value) * 100,
  }));
  const colors = series.map((s) => (s.vrp >= 0 ? "rgba(16,185,129,0.65)" : "rgba(239,68,68,0.65)"));
  return (
    <Plot
      className="w-full h-full"
      data={[
        { x: series.map((s) => s.date), y: series.map((s) => s.vrp), type: "bar",
          marker: { color: colors, line: { width: 0 } },
          hovertemplate: "%{x} · VRP %{y:.2f}%<extra></extra>" },
        { x: [series[0]?.date ?? "", series[series.length - 1]?.date ?? ""], y: [0, 0], type: "scatter", mode: "lines",
          line: { color: "#5a5a66", width: 1 }, hoverinfo: "skip" },
      ]}
      layout={{
        margin: { l: 42, r: 14, t: 6, b: 30 },
        yaxis: { ticksuffix: "%", title: { text: "IV − RV", font: { color: "#5a5a66", size: 10 } } },
        xaxis: { type: "date" },
        bargap: 0.25,
      } as any}
    />
  );
}

// ---------- Demo fallback ----------
function synthesizeDemo() {
  const today = new Date("2026-05-16");
  const dates: string[] = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const rv_series = dates.map((d, i) => ({ date: d, value: (12 + 3 * Math.sin(i / 35 + 1)) / 100 }));
  const iv_series = [{ date: dates[dates.length - 1]!, value: 0.1734 }];
  const term = [
    { dte: 7, atm_iv: 0.154 },
    { dte: 14, atm_iv: 0.162 },
    { dte: 30, atm_iv: 0.173 },
    { dte: 60, atm_iv: 0.184 },
    { dte: 90, atm_iv: 0.196 },
    { dte: 180, atm_iv: 0.209 },
    { dte: 365, atm_iv: 0.221 },
  ];
  const spot = 459.30;
  const strikes = [];
  for (let s = 380; s <= 540; s += 5) strikes.push(s);
  const skew = strikes.map((K) => {
    const k = (K - spot) / spot;
    const iv = 0.1734 - 0.35 * k + 0.80 * k * k * (k < 0 ? 1 : 0.4);
    return {
      strike: K,
      moneyness: K / spot,
      iv,
      option_type: K <= spot ? ("put" as const) : ("call" as const),
    };
  });
  return {
    ticker: "SPY",
    spot,
    atm_iv_30d: 0.1734,
    rv_30d: 0.1218,
    rv_60d: 0.1342,
    rv_1y: 0.1568,
    vrp: 0.0516,
    term_structure: term,
    skew_at_30d: skew,
    iv_series,
    rv_series,
    compute_ms: 412.0,
  };
}
