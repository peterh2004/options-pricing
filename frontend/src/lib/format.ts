// Locale-aware formatters with mono-friendly thousand separators. Use the proper
// minus sign U+2212 for negative numbers per the design system.

const MINUS = "−";

export function fmtMoney(v: number | null | undefined, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "…";
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `${MINUS}$${abs}` : `$${abs}`;
}

export function fmtNum(v: number | null | undefined, decimals = 4): string {
  if (v == null || Number.isNaN(v)) return "…";
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `${MINUS}${abs}` : abs;
}

export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "…";
  const pct = v * 100;
  const abs = Math.abs(pct).toFixed(decimals);
  return pct < 0 ? `${MINUS}${abs}%` : `${abs}%`;
}

export function fmtSigned(v: number | null | undefined, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "…";
  const abs = Math.abs(v).toFixed(decimals);
  return v < 0 ? `${MINUS}${abs}` : `+${abs}`;
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "…";
  return v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function fmtMs(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "…";
  if (v < 1) return `${(v * 1000).toFixed(0)}µs`;
  if (v < 100) return `${v.toFixed(1)}ms`;
  return `${v.toFixed(0)}ms`;
}

export function semanticClass(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v) || v === 0) return "text-ink-100";
  return v > 0 ? "text-up-400" : "text-down-400";
}
