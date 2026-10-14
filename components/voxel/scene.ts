// Builds and runs the 3D voxel Singapore scene with three.js. Browser only.
import * as THREE from "three";
import { FOREST, GRID, GRID_H, GRID_W, noise, project } from "../pixel/geo";
import type { LatLng, Region, RegionVerdict, Verdict } from "@/lib/verdict";
import * as M from "./models";
import type { Vox } from "./models";

const D = 0.25; // size of a detail voxel, in map blocks
const LANDMARK_SCALE = 1.55; // landmarks are drawn bigger than life so they read at a glance

export const BEACON_COLOR: Record<Verdict, number> = { GO: 0x22c55e, GO_EASY: 0xf59e0b, SKIP: 0xef4444 };

const DEFAULT_CENTRES: Record<Region, LatLng> = {
  north: { lat: 1.41803, lng: 103.82 },
  south: { lat: 1.29587, lng: 103.82 },
  east: { lat: 1.35735, lng: 103.94 },
  west: { lat: 1.35735, lng: 103.7 },
  central: { lat: 1.35735, lng: 103.82 },
};

// Where each region's beacon + badge stands (grid x, y), picked to keep landmarks visible.
export const BEACON_AT: Record<Region, [number, number]> = {
  north: [55, 8],
  west: [22, 22],
  central: [50, 25],
  east: [94, 25],
  south: [46, 57],
};

type Placement = { model: Vox[]; x: number; y: number; rot?: number; scale?: number };

const LANDMARKS: (Placement & { name: string })[] = [
  { name: "Marina Bay Sands", model: M.marinaBaySands(), x: 63.5, y: 51 },
  { name: "Gardens by the Bay", model: M.gardensByTheBay(), x: 71, y: 50 },
  { name: "Esplanade", model: M.esplanade(), x: 58.5, y: 46.5 },
  { name: "Singapore Flyer", model: M.singaporeFlyer(), x: 67, y: 45 },
  { name: "Chinese Garden pagoda", model: M.pagoda(), x: 35, y: 33.5 },
  { name: "Science Centre", model: M.scienceCentre(), x: 41.5, y: 38.5 },
  { name: "Dragon Playground", model: M.dragonPlayground(), x: 58, y: 32.5 },
  { name: "East Coast Park", model: M.eastCoastPark(), x: 82, y: 43 },
  { name: "Bedok Reservoir", model: M.reservoirPavilion(), x: 87, y: 35.3 },
  { name: "Punggol Waterway", model: M.punggolBridge(), x: 78, y: 17.8, rot: Math.PI / 2 },
];

const ESTATES: [number, number][] = [
  [1.352, 103.94], [1.356, 103.953], [1.333, 103.743], [1.37, 103.75], [1.37, 103.848],
  [1.38, 103.86], [1.437, 103.786], [1.43, 103.8], [1.391, 103.895], [1.405, 103.915],
  [1.32, 103.89], [1.425, 103.84], [1.35, 103.87], [1.318, 103.765], [1.384, 103.745],
];
const CBD: [number, number][] = [[55, 49.5], [56.5, 50.5], [54, 48.5], [57.5, 49.2], [53.5, 50.5]];
const BOATS: [number, number, number][] = [[48, 59, 0.3], [80, 54, -0.4], [97, 46, 0.9], [18, 50, 0.1], [72, 58, 1.2], [30, 58, -0.2]];

function heightAt(x: number, y: number): number {
  const bt = project(1.3545, 103.776); // Bukit Timah hill
  const g = (cx: number, cy: number, s: number) => Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)));
  const forest = project(FOREST[0], FOREST[1]);
  return 1 + Math.round(3 * g(bt.x, bt.y, 3.5) + 1.2 * g(forest.x, forest.y, 7));
}

function isCoast(x: number, y: number) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const r = GRID[y + dy]?.[x + dx];
    if (r === undefined || r === 0) return true;
  }
  return false;
}

function jitter(color: number, x: number, y: number, z: number, amt = 0.05) {
  const col = new THREE.Color(color);
  const k = 1 + (noise(x * 3.1 + z, y * 1.7 + z * 0.3) - 0.5) * 2 * amt;
  return col.multiplyScalar(k);
}

