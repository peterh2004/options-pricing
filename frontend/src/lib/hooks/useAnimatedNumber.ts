"use client";

import { useEffect, useRef, useState } from "react";

// requestAnimationFrame-based number tween. Used by net-Greek displays so values
// roll smoothly when legs change instead of jumping. Respects prefers-reduced-motion.

export interface AnimatedNumberOpts {
  duration?: number;   // ms
  decimals?: number;
}

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);

export function useAnimatedNumber(target: number, opts: AnimatedNumberOpts = {}): number {
  const { duration = 300 } = opts;
  const [value, setValue] = useState(target);
  const startVal = useRef(target);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const lastTarget = useRef(target);
  const reduced = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  useEffect(() => {
    if (target === lastTarget.current) return;
    if (reduced.current) {
      setValue(target);
      lastTarget.current = target;
      return;
    }
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    startVal.current = value;
    startTime.current = null;
    lastTarget.current = target;

    const step = (ts: number) => {
      if (startTime.current == null) startTime.current = ts;
      const t = Math.min((ts - startTime.current) / duration, 1);
      const eased = EASE_OUT_CUBIC(t);
      const v = startVal.current + (target - startVal.current) * eased;
      setValue(v);
      if (t < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        rafId.current = null;
      }
    };
    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
