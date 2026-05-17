"use client";

import {
  Activity,
  BookOpen,
  CandlestickChart,
  FileText,
  Layers,
  LineChart,
  Mountain,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { BackendStatus } from "./BackendStatus";

const NAV = [
  { href: "/app/pricer",      label: "Pricer",            icon: CandlestickChart },
  { href: "/app/surface",     label: "Vol Surface",       icon: Mountain },
  { href: "/app/strategy",    label: "Strategy Builder",  icon: Layers },
  { href: "/app/iv-analysis", label: "IV Analysis",       icon: LineChart },
] as const;

const REFERENCE = [
  { href: "/app/guide",      label: "Guide",      icon: BookOpen },
  { href: "/app/validation", label: "Validation", icon: FileText },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-[224px] shrink-0 bg-ink-950 border-r flex flex-col">
      <Link href="/" className="h-12 flex items-center gap-2 px-4 border-b">
        <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-accent-500 to-accent-600 grid place-items-center">
          <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">Vol Lab</div>
          <div className="text-[10px] text-ink-400 mono">v0.1.0-rc</div>
        </div>
      </Link>

      <nav className="flex-1 py-3 px-2 text-[13px] overflow-y-auto">
        <div className="label px-3 pb-2 pt-1">Workbench</div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 h-8 rounded-sm transition-colors",
                active
                  ? "bg-ink-800 text-ink-50 border-l-2 border-accent-500 -ml-px"
                  : "text-ink-200 hover:bg-ink-800/60 hover:text-ink-50",
              )}
            >
              <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}

        <div className="label px-3 pb-2 pt-5">Reference</div>
        {REFERENCE.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 h-8 rounded-sm transition-colors",
                active
                  ? "bg-ink-800 text-ink-50 border-l-2 border-accent-500 -ml-px"
                  : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-50",
              )}
            >
              <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <BackendStatus />
      </div>
    </aside>
  );
}
