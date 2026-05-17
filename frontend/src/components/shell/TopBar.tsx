"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { TickerTape } from "./TickerTape";

const SECTION_LABELS: Record<string, string> = {
  "/app/pricer": "Pricer",
  "/app/surface": "Vol Surface",
  "/app/strategy": "Strategy Builder",
  "/app/iv-analysis": "IV Analysis",
};

export function TopBar() {
  const pathname = usePathname() ?? "";
  const sectionLabel = Object.entries(SECTION_LABELS).find(([k]) => pathname.startsWith(k))?.[1] ?? "";
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <header className="h-12 shrink-0 border-b flex items-stretch bg-ink-950">
      <div className="flex items-center gap-3 px-5 border-r w-[360px]">
        <span className="text-ink-400 text-[12px]">Workbench</span>
        <span className="text-ink-500 text-[10px]">›</span>
        <span className="text-ink-100 text-[12px] font-medium">{sectionLabel}</span>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="ml-4 my-2 flex items-center gap-2 px-3 rounded-sm bg-ink-850 border hover:border-ink-600 w-[320px] text-left"
      >
        <Search className="w-[13px] h-[13px] text-ink-400" strokeWidth={1.75} />
        <span className="text-[12px] text-ink-400 flex-1">
          Search ticker, strategy, command…
        </span>
        <kbd className="mono text-[10px] text-ink-300 bg-ink-800 border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <TickerTape />

      <div className="flex items-center gap-1 px-3 border-l">
        <ThemeToggle />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
