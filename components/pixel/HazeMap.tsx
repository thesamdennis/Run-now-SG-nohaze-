import type { LatLng, Region, RegionVerdict, Verdict } from "@/lib/verdict";
import { FOREST, GRID, GRID_H, GRID_W, noise, project } from "./geo";
import { SPRITES, spriteRuns, spriteSize, type SpriteName } from "./sprites";

const GRASS = ["#4ade80", "#22c55e", "#3fcf6d", "#34c463"];
const FOREST_GRASS = ["#16a34a", "#15803d", "#1a9145"];
const DIRT = "#9a6b3f";
const DIRT_DARK = "#7a5230";
const SEA = "#38bdf8";
const SEA_DEEP = "#0ea5e9";
const LAKE = "#60a5fa";

// NEA's own label locations, used if the API doesn't send them.
const DEFAULT_CENTRES: Record<Region, LatLng> = {
  north: { lat: 1.41803, lng: 103.82 },
  south: { lat: 1.29587, lng: 103.82 },
  east: { lat: 1.35735, lng: 103.94 },
  west: { lat: 1.35735, lng: 103.7 },
  central: { lat: 1.35735, lng: 103.82 },
};

// Landmarks are placed by hand on the block grid (x, y = bottom-centre), close to their real
// spot but spread out so the crowded Marina Bay area stays readable. ly nudges the name label.
type Landmark = { name: string; label?: string; sprite: SpriteName; x: number; y: number; lx?: number; ly?: number };

const LANDMARKS: Landmark[] = [
  { name: "Jurong Lake Gardens", sprite: "tree", x: 29, y: 35 },
  { name: "Chinese Garden pagoda", label: "Chinese Garden", sprite: "chineseGardenPagoda", x: 35, y: 34 },
  { name: "Science Centre", label: "Science Centre", sprite: "scienceCentre", x: 41, y: 40 },
  { name: "Dragon Playground, Toa Payoh", label: "Dragon Playground", sprite: "dragonPlayground", x: 59, y: 32 },
  { name: "Esplanade", label: "Esplanade", sprite: "esplanade", x: 57, y: 46 },
  { name: "Singapore Flyer", label: "Flyer", sprite: "singaporeFlyer", x: 70, y: 45 },
  { name: "Marina Bay Sands", label: "Marina Bay Sands", sprite: "marinaBaySands", x: 64, y: 51, lx: -5 },
  { name: "Gardens by the Bay", label: "Gardens by the Bay", sprite: "gardensByTheBay", x: 74, y: 49, lx: 6, ly: 5.5 },
  { name: "East Coast Park", label: "East Coast Park", sprite: "eastCoastPark", x: 86, y: 43 },
  { name: "Bedok Reservoir", label: "Bedok Reservoir", sprite: "reservoirSign", x: 84, y: 34 },
  { name: "Punggol Waterway", label: "Punggol Waterway", sprite: "punggolBridge", x: 78, y: 19, lx: 5.5 },
];

// Housing estates for a "heartland" feel.
const ESTATES: { sprite: SpriteName; lat: number; lng: number }[] = [
  { sprite: "hdbTall", lat: 1.352, lng: 103.94 }, // Tampines
  { sprite: "hdb", lat: 1.356, lng: 103.953 },
  { sprite: "hdb", lat: 1.333, lng: 103.743 }, // Jurong East
  { sprite: "hdbTall", lat: 1.37, lng: 103.75 }, // Bukit Batok
  { sprite: "hdb", lat: 1.37, lng: 103.848 }, // Ang Mo Kio
  { sprite: "hdbTall", lat: 1.38, lng: 103.86 },
  { sprite: "hdb", lat: 1.437, lng: 103.786 }, // Woodlands
  { sprite: "hdbTall", lat: 1.43, lng: 103.8 },
  { sprite: "hdb", lat: 1.391, lng: 103.895 }, // Sengkang
  { sprite: "hdbTall", lat: 1.405, lng: 103.915 }, // Punggol
  { sprite: "hdb", lat: 1.32, lng: 103.89 }, // Geylang / Paya Lebar
  { sprite: "hdb", lat: 1.302, lng: 103.84 }, // Orchard
  { sprite: "hdbTall", lat: 1.295, lng: 103.85 },
  { sprite: "hdb", lat: 1.425, lng: 103.84 }, // Yishun
];

