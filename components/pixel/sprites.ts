// Pixel-art sprites. Each row is a string; each character is one block, "." is transparent.

export const PALETTE: Record<string, string> = {
  K: "#1f2937", // outline / dark
  W: "#f8fafc", // white
  w: "#e2e8f0", // white shadow
  g: "#cbd5e1", // light grey
  G: "#94a3b8", // grey
  B: "#7dd3fc", // glass
  b: "#0284c7", // deep glass
  C: "#a5f3fc", // pale cyan
  Y: "#facc15", // yellow
  O: "#f97316", // orange
  R: "#dc2626", // red
  r: "#991b1b", // dark red
  P: "#c026d3", // supertree magenta
  p: "#f0abfc", // supertree pink
  N: "#22c55e", // green
  n: "#15803d", // dark green
  T: "#92400e", // trunk brown
  S: "#fde68a", // sand
  U: "#2563eb", // blue
  u: "#1e3a8a", // navy
  H: "#27201c", // hair
  F: "#f5c9a1", // skin
  f: "#dca77f", // skin shadow
  E: "#111827", // eye
  M: "#be123c", // mouth
  A: "#3b82f6", // backpack
  a: "#1d4ed8", // backpack shadow
  V: "#7c3aed", // violet
};

export type Sprite = string[];

export const SPRITES = {
  marinaBaySands: [
    "GGGGGGGGGGGGGG",
    ".gggggggggggg.",
    "..Bb..Bb..Bb..",
    "..BB..BB..BB..",
    "..Bb..Bb..Bb..",
    "..BB..BB..BB..",
    "..Bb..Bb..Bb..",
    "..BB..BB..BB..",
    "..Bb..Bb..Bb..",
    ".gBBggBBggBBg.",
    "GGGGGGGGGGGGGG",
  ],
  gardensByTheBay: [
    "pPp...........",
    ".T..PpP.......",
    ".T...T....gg..",
    ".T...T.pPpgCCg",
    ".T...T..TgCCCC",
    "nTnnnTnnTgCCCC",
  ],
  esplanade: [
    "..TOT....TOT..",
    ".OYOYO..OYOYO.",
    "OYOYOYOOYOYOYO",
    "GGGGGGGGGGGGGG",
  ],
  singaporeFlyer: [
    "...gCggg...",
    "..g..g..C..",
    ".C...g...g.",
    "g....g....g",
    "gggggKgggggC",
    "g....g....g",
    ".g...g...C.",
    "..C..g..g..",
    "...gggCg...",
    "...G...G...",
    "..GG...GG..",
    "GGGGGGGGGGG",
  ],
  eastCoastPark: [
    ".nNn..........",
    "nN.Nn....RWR..",
    "...T....RWRWR.",
    "...T......T...",
    "...T......T...",
    "SSSSSSSSSSSSSS",
  ],
  chineseGardenPagoda: [
    "...R...",
    "..RRR..",
    ".rrrrr.",
    "..YRY..",
    ".rrrrr.",
    "..YRY..",
    "rrrrrrr",
    "..YRY..",
    ".WWWWW.",
  ],
  scienceCentre: [
    "....GG......",
    "...GGGG..gg.",
    "..GBGBGG.gCg",
    ".GGGGGGGGgCg",
    "GBGBGBGBGGGG",
    "GGGGGGGGGGGG",
  ],
  dragonPlayground: [
    ".OO...........",
    "OYKO..RYU..RYU",
    "OYYYOR...U.R..",
    ".OYOR....U.R..",
    "..OR.....U.R..",
    "SSSSSSSSSSSSSS",
  ],
  punggolBridge: [
    "..WWWWW..",
    ".W.....W.",
    "W.......W",
  ],
  hdb: [
    "rrrrr",
    "WWWWW",
    "WBWBW",
    "WWWWW",
    "WBWBW",
    "WWWWW",
    "WBWBW",
    "wwwww",
  ],
  hdbTall: [
    "UUUUU",
    "WWWWW",
    "WBWBW",
    "WWWWW",
    "WBWBW",
    "WWWWW",
    "WBWBW",
    "WWWWW",
    "WBWBW",
    "wwwww",
  ],
  tree: [".nN.", "nNNn", ".T.."],
  reservoirSign: ["UUU", ".T."],

  // The kid: happy and ready to run.
  kidRun: [
    ".............FF.",
    "....HHHHHH...FF.",
    "...HHHHHHHH..F..",
    "..HHHHHHHHHH.F..",
    "..HHFFFFFFHH.F..",
    "..HFFFFFFFFH.F..",
    "..HFEFFFFEFH.F..",
    "..FFEFFFFEFFF...",
    "..FFFFFFFFFF....",
    "..FFMMMMMMFF....",
    "...FFFMMFFF.....",
    "....FFFFFF......",
    "..AWWWWWWWWA....",
    ".FAWWWwWWWWA....",
    ".FAWWWwWWWWA....",
    ".FAWWWWWWWWA....",
    "...uuuuuuuu.....",
    "...uuu..uuu.....",
    "...FF....FF.....",
    "..FF......FF....",
    ".UUU......UUU...",
    ".GGG......GGG...",
  ],
  // The kid: masked up and wagging a finger at the haze.
  kidMask: [
    "....HHHHHH......",
    "...HHHHHHHH.....",
    "..HHHHHHHHHH....",
    "..HHKFFFFKHH....",
    "..HFFFFFFFFH..F.",
    "..HFEFFFFEFH..F.",
    "..FFEFFFFEFF..F.",
    "..gWWWWWWWWg.FF.",
    "..FWWwWWwWWF.FF.",
    "...WWWWWWWW..F..",
    "....FFFFFF..F...",
    "..AWWWWWWWWAF...",
    ".FAWWWwWWWWA....",
    "F.AWWWwWWWWA....",
    "F.AWWWWWWWWA....",
    "...uuuuuuuu.....",
    "...uuu..uuu.....",
    "....FF..FF......",
    "....FF..FF......",
    "...UUU..UUU.....",
    "...GGG..GGG.....",
  ],
} satisfies Record<string, Sprite>;

export type SpriteName = keyof typeof SPRITES;

/** Turn a sprite into horizontal runs of same-coloured blocks (fewer SVG elements). */
export function spriteRuns(sprite: Sprite): { x: number; y: number; w: number; color: string }[] {
  const runs: { x: number; y: number; w: number; color: string }[] = [];
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== "." && PALETTE[ch]) runs.push({ x, y, w: end - x, color: PALETTE[ch] });
      x = end;
    }
  });
  return runs;
}

export function spriteSize(sprite: Sprite) {
  return { w: Math.max(...sprite.map((r) => r.length)), h: sprite.length };
}
