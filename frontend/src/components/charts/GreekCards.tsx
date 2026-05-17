"use client";

import { useAnimatedNumber } from "@/lib/hooks/useAnimatedNumber";
import type { Greeks } from "@/lib/api/schemas";
import { fmtMoney, fmtNum, fmtSigned } from "@/lib/format";

// All micro-viz components are SVG-based. No Plotly, renders in under 2ms each.

interface CardProps {
  title: string;
  symbol: string;
  value: string;
  valueClass?: string;
  helper: React.ReactNode;
  children: React.ReactNode;
}

function Card({ title, symbol, value, valueClass, helper, children }: CardProps) {
  return (
    <div className="bg-ink-950 border p-5 hover:border-ink-600 transition-colors">
      <div className="flex items-baseline justify-between">
        <span className="label">{title}</span>
        <span className="mono text-[10px] text-ink-400">{symbol}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`mono text-[34px] font-semibold leading-none ${valueClass ?? "text-ink-50"}`}>
          {value}
        </span>
      </div>
      <div className="mt-1 text-[11px] mono text-ink-400">{helper}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// ---------- PRICE: mini payoff curve ----------
export function PriceCard({ price, S, K, optionType }: { price: number; S: number; K: number; optionType: "call" | "put" }) {
  const animated = useAnimatedNumber(price, { duration: 300 });
  const intrinsic = optionType === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const tv = Math.max(animated - intrinsic, 0);

  // Build a tiny normalized payoff curve
  const w = 220, h = 56;
  const N = 40;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const sRel = -0.15 + (0.30 * i) / N; // -15% to +15% of K
    const spot = K * (1 + sRel);
    const pay = optionType === "call" ? Math.max(spot - K, 0) : Math.max(K - spot, 0);
    return { x: i, y: pay };
  });
  // theoretical curve (smoother): half intrinsic + half time-value bell
  const theo = pts.map((p) => {
    const sRel = -0.15 + (0.30 * p.x) / N;
    const tvBell = price * 0.6 * Math.exp(-Math.pow(sRel * 8, 2));
    return p.y + tvBell;
  });
  const maxY = Math.max(...theo, 0.001) * 1.05;
  const xScale = (x: number) => (x / N) * (w - 10) + 5;
  const yScale = (y: number) => h - (y / maxY) * (h - 6) - 3;
  const intrinsicPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScale(p.y)}`).join(" ");
  const theoPath = theo.map((y, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(y)}`).join(" ");
  const fillPath = `${theoPath} L ${xScale(N)},${h} L ${xScale(0)},${h} Z`;
  // spot marker at moneyness=1
  const spotIdx = ((S - K * 0.85) / (K * 0.30)) * N;

  return (
    <Card
      title="Theoretical Price"
      symbol="BS"
      value={fmtMoney(animated, 2)}
      helper={<>intrinsic <span className="text-ink-200">{fmtMoney(intrinsic, 2)}</span> · time <span className="text-ink-200">{fmtMoney(tv, 2)}</span></>}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 gridv">
        <defs>
          <linearGradient id="pxg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={intrinsicPath} stroke="#3a3a44" strokeDasharray="3 3" strokeWidth="1" fill="none" />
        <path d={fillPath} fill="url(#pxg)" />
        <path d={theoPath} stroke="#34d399" strokeWidth="1.4" fill="none" />
        {spotIdx >= 0 && spotIdx <= N && (
          <>
            <line x1={xScale(spotIdx)} y1="0" x2={xScale(spotIdx)} y2={h} stroke="#60a5fa" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx={xScale(spotIdx)} cy={yScale(theo[Math.round(spotIdx)] ?? 0)} r="2.5" fill="#60a5fa" stroke="#0a0a0b" strokeWidth="1" />
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] mono text-ink-500 mt-1">
        <span>K−15%</span>
        <span>K</span>
        <span>K+15%</span>
      </div>
    </Card>
  );
}