// Where each region's badge points to (chosen to keep landmarks visible).
const BADGE_AT: Record<Region, LatLng> = {
  north: { lat: 1.448, lng: 103.818 },
  west: { lat: 1.392, lng: 103.69 },
  central: { lat: 1.392, lng: 103.86 },
  east: { lat: 1.39, lng: 103.975 },
  south: { lat: 1.255, lng: 103.775 },
};

const LANDMARK_SCALE = 1.25;

export const VERDICT_LIGHT: Record<Verdict, { color: string; label: string }> = {
  GO: { color: "#22c55e", label: "GO" },
  GO_EASY: { color: "#f59e0b", label: "EASY" },
  SKIP: { color: "#ef4444", label: "SKIP" },
};

function SpriteAt({ sprite, x, y, title, scale = 1 }: { sprite: SpriteName; x: number; y: number; title?: string; scale?: number }) {
  const s = SPRITES[sprite];
  const { w, h } = spriteSize(s);
  const left = Math.round(x - (w * scale) / 2);
  const top = Math.round(y - h * scale);
  return (
    <g transform={`translate(${left} ${top}) scale(${scale})`}>
      {title && <title>{title}</title>}
      {spriteRuns(s).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </g>
  );
}

/** Haze drawn as see-through blocks, thicker in the middle, so it matches the pixel style. */
function HazeBlocks({ cx, cy, rx, ry, density, seed }: { cx: number; cy: number; rx: number; ry: number; density: number; seed: number }) {
  const cells: React.ReactNode[] = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      const n = noise(x + seed, y - seed);
      if (n > density * (1.15 - d)) continue;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={n < 0.3 ? "#cbb98f" : "#e2d6b4"} opacity={0.85 - d * 0.4} />);
    }
  return <g className="px-haze" style={{ animationDelay: `${seed * -1.7}s` }}>{cells}</g>;
}

