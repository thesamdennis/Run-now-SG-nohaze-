// Voxel models for landmarks and scenery. Units are "detail voxels" (a quarter of a map block),
// origin at the model's base centre, y up. Each voxel: [x, y, z, colour].

export type Vox = [number, number, number, number];

type ColorFn = (x: number, y: number, z: number) => number;
const c = (v: number | ColorFn): ColorFn => (typeof v === "number" ? () => v : v);

function hash(x: number, y: number, z: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

class Builder {
  voxels: Vox[] = [];
  private seen = new Set<string>();
  add(x: number, y: number, z: number, color: number) {
    const k = `${x},${y},${z}`;
    if (this.seen.has(k)) return;
    this.seen.add(k);
    this.voxels.push([x, y, z, color]);
  }
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: number | ColorFn, hollow = false) {
    const f = c(color);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          if (hollow && x > x0 && x < x1 && z > z0 && z < z1 && y > y0 && y < y1) continue;
          this.add(x, y, z, f(x, y, z));
        }
    return this;
  }
  /** Hemisphere shell (dome) sitting on y = y0. */
  dome(cx: number, y0: number, cz: number, r: number, color: number | ColorFn, sy = 1) {
    const f = c(color);
    for (let x = -r; x <= r; x++)
      for (let z = -r; z <= r; z++)
        for (let y = 0; y <= Math.ceil(r * sy); y++) {
          const d = Math.sqrt(x * x + (y / sy) ** 2 + z * z);
          if (d <= r + 0.5 && d > r - 1.2) this.add(cx + x, y0 + y, cz + z, f(x, y, z));
        }
    return this;
  }
  get() {
    return this.voxels;
  }
}

// ---- Palette -------------------------------------------------------------
const WHITE = 0xf8fafc;
const OFFWHITE = 0xe5e7eb;
const GREY = 0x9ca3af;
const DARK = 0x374151;
const GLASS = 0x7dd3fc;
const GLASS_DARK = 0x0ea5e9;
const SAND = 0xfcd9a0;
const TRUNK = 0x8b5a2b;
const LEAF = [0x22c55e, 0x16a34a, 0x15803d, 0x4ade80];

// ---- Landmarks -----------------------------------------------------------

export function marinaBaySands(): Vox[] {
  const b = new Builder();
  const towers = [-7, 0, 7];
  for (const tx of towers) {
    b.box(tx - 1, tx + 1, 0, 25, -2, 1, (x, y, z) => (y % 3 === 0 ? 0xbae6fd : y % 3 === 1 ? 0xf5f5f4 : 0xe7e5e4));
  }
  // SkyPark "ship" across the top, overhanging on one side.
  b.box(-10, 13, 26, 27, -2, 1, (x, y) => (y === 27 ? GREY : WHITE));
  for (let x = -8; x <= 11; x += 2) b.add(x, 28, -1, LEAF[1]);
  b.add(9, 28, 0, GLASS); // infinity pool
  b.add(10, 28, 0, GLASS);
  // Podium
  b.box(-10, 10, 0, 2, 2, 6, (x, y) => (y === 2 ? OFFWHITE : GLASS));
  return b.get();
}

export function gardensByTheBay(): Vox[] {
  const b = new Builder();
  const trees: [number, number, number][] = [
    [-8, -3, 16], [-3, 1, 20], [2, -4, 14], [5, 2, 18], [-6, 4, 12], [0, -1, 10],
  ];
  for (const [x, z, h] of trees) {
    for (let y = 0; y < h; y++) b.add(x, y, z, y % 3 === 0 ? 0xa21caf : 0x86198f);
    // Funnel canopy widening at the top
    for (let r = 1; r <= 3; r++)
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        b.add(x + Math.round(Math.cos(ang) * r), h - 3 + r, z + Math.round(Math.sin(ang) * r), r === 3 ? 0xf0abfc : 0xc026d3);
      }
  }
  // Two glass conservatory domes
  b.dome(14, 0, -1, 6, (x, y) => (y % 2 === 0 ? 0xcffafe : 0xa5f3fc), 0.7);
  b.dome(24, 0, 1, 5, (x, y) => (y % 2 === 0 ? 0xcffafe : 0xa5f3fc), 0.75);
  b.box(-11, 6, 0, 0, -7, 7, (x, z) => (hash(x, 0, z) > 0.5 ? LEAF[0] : LEAF[2]));
  return b.get();
}

export function esplanade(): Vox[] {
  const b = new Builder();
  const spiky = (x: number, y: number, z: number) => ((x + y + z) % 2 === 0 ? 0xb45309 : 0xfbbf24);
  b.dome(-6, 1, 0, 6, spiky, 0.8);
  b.dome(7, 1, 0, 5, spiky, 0.8);
  b.box(-13, 13, 0, 0, -7, 7, OFFWHITE);
  return b.get();
}

