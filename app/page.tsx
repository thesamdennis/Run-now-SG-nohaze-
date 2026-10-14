import Link from "next/link";
import HazeMap, { VERDICT_LIGHT } from "@/components/pixel/HazeMap";
import Kid, { type KidMood } from "@/components/pixel/Kid";
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
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex items-center gap-3">
        <span className="grid h-9 w-9 grid-cols-2 grid-rows-2 border-2 border-green-900" aria-hidden>
          <span className="bg-green-400" />
          <span className="bg-green-600" />
          <span className="bg-green-600" />
          <span className="bg-amber-700" />
        </span>
        <div>
          <h1 className="font-pixel text-base text-green-900 sm:text-lg">SG Haze Run</h1>
          <p className="text-xs text-green-800 sm:text-sm">Where should I run my 5K right now?</p>
        </div>
      </header>

      <section className="px-panel mt-5 overflow-hidden">
        <p className="bg-gradient-to-b from-sky-200 to-sky-300 px-3 py-2 text-center font-pixel text-[10px] text-sky-950 sm:text-xs">
          Singapore, one breath at a time.
        </p>
        <HazeMap regions={ranked.length > 0 ? ranked : null} centres={conditions?.centres ?? {}} />

        <div className="flex items-center gap-3 border-t-3 border-green-900 bg-green-50 p-3 sm:gap-4 sm:p-4">
          <Kid mood={kid.mood} className="h-24 w-[4.5rem] shrink-0 sm:h-32 sm:w-24" />
          <div className="min-w-0">
            {best && !allSkip && (
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: VERDICT_LIGHT[best.verdict].color }}>
                {VERDICT_LIGHT[best.verdict].label === "EASY" ? "GO EASY" : VERDICT_LIGHT[best.verdict].label}
              </p>
            )}
            {allSkip && <p className="text-xs font-semibold uppercase tracking-wide text-red-600">SKIP</p>}
            <p className="font-pixel text-sm capitalize leading-snug text-green-950 sm:text-base">{kid.title}</p>
            <p className="mt-1 text-sm text-slate-700">{kid.line}</p>
            {updated && <p className="mt-1 text-xs text-slate-500">NEA reading as of {updated} · tap a region for routes</p>}
          </div>
        </div>
      </section>

      {ranked.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {ranked.map((r) => (
            <li key={r.region}>
              <a href={`#routes-${r.region}`} className="px-badge flex h-full items-center justify-between px-3 py-2 sm:flex-col sm:gap-1">
                <span className="flex items-center gap-2">
                  <span className="px-light h-3 w-3" style={{ background: VERDICT_LIGHT[r.verdict].color, color: VERDICT_LIGHT[r.verdict].color }} />
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
        <h2 className="font-pixel text-sm text-green-900">5K routes{ranked.length > 0 ? ", best areas first" : ""}</h2>
        <ul className="mt-4 space-y-6">
          {regionOrder.map((region) => {
            const inRegion = routes.filter((r) => r.region === region);
            if (inRegion.length === 0) return null;
            const v = ranked.find((r) => r.region === region);
            return (
              <li key={region} id={`routes-${region}`} className="scroll-mt-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-green-900">
                  {v && <span className="px-light h-2.5 w-2.5" style={{ background: VERDICT_LIGHT[v.verdict].color, color: VERDICT_LIGHT[v.verdict].color }} />}
                  {region}
                  {v && <span className="font-normal normal-case text-slate-500">· PM2.5 {v.pm25 ?? "–"}</span>}
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {inRegion.map((r) => (
                    <li key={r.id}>
                      <Link href={`/routes/${r.id}`} className="px-badge flex items-center justify-between px-3 py-2 transition-transform hover:-translate-y-0.5">
                        <span>
                          <span className="font-semibold">{r.name}</span>
                          <span className="block text-sm text-slate-500">
                            🚇 {r.nearestMrt} · {SHADE_LABEL[r.shade] ?? r.shade}
                          </span>
                        </span>
                        <span className="font-pixel text-xs text-green-700" aria-hidden>
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
