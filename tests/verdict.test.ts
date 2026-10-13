import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestRegion, pm25Verdict, psiVerdict, rankRegions, regionVerdict } from "../lib/verdict.ts";
import { parseConditions } from "../lib/nea.ts";

test("PM2.5 thresholds", () => {
  assert.equal(pm25Verdict(35), "GO");
  assert.equal(pm25Verdict(36), "GO_EASY");
  assert.equal(pm25Verdict(55), "GO_EASY");
  assert.equal(pm25Verdict(56), "SKIP");
  assert.equal(pm25Verdict(30, true), "GO_EASY");
});

test("PSI thresholds", () => {
  assert.equal(psiVerdict(100), "GO");
  assert.equal(psiVerdict(150), "GO_EASY");
  assert.equal(psiVerdict(201), "SKIP");
});

test("verdict is the worst of the checks", () => {
  assert.equal(regionVerdict({ region: "east", pm25: 10, psi24: 250 }).verdict, "SKIP");
  assert.equal(regionVerdict({ region: "east", pm25: 10, psi24: 50 }).verdict, "GO");
  assert.equal(regionVerdict({ region: "east", pm25: null, psi24: 50 }).verdict, "GO_EASY");
});

test("ranking puts the cleanest GO region first", () => {
  const ranked = rankRegions([
    regionVerdict({ region: "west", pm25: 60, psi24: 80 }),
    regionVerdict({ region: "east", pm25: 20, psi24: 60 }),
    regionVerdict({ region: "north", pm25: 12, psi24: 60 }),
  ]);
  assert.deepEqual(ranked.map((r) => r.region), ["north", "east", "west"]);
});

test("parses NEA v2 responses and matches routes to nearest region", () => {
  const meta = [
    { name: "west", labelLocation: { latitude: 1.35735, longitude: 103.7 } },
    { name: "east", labelLocation: { latitude: 1.35735, longitude: 103.94 } },
    { name: "central", labelLocation: { latitude: 1.35735, longitude: 103.82 } },
    { name: "south", labelLocation: { latitude: 1.29587, longitude: 103.82 } },
    { name: "north", labelLocation: { latitude: 1.41803, longitude: 103.82 } },
  ];
  const pm25 = {
    data: {
      regionMetadata: meta,
      items: [{ updatedTimestamp: "2026-10-13T08:00:00+08:00", readings: { pm25_one_hourly: { west: 40, east: 12, central: 20, south: 18, north: 25 } } }],
    },
  };
  const psi = {
    data: {
      regionMetadata: meta,
      items: [{ readings: { psi_twenty_four_hourly: { west: 70, east: 50, central: 55, south: 52, north: 60, national: 70 } } }],
    },
  };
  const c = parseConditions(pm25, psi);
  assert.equal(c.readings.find((r) => r.region === "east")?.pm25, 12);
  assert.equal(c.readings.find((r) => r.region === "west")?.psi24, 70);
  assert.equal(c.updatedAt, "2026-10-13T08:00:00+08:00");
  assert.equal(nearestRegion({ lat: 1.3405, lng: 103.9327 }, c.centres), "east"); // Bedok Reservoir
  assert.equal(nearestRegion({ lat: 1.4521, lng: 103.7795 }, c.centres), "north"); // Woodlands Waterfront
});
