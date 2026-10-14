import Link from "next/link";
import { getConditions, type Conditions } from "@/lib/nea";
import { getRoutes } from "@/lib/routes";
import { rankRegions, regionVerdict, type Region } from "@/lib/verdict";
import { formatTime, SHADE_LABEL, VERDICT_STYLE } from "./verdict-style";

// Re-check NEA at most every 5 minutes.
export const revalidate = 300;

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

  const routes = getRoutes(conditions);
  const regionOrder = ranked.length > 0 ? ranked.map((r) => r.region) : (["east", "central", "south", "west", "north"] as Region[]);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-bold">SG Haze Run</h1>
      <p className="mt-2 text-slate-600">Where in Singapore should I run my 5K right now?</p>

      {!conditions && (
        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="font-semibold">Live air-quality data is unavailable right now.</p>
          <p className="mt-1 text-sm text-slate-600">
            Check{" "}
            <a className="underline" href="https://www.haze.gov.sg" target="_blank" rel="noreferrer">
              haze.gov.sg
            </a>{" "}
            before heading out.
          </p>
        </section>
      )}

      {best && (
        <section className={`mt-8 rounded-2xl p-5 ring-1 ${VERDICT_STYLE[best.verdict].bg}`}>
          {allSkip ? (
            <>
              <p className={`text-2xl font-bold ${VERDICT_STYLE.SKIP.text}`}>SKIP the outdoor run</p>
              <p className="mt-1 text-slate-700">Air quality is poor across Singapore. Consider an indoor run.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Best area right now</p>
              <p className={`mt-1 text-2xl font-bold ${VERDICT_STYLE[best.verdict].text}`}>
                {VERDICT_STYLE[best.verdict].label}: <span className="capitalize">{best.region}</span>
              </p>
              <p className="mt-1 text-slate-700">1-hr PM2.5: {best.pm25 ?? "–"} µg/m³</p>
            </>
          )}
          {updated && <p className="mt-2 text-xs text-slate-500">NEA reading as of {updated}</p>}
        </section>
      )}

      {ranked.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {ranked.map((r) => (
            <li key={r.region} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
              <span className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${VERDICT_STYLE[r.verdict].dot}`} />
                <span className="font-medium capitalize">{r.region}</span>
              </span>
              <span className="text-sm text-slate-600">
                PM2.5 {r.pm25 ?? "–"} · PSI {r.psi24 ?? "–"}{" "}
                <span className={`ml-1 font-semibold ${VERDICT_STYLE[r.verdict].text}`}>{VERDICT_STYLE[r.verdict].label}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">5K routes{ranked.length > 0 ? ", best areas first" : ""}</h2>
        <ul className="mt-3 space-y-4">
          {regionOrder.map((region) => {
            const inRegion = routes.filter((r) => r.region === region);
            if (inRegion.length === 0) return null;
            const v = ranked.find((r) => r.region === region);
            return (
              <li key={region}>
                <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
                  {v && <span className={`h-2 w-2 rounded-full ${VERDICT_STYLE[v.verdict].dot}`} />}
                  {region}
                </h3>
                <ul className="mt-1 space-y-1">
                  {inRegion.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/routes/${r.id}`}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 hover:ring-slate-400"
                      >
                        <span>
                          <span className="font-medium">{r.name}</span>
                          <span className="block text-sm text-slate-500">
                            🚇 {r.nearestMrt} · {SHADE_LABEL[r.shade] ?? r.shade}
                          </span>
                        </span>
                        <span className="text-slate-400" aria-hidden>
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

      <footer className="mt-10 space-y-1 text-xs text-slate-400">
        <p>Air-quality data © NEA via data.gov.sg. Readings are regional averages, not street-level.</p>
        <p>Verdicts are general guidance for healthy adults, not medical advice.</p>
      </footer>
    </main>
  );
}