export function singaporeFlyer(): Vox[] {
  const b = new Builder();
  const R = 13;
  const cy = R + 6;
  for (let a = 0; a < 120; a++) {
    const ang = (a / 120) * Math.PI * 2;
    b.add(Math.round(Math.cos(ang) * R), Math.round(cy + Math.sin(ang) * R), 0, WHITE);
  }
  for (let a = 0; a < 28; a++) {
    const ang = (a / 28) * Math.PI * 2;
    b.add(Math.round(Math.cos(ang) * (R + 1)), Math.round(cy + Math.sin(ang) * (R + 1)), 1, GLASS);
  }
  for (let s = 0; s < 8; s++) {
    const ang = (s / 8) * Math.PI * 2;
    for (let r = 1; r < R; r += 2) b.add(Math.round(Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 0, OFFWHITE);
  }
  b.box(-1, 1, cy - 1, cy + 1, -1, 1, GREY); // hub
  for (let y = 0; y < cy; y++) {
    const off = Math.round(((cy - y) / cy) * 5);
    b.add(-off, y, -2, GREY);
    b.add(off, y, -2, GREY);
  }
  b.box(-8, 8, 0, 2, 2, 7, (x, y) => (y === 2 ? GREY : GLASS)); // terminal
  return b.get();
}

export function pagoda(): Vox[] {
  const b = new Builder();
  const tiers = 7;
  let y = 0;
  for (let t = 0; t < tiers; t++) {
    const w = 5 - Math.floor(t / 2);
    b.box(-w + 1, w - 1, y, y + 2, -w + 1, w - 1, (x, yy, z) => ((Math.abs(x) === w - 1 || Math.abs(z) === w - 1) && (x + z) % 2 === 0 ? 0xdc2626 : yy === y + 1 ? 0xfacc15 : 0xb91c1c));
    y += 3;
    b.box(-w - 1, w + 1, y, y, -w - 1, w + 1, (x, yy, z) => (Math.abs(x) === w + 1 && Math.abs(z) === w + 1 ? 0xfbbf24 : (x + z) % 2 === 0 ? 0x57534e : 0x44403c));
    y += 1;
  }
  b.box(0, 0, y, y + 3, 0, 0, 0xf59e0b);
  b.box(-6, 6, 0, 0, -6, 6, 0xd6d3d1);
  return b.get();
}

export function scienceCentre(): Vox[] {
  const b = new Builder();
  // Angular main hall stepping up
  for (let i = 0; i < 6; i++) b.box(-12 + i * 2, 4, 0, 2 + i * 2, -5, 5, (x, y) => (y % 3 === 0 ? GLASS : 0xd1d5db));
  // Omni-theatre dome
  b.dome(10, 0, 0, 6, (x, y) => (y % 2 === 0 ? 0xe7e5e4 : 0xd6d3d1));
  return b.get();
}

export function dragonPlayground(): Vox[] {
  const b = new Builder();
  const mosaic = (x: number, y: number, z: number) => [0xef4444, 0xfacc15, 0xf97316, 0x3b82f6, 0xffffff][Math.floor(hash(x, y, z) * 5)];
  // Head: a big blocky dragon head with an open mouth
  b.box(-14, -8, 0, 9, -3, 3, (x, y, z) => (y >= 7 && x > -11 ? 0xf97316 : mosaic(x, y, z)), true);
  b.box(-17, -14, 3, 6, -2, 2, 0xfacc15); // snout
  b.add(-12, 8, -4, 0x111827);
  b.add(-12, 8, 4, 0x111827); // eyes
  b.box(-11, -10, 10, 12, -1, -1, 0xef4444);
  b.box(-11, -10, 10, 12, 1, 1, 0xef4444); // horns
  // Body: three humps of metal-ring arches
  for (let h = 0; h < 3; h++) {
    const cx = -3 + h * 7;
    for (let a = 0; a <= 12; a++) {
      const ang = (a / 12) * Math.PI;
      const x = Math.round(cx + Math.cos(ang) * 3);
      const y = Math.round(Math.sin(ang) * 6);
      b.box(x, x, y, y, -2, 2, (xx, yy, z) => (z === 0 ? mosaic(xx, yy, z) : 0xfacc15));
    }
  }
  b.box(19, 21, 0, 2, -1, 1, mosaic); // tail
  b.box(-18, 22, -1, -1, -6, 6, SAND); // sandpit
  return b.get();
}

export function palmTree(seed = 0): Vox[] {
  const b = new Builder();
  const h = 9 + Math.floor(hash(seed, 1, 2) * 4);
  for (let y = 0; y < h; y++) b.add(Math.round(y / 4), y, 0, TRUNK);
  const tx = Math.round(h / 4);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
    for (let r = 1; r <= 3; r++) b.add(tx + dx * r, h - Math.floor(r / 2), dz * r, r === 3 ? LEAF[3] : LEAF[0]);
  return b.get();
}

export function beachUmbrella(color = 0xef4444): Vox[] {
  const b = new Builder();
  b.box(0, 0, 0, 5, 0, 0, OFFWHITE);
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= 10) b.add(x, 6 - (x * x + z * z > 5 ? 1 : 0), z, (x + z) % 2 === 0 ? color : WHITE);
  return b.get();
}