function Terrain() {
  const forest = project(FOREST[0], FOREST[1]);
  const rects: React.ReactNode[] = [];
  const trees: React.ReactNode[] = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const cell = GRID[y][x];
      if (cell === 0) {
        // Occasional lighter "wave" block on the sea.
        if (noise(x, y) > 0.985) rects.push(<rect key={`w${x}-${y}`} className="px-wave" x={x} y={y} width={2} height={1} fill="#bae6fd" />);
        continue;
      }
      if (cell === 2) {
        rects.push(<rect key={`l${x}-${y}`} x={x} y={y} width={1} height={1} fill={LAKE} />);
        continue;
      }
      const inForest = ((x - forest.x) / FOREST[2]) ** 2 + ((y - forest.y) / FOREST[3]) ** 2 <= 1;
      const palette = inForest ? FOREST_GRASS : GRASS;
      rects.push(<rect key={`g${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[Math.floor(noise(x, y) * palette.length)]} />);
      // Grass-block side (dirt) where land meets the sea to the south: the Minecraft "cliff".
      if (y + 1 < GRID_H && GRID[y + 1][x] === 0) {
        rects.push(<rect key={`d${x}-${y}`} x={x} y={y + 1} width={1} height={1} fill={noise(y, x) > 0.5 ? DIRT : DIRT_DARK} />);
        if (y + 2 < GRID_H && GRID[y + 2][x] === 0)
          rects.push(<rect key={`s${x}-${y}`} x={x} y={y + 2} width={1} height={1} fill={SEA_DEEP} />);
      }
      if (inForest && noise(x * 3, y * 7) > 0.88) trees.push(<SpriteAt key={`t${x}-${y}`} sprite="tree" x={x} y={y + 1} />);
    }
  }
  return (
    <>
      {rects}
      {trees}
    </>
  );
}

type Props = {
  regions: RegionVerdict[] | null;
  centres: Partial<Record<Region, LatLng>>;
};

export default function HazeMap({ regions, centres }: Props) {
  const byRegion = new Map(regions?.map((r) => [r.region, r]));
  const regionList: Region[] = ["north", "west", "central", "east", "south"];

  return (
    <div className="relative w-full" style={{ aspectRatio: `${GRID_W} / ${GRID_H}` }}>
      <svg
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        className="absolute inset-0 h-full w-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="Pixel map of Singapore showing air quality by region"
      >
        <defs>
          <radialGradient id="haze-skip">
            <stop offset="0%" stopColor="#c8b48a" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#d6c7a1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e7dcc0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="haze-easy">
            <stop offset="0%" stopColor="#e5d9b5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#efe7cf" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={GRID_W} height={GRID_H} fill={SEA} />
        <Terrain />
        {/* Haze drifting over the regions that aren't clear, drawn under the buildings like ground fog. */}
        {regionList.map((region, i) => {
          const r = byRegion.get(region);
          if (!r || r.verdict === "GO") return null;
          const centre = centres[region] ?? DEFAULT_CENTRES[region];
          const c = project(centre.lat, centre.lng);
          const skip = r.verdict === "SKIP";
          return <HazeBlocks key={region} cx={c.x} cy={c.y} rx={skip ? 17 : 13} ry={skip ? 11 : 8} density={skip ? 1 : 0.55} seed={i + 1} />;
        })}
        {ESTATES.map((e, i) => {
          const p = project(e.lat, e.lng);
          return <SpriteAt key={i} sprite={e.sprite} x={p.x} y={p.y} />;
        })}
        {LANDMARKS.map((l) => (
          <SpriteAt key={l.name} sprite={l.sprite} x={l.x} y={l.y} title={l.name} scale={LANDMARK_SCALE} />
        ))}
        {/* Landmark names, shown on wider screens only. */}
        <g className="hidden sm:inline">
          {LANDMARKS.filter((l) => l.label).map((l) => {
            return (
              <text
                key={l.name}
                x={l.x + (l.lx ?? 0)}
                y={l.y + (l.ly ?? 2.4)}
                textAnchor="middle"
                fontSize={1.9}
                fontWeight={700}
                fill="#14532d"
                stroke="#f0fdf4"
                strokeWidth={0.5}
                paintOrder="stroke"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {l.label}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Bouncing region badges with a traffic light for the verdict. */}
      {regions &&
        regionList.map((region, i) => {
          const r = byRegion.get(region);
          if (!r) return null;
          const c = project(BADGE_AT[region].lat, BADGE_AT[region].lng);
          const light = VERDICT_LIGHT[r.verdict];
          return (
            <a
              key={region}
              href={`#routes-${region}`}
              aria-label={`${region}: PM2.5 ${r.pm25 ?? "unknown"}, ${light.label}. See routes`}
              className="px-bounce absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${(c.x / GRID_W) * 100}%`, top: `${(c.y / GRID_H) * 100}%`, animationDelay: `${i * 0.25}s` }}
            >
              <span className="px-badge relative flex items-center gap-1 px-1 py-0.5 sm:flex-col sm:gap-0 sm:px-2 sm:py-1">
                <span className="px-light h-2 w-2 sm:hidden" style={{ background: light.color, color: light.color }} />
                <span className="hidden items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 sm:flex">
                  <span className="px-light h-2.5 w-2.5" style={{ background: light.color, color: light.color }} />
                  {region}
                </span>
                <span className="font-pixel text-[9px] leading-none text-slate-900 sm:text-base sm:leading-tight">{r.pm25 ?? "–"}</span>
                <span className="hidden text-[9px] font-semibold sm:block" style={{ color: light.color }}>
                  {light.label}
                </span>
                <span className="px-pointer" aria-hidden />
              </span>
            </a>
          );
        })}
    </div>
  );
}
