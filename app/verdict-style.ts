import type { Verdict } from "@/lib/verdict";

export const VERDICT_STYLE: Record<Verdict, { label: string; dot: string; text: string; bg: string }> = {
  GO: { label: "GO", dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 ring-green-200" },
  GO_EASY: { label: "GO EASY", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 ring-amber-200" },
  SKIP: { label: "SKIP", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50 ring-red-200" },
};

export function formatTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}

export const SHADE_LABEL: Record<string, string> = { low: "Little shade", medium: "Some shade", high: "Well shaded" };
