"use client";

import { useAnimatedNumber } from "@/lib/hooks/useAnimatedNumber";

export function AnimatedGreek({
  label,
  symbol,
  value,
  format,
  helper,
  spark,
}: {
  label: string;
  symbol: string;
  value: number;
  format: (v: number) => string;
  helper: React.ReactNode;
  spark: React.ReactNode;
}) {
  const animated = useAnimatedNumber(value, { duration: 300 });
  const colorClass = animated > 0 ? "text-up-400" : animated < 0 ? "text-down-400" : "text-ink-50";
  return (
    <div className="bg-ink-950 px-4 py-3">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-ink-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] mono text-ink-500">{symbol}</span>
      </div>
      <div className={`mono text-[22px] leading-none mt-1 ${colorClass}`}>{format(animated)}</div>
      <div className="mt-1">{spark}</div>
      <div className="text-[10px] mono text-ink-400 mt-0.5">{helper}</div>
    </div>
  );
}