export function eastCoastPark(): Vox[] {
  const out: Vox[] = [];
  const place = (m: Vox[], ox: number, oz: number) => m.forEach(([x, y, z, col]) => out.push([x + ox, y, z + oz, col]));
  place(palmTree(1), -10, 0);
  place(palmTree(2), 2, -2);
  place(palmTree(3), 14, 1);
  place(beachUmbrella(0xef4444), -4, 3);
  place(beachUmbrella(0x3b82f6), 8, 4);
  for (let x = -16; x <= 20; x++) for (let z = -2; z <= 7; z++) out.push([x, -1, z, hash(x, 0, z) > 0.4 ? SAND : 0xfde68a]);
  return out;
}

export function punggolBridge(): Vox[] {
  const b = new Builder();
  for (let a = 0; a <= 20; a++) {
    const ang = (a / 20) * Math.PI;
    const x = Math.round(Math.cos(ang) * 8);
    const y = Math.round(Math.sin(ang) * 4) + 1;
    b.box(x, x, y, y, -1, 1, WHITE);
  }
  b.box(-9, 9, 1, 1, -1, 1, 0xa3a3a3);
  return b.get();
}

export function reservoirPavilion(): Vox[] {
  const b = new Builder();
  b.box(-4, 4, 0, 0, -3, 3, 0xa16207); // deck
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) b.box(x, x, 1, 4, z, z, TRUNK);
  b.box(-5, 5, 5, 5, -4, 4, 0x15803d);
  b.box(-3, 3, 6, 6, -2, 2, 0x166534);
  // a kayak
  b.box(7, 12, 0, 0, 0, 1, 0xf97316);
  return b.get();
}

export function hdbBlock(seed: number): Vox[] {
  const b = new Builder();
  const h = 14 + Math.floor(hash(seed, 3, 7) * 12);
  const roof = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x7c3aed][seed % 5];
  const accent = [0xfca5a5, 0x93c5fd, 0x86efac, 0xfde68a, 0xc4b5fd][seed % 5];
  b.box(-3, 3, 0, h, -2, 2, (x, y, z) => {
    if (y === h) return roof;
    if (y % 2 === 1 && (z === -2 || z === 2 || x === -3 || x === 3) && (x + z) % 2 !== 0) return 0x60a5fa;
    return y < 2 ? accent : y % 2 === 0 ? WHITE : OFFWHITE;
  });
  return b.get();
}

export function cbdTower(seed: number): Vox[] {
  const b = new Builder();
  const h = 22 + Math.floor(hash(seed, 9, 1) * 14);
  const glass = [GLASS, 0x93c5fd, 0xa5b4fc][seed % 3];
  b.box(-2, 2, 0, h, -2, 2, (x, y) => (y === h ? DARK : y % 2 === 0 ? glass : 0xcbd5e1));
  return b.get();
}

export function tree(seed: number): Vox[] {
  const b = new Builder();
  const h = 2 + Math.floor(hash(seed, 1, 1) * 2);
  b.box(0, 0, 0, h, 0, 0, TRUNK);
  const leaf = LEAF[Math.floor(hash(seed, 2, 2) * 3)];
  const r = 2;
  for (let x = -r; x <= r; x++)
    for (let y = 0; y <= 3; y++)
      for (let z = -r; z <= r; z++)
        if (x * x + (y - 1.5) ** 2 + z * z <= r * r + 1.2) b.add(x, h + 1 + y, z, hash(x + seed, y, z) > 0.75 ? LEAF[3] : leaf);
  return b.get();
}

export function boat(seed: number): Vox[] {
  const b = new Builder();
  const hull = [0xdc2626, 0x1d4ed8, 0x0f766e][seed % 3];
  b.box(-5, 5, 0, 1, -2, 2, hull);
  b.box(-4, 4, 2, 2, -2, 2, WHITE);
  b.box(-1, 3, 3, 4, -1, 1, (x, y) => (y === 4 ? OFFWHITE : GLASS));
  b.add(-3, 3, 0, 0xfacc15);
  return b.get();
}

export function cloud(seed: number): Vox[] {
  const b = new Builder();
  const blobs = 3 + Math.floor(hash(seed, 0, 0) * 3);
  for (let i = 0; i < blobs; i++) {
    const cx = i * 4 - blobs * 2;
    const r = 3 + Math.floor(hash(seed, i, 1) * 2);
    for (let x = -r; x <= r; x++) for (let y = 0; y <= r; y++) for (let z = -r; z <= r; z++) if (x * x + y * y * 2 + z * z <= r * r) b.add(cx + x, y, z, WHITE);
  }
  return b.get();
}

// ---- The kid -------------------------------------------------------------

/** Turn a 2D pixel sprite into a chunky voxel figure (thicker in the head and body). */
export function voxelizeSprite(rows: string[], palette: Record<string, number>, depthFor: (ch: string, y: number) => number): Vox[] {
  const out: Vox[] = [];
  const h = rows.length;
  rows.forEach((row, ry) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || palette[ch] === undefined) return;
      const y = h - 1 - ry;
      const d = depthFor(ch, ry);
      for (let z = -d; z <= d; z++) out.push([x, y, z, palette[ch]]);
    });
  });
  return out;
}
