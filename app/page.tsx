import routeData from "@/data/routes-5k.json";

const REGIONS = ["north", "south", "east", "west", "central"] as const;

export default function Home() {
  const routes = routeData.routes;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-bold">SG Haze Run</h1>
      <p className="mt-2 text-slate-600">Where in Singapore should I run my 5K right now?</p>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Coming soon</p>
        <p className="mt-1 text-lg">
          Live air-quality verdicts (<span className="font-semibold text-green-600">GO</span> /{" "}
          <span className="font-semibold text-amber-500">GO EASY</span> /{" "}
          <span className="font-semibold text-red-600">SKIP</span>) for each part of Singapore.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{routes.length} 5K routes so far</h2>
        <ul className="mt-3 space-y-4">
          {REGIONS.map((region) => {
            const inRegion = routes.filter((r) => r.provisionalRegion === region);
            if (inRegion.length === 0) return null;
            return (
              <li key={region}>
                <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">{region}</h3>
                <ul className="mt-1 space-y-1">
                  {inRegion.map((r) => (
                    <li key={r.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                      <span className="font-medium">{r.name}</span>
                      <span className="block text-sm text-slate-500">
                        {r.nearestMrt} · {r.format}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-10 text-xs text-slate-400">
        Readings will come from NEA via data.gov.sg. Not medical advice.
      </footer>
    </main>
  );
}
