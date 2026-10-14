import routeData from "@/data/routes-5k.json";
import type { Conditions } from "./nea.ts";
import { nearestRegion, type Region } from "./verdict.ts";

export type Route = (typeof routeData.routes)[number] & { region: Region };

/** All routes, each assigned to the NEA region nearest its start (or its provisional region if NEA is unavailable). */
export function getRoutes(conditions: Conditions | null): Route[] {
  return routeData.routes.map((r) => ({
    ...r,
    region: (conditions && nearestRegion(r.start, conditions.centres)) || (r.provisionalRegion as Region),
  }));
}

export function getRoute(id: string, conditions: Conditions | null): Route | undefined {
  return getRoutes(conditions).find((r) => r.id === id);
}

export function allRouteIds(): string[] {
  return routeData.routes.map((r) => r.id);
}
