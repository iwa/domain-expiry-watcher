export const C = {
  purple: "#a78bfa",
  amber: "#e6b65c",
  red: "#e8736a",
  gray: "#7c7c88",
  green: "#5fb98b",
  text: "#ededf1",
  text2: "#9a9aa6",
  text3: "#62626c",
  border: "#2b2b34",
  surface: "#1a1a1f",
  surface2: "#202027",
} as const;

export const MONO = "'Geist Mono', ui-monospace, Menlo, monospace";

export function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",")},${alpha})`;
}
