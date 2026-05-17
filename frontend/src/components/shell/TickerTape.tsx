"use client";

import { useEffect, useState } from "react";

import { fmtSigned } from "@/lib/format";

// Toy intraday simulator. In production this would pull from /api/v1/chain/{ticker}
// every 30s; here we just simulate small random walks so the UI renders without
// requiring a network call on every page load.

const SYMBOLS = [
  { sym: "SPY",  base: 459.30 },
  { sym: "QQQ",  base: 432.18 },
  { sym: "NVDA", base: 128.44 },
  { sym: "AAPL", base: 213.06 },
  { sym: "TSLA", base: 241.79 },
  { sym: "VIX",  base: 14.21  },
  { sym: "^TNX", base: 4.288  },
];

interface Tick {
  sym: string;
  last: number;
  change: number;
}

function simulate(seed: number): Tick[] {
  return SYMBOLS.map((s, i) => {
    const drift = Math.sin((seed + i * 11) * 0.07) * (s.base * 0.002);
    const last = s.base + drift;
    const change = last - s.base;
    return { sym: s.sym, last, change };
  });
}

export function TickerTape() {
  const [ticks, setTicks] = useState<Tick[]>(() => simulate(0));

  useEffect(() => {
    let s = 0;
    const id = window.setInterval(() => {
      s += 1;
      setTicks(simulate(s));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const items = [...ticks, ...ticks]; // duplicate for seamless marquee
  return (
    <div className="flex-1 overflow-hidden ticker-wrap flex items-center min-w-0">
      <div className="animate-ticker flex gap-7 whitespace-nowrap pl-6">
        {items.map((t, i) => (
          <span key={`${t.sym}-${i}`} className="text-[11px]">
            <span className="text-ink-400">{t.sym}</span>{" "}
            <span className="mono text-ink-100">{t.last.toFixed(2)}</span>{" "}
            <span className={`mono ${t.change >= 0 ? "text-up-400" : "text-down-400"}`}>
              {fmtSigned(t.change, 2)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