/** One InstancedMesh for many same-size cubes with per-cube colours. */
function cubes(items: { p: THREE.Vector3; color: THREE.Color }[], size: number, material: THREE.Material) {
  const geo = new THREE.BoxGeometry(size, size, size);
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const m = new THREE.Matrix4();
  items.forEach((it, i) => {
    m.makeTranslation(it.p.x, it.p.y, it.p.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, it.color);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function radialTexture(inner: string, outer: string) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function waterTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const ctx = cv.getContext("2d")!;
  const blues = ["#38bdf8", "#3ec1f8", "#33b6f0", "#4cc7fa", "#2fb0ea"];
  for (let x = 0; x < 16; x++)
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = noise(x * 7, y * 13) > 0.93 ? "#bae6fd" : blues[Math.floor(noise(x, y) * blues.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(40, 40);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  regions: RegionVerdict[] | null;
  centres: Partial<Record<Region, LatLng>>;
  animate: boolean;
  /** Called after each render with the on-screen position (px) of each region beacon. */
  onBeacons: (pos: Partial<Record<Region, { x: number; y: number }>>) => void;
};

export function createScene({ canvas, regions, centres, animate, onBeacons }: SceneOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const byRegion = new Map(regions?.map((r) => [r.region, r]));
  const allSkip = !!regions?.length && regions.every((r) => r.verdict === "SKIP");
  if (allSkip) scene.fog = new THREE.Fog(0xe2d3ad, 150, 260);

  // ---- Lights
  scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, allSkip ? 1.5 : 1.8));
  const sun = new THREE.DirectionalLight(allSkip ? 0xffe2b0 : 0xfff4e0, allSkip ? 1.6 : 2.4);
  sun.position.set(GRID_W / 2 - 50, 85, GRID_H / 2 + 45); // front-left, so the faces we see are lit
  sun.target.position.set(GRID_W / 2, 0, GRID_H / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 60, bottom: -60, near: 10, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ---- Sea
  const water = waterTexture();
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: water, transparent: true, opacity: 0.9, roughness: 0.25, metalness: 0.05 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(GRID_W / 2, 0.3, GRID_H / 2);
  sea.receiveShadow = true;
  scene.add(sea);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x0e7490 }));
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.set(GRID_W / 2, -1.2, GRID_H / 2);
  scene.add(seabed);

  // ---- Terrain
  const material = new THREE.MeshLambertMaterial();
  const big: { p: THREE.Vector3; color: THREE.Color }[] = [];
  const forest = project(FOREST[0], FOREST[1]);
  const top = new Map<string, number>(); // ground height per cell
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const cell = GRID[y][x];
      if (cell === 0) continue;
      if (cell === 2) {
        big.push({ p: new THREE.Vector3(x + 0.5, 0.15, y + 0.5), color: jitter(0x60a5fa, x, 0, y, 0.04) });
        big.push({ p: new THREE.Vector3(x + 0.5, -0.85, y + 0.5), color: new THREE.Color(0x7c5a3a) });
        top.set(`${x},${y}`, 0.65);
        continue;
      }
      const coast = isCoast(x, y);
      const h = coast ? 1 : heightAt(x, y);
      const inForest = ((x - forest.x) / FOREST[2]) ** 2 + ((y - forest.y) / FOREST[3]) ** 2 <= 1;
      for (let k = -1; k < h; k++) {
        let color: number;
        if (k === h - 1) color = coast ? 0xfcd9a0 : inForest ? 0x16a34a : [0x4ade80, 0x3fcf6d, 0x22c55e][Math.floor(noise(x, y) * 3)];
        else color = k < 0 ? 0x6b4a2e : noise(x + k, y) > 0.5 ? 0x9a6b3f : 0x8a5d35;
        big.push({ p: new THREE.Vector3(x + 0.5, k + 0.5, y + 0.5), color: jitter(color, x, k, y) });
      }
      top.set(`${x},${y}`, h);
    }
  scene.add(cubes(big, 1, material));

  const ground = (x: number, y: number) => top.get(`${Math.floor(x)},${Math.floor(y)}`) ?? 0.4;

  // ---- Detail voxels (landmarks, buildings, trees, boats)
  const bySize = new Map<number, { p: THREE.Vector3; color: THREE.Color }[]>();
  const occupied = new Set<string>();
  const place = (model: Vox[], gx: number, gy: number, baseY: number, rot = 0, reserve = 0, scale = 1) => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const d = D * scale;
    if (!bySize.has(d)) bySize.set(d, []);
    const list = bySize.get(d)!;
    for (const [vx, vy, vz, col] of model) {
      const rx = vx * cos - vz * sin;
      const rz = vx * sin + vz * cos;
      list.push({ p: new THREE.Vector3(gx + rx * d, baseY + (vy + 0.5) * d, gy + rz * d), color: jitter(col, vx, vy, vz, 0.04) });
    }
    for (let dx = -reserve; dx <= reserve; dx++) for (let dy = -reserve; dy <= reserve; dy++) occupied.add(`${Math.floor(gx) + dx},${Math.floor(gy) + dy}`);
  };

  for (const l of LANDMARKS) place(l.model, l.x, l.y, Math.max(1, ground(l.x, l.y)), l.rot ?? 0, 4, l.scale ?? LANDMARK_SCALE);
  CBD.forEach(([x, y], i) => place(M.cbdTower(i), x, y, ground(x, y), 0, 1));
  ESTATES.forEach(([lat, lng], i) => {
    const p = project(lat, lng);
    [[0, 0], [2.2, 0.8]].forEach(([dx, dy], j) => {
      const x = p.x + dx;
      const y = p.y + dy;
      if (GRID[Math.floor(y)]?.[Math.floor(x)] !== 1 || occupied.has(`${Math.floor(x)},${Math.floor(y)}`)) return;
      place(M.hdbBlock(i * 3 + j), x, y, ground(x, y), (i % 2) * (Math.PI / 2), 1);
    });
  });
  // Trees: dense in the Central Catchment, scattered elsewhere.
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (GRID[y][x] !== 1 || occupied.has(`${x},${y}`) || isCoast(x, y)) continue;
      const inForest = ((x - forest.x) / FOREST[2]) ** 2 + ((y - forest.y) / FOREST[3]) ** 2 <= 1;
      if (noise(x * 5.3, y * 2.9) < (inForest ? 0.55 : 0.1)) {
        const ox = (noise(x, y * 3) - 0.5) * 0.5;
        const oy = (noise(x * 3, y) - 0.5) * 0.5;
        place(M.tree(x * 31 + y), x + 0.5 + ox, y + 0.5 + oy, ground(x, y));
      }
    }
  BOATS.forEach(([x, y, r], i) => {
    if (GRID[Math.floor(y)]?.[Math.floor(x)] === 0) place(M.boat(i), x, y, 0.15, r);
  });
  bySize.forEach((list, size) => scene.add(cubes(list, size, material)));

  // ---- Clouds (drift slowly)
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: allSkip ? 0xf1e6c8 : 0xffffff, transparent: true, opacity: 0.92 });
  const clouds: THREE.InstancedMesh[] = [];
  [[12, 6], [45, 2], [78, 8], [100, 40], [5, 45]].forEach(([x, y], i) => {
    const vox = M.cloud(i).map(([vx, vy, vz]) => ({ p: new THREE.Vector3(vx * 0.5, vy * 0.5, vz * 0.5), color: new THREE.Color(0xffffff) }));
    const mesh = cubes(vox, 0.5, cloudMat);
    mesh.receiveShadow = false;
    mesh.position.set(x, 13 + (i % 3), y);
    clouds.push(mesh);
    cloudGroup.add(mesh);
  });
  scene.add(cloudGroup);

  // ---- Region beacons: a post with a glowing light in the verdict colour
  const glowTex = radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)");
  const beacons: { region: Region; light: THREE.Mesh; glow: THREE.Sprite; anchor: THREE.Vector3 }[] = [];
  const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  for (const r of regions ?? []) {
    const [bx, by] = BEACON_AT[r.region];
    const g = Math.max(0.4, ground(bx, by));
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), postMat);
    post.position.set(bx, g + 1.3, by);
    post.castShadow = true;
    const color = BEACON_COLOR[r.verdict];
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color }));
    light.position.set(bx, g + 3, by);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(5, 5, 1);
    glow.position.copy(light.position);
    scene.add(post, light, glow);
    beacons.push({ region: r.region, light, glow, anchor: new THREE.Vector3(bx, g + 3.8, by) });
  }

  // ---- Haze: soft drifting puffs over regions that aren't clear
  const hazeTex = radialTexture("rgba(214,196,150,0.95)", "rgba(214,196,150,0)");
  const puffs: { s: THREE.Sprite; base: THREE.Vector3; phase: number; op: number }[] = [];
  (["north", "south", "east", "west", "central"] as Region[]).forEach((region, ri) => {
    const r = byRegion.get(region);
    if (!r || r.verdict === "GO") return;
    const ctr = project((centres[region] ?? DEFAULT_CENTRES[region]).lat, (centres[region] ?? DEFAULT_CENTRES[region]).lng);
    const skip = r.verdict === "SKIP";
    const n = skip ? 26 : 12;
    for (let i = 0; i < n; i++) {
      const a = noise(i * 7 + ri, ri * 3) * Math.PI * 2;
      const d = Math.sqrt(noise(i, ri * 11 + 5));
      const base = new THREE.Vector3(ctr.x + Math.cos(a) * d * 15, 2.5 + noise(i * 3, ri) * 4, ctr.y + Math.sin(a) * d * 10);
      const op = (skip ? 0.42 : 0.24) * (0.7 + noise(i, ri) * 0.3);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, transparent: true, opacity: op, depthWrite: false }));
      const sc = 9 + noise(i * 2, ri * 5) * 8;
      s.scale.set(sc, sc * 0.6, 1);
      s.position.copy(base);
      scene.add(s);
      puffs.push({ s, base, phase: noise(i, ri * 2) * 10, op });
    }
  });

  // ---- Camera: orthographic, looking at the island from the south-west, fitted to the canvas
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
  const target = new THREE.Vector3(GRID_W / 2 + 1, 0, GRID_H / 2 + 2);
  const dir = new THREE.Vector3(-0.22, 1.05, 1).normalize();
  camera.position.copy(target).addScaledVector(dir, 200);
  camera.lookAt(target);
  camera.updateMatrixWorld();

  const corners = [
    [5, 0, 9], [GRID_W - 4, 0, 9], [5, 0, GRID_H - 7], [GRID_W - 4, 0, GRID_H - 7], [55, 6, 7],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const pts = corners.map((p) => p.clone().applyMatrix4(camera.matrixWorldInverse));
    let minX = Math.min(...pts.map((p) => p.x));
    let maxX = Math.max(...pts.map((p) => p.x));
    let minY = Math.min(...pts.map((p) => p.y));
    let maxY = Math.max(...pts.map((p) => p.y));
    const aspect = w / h;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let halfW = (maxX - minX) / 2;
    let halfH = (maxY - minY) / 2;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    halfW *= 1.02;
    halfH *= 1.02;
    minX = cx - halfW;
    maxX = cx + halfW;
    minY = cy - halfH;
    maxY = cy + halfH;
    Object.assign(camera, { left: minX, right: maxX, top: maxY, bottom: minY });
    camera.updateProjectionMatrix();
  }

  const v = new THREE.Vector3();
  function render(t: number) {
    const time = t / 1000;
    water.offset.set((time * 0.01) % 1, (time * 0.006) % 1);
    clouds.forEach((cl, i) => {
      cl.position.x = ((cl.position.x + 0.01 + i * 0.002 + 20) % (GRID_W + 40)) - 20;
    });
    puffs.forEach((p) => {
      p.s.position.set(p.base.x + Math.sin(time * 0.25 + p.phase) * 1.8, p.base.y + Math.sin(time * 0.4 + p.phase) * 0.4, p.base.z);
      (p.s.material as THREE.SpriteMaterial).opacity = p.op * (0.85 + Math.sin(time * 0.6 + p.phase) * 0.15);
    });
    beacons.forEach((b, i) => {
      const k = 1 + Math.sin(time * 3 + i) * 0.18;
      b.glow.scale.set(5 * k, 5 * k, 1);
      b.light.rotation.y = time * 0.8;
    });
    renderer.render(scene, camera);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pos: Partial<Record<Region, { x: number; y: number }>> = {};
    for (const b of beacons) {
      v.copy(b.anchor).project(camera);
      pos[b.region] = { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
    }
    onBeacons(pos);
  }

  let raf = 0;
  let running = false;
  const loop = (t: number) => {
    render(t);
    if (running) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || !animate) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  resize();
  render(0);
  start();

  const ro = new ResizeObserver(() => {
    resize();
    render(performance.now());
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
  io.observe(canvas);

  return {
    dispose() {
      stop();
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      water.dispose();
      glowTex.dispose();
      hazeTex.dispose();
      renderer.dispose();
    },
  };
}
