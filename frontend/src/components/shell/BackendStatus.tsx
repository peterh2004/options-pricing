"use client";

import { useHealth } from "@/lib/api/queries";

export function BackendStatus() {
  const { data, isLoading, isError } = useHealth();
  const ok = !isError && !!data;
  const color = isLoading ? "bg-warn-500" : ok ? "bg-up-500" : "bg-down-500";
  const label = isLoading ? "connecting" : ok ? "Backend" : "Backend down";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${color} ${ok ? "animate-pulse-green" : ""}`} />
          <span className="text-ink-200">{label}</span>
        </div>
        <span className="mono text-up-400">
          {ok ? `${(data!.uptime_seconds | 0)}s` : "…"}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-300">version</span>
        <span className="mono text-ink-200">{ok ? data!.version : "…"}</span>
      </div>
    </div>
  );
}