// ---------- DELTA: probability gauge ----------
export function DeltaCard({ delta }: { delta: number }) {
  const animated = useAnimatedNumber(delta, { duration: 300 });
  const absD = Math.min(Math.abs(animated), 1);
  // semi-circle from 180° (left) to 0° (right); needle angle from -90° (delta=0) to +90° (delta=1)
  const angle = -90 + absD * 180;

  return (
    <Card
      title="Delta · Δ"
      symbol="∂V/∂S"
      value={fmtNum(animated, 4)}
      helper={<>N(d1) · risk-neutral P(ITM) ≈ <span className="text-ink-200">{(absD * 100).toFixed(1)}%</span></>}
    >
      <svg viewBox="0 0 220 90" className="w-full h-20">
        <defs>
          <linearGradient id="gaugeg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M20,80 A90,90 0 0 1 200,80" stroke="#1a1a1f" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path
          d={`M20,80 A90,90 0 ${absD > 0.5 ? 1 : 0} 1 ${110 + 90 * Math.cos((angle - 180) * Math.PI / 180)},${80 + 90 * Math.sin((angle - 180) * Math.PI / 180)}`}
          stroke="url(#gaugeg)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <g transform={`translate(110,80) rotate(${angle - 90})`}>
          <line x1="0" y1="0" x2="0" y2="-68" stroke="#f5f5f7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="4" fill="#0a0a0b" stroke="#f5f5f7" strokeWidth="1.5" />
        </g>
        <text x="20" y="89" className="mono" fill="#5a5a66" fontSize="9">0</text>
        <text x="110" y="89" textAnchor="middle" className="mono" fill="#5a5a66" fontSize="9">0.5</text>
        <text x="200" y="89" textAnchor="end" className="mono" fill="#5a5a66" fontSize="9">1.0</text>
      </svg>
    </Card>
  );
}

// ---------- GAMMA: bell curve ----------
export function GammaCard({ gamma }: { gamma: number }) {
  const animated = useAnimatedNumber(gamma, { duration: 300 });
  return (
    <Card
      title="Gamma · Γ"
      symbol="∂²V/∂S²"
      value={fmtNum(animated, 4)}
      helper={<>peak at strike · convexity premium</>}
    >
      <svg viewBox="0 0 220 76" className="w-full h-16 gridv">
        <defs>
          <linearGradient id="gammaArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* delta curve (sigmoid, deemphasized) */}
        <path d="M0,70 C40,68 70,60 110,38 C150,16 180,8 220,6" stroke="#5a5a66" strokeWidth="1" fill="none" />
        {/* gamma bell */}
        <path d="M0,68 C40,65 80,50 110,18 C140,50 180,65 220,68 L220,76 L0,76 Z" fill="url(#gammaArea)" />
        <path d="M0,68 C40,65 80,50 110,18 C140,50 180,65 220,68" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
        <line x1="110" y1="0" x2="110" y2="76" stroke="#26262d" strokeDasharray="2 2" strokeWidth="1" />
        <circle cx="110" cy="18" r="2.6" fill="#60a5fa" stroke="#0a0a0b" strokeWidth="1" />
        <text x="6" y="74" className="mono" fill="#5a5a66" fontSize="9">0</text>
        <text x="110" y="74" textAnchor="middle" className="mono" fill="#5a5a66" fontSize="9">K</text>
        <text x="214" y="74" textAnchor="end" className="mono" fill="#5a5a66" fontSize="9">2K</text>
      </svg>
    </Card>
  );
}

