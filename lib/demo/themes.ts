// Token-based theme system. Components consume these as CSS custom
// properties (via static `bg-[var(--demo-bg)]`-style Tailwind classes), not
// dynamically-built class names — dynamic class strings get purged by
// Tailwind's production build since they never appear literally in source.
// AI never generates raw CSS; it only ever picks a ThemeId/PaletteId.

import type { CSSProperties } from "react";
import type { PaletteId, ThemeId } from "./types";

export interface ThemeTokens {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  radius: string;
  containerMax: string;
  shadow: string;
  fontHeading: string;
  fontBody: string;
  navBg: string;
  navText: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  "clean-light": {
    bg: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textMuted: "#475569",
    border: "#e2e8f0",
    radius: "0.5rem",
    containerMax: "72rem",
    shadow: "0 1px 3px rgba(15,23,42,0.08)",
    fontHeading: "ui-sans-serif, system-ui, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    navBg: "#ffffff",
    navText: "#0f172a",
  },
  "premium-dark": {
    bg: "#0b0d10",
    surface: "#15181d",
    text: "#f4f5f7",
    textMuted: "#a3a9b3",
    border: "#262b33",
    radius: "0.25rem",
    containerMax: "76rem",
    shadow: "0 8px 30px rgba(0,0,0,0.45)",
    fontHeading: "ui-sans-serif, system-ui, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    navBg: "rgba(11,13,16,0.85)",
    navText: "#f4f5f7",
  },
  "bold-local": {
    bg: "#ffffff",
    surface: "#fff7ed",
    text: "#1c1917",
    textMuted: "#57534e",
    border: "#e7e5e4",
    radius: "0.125rem",
    containerMax: "72rem",
    shadow: "0 2px 8px rgba(28,25,23,0.12)",
    fontHeading: "ui-sans-serif, system-ui, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    navBg: "#1c1917",
    navText: "#ffffff",
  },
  natural: {
    bg: "#faf9f6",
    surface: "#f0efe8",
    text: "#22281f",
    textMuted: "#4b5442",
    border: "#dedbcd",
    radius: "0.75rem",
    containerMax: "70rem",
    shadow: "0 1px 4px rgba(34,40,31,0.1)",
    fontHeading: "ui-sans-serif, system-ui, sans-serif",
    fontBody: "ui-sans-serif, system-ui, sans-serif",
    navBg: "#faf9f6",
    navText: "#22281f",
  },
};

export interface PaletteTokens {
  accent: string;
  accentText: string;
  accentHover: string;
}

export const PALETTES: Record<PaletteId, PaletteTokens> = {
  "slate-blue": { accent: "#2563eb", accentText: "#ffffff", accentHover: "#1d4ed8" },
  "charcoal-gold": { accent: "#b8860b", accentText: "#0f0f0f", accentHover: "#96690a" },
  "forest-neutral": { accent: "#166534", accentText: "#ffffff", accentHover: "#14532d" },
  "navy-sand": { accent: "#1e3a5f", accentText: "#ffffff", accentHover: "#16293f" },
  "graphite-orange": { accent: "#ea580c", accentText: "#ffffff", accentHover: "#c2410c" },
};

// CSS custom properties applied at the demo site root. Components reference
// these via arbitrary-value Tailwind classes, e.g. bg-[var(--demo-accent)].
export function themeCssVars(themeId: ThemeId, paletteId: PaletteId): CSSProperties {
  const t = THEMES[themeId];
  const p = PALETTES[paletteId];
  return {
    ["--demo-bg" as string]: t.bg,
    ["--demo-surface" as string]: t.surface,
    ["--demo-text" as string]: t.text,
    ["--demo-text-muted" as string]: t.textMuted,
    ["--demo-border" as string]: t.border,
    ["--demo-radius" as string]: t.radius,
    ["--demo-container-max" as string]: t.containerMax,
    ["--demo-shadow" as string]: t.shadow,
    ["--demo-font-heading" as string]: t.fontHeading,
    ["--demo-font-body" as string]: t.fontBody,
    ["--demo-nav-bg" as string]: t.navBg,
    ["--demo-nav-text" as string]: t.navText,
    ["--demo-accent" as string]: p.accent,
    ["--demo-accent-text" as string]: p.accentText,
    ["--demo-accent-hover" as string]: p.accentHover,
  } as CSSProperties;
}
