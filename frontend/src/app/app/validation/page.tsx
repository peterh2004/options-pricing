"use client";

import { Check } from "lucide-react";

import { StatusFooter } from "@/components/shell/StatusFooter";

const REF_CASES = [
  { n: 1,  label: "Hull Ex 15.6 (call)",     type: "call", vollab: 4.753175,  ql: 4.753175,  abs: 8.88e-16, rel: 1.87e-16 },
  { n: 2,  label: "Hull Ex 15.6 (put)",      type: "put",  vollab: 0.807565,  ql: 0.807565,  abs: 4.44e-15, rel: 5.50e-15 },
  { n: 3,  label: "ATM 30d index",           type: "call", vollab: 9.299856,  ql: 9.299856,  abs: 1.78e-14, rel: 1.91e-15 },
  { n: 4,  label: "ATM 30d index put",       type: "put",  vollab: 8.890845,  ql: 8.890845,  abs: 3.55e-14, rel: 4.00e-15 },
  { n: 5,  label: "Deep ITM call",           type: "call", vollab: 51.232492, ql: 51.232492, abs: 0,        rel: 0       },
  { n: 6,  label: "Deep OTM call",           type: "call", vollab: 0.006455,  ql: 0.006455,  abs: 1.72e-15, rel: 2.66e-13 },
  { n: 7,  label: "Long-dated ATM (5y)",     type: "call", vollab: 23.571745, ql: 23.571745, abs: 7.11e-15, rel: 3.01e-16 },
  { n: 8,  label: "Short-dated OTM put",     type: "put",  vollab: 0.006660,  ql: 0.006660,  abs: 9.02e-15, rel: 1.35e-12 },
  { n: 9,  label: "With dividends (high q)", type: "call", vollab: 7.075532,  ql: 7.075532,  abs: 3.55e-15, rel: 5.02e-16 },
  { n: 10, label: "High-vol earnings",       type: "call", vollab: 1.391082,  ql: 1.391082,  abs: 4.00e-15, rel: 2.87e-15 },
] as const;

const GREEKS = [
  { name: "Δ delta", vollab: 0.516495,  ql: 0.516495,  abs: 0 },
  { name: "Γ gamma", vollab: 0.017437,  ql: 0.017437,  abs: 6.94e-18 },
  { name: "ν vega",  vollab: 0.524253,  ql: 0.524253,  abs: 1.11e-16 },
  { name: "Θ theta", vollab: -0.169512, ql: -0.169512, abs: 1.33e-15 },
  { name: "ρ rho",   vollab: 0.187337,  ql: 0.187337,  abs: 5.55e-17 },
] as const;

const CROSS_CHECKS = [
  { name: "Put-call parity",                 detail: "residual < 1e-9 across 20 random param sets" },
  { name: "Closed-form Greeks vs FD",        detail: "max error < 1e-4 (call & put)" },
  { name: "Binomial CRR → BS",               detail: "European prices within 0.01 at n=500" },
  { name: "American put > European put",     detail: "early-exercise premium > 0" },
  { name: "IV round-trip",                   detail: "50 synthetic quotes → 100% converge to true σ ≤ 1e-5" },
  { name: "MC 95% CI coverage",              detail: "≥ 88 / 100 trials at n = 10k paths" },
  { name: "Asian < European call",           detail: "averaging reduces convexity, as expected" },
  { name: "Barrier in-out parity",           detail: "KI + KO = vanilla to MC tolerance" },
] as const;

const PERF = [
  { label: "Single BS price + 5 Greeks",         time: "0.42",  unit: "ms", target: "< 1 ms",   pass: true },
  { label: "30×30 vol surface (IV invert 900)",  time: "121",   unit: "ms", target: "< 200 ms", pass: true },
  { label: "Monte Carlo, 10k antithetic paths",  time: "0.3",   unit: "ms", target: "< 100 ms", pass: true },
  { label: "Binomial CRR, n = 500",              time: "2.0",   unit: "ms", target: "< 50 ms",  pass: true },
  { label: "Binomial CRR, n = 1000",             time: "5.0",   unit: "ms", target: "n/a",      pass: null },
] as const;

function fmtSci(x: number): string {
  if (x === 0) return "0";
  const abs = Math.abs(x);
  return abs.toExponential(2);
}

const MAX_REL_ERR = Math.max(...REF_CASES.map((c) => c.rel));

