"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 grid place-items-center text-ink-300 hover:text-ink-100 hover:bg-ink-850 rounded-sm"
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-[15px] h-[15px]" strokeWidth={1.75} />
      ) : (
        <Moon className="w-[15px] h-[15px]" strokeWidth={1.75} />
      )}
    </button>
  );
}
