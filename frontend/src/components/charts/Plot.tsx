"use client";

import { useEffect, useMemo, useRef } from "react";

import { useTheme } from "@/lib/hooks/useTheme";

// Lightweight wrapper around plotly.js-dist-min. Bundle is lazy-loaded so we
// don't ship Plotly on first paint.

import type { Data, Layout, Config } from "plotly.js";

function themeForMode(theme: "dark" | "light"): Partial<Layout> {
  if (theme === "light") {
    return {
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      font: { family: "JetBrains Mono, monospace", color: "#52525b", size: 9 },
      margin: { l: 46, r: 14, t: 14, b: 32 },
      showlegend: false,
      xaxis: { gridcolor: "#ededf0", zerolinecolor: "#c8c8d0", linecolor: "#c8c8d0" },
      yaxis: { gridcolor: "#ededf0", zerolinecolor: "#c8c8d0", linecolor: "#c8c8d0" },
    };
  }
  return {
    paper_bgcolor: "#0a0a0b",
    plot_bgcolor: "#0a0a0b",
    font: { family: "JetBrains Mono, monospace", color: "#8a8a96", size: 9 },
    margin: { l: 46, r: 14, t: 14, b: 32 },
    showlegend: false,
    xaxis: { gridcolor: "#131316", zerolinecolor: "#26262d", linecolor: "#26262d" },
    yaxis: { gridcolor: "#131316", zerolinecolor: "#26262d", linecolor: "#26262d" },
  };
}

// Exported for callers that need theme defaults (legacy import path).
export const PLOTLY_THEME = themeForMode("dark");

const DEFAULT_CONFIG: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
};

export function Plot({
  data,
  layout,
  config,
  className,
}: {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const { theme } = useTheme();

  const themedLayout = useMemo(() => themeForMode(theme), [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Plotly = (await import("plotly.js-dist-min")).default;
      if (!ref.current || cancelled) return;
      const merged: Partial<Layout> = {
        ...themedLayout,
        ...(layout ?? {}),
        xaxis: { ...themedLayout.xaxis, ...(layout?.xaxis ?? {}) },
        yaxis: { ...themedLayout.yaxis, ...(layout?.yaxis ?? {}) },
      };
      if (initialized.current) {
        await Plotly.react(ref.current, data, merged, { ...DEFAULT_CONFIG, ...(config ?? {}) });
      } else {
        await Plotly.newPlot(ref.current, data, merged, { ...DEFAULT_CONFIG, ...(config ?? {}) });
        initialized.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, layout, config, themedLayout]);

  useEffect(() => {
    return () => {
      if (ref.current) {
        import("plotly.js-dist-min").then(({ default: Plotly }) => {
          if (ref.current) Plotly.purge(ref.current);
        });
      }
    };
  }, []);

  return <div ref={ref} className={className} />;
}
