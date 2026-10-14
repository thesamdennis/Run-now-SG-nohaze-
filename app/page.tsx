import Link from "next/link";
import HazeMap, { VERDICT_LIGHT } from "@/components/pixel/HazeMap";
import type { KidMood } from "@/components/pixel/Kid";
import VoxelKid from "@/components/voxel/VoxelKid";
import VoxelMap from "@/components/voxel/VoxelMap";
import { getConditions, type Conditions } from "@/lib/nea";
import { getRoutes } from "@/lib/routes";
import { rankRegions, regionVerdict, type Region, type RegionVerdict } from "@/lib/verdict";
import { formatTime, SHADE_LABEL } from "./verdict-style";

// Re-check NEA at most every 5 minutes.
export const revalidate = 300;

function kidMessage(best: RegionVerdict | undefined, allSkip: boolean): { mood: KidMood; title: string; line: string } {
  if (!best) return { mood: "mask", title: "No live data", line: "Can't reach NEA right now. Check haze.gov.sg before heading out." };
  if (allSkip) return { mood: "mask", title: "Not today!", line: "The haze is bad everywhere. Mask up and run indoors." };
  if (best.verdict === "GO") return { mood: "run", title: `Let's run ${best.region}!`, line: `Cleanest air right now: PM2.5 ${best.pm25}.` };
  return { mood: "easy", title: `Easy pace in the ${best.region}`, line: `Best option, but keep it short and gentle. PM2.5 ${best.pm25}.` };
}

function Verdict({ kid, best, allSkip, updated }: { kid: ReturnType<typeof kidMessage>; best: RegionVerdict | undefined; allSkip: boolean; updated: string | null }) {
  const label = allSkip ? "SKIP" : best ? (best.verdict === "GO_EASY" ? "GO EASY" : best.verdict) : null;
  const color = allSkip ? VERDICT_LIGHT.SKIP.color : best ? VERDICT_LIGHT[best.verdict].color : "#64748b";
  return (
    <div>
      {label && (
        <span className="inline-block rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide text-white" style={{ background: color }}>
          {label}
        </span>
      )}
      <p className="mt-1.5 text-xl font-extrabold capitalize leading-tight text-slate-900 sm:text-2xl">{kid.title}</p>
      <p className="mt-1 text-sm text-slate-600">{kid.line}</p>
      <p className="mt-2 text-xs text-slate-400">
        {updated && <>NEA reading as of {updated} · </>}Tap a region to see its 5K routes.
      </p>
    </div>
  );
}

export default async function Home() {
  let conditions: Conditions | null = null;
  try {
    conditions = await getConditions();
  } catch (err) {
    console.error("Failed to load NEA data", err);
  }

  const ranked = conditions ? rankRegions(conditions.readings.map((r) => regionVerdict(r))) : [];
  const best = ranked[0];
  const allSkip = ranked.length > 0 && ranked.every((r) => r.verdict === "SKIP");
  const updated = formatTime(conditions?.updatedAt ?? null);
  const kid = kidMessage(best, allSkip);

  const routes = getRoutes(conditions);
  const regionOrder = ranked.length > 0 ? ranked.map((r) => r.region) : (["east", "central", "south", "west", "north"] as Region[]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 grid-cols-2 grid-rows-2 overflow-hidden rounded-md shadow-sm" aria-hidden>
            <span className="bg-green-400" />
            <span className="bg-green-600" />
            <span className="bg-green-600" />
            <span className="bg-amber-700" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-green-950 sm:text-xl">SG Haze Run</h1>
            <p className="text-xs text-green-800 sm:text-sm">Where should I run my 5K right now?</p>
          </div>
        </div>
        {updated && <p className="hidden text-right text-xs text-slate-500 sm:block">Live NEA readings · {updated}</p>}
      </header>

      <section className="mt-4 overflow-hidden rounded-3xl shadow-xl ring-1 ring-sky-900/10">
        <VoxelMap
          regions={ranked.length > 0 ? ranked : null}
          centres={conditions?.centres ?? {}}
          fallback={<HazeMap regions={ranked.length > 0 ? ranked : null} centres={conditions?.centres ?? {}} />}
        >
          <p className="pointer-events-none absolute left-1/2 top-3 hidden -translate-x-1/2 whitespace-nowrap text-sm font-extrabold sm:block tracking-tight text-sky-950/80 drop-shadow-sm sm:top-5 sm:text-2xl">
            Singapore, one breath at a time.
          </p>
          <div className="vx-card absolute bottom-4 left-4 hidden max-w-sm p-4 sm:block">
            <Verdict kid={kid} best={best} allSkip={allSkip} updated={updated} />
          </div>
          <VoxelKid mood={kid.mood} className="pointer-events-none absolute -bottom-1 right-0 h-24 w-16 sm:h-60 sm:w-44 lg:h-72 lg:w-52" />
        </VoxelMap>
        <div className="bg-white p-4 sm:hidden">
          <Verdict kid={kid} best={best} allSkip={allSkip} updated={updated} />
        </div>
      </section>

      {ranked.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {ranked.map((r) => (
            <li key={r.region}>
              <a href={`#routes-${r.region}`} className="vx-tile flex h-full items-center justify-between px-4 py-3 sm:flex-col sm:gap-1">
                <span className="flex items-center gap-2">
                  <span className="vx-light h-3 w-3" style={{ background: VERDICT_LIGHT[r.verdict].color, color: VERDICT_LIGHT[r.verdict].color }} />
                  <span className="font-semibold capitalize">{r.region}</span>
                </span>
                <span className="text-sm text-slate-600">
                  PM2.5 {r.pm25 ?? "–"} · PSI {r.psi24 ?? "–"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-extrabold text-green-950">5K routes{ranked.length > 0 ? ", best areas first" : ""}</h2>
        <ul className="mt-4 space-y-6">
          {regionOrder.map((region) => {
            const inRegion = routes.filter((r) => r.region === region);
            if (inRegion.length === 0) return null;
            const v = ranked.find((r) => r.region === region);
            return (
              <li key={region} id={`routes-${region}`} className="scroll-mt-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-green-900">
                  {v && <span className="vx-light h-2.5 w-2.5" style={{ background: VERDICT_LIGHT[v.verdict].color, color: VERDICT_LIGHT[v.verdict].color }} />}
                  {region}
                  {v && <span className="font-normal normal-case text-slate-500">· PM2.5 {v.pm25 ?? "–"}</span>}
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {inRegion.map((r) => (
                    <li key={r.id}>
                      <Link href={`/routes/${r.id}`} className="vx-tile flex items-center justify-between px-4 py-3 transition-transform hover:-translate-y-0.5">
                        <span>
                          <span className="font-semibold">{r.name}</span>
                          <span className="block text-sm text-slate-500">
                            🚇 {r.nearestMrt} · {SHADE_LABEL[r.shade] ?? r.shade}
                          </span>
                        </span>
                        <span className="text-lg font-bold text-green-700" aria-hidden>
                          ›
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-10 space-y-1 text-xs text-slate-500">
        <p>Air-quality data © NEA via data.gov.sg. Readings are regional averages, not street-level.</p>
        <p>Verdicts are general guidance for healthy adults, not medical advice.</p>
      </footer>
    </main>
  );
}
