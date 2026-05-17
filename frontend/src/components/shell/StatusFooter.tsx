"use client";

import { useEffect, useState } from "react";

// Persist a short session id per browser tab. Generated once on first mount.
function useSessionId(): string {
  const [id, setId] = useState("--------");
  useEffect(() => {
    let s = sessionStorage.getItem("vollab-session");
    if (!s) {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      s = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem("vollab-session", s);
    }
    setId(s);
  }, []);
  return id;
}

export function StatusFooter({
  computeMs,
  endpoint,
  meta,
}: {
  computeMs?: number;
  endpoint?: string;
  meta?: React.ReactNode;
}) {
  const sessionId = useSessionId();
  return (
    <footer className="h-7 border-t flex items-center px-5 text-[11px] mono text-ink-400 gap-6 bg-ink-950 shrink-0">
      <span>
        session <span className="text-ink-200">{sessionId}</span>
      </span>
      <span>
        r <span className="text-ink-200">4.288%</span>
      </span>
      <span>
        q <span className="text-ink-200">1.35%</span>
      </span>
      <span>
        model <span className="text-ink-200">Black-Scholes-Merton</span>
      </span>
      {meta}
      <span className="flex-1" />
      {computeMs != null ? (
        <span>
          compute{" "}
          <span className={computeMs < 50 ? "text-up-400" : "text-warn-400"}>
            {computeMs.toFixed(1)}ms
          </span>
        </span>
      ) : null}
      {endpoint ? (
        <span>
          API <span className="text-ink-200">{endpoint}</span>
        </span>
      ) : null}
    </footer>
  );
}
