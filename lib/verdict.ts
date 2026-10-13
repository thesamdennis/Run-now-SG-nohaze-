// Turns NEA readings into a runner's verdict. Thresholds are documented in docs/PLAN.md.

export const REGIONS = ["north", "south", "east", "west", "central"] as const;
export type Region = (typeof REGIONS)[number];
export type Verdict = "GO" | "GO_EASY" | "SKIP";

export type RegionReading = {
  region: Region;
  pm25: number | null; // 1-hr PM2.5, µg/m³
  psi24: number | null; // 24-hr PSI
};

export type RegionVerdict = RegionReading & { verdict: Verdict; reasons: string[] };

const RANK: Record<Verdict, number> = { GO: 0, GO_EASY: 1, SKIP: 2 };

export function worst(a: Verdict, b: Verdict): Verdict {
  return RANK[a] >= RANK[b] ? a : b;
}

export function pm25Verdict(pm25: number, sensitive = false): Verdict {
  const [go, easy] = sensitive ? [25, 40] : [35, 55];
  if (pm25 <= go) return "GO";
  if (pm25 <= easy) return "GO_EASY";
  return "SKIP";
}

export function psiVerdict(psi24: number): Verdict {
  if (psi24 <= 100) return "GO";
  if (psi24 <= 200) return "GO_EASY";
  return "SKIP";
}

export function regionVerdict(r: RegionReading, sensitive = false): RegionVerdict {
  const reasons: string[] = [];
  let verdict: Verdict = "GO";
  if (r.pm25 !== null) {
    const v = pm25Verdict(r.pm25, sensitive);
    if (v !== "GO") reasons.push(`PM2.5 is ${r.pm25}`);
    verdict = worst(verdict, v);
  }
  if (r.psi24 !== null) {
    const v = psiVerdict(r.psi24);
    if (v !== "GO") reasons.push(`24-hr PSI is ${r.psi24}`);
    verdict = worst(verdict, v);
  }
  // No PM2.5 reading means we can't say it's fine to run hard.
  if (r.pm25 === null) {
    reasons.push("No PM2.5 reading");
    verdict = worst(verdict, "GO_EASY");
  }
  return { ...r, verdict, reasons };
}

/** Best region first: by verdict, then lowest PM2.5. */
export function rankRegions(list: RegionVerdict[]): RegionVerdict[] {
  return [...list].sort(
    (a, b) => RANK[a.verdict] - RANK[b.verdict] || (a.pm25 ?? Infinity) - (b.pm25 ?? Infinity),
  );
}

export type LatLng = { lat: number; lng: number };

/** Region whose NEA label location is closest to the point. */
export function nearestRegion(point: LatLng, centres: Partial<Record<Region, LatLng>>): Region | null {
  let best: Region | null = null;
  let bestDist = Infinity;
  for (const region of REGIONS) {
    const c = centres[region];
    if (!c) continue;
    const d = (c.lat - point.lat) ** 2 + ((c.lng - point.lng) * Math.cos((point.lat * Math.PI) / 180)) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = region;
    }
  }
  return best;
}
