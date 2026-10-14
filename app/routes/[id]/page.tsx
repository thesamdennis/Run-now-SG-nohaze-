import Link from "next/link";
import { notFound } from "next/navigation";
import { getConditions, type Conditions } from "@/lib/nea";
import { allRouteIds, getRoute } from "@/lib/routes";
import { regionVerdict } from "@/lib/verdict";
import { formatTime, SHADE_LABEL, VERDICT_STYLE } from "../../verdict-style";
import RouteMap from "./RouteMap";

export const revalidate = 300;

export function generateStaticParams() {
  return allRouteIds().map((id) => ({ id }));
}

function yesNo(v: boolean | null) {
  return v === null ? "Not checked yet" : v ? "Yes" : "No";
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let conditions: Conditions | null = null;
  try {
    conditions = await getConditions();
  } catch (err) {
    console.error("Failed to load NEA data", err);
  }

  const route = getRoute(id, conditions);
  if (!route) notFound();

  const reading = conditions?.readings.find((r) => r.region === route.region);
  const verdict = reading ? regionVerdict(reading) : null;
  const updated = formatTime(conditions?.updatedAt ?? null);
  const { lat, lng } = route.start;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← All routes
      </Link>

      <h1 className="mt-3 text-2xl font-bold">{route.name}</h1>
      <p className="mt-1 text-slate-600">
        5.0 km · <span className="capitalize">{route.format.replace(/-/g, " ")}</span> ·{" "}
        <span className="capitalize">{route.region}</span>
      </p>

      {verdict ? (
        <section className={`mt-4 rounded-2xl p-4 ring-1 ${VERDICT_STYLE[verdict.verdict].bg}`}>
          <p className={`text-xl font-bold ${VERDICT_STYLE[verdict.verdict].text}`}>
            {VERDICT_STYLE[verdict.verdict].label}
            {verdict.verdict === "SKIP" && " – not a good time for this run"}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="capitalize">{route.region}</span>: PM2.5 {verdict.pm25 ?? "–"} µg/m³ · PSI {verdict.psi24 ?? "–"}
          </p>
          {updated && <p className="mt-1 text-xs text-slate-500">NEA reading as of {updated}</p>}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
          Live air-quality data is unavailable. Check haze.gov.sg before heading out.
        </section>
      )}

      <div className="mt-4">
        <RouteMap start={route.start} path={route.path} />
        {route.path.length < 2 && (
          <p className="mt-2 text-xs text-slate-500">Showing the start point. The full 5K route line is coming soon.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-slate-900 px-3 py-3 text-center text-sm font-semibold text-white"
        >
          Navigate (Google Maps)
        </a>
        <a
          href={`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=r`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-white px-3 py-3 text-center text-sm font-semibold ring-1 ring-slate-300"
        >
          Navigate (Apple Maps)
        </a>
      </div>

      <section className="mt-6 space-y-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">How to run it</h2>
          <p className="mt-1">{route.howToRun}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
          <dt className="text-slate-500">Start / finish</dt>
          <dd>{route.start.name}</dd>
          <dt className="text-slate-500">Nearest MRT</dt>
          <dd>{route.nearestMrt}</dd>
          <dt className="text-slate-500">Shade</dt>
          <dd>{SHADE_LABEL[route.shade] ?? route.shade}</dd>
          <dt className="text-slate-500">Water points</dt>
          <dd>{yesNo(route.water)}</dd>
          <dt className="text-slate-500">Toilets</dt>
          <dd>{yesNo(route.toilets)}</dd>
          <dt className="text-slate-500">Lit at night</dt>
          <dd>{yesNo(route.litAtNight)}</dd>
        </dl>
        <p className="text-sm text-slate-600">{route.notes}</p>
        {route.status === "draft" && (
          <p className="text-xs text-slate-400">Draft route: distance and details not yet verified on foot.</p>
        )}
      </section>

      <footer className="mt-10 space-y-1 text-xs text-slate-400">
        <p>Air-quality data © NEA via data.gov.sg. Readings are regional averages, not street-level.</p>
        <p>Verdicts are general guidance for healthy adults, not medical advice.</p>
      </footer>
    </main>
  );
}
