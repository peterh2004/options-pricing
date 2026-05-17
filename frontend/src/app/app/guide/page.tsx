"use client";

import { ArrowRight, CandlestickChart, Layers, LineChart, Mountain } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusFooter } from "@/components/shell/StatusFooter";

// A concept primer plus a tour of the app. Lives inside the workbench shell
// so you can flip back and forth between reading and trying things in the tools.

const SECTIONS = [
  { id: "contract",   label: "01 · The contract" },
  { id: "payoff",     label: "02 · Payoff & moneyness" },
  { id: "greeks",     label: "03 · The five Greeks" },
  { id: "models",     label: "04 · Pricing models" },
  { id: "iv",         label: "05 · Implied volatility" },
  { id: "surface",    label: "06 · The vol surface" },
  { id: "strategies", label: "07 · Multi-leg strategies" },
  { id: "vrp",        label: "08 · Realized vs implied" },
  { id: "perf",       label: "09 · Why microseconds matter" },
  { id: "tour",       label: "10 · Tour the workbench" },
] as const;

export default function GuidePage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Highlight TOC entry of the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-10 grid grid-cols-[180px_1fr] gap-12">
          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <div className="label mb-3">Sections</div>
              <nav className="space-y-0.5 text-[12px]">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`block py-1 mono ${
                      active === s.id ? "text-accent-400" : "text-ink-400 hover:text-ink-100"
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="mt-8 border-t pt-4 text-[11px] mono text-ink-400 leading-relaxed">
                <div>Reading time</div>
                <div className="text-ink-200 mt-0.5">about 10 minutes</div>
                <div className="mt-3">Prerequisite</div>
                <div className="text-ink-200 mt-0.5">curiosity</div>
              </div>
            </div>
          </aside>

          {/* Body */}
          <article className="max-w-[720px] space-y-14">
            <header className="space-y-3">
              <div className="label">Vol Lab Guide</div>
              <h1 className="text-[32px] font-semibold tracking-tight leading-[1.1]">
                Options pricing,
                <br />
                <span className="text-ink-300">in ten minutes.</span>
              </h1>
              <p className="text-[14px] text-ink-200 leading-relaxed">
                A concept primer mapped to the tools in this workbench. Each section
                links to where you can try it. If you&apos;re a quant or a SWE who&apos;s
                touching options for the first time, this is the cheat sheet.
              </p>
            </header>

            {/* 01 · Contract */}
            <Section id="contract" number="01" title="The contract">
              <P>
                An <Term>option</Term> is a contract that gives you the <i>right</i>{" "}
                (not obligation) to buy or sell an underlying asset at a fixed price
                on or before a fixed date.
              </P>
              <Grid2>
                <Def label="Call">
                  Right to <span className="text-up-400">buy</span> at strike K.
                  You profit if spot S finishes above K.
                </Def>
                <Def label="Put">
                  Right to <span className="text-down-400">sell</span> at strike K.
                  You profit if spot S finishes below K.
                </Def>
              </Grid2>
              <P className="mt-4">
                The four numbers that define a vanilla option:{" "}
                <Code>S</Code> spot, <Code>K</Code> strike, <Code>T</Code> time to
                expiry, <Code>σ</Code> volatility. Plus the risk-free rate{" "}
                <Code>r</Code> and (for equities) the dividend yield <Code>q</Code>.
              </P>
            </Section>

            {/* 02 · Payoff */}
            <Section id="payoff" number="02" title="Payoff & moneyness">
              <P>
                At expiry the option pays its <Term>intrinsic value</Term>:
              </P>
              <Formula>
                Call: max(S − K, 0) · Put: max(K − S, 0)
              </Formula>
              <P>
                Before expiry, the price also includes <Term>time value</Term>, the
                optionality of waiting. As expiry approaches, time value decays
                toward zero. That decay is Theta (Θ).
              </P>
              <div className="bg-ink-900 border p-5 my-4">
                <div className="label mb-2">Long call payoff at expiry, K = 100</div>
                <PayoffSvg />
                <div className="flex justify-between text-[10px] mono text-ink-500 mt-2 px-1">
                  <span>spot = 60</span>
                  <span>K = 100</span>
                  <span>spot = 140</span>
                </div>
              </div>
              <Grid3>
                <Def label="ITM" detail="in the money">S &gt; K (call) · S &lt; K (put)</Def>
                <Def label="ATM" detail="at the money">S ≈ K</Def>
                <Def label="OTM" detail="out of the money">S &lt; K (call) · S &gt; K (put)</Def>
              </Grid3>
              <P>
                <Term>Moneyness</Term> = K/S. ATM is moneyness ≈ 1.0. The vol
                surface is usually plotted in (moneyness, DTE) space so it doesn&apos;t
                drift with the underlying.
              </P>
            </Section>

            {/* 03 · Greeks */}
            <Section id="greeks" number="03" title="The five Greeks">
              <P>
                <Term>Greeks</Term> are sensitivities of the option price to its
                inputs. Each one tells you what changes if one variable moves.
              </P>
              <div className="overflow-hidden border bg-ink-900 my-4">
                <table className="w-full text-[12px]">
                  <thead className="bg-ink-850">
                    <tr className="text-[10px] uppercase tracking-wider text-ink-500">
                      <th className="text-left font-medium px-3 py-2">Greek</th>
                      <th className="text-left font-medium px-3 py-2">Symbol</th>
                      <th className="text-left font-medium px-3 py-2">Measures</th>
                      <th className="text-left font-medium px-3 py-2">Long-option sign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    <GreekRow name="Delta" sym="Δ" measures="∂V/∂S, change per $1 move in spot" sign="+ call · − put" />
                    <GreekRow name="Gamma" sym="Γ" measures="∂²V/∂S², change in delta per $1 move" sign="always +" />
                    <GreekRow name="Vega"  sym="ν" measures="∂V/∂σ, change per 1 vol point" sign="always +" />
                    <GreekRow name="Theta" sym="Θ" measures="−∂V/∂t, value lost per day" sign="usually −" />
                    <GreekRow name="Rho"   sym="ρ" measures="∂V/∂r, change per 1% rate move" sign="+ call · − put" />
                  </tbody>
                </table>
              </div>
              <Callout>
                On the Pricer, each Greek has a custom micro visualization. A
                probability gauge for delta, a bell curve for gamma, a sensitivity
                bar for vega, a decay curve for theta, a tilted line for rho. They
                animate when inputs change.
              </Callout>
              <TryLink href="/app/pricer" icon={CandlestickChart}>Open the Pricer</TryLink>
            </Section>

            {/* 04 · Models */}
            <Section id="models" number="04" title="Pricing models">
              <P>Three methods, three trade-offs. Vol Lab implements all of them and lets you compare side by side.</P>
              <div className="space-y-3 my-4">
                <ModelCard
                  name="Black-Scholes-Merton"
                  speed="under 1 ms"
                  use="Closed-form. Exact for European options under lognormal returns. Use this 95% of the time."
                />
                <ModelCard
                  name="Binomial (Cox-Ross-Rubinstein)"
                  speed="about 2 ms (n = 500)"
                  use="Discrete tree, backward induction. Handles American options with early exercise. Converges to BS as n → ∞."
                />
                <ModelCard
                  name="Monte Carlo"
                  speed="about 0.3 ms (10k paths)"
                  use="Simulate price paths under the risk-neutral measure. Use for Asian, barrier, and other path-dependent payoffs. Returns price ± std error."
                />
              </div>
              <P>
                Why three? Because real markets have features (early exercise,
                averaging, knock-outs) that the elegant BS formula doesn&apos;t
                capture. Each tool exists for a reason.
              </P>
              <TryLink href="/app/pricer" icon={CandlestickChart}>
                Compare them on a single contract
              </TryLink>
            </Section>

            {/* 05 · Implied vol */}
            <Section id="iv" number="05" title="Implied volatility">
              <P>
                Black-Scholes is a function: <Code>(S, K, T, r, σ) → price</Code>.
              </P>
              <P>
                <Term>Implied volatility (IV)</Term> is the σ that makes the model
                price equal the price you observe in the market. It is the market&apos;s
                forward-looking forecast of realized volatility, packed into the
                option premium.
              </P>
              <P>
                To find it: invert numerically. Newton-Raphson with a bisection
                fallback for the deep-OTM cases where vega is tiny.
              </P>
              <Callout>
                Vol Lab&apos;s IV solver converges to{" "}
                <span className="mono text-ink-100">σ ≤ 1e-5</span> in 4 to 8
                Newton iterations on typical chain quotes. The full 50-quote
                regression test sees 100% convergence.
              </Callout>
              <TryLink href="/app/validation" icon={LineChart}>See the validation report</TryLink>
            </Section>

            {/* 06 · Surface */}
            <Section id="surface" number="06" title="The vol surface">
              <P>
                Invert IV for every contract in a chain and you get IV at every
                (strike, expiry) pair. That is the <Term>volatility surface</Term>.
              </P>
              <div className="bg-ink-900 border p-5 my-4">
                <div className="label mb-3">What its shape encodes</div>
                <div className="space-y-3 text-[13px]">
                  <Shape label="Smile / skew">
                    σ varies by strike at fixed expiry. Equity options usually
                    skew. OTM puts price at higher IV than OTM calls. Demand
                    for crash protection drives this.
                  </Shape>
                  <Shape label="Term structure">
                    σ varies by DTE at fixed strike. Often contango (long-dated
                    higher) in calm markets, and backwardation around earnings
                    or macro events.
                  </Shape>
                  <Shape label="Risk reversal">
                    25-delta call IV minus 25-delta put IV. Negative on equities
                    (puts richer), flips around bullish regimes.
                  </Shape>
                </div>
              </div>
              <P>
                A perfectly flat surface would mean Black-Scholes assumptions
                hold exactly. The real surface deviates, and that is where the
                trades live.
              </P>
              <TryLink href="/app/surface" icon={Mountain}>Rotate the live 3D surface</TryLink>
            </Section>

            {/* 07 · Strategies */}
            <Section id="strategies" number="07" title="Multi-leg strategies">
              <P>
                A <Term>leg</Term> is one option (long or short, call or put). Combining
                legs builds bespoke exposures. The classic structures:
              </P>
              <div className="grid grid-cols-2 gap-3 my-4">
                <Structure name="Vertical spread" view="directional · capped">long + short, same expiry, different strikes</Structure>
                <Structure name="Straddle" view="long volatility">long call + long put, same strike</Structure>
                <Structure name="Strangle" view="long volatility · cheaper">long call + long put, different OTM strikes</Structure>
                <Structure name="Iron Condor" view="range-bound · short vol">short put spread + short call spread</Structure>
                <Structure name="Butterfly" view="pinning bet">long-short-long across three strikes</Structure>
                <Structure name="Calendar" view="term-structure bet">short near-dated + long far-dated, same strike</Structure>
              </div>
              <P>
                Net Greeks sum across legs. So a market-neutral spread can be
                long gamma and short vega at the same time, a bet on realized
                volatility being higher than implied without taking directional
                risk.
              </P>
              <TryLink href="/app/strategy" icon={Layers}>Build a strategy</TryLink>
            </Section>

            {/* 08 · RV vs IV */}
            <Section id="vrp" number="08" title="Realized vs implied">
              <P>Two ways to measure volatility:</P>
              <Grid2>
                <Def label="Realized (RV)">
                  Actual standard deviation of log returns over a window
                  (typically 30 days), annualized by <Code>√252</Code>.
                </Def>
                <Def label="Implied (IV)">
                  Forward-looking forecast extracted from option prices.
                </Def>
              </Grid2>
              <Formula>VRP = IV − RV</Formula>
              <P>
                The <Term>variance risk premium (VRP)</Term> is what sellers of
                volatility charge for taking on variance risk. Empirically it&apos;s
                positive about 85% of trading days for index options. IV runs
                above realized.
              </P>
              <Callout>
                When VRP collapses or goes negative, long-vol strategies become
                attractive (or short-vol becomes dangerous, depending which side
                you&apos;re on). The IV Analysis page tracks this for any optionable
                name.
              </Callout>
              <TryLink href="/app/iv-analysis" icon={LineChart}>Open IV Analysis</TryLink>
            </Section>

            {/* 09 · Performance */}
            <Section id="perf" number="09" title="Why microseconds matter">
              <P>
                Trading desks rebuild vol surfaces every few seconds across
                thousands of names. Quoting markets means recomputing prices and
                Greeks at every tick. Slow pricers are useless.
              </P>
              <div className="bg-ink-900 border p-5 my-4 space-y-2 text-[12px] mono">
                <Bench label="Single BS price + 5 Greeks" t="0.42 ms" />
                <Bench label="30 × 30 vol surface (900 IV inversions)" t="121 ms" />
                <Bench label="Monte Carlo, 10,000 antithetic paths" t="0.3 ms" />
                <Bench label="Binomial CRR, n = 500" t="2.0 ms" />
              </div>
              <P>
                How? Vectorized NumPy for the surface, Newton-Raphson with
                bisection fallback for IV, antithetic variates for MC, and a
                geometric-mean control variate for arithmetic Asians. The full
                validation report shows every benchmark and a side-by-side
                QuantLib comparison.
              </P>
              <TryLink href="/app/validation" icon={LineChart}>Read the validation report</TryLink>
            </Section>

            {/* 10 · Tour */}
            <Section id="tour" number="10" title="Tour the workbench">
              <P>The four tools in Vol Lab, mapped to the concepts above.</P>
              <div className="grid grid-cols-2 gap-3 my-4">
                <TourCard
                  href="/app/pricer"
                  icon={CandlestickChart}
                  name="Pricer"
                  body="Single contract. Inputs on the left, six cards on the right (price + 5 Greeks, each with a custom micro viz), payoff diagram below, three-method comparison alongside."
                />
                <TourCard
                  href="/app/surface"
                  icon={Mountain}
                  name="Vol Surface"
                  body="3D Plotly surface from real yfinance chains. Toggle calls/puts and surface/smile/term views. Mini term structure and skew on the right rail. Export CSV."
                />
                <TourCard
                  href="/app/strategy"
                  icon={Layers}
                  name="Strategy Builder"
                  body="Multi-leg editor. Strike, DTE, qty, σ all inline editable. Net Greeks animate. Templates (condor, straddle, butterfly, calendar) on the toolbar. Save to JSON."
                />
                <TourCard
                  href="/app/iv-analysis"
                  icon={LineChart}
                  name="IV Analysis"
                  body="Four quadrants: realized vs implied time series, ATM term structure, smile/skew at selected expiry, vol risk premium history."
                />
              </div>
              <P className="mt-6">
                The math is validated to <span className="mono text-up-400">1e-12</span>{" "}
                against QuantLib, 77 unit tests pass, and every endpoint reports its{" "}
                <Code>compute_ms</Code>. See the{" "}
                <Link href="/app/validation" className="text-accent-400 hover:underline">
                  Validation report
                </Link>{" "}
                for the full table.
              </P>
            </Section>

            <div className="border-t pt-6 text-[12px] text-ink-400">
              <p>
                That&apos;s the map. Open any tool from the sidebar to start
                exploring.
              </p>
            </div>
          </article>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}

/* ---------- helpers ---------- */

function Section({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="mono text-[11px] text-ink-500">{number}</span>
        <h2 className="text-[20px] font-semibold tracking-tight text-ink-50">{title}</h2>
      </div>
      <div className="space-y-3 text-[14px] text-ink-200 leading-relaxed">{children}</div>
    </section>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>;
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-50 font-medium">{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mono text-[12px] bg-ink-850 border rounded px-1.5 py-0.5 text-ink-100">
      {children}
    </code>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 bg-ink-900 border px-5 py-4 mono text-[13px] text-ink-100 text-center">
      {children}
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 border-l-2 border-accent-500 bg-ink-900 pl-4 pr-5 py-3 text-[13px] text-ink-200">
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 my-3">{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 my-3">{children}</div>;
}

function Def({ label, detail, children }: { label: string; detail?: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink-900 border p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] mono font-semibold text-ink-50">{label}</span>
        {detail && <span className="text-[10px] mono text-ink-500">{detail}</span>}
      </div>
      <div className="text-[13px] text-ink-300 mt-1.5">{children}</div>
    </div>
  );
}

function GreekRow({ name, sym, measures, sign }: { name: string; sym: string; measures: string; sign: string }) {
  return (
    <tr className="hover:bg-ink-800/40">
      <td className="px-3 py-2 text-ink-100 font-medium">{name}</td>
      <td className="px-3 py-2 mono text-ink-50 text-[14px]">{sym}</td>
      <td className="px-3 py-2 text-ink-300 mono text-[11px]">{measures}</td>
      <td className="px-3 py-2 mono text-[11px] text-ink-300">{sign}</td>
    </tr>
  );
}

function ModelCard({ name, speed, use }: { name: string; speed: string; use: string }) {
  return (
    <div className="bg-ink-900 border p-4 grid grid-cols-[1fr_auto] gap-4 items-baseline">
      <div>
        <div className="text-[13px] text-ink-50 font-medium">{name}</div>
        <div className="text-[12px] text-ink-300 mt-1 leading-relaxed">{use}</div>
      </div>
      <div className="mono text-[11px] text-up-400 whitespace-nowrap">{speed}</div>
    </div>
  );
}

function Shape({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-1 bg-accent-500 shrink-0 mt-1 mb-1 rounded-sm" />
      <div>
        <div className="text-ink-50 font-medium text-[12px]">{label}</div>
        <div className="text-ink-300 text-[12px] mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Structure({ name, view, children }: { name: string; view: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink-900 border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-ink-50 font-medium">{name}</span>
        <span className="text-[9px] mono text-ink-500 uppercase tracking-wider">{view}</span>
      </div>
      <div className="text-[11px] text-ink-300 mt-1 mono">{children}</div>
    </div>
  );
}

function Bench({ label, t }: { label: string; t: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-ink-200">{label}</span>
      <span className="text-up-400">{t}</span>
    </div>
  );
}

function TryLink({ href, icon: Icon, children }: { href: string; icon: typeof CandlestickChart; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[12px] text-accent-400 hover:text-accent-500 mt-2"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
      {children}
      <ArrowRight className="w-3 h-3" strokeWidth={2} />
    </Link>
  );
}

function TourCard({ href, icon: Icon, name, body }: { href: string; icon: typeof CandlestickChart; name: string; body: string }) {
  return (
    <Link
      href={href}
      className="bg-ink-900 border p-4 hover:border-ink-600 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <Icon className="w-4 h-4 text-accent-400" strokeWidth={1.75} />
        <ArrowRight className="w-3.5 h-3.5 text-ink-500 group-hover:text-ink-200" strokeWidth={2} />
      </div>
      <div className="mt-3 text-[13px] text-ink-50 font-medium">{name}</div>
      <div className="mt-1 text-[12px] text-ink-300 leading-relaxed">{body}</div>
    </Link>
  );
}

function PayoffSvg() {
  return (
    <svg viewBox="0 0 400 140" className="w-full h-32">
      <defs>
        <linearGradient id="payoffG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="20" y1="120" x2="380" y2="120" stroke="rgb(var(--ink-700))" strokeWidth="1" />
      <line x1="20" y1="20" x2="20" y2="120" stroke="rgb(var(--ink-700))" strokeWidth="1" />
      <path d="M20,120 L200,120 L380,20 L380,120 L20,120 Z" fill="url(#payoffG)" />
      <path d="M20,120 L200,120 L380,20" stroke="#34d399" strokeWidth="1.6" fill="none" />
      <line x1="200" y1="20" x2="200" y2="120" stroke="rgb(var(--ink-600))" strokeDasharray="3 3" />
      <text x="200" y="135" textAnchor="middle" className="mono" fill="rgb(var(--ink-400))" fontSize="10">K</text>
      <text x="380" y="135" textAnchor="end" className="mono" fill="rgb(var(--ink-400))" fontSize="10">payoff</text>
    </svg>
  );
}
