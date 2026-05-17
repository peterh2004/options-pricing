import {
  Activity,
  ArrowUpRight,
  CandlestickChart,
  Layers,
  LineChart,
  Mountain,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Mountain,
    title: "3D Volatility Surface",
    body: "IV surfaces from real chains. Newton-Raphson solver with bisection fallback. Under 200ms for a 30×30 grid.",
    href: "/app/surface",
  },
  {
    icon: CandlestickChart,
    title: "Pricer",
    body: "Black-Scholes, CRR binomial, antithetic Monte Carlo. All five Greeks, validated to 1e-12 vs QuantLib.",
    href: "/app/pricer",
  },
  {
    icon: Layers,
    title: "Strategy Builder",
    body: "Multi-leg pricing, combined Greeks, P&L heatmaps over (spot × time). Templates: condor, butterfly, calendar.",
    href: "/app/strategy",
  },
  {
    icon: LineChart,
    title: "IV Analysis",
    body: "Realized vs implied vol, term structure, smile and skew, vol risk premium. Works on any optionable name.",
    href: "/app/iv-analysis",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="h-12 border-b flex items-center px-6 gap-6 bg-ink-950">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-accent-500 to-accent-600 grid place-items-center">
            <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Vol Lab</span>
          <span className="mono text-[10px] text-ink-400">v0.1.0-rc</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-[12px] text-ink-300 ml-4">
          <a href="#features" className="hover:text-ink-50">Features</a>
          <Link href="/app/guide" className="hover:text-ink-50">Guide</Link>
          <Link href="/app/validation" className="hover:text-ink-50">Validation</Link>
        </nav>
        <div className="flex-1" />
        <Link
          href="/app/surface"
          className="h-8 px-3 bg-accent-500/15 border border-accent-500/30 text-accent-400 hover:bg-accent-500/25 rounded-sm flex items-center gap-1.5 text-[12px] font-medium"
        >
          Launch app
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
        </Link>
      </header>

      {/* Hero */}
      <section className="border-b grid-overlay">
        <div className="max-w-6xl mx-auto px-8 py-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] mono text-ink-400 uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-up-500 animate-pulse-green" />
              Validated against QuantLib · 77 tests passing
            </div>
            <h1 className="text-[44px] leading-[1.05] tracking-tight font-semibold">
              Options pricing,<br />
              <span className="text-ink-300">measured in microseconds.</span>
            </h1>
            <p className="mt-6 text-[15px] text-ink-200 leading-relaxed max-w-[480px]">
              An options pricing and strategy workbench. Black-Scholes, binomial
              trees, Monte Carlo with variance reduction, vol surfaces from
              yfinance chain data, and a multi-leg strategy builder. Every
              pricing function is validated against QuantLib.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/app/surface"
                className="h-10 px-4 bg-accent-500 hover:bg-accent-600 text-white rounded-sm flex items-center gap-2 text-[13px] font-medium"
              >
                Launch surface
                <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
              </Link>
              <Link
                href="/app/pricer"
                className="h-10 px-4 bg-ink-900 border hover:border-ink-600 rounded-sm flex items-center text-[13px] text-ink-100"
              >
                Open pricer
              </Link>
              <Link
                href="/app/guide"
                className="h-10 px-4 text-ink-300 hover:text-ink-100 rounded-sm flex items-center text-[13px]"
              >
                New to options? Read the guide →
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-[480px]">
              <div>
                <div className="mono text-[20px] text-ink-50">0.42ms</div>
                <div className="text-[11px] text-ink-400 mt-0.5">BS price + 5 Greeks</div>
              </div>
              <div>
                <div className="mono text-[20px] text-ink-50">121ms</div>
                <div className="text-[11px] text-ink-400 mt-0.5">30×30 vol surface</div>
              </div>
              <div>
                <div className="mono text-[20px] text-ink-50">1e-12</div>
                <div className="text-[11px] text-ink-400 mt-0.5">max err vs QuantLib</div>
              </div>
            </div>
          </div>

          {/* Decorative surface preview */}
          <div className="relative aspect-[4/3] rounded-sm border bg-ink-900 overflow-hidden">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#facc15" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              {Array.from({ length: 10 }).map((_, i) => {
                const y = 50 + i * 22;
                const skew = i * 4;
                return (
                  <path
                    key={`h${i}`}
                    d={`M ${30 + skew} ${y + i * 3} Q 200 ${y - 30 + Math.sin(i / 2) * 20} ${370 - skew} ${y + i * 3 - 8}`}
                    stroke="#1d4ed8"
                    strokeOpacity={0.5 + i * 0.04}
                    strokeWidth="1"
                    fill="none"
                  />
                );
              })}
              {Array.from({ length: 12 }).map((_, i) => {
                const x = 40 + i * 28;
                return (
                  <path
                    key={`v${i}`}
                    d={`M ${x} 60 Q ${x + 5} 150 ${x + 14} 270`}
                    stroke="#60a5fa"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                    fill="none"
                  />
                );
              })}
              <path
                d="M 30 80 Q 200 30 370 70 L 380 250 Q 200 290 20 250 Z"
                fill="url(#hg)"
                opacity="0.18"
              />
            </svg>
            <div className="absolute top-3 left-4 text-[10px] mono text-ink-400">
              SPY · Implied Vol Surface · 1,247 contracts
            </div>
            <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[10px] mono">
              <span className="w-2.5 h-1" style={{ background: "linear-gradient(90deg,#1e3a8a,#3b82f6,#facc15,#ef4444)" }} />
              <span className="text-ink-300">10.2% → 42.8%</span>
            </div>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] mono text-ink-500">
              <span>moneyness K/S</span>
              <span>days to expiry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b">
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="text-[24px] font-semibold tracking-tight">Four tools, one workbench.</h2>
            <span className="mono text-[11px] text-ink-400">No paid data feeds required</span>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-ink-700/50">
            {FEATURES.map(({ icon: Icon, title, body, href }) => (
              <Link
                key={title}
                href={href}
                className="bg-ink-950 p-6 hover:bg-ink-900 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <Icon className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
                  <ArrowUpRight className="w-4 h-4 text-ink-500 group-hover:text-ink-300" strokeWidth={1.75} />
                </div>
                <div className="mt-5 text-[15px] text-ink-50 font-medium">{title}</div>
                <div className="mt-1.5 text-[13px] text-ink-300 leading-relaxed">{body}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-ink-950">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between text-[11px] mono text-ink-400">
          <div className="flex items-center gap-4">
            <span>Vol Lab</span>
            <span className="text-ink-600">·</span>
            <span>Built with Next.js, FastAPI, NumPy</span>
          </div>
          <Link href="/app/validation" className="hover:text-ink-200">Validation report</Link>
        </div>
      </footer>
    </div>
  );
}
