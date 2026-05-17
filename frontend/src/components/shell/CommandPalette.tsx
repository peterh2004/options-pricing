"use client";

import { ArrowRight, CandlestickChart, Layers, LineChart, Mountain, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COMMANDS = [
  { id: "pricer",    label: "Open Pricer",         href: "/app/pricer",      icon: CandlestickChart, kbd: "P" },
  { id: "surface",   label: "Open Vol Surface",    href: "/app/surface",     icon: Mountain,         kbd: "S" },
  { id: "strategy",  label: "Open Strategy Builder", href: "/app/strategy",  icon: Layers,           kbd: "B" },
  { id: "iv",        label: "Open IV Analysis",    href: "/app/iv-analysis", icon: LineChart,        kbd: "I" },
];

const TICKERS = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "AMD"];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  // Keyboard: Cmd/Ctrl+K toggles; Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;

  const ql = q.trim().toUpperCase();
  const tickerMatches = ql
    ? TICKERS.filter((t) => t.includes(ql)).slice(0, 5)
    : TICKERS.slice(0, 5);
  const commandMatches = ql
    ? COMMANDS.filter((c) => c.label.toUpperCase().includes(ql))
    : COMMANDS;

  const navigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[12vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-[560px] bg-ink-900 border border-ink-700 rounded-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 flex items-center gap-3 px-4 border-b border-ink-700">
          <Search className="w-4 h-4 text-ink-400" strokeWidth={1.75} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker or command…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-50 placeholder:text-ink-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (tickerMatches[0] && ql) {
                  navigate(`/app/surface?ticker=${tickerMatches[0]}`);
                } else if (commandMatches[0]) {
                  navigate(commandMatches[0].href);
                }
              }
            }}
          />
          <kbd className="mono text-[10px] text-ink-400 bg-ink-800 border border-ink-700 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          <div className="label px-2 py-1">Tickers</div>
          {tickerMatches.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/app/surface?ticker=${t}`)}
              className="w-full flex items-center justify-between px-2 h-9 rounded-sm hover:bg-ink-800 text-left text-[13px]"
            >
              <span className="flex items-center gap-2">
                <span className="mono text-ink-50 font-medium">{t}</span>
                <span className="text-ink-400 text-[11px]">→ Vol Surface</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-500" strokeWidth={1.75} />
            </button>
          ))}

          <div className="label px-2 py-1 pt-3">Commands</div>
          {commandMatches.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => navigate(c.href)}
                className="w-full flex items-center justify-between px-2 h-9 rounded-sm hover:bg-ink-800 text-left text-[13px]"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.75} />
                  <span className="text-ink-100">{c.label}</span>
                </span>
                <kbd className="mono text-[10px] text-ink-400 bg-ink-800 border border-ink-700 rounded px-1.5 py-0.5">
                  {c.kbd}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
