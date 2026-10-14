// Pixel-grid version of Singapore for the blocky home-screen map.
// Outlines are hand-simplified (not survey accurate), good enough at ~400 m per block.

export const GRID_W = 105;
export const GRID_H = 63;
const LNG_MIN = 103.6;
const LNG_MAX = 104.01;
const LAT_MIN = 1.23;
const LAT_MAX = 1.475;

/** lat/lng -> grid cell (x, y), y grows southwards. */
export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * GRID_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * GRID_H,
  };
}

type Poly = [number, number][]; // [lat, lng]

const MAINLAND: Poly = [
  [1.352, 103.64], [1.338, 103.618], [1.318, 103.607], [1.296, 103.612], [1.288, 103.632],
  [1.302, 103.662], [1.296, 103.69], [1.293, 103.72], [1.288, 103.745], [1.282, 103.77],
  [1.274, 103.792], [1.265, 103.81], [1.266, 103.832], [1.27, 103.848], [1.273, 103.862],
  [1.284, 103.876], [1.296, 103.892], [1.303, 103.912], [1.311, 103.935], [1.32, 103.958],
  [1.326, 103.978], [1.334, 103.99], [1.35, 104.0], [1.37, 104.0], [1.388, 103.988],
  [1.386, 103.965], [1.383, 103.945], [1.394, 103.925], [1.412, 103.91], [1.42, 103.89],
  [1.417, 103.87], [1.43, 103.856], [1.446, 103.845], [1.463, 103.835], [1.468, 103.815],
  [1.458, 103.797], [1.45, 103.775], [1.447, 103.752], [1.438, 103.73], [1.428, 103.708],
  [1.41, 103.693], [1.392, 103.675], [1.372, 103.66],
];
const SENTOSA: Poly = [
  [1.258, 103.806], [1.256, 103.83], [1.25, 103.842], [1.242, 103.836], [1.243, 103.814], [1.25, 103.804],
];
const JURONG_ISLAND: Poly = [
  [1.284, 103.672], [1.275, 103.718], [1.258, 103.718], [1.252, 103.69], [1.262, 103.662], [1.276, 103.658],
];
const PULAU_UBIN: Poly = [
  [1.418, 103.935], [1.42, 103.962], [1.413, 103.985], [1.403, 103.983], [1.402, 103.955], [1.407, 103.935],
];

// Inland water carved out of the land: [lat, lng, radiusX cells, radiusY cells]
const LAKES: [number, number, number, number][] = [
  [1.3405, 103.927, 2.6, 1.2], // Bedok Reservoir
  [1.338, 103.727, 2.2, 1.8], // Jurong Lake
  [1.354, 103.818, 2.4, 1.2], // MacRitchie
  [1.37, 103.805, 2.2, 1.5], // Upper Peirce
  [1.403, 103.836, 3.2, 0.9], // Lower Seletar
  [1.288, 103.857, 2.6, 1.6], // Marina Bay
  [1.343, 103.69, 2.2, 1.2], // Tengeh / west reservoirs
];
// Punggol Waterway as a thin channel: list of points it passes through.
const WATERWAY: [number, number][] = [
  [1.4, 103.895], [1.404, 103.9], [1.406, 103.905], [1.409, 103.91], [1.407, 103.915],
];

// Central Catchment forest (darker greens + trees): [lat, lng, rx, ry]
export const FOREST: [number, number, number, number] = [1.362, 103.808, 7, 5];

function inPoly(lat: number, lng: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ai, oi] = poly[i];
    const [aj, oj] = poly[j];
    if (oi > lng !== oj > lng && lat < ((aj - ai) * (lng - oi)) / (oj - oi) + ai) inside = !inside;
  }
  return inside;
}

export type Cell = 0 | 1 | 2; // 0 sea, 1 land, 2 inland water

function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_W; x++) {
      const lng = LNG_MIN + ((x + 0.5) / GRID_W) * (LNG_MAX - LNG_MIN);
      const lat = LAT_MAX - ((y + 0.5) / GRID_H) * (LAT_MAX - LAT_MIN);
      const land = [MAINLAND, SENTOSA, JURONG_ISLAND, PULAU_UBIN].some((p) => inPoly(lat, lng, p));
      row.push(land ? 1 : 0);
    }
    grid.push(row);
  }
  const carve = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (y < 0 || y >= GRID_H || x < 0 || x >= GRID_W) continue;
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && grid[y][x] === 1) grid[y][x] = 2;
      }
  };
  for (const [lat, lng, rx, ry] of LAKES) {
    const { x, y } = project(lat, lng);
    carve(x, y, rx, ry);
  }
  for (const [lat, lng] of WATERWAY) {
    const { x, y } = project(lat, lng);
    carve(x, y, 1.1, 0.7);
  }
  return grid;
}

export const GRID = buildGrid();

/** Small deterministic hash for "random" block shading that is stable between renders. */
export function noise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
