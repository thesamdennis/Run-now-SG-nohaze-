// Fetches live air-quality readings from NEA via data.gov.sg (server side only).
import { REGIONS, type LatLng, type Region, type RegionReading } from "./verdict.ts";

const BASE = "https://api-open.data.gov.sg/v2/real-time/api";
const CACHE_SECONDS = 300;

export type Conditions = {
  readings: RegionReading[];
  centres: Partial<Record<Region, LatLng>>;
  updatedAt: string | null;
};

type NeaResponse = {
  data?: {
    regionMetadata?: { name: string; labelLocation?: { latitude: number; longitude: number } }[];
    items?: { updatedTimestamp?: string; date?: string; readings?: Record<string, Record<string, number>> }[];
  };
};

async function getJson(path: string): Promise<NeaResponse> {
  const headers: Record<string, string> = {};
  const key = process.env.DATA_GOV_SG_API_KEY;
  if (key) headers["x-api-key"] = key;
  const res = await fetch(`${BASE}/${path}`, { headers, next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error(`NEA ${path} returned ${res.status}`);
  return res.json();
}

function latest(json: NeaResponse, field: string): { values: Record<string, number>; updatedAt: string | null } {
  const item = json.data?.items?.[0];
  return { values: item?.readings?.[field] ?? {}, updatedAt: item?.updatedTimestamp ?? item?.date ?? null };
}

export function parseConditions(pm25Json: NeaResponse, psiJson: NeaResponse): Conditions {
  const pm25 = latest(pm25Json, "pm25_one_hourly");
  const psi = latest(psiJson, "psi_twenty_four_hourly");

  const centres: Partial<Record<Region, LatLng>> = {};
  for (const m of pm25Json.data?.regionMetadata ?? psiJson.data?.regionMetadata ?? []) {
    if ((REGIONS as readonly string[]).includes(m.name) && m.labelLocation) {
      centres[m.name as Region] = { lat: m.labelLocation.latitude, lng: m.labelLocation.longitude };
    }
  }

  const readings = REGIONS.map((region) => ({
    region,
    pm25: typeof pm25.values[region] === "number" ? pm25.values[region] : null,
    psi24: typeof psi.values[region] === "number" ? psi.values[region] : null,
  }));

  return { readings, centres, updatedAt: pm25.updatedAt ?? psi.updatedAt };
}

export async function getConditions(): Promise<Conditions> {
  const [pm25Json, psiJson] = await Promise.all([getJson("pm25"), getJson("psi")]);
  return parseConditions(pm25Json, psiJson);
}