// ---------- VEGA: vol-sweep bars ----------
export function VegaCard({ vega }: { vega: number }) {
  const animated = useAnimatedNumber(vega, { duration: 300 });
  // 11 bars from sigma=10% to sigma=30%, current at index 5
  // height grows roughly linearly with sigma; bars highlighted relative to current
  return (
    <Card
      title="Vega · ν"
      symbol="∂V/∂σ · per 1%"
      value={fmtMoney(animated, 3)}
      helper={<>+1 vol pt → <span className="text-up-400">+{fmtMoney(animated, 2)}</span> · −1 → <span className="text-down-400">−{fmtMoney(animated, 2)}</span></>}
    >
      <div className="mt-3">
        <div className="flex items-end justify-between gap-1 h-12">
          {Array.from({ length: 11 }).map((_, i) => {
            const height = 18 + i * 8.2; // 18% to ~100%
            const isCurrent = i === 5;
            const color = isCurrent
              ? "bg-accent-500"
              : i < 5
                ? `bg-down-500 opacity-${40 + i * 10}`
                : `bg-up-500 opacity-${100 - (i - 5) * 8}`;
            return (
              <div
                key={i}
                className={isCurrent ? "w-full bg-accent-500" : i < 5 ? "w-full bg-down-500/60" : "w-full bg-up-500/70"}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] mono text-ink-500 mt-1">
          <span>10%</span>
          <span>17%</span>
          <span>30%</span>
        </div>
      </div>
    </Card>
  );
}

// ---------- THETA: decay curve ----------
export function ThetaCard({ theta, dte }: { theta: number; dte: number }) {
  const animated = useAnimatedNumber(theta, { duration: 300 });
  const dteAnimated = useAnimatedNumber(dte, { duration: 300 });
  // Map dte (0..60d) to x in (0..220)
  const nowX = Math.max(0, Math.min(220, (60 - dteAnimated) / 60 * 220));
  return (
    <Card
      title="Theta · Θ"
      symbol="∂V/∂t · per day"
      value={fmtMoney(animated, 3)}
      valueClass={animated < 0 ? "text-down-400" : "text-up-400"}
      helper={<>per-day decay · expiry in <span className="text-ink-200">{Math.round(dteAnimated)}d</span></>}
    >
      <svg viewBox="0 0 220 56" className="w-full h-12 gridv">
        <defs>
          <linearGradient id="thetag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,8 C40,9 90,12 140,20 C180,32 210,48 220,52 L220,56 L0,56 Z" fill="url(#thetag)" />
        <path d="M0,8 C40,9 90,12 140,20 C180,32 210,48 220,52" stroke="#f87171" strokeWidth="1.4" fill="none" />
        <line x1={nowX} y1="0" x2={nowX} y2="56" stroke="#60a5fa" strokeDasharray="2 2" strokeWidth="1" />
        <circle cx={nowX} cy="20" r="2.5" fill="#60a5fa" stroke="#0a0a0b" strokeWidth="1" />
        <text x={nowX} y="6" textAnchor="middle" className="mono" fill="#60a5fa" fontSize="8">now · {Math.round(dteAnimated)}d</text>
      </svg>
      <div className="flex justify-between text-[10px] mono text-ink-500 mt-1">
        <span>60d</span>
        <span>30d</span>
        <span>0d</span>
      </div>
    </Card>
  );
}

// ---------- RHO: tilted line ----------
export function RhoCard({ rho, r }: { rho: number; r: number }) {
  const animated = useAnimatedNumber(rho, { duration: 300 });
  // r in %, current rate at x corresponding to (r%/10%) of 220
  const rPct = r * 100;
  const currX = Math.max(10, Math.min(210, (rPct / 10) * 220));
  return (
    <Card
      title="Rho · ρ"
      symbol="∂V/∂r · per 1%"
      value={fmtMoney(animated, 3)}
      helper={<>+25bp hike → <span className={animated >= 0 ? "text-up-400" : "text-down-400"}>{fmtMoney(animated * 0.25, 3)}</span> · low sensitivity</>}
    >
      <svg viewBox="0 0 220 56" className="w-full h-12 gridv">
        {/* slope direction matches sign(rho) */}
        <path
          d={animated >= 0 ? "M0,46 L220,16" : "M0,16 L220,46"}
          stroke="#60a5fa"
          strokeWidth="1.5"
          fill="none"
        />
        <line x1={currX} y1="0" x2={currX} y2="56" stroke="#26262d" strokeDasharray="2 2" strokeWidth="1" />
        <circle
          cx={currX}
          cy={animated >= 0 ? 46 - (currX / 220) * 30 : 16 + (currX / 220) * 30}
          r="2.6"
          fill="#60a5fa"
          stroke="#0a0a0b"
          strokeWidth="1"
        />
        <text x={currX} y="9" textAnchor="middle" className="mono" fill="#60a5fa" fontSize="8">
          r={rPct.toFixed(2)}%
        </text>
      </svg>
      <div className="flex justify-between text-[10px] mono text-ink-500 mt-1">
        <span>0%</span>
        <span>5%</span>
        <span>10%</span>
      </div>
    </Card>
  );
}

export function GreekCardGrid({
  price, greeks, S, K, dte, r, optionType,
}: {
  price: number;
  greeks: Greeks;
  S: number;
  K: number;
  dte: number;
  r: number;
  optionType: "call" | "put";
}) {
  return (
    <div className="grid grid-cols-3 gap-px bg-ink-700/40">
      <PriceCard price={price} S={S} K={K} optionType={optionType} />
      <DeltaCard delta={greeks.delta} />
      <GammaCard gamma={greeks.gamma} />
      <VegaCard vega={greeks.vega} />
      <ThetaCard theta={greeks.theta} dte={dte} />
      <RhoCard rho={greeks.rho} r={r} />
    </div>
  );
}