export default function ValidationPage() {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">
          {/* Header */}
          <header>
            <div className="label">Numerical Validation</div>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">
              Vol Lab vs QuantLib reference engine
            </h1>
            <p className="text-[13px] text-ink-300 mt-3 max-w-[640px] leading-relaxed">
              Every pricing function is validated against QuantLib's analytical engine
              and against textbook reference values. The full suite runs in pytest in
              about 5 seconds; the tables below show what was measured.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="chip mono bg-up-950/50 text-up-400">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                {77} / {77} tests passing
              </span>
              <span className="chip mono bg-accent-500/15 text-accent-400">
                max rel err vs QuantLib {fmtSci(MAX_REL_ERR)}
              </span>
            </div>
          </header>

          {/* Section 1 */}
          <Section
            number={1}
            title="Black-Scholes vs QuantLib reference engine"
            note="Reference cases span ITM/ATM/OTM, short/long maturity, with and without dividends."
          >
            <table className="w-full text-[12px] mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-500 border-b">
                  <Th className="w-8 text-left">#</Th>
                  <Th className="text-left">Case</Th>
                  <Th className="text-left w-16">Type</Th>
                  <Th className="text-right">Vol Lab</Th>
                  <Th className="text-right">QuantLib</Th>
                  <Th className="text-right">abs err</Th>
                  <Th className="text-right pr-1">rel err</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {REF_CASES.map((c) => (
                  <tr key={c.n} className="hover:bg-ink-800/40">
                    <td className="py-2 text-ink-500">{c.n}</td>
                    <td className="text-ink-100">{c.label}</td>
                    <td>
                      <span className={`pill border text-[10px] ${
                        c.type === "call"
                          ? "bg-up-950/60 text-up-400 border-up-500/20"
                          : "bg-down-950/60 text-down-400 border-down-500/20"
                      }`}>
                        {c.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right text-ink-50">{c.vollab.toFixed(6)}</td>
                    <td className="text-right text-ink-200">{c.ql.toFixed(6)}</td>
                    <td className="text-right text-ink-300">{fmtSci(c.abs)}</td>
                    <td className="text-right text-up-400 pr-1">{fmtSci(c.rel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-[11px] mono text-ink-300">
              max relative error <span className="text-up-400">{fmtSci(MAX_REL_ERR)}</span>{" "}
              <span className="text-ink-500">≤ 1e-10 threshold</span>{" "}
              <span className="text-up-400 ml-2">PASS</span>
            </div>
          </Section>

          {/* Section 2 */}
          <Section
            number={2}
            title="Greeks vs QuantLib (ATM 30d case)"
            note="S=459.30, K=460, T=30/365, r=4.288%, σ=17.34%, q=1.35%. Practitioner units: vega per 1 vol pt, rho per 1% rate, theta per calendar day."
          >
            <table className="w-full text-[12px] mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-500 border-b">
                  <Th className="text-left">Greek</Th>
                  <Th className="text-right">Vol Lab</Th>
                  <Th className="text-right">QuantLib</Th>
                  <Th className="text-right pr-1">abs err</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {GREEKS.map((g) => (
                  <tr key={g.name} className="hover:bg-ink-800/40">
                    <td className="py-2 text-ink-100">{g.name}</td>
                    <td className="text-right text-ink-50">{g.vollab.toFixed(6)}</td>
                    <td className="text-right text-ink-200">{g.ql.toFixed(6)}</td>
                    <td className="text-right text-up-400 pr-1">{fmtSci(g.abs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-[11px] mono text-ink-300">
              All Greeks identical to machine ε.{" "}
              <span className="text-up-400 ml-1">PASS</span>
            </div>
          </Section>

          {/* Section 3 */}
          <Section
            number={3}
            title="Internal cross-checks (pytest)"
            note="Closed-form identities and statistical bounds that don't require an external reference."
          >
            <ul className="text-[12px] divide-y divide-ink-800">
              {CROSS_CHECKS.map((c) => (
                <li key={c.name} className="py-2.5 flex items-baseline gap-3">
                  <Check className="w-3.5 h-3.5 text-up-400 shrink-0" strokeWidth={2} />
                  <div className="min-w-[220px] text-ink-100 font-medium">{c.name}</div>
                  <div className="text-ink-300 mono text-[11px]">{c.detail}</div>
                </li>
              ))}
            </ul>
          </Section>

          {/* Section 4 */}
          <Section
            number={4}
            title="Performance benchmarks"
            note="Measured on the dev machine via time.perf_counter, warm-up loop excluded."
          >
            <table className="w-full text-[12px] mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-500 border-b">
                  <Th className="text-left">Workload</Th>
                  <Th className="text-right w-20">Time</Th>
                  <Th className="text-right w-28">Target</Th>
                  <Th className="text-right w-20 pr-1">Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {PERF.map((p) => (
                  <tr key={p.label} className="hover:bg-ink-800/40">
                    <td className="py-2 text-ink-100">{p.label}</td>
                    <td className="text-right text-ink-50">
                      {p.time}<span className="text-ink-400 ml-1">{p.unit}</span>
                    </td>
                    <td className="text-right text-ink-300">{p.target}</td>
                    <td className="text-right pr-1">
                      {p.pass === true ? (
                        <span className="text-up-400">PASS</span>
                      ) : (
                        <span className="text-ink-400">…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

        </div>
      </div>
      <StatusFooter />
    </>
  );
}

function Section({
  number,
  title,
  note,
  children,
}: {
  number: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="mono text-[11px] text-ink-500">{number.toString().padStart(2, "0")}</span>
        <h2 className="text-[16px] font-semibold text-ink-50">{title}</h2>
      </div>
      {note && <p className="text-[12px] text-ink-400 mb-3 max-w-[640px]">{note}</p>}
      <div className="bg-ink-900 border p-5">{children}</div>
    </section>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`font-medium py-2 ${className ?? ""}`}>{children}</th>;
}
