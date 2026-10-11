# SG Haze Run: Product & Build Plan (v1)

> **One question, one answer:** *"I want to run 5K right now. Where in Singapore should I go?"*

Every route in the app is **5K, no more and no less**. Because there's only one distance, the app
doesn't need a distance picker, filters or a route generator, so the hard part is getting the
recommendation right.

---

## 1. What changed from the first draft (and why)

| First draft | Improved version | Why |
|---|---|---|
| 5K / 10K / 15K routes | **5K only** | One distance keeps the app simple: one list and one decision. 5K is also short enough that a haze-aware runner can finish before conditions change. |
| 0–100 "RunScore" as the headline | **Verdict first: GO / GO EASY / SKIP**, with the number underneath | A runner wants a decision, not a score they have to interpret. The score is still used behind the scenes to rank areas. |
| Hard-coded region per route | **Each route is matched to the nearest NEA reading point automatically** | NEA's API returns a lat/long for each region. If we compute "nearest region" from the route's start point, nobody has to argue about whether Punggol counts as North or East. |
| NEA's general-public bands | **Stricter runner thresholds + a "sensitive" toggle** | Running multiplies how much air you breathe in, so a reading that's fine for a walk isn't necessarily fine for a tempo run. Asthma and other sensitive users get stricter cut-offs. |
| "Drive 12 minutes to…" | **Every route starts within walking distance of an MRT station** | Many runners in Singapore don't drive. "Take the EWL to Bedok" is more useful. |
| Snapshot only | **Trend arrow (improving ↗ / worsening ↘)** from the last 3 hours | "PM2.5 is 40 and falling" calls for a different decision than "40 and rising". |
| — | **"Updated 6 min ago" timestamp and a fallback when NEA data is stale** | People need to know whether they can trust the reading. If data is older than about an hour, the app says so instead of guessing. |
| — | **Route practicalities: shade, water points, toilets, lighting** | These matter in Singapore heat. Cost to add: a few more fields per route. |

---

## 2. How the recommendation works

### Inputs (all free, from NEA via data.gov.sg)

| Data | Endpoint (v2 real-time API) | Refresh | Used for |
|---|---|---|---|
| 1-hr PM2.5 by region | `https://api-open.data.gov.sg/v2/real-time/api/pm25` | ~hourly | **Main signal**: run-now air quality |
| PSI (24-hr) by region | `https://api-open.data.gov.sg/v2/real-time/api/psi` | ~hourly | Day-level health cap |
| WBGT (heat stress) | `https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt` | ~15 min | Heat safety |
| 2-hr weather forecast by area | `https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast` | ~30 min | Rain / thunderstorm warnings |

> Before building, check the endpoints in the [data.gov.sg developer docs](https://guide.data.gov.sg/).
> data.gov.sg rate-limits anonymous requests. Register for a free API key and call NEA from
> **our own server** (cached for about 5 minutes), never directly from every user's phone.

### Verdict rules (v1, deliberately simple)

The verdict for an area is the **worst** of these checks:

| Check | GO 🟢 | GO EASY 🟡 | SKIP 🔴 |
|---|---|---|---|
| 1-hr PM2.5 (µg/m³), standard | ≤ 35 | 36–55 | > 55 |
| 1-hr PM2.5, **sensitive mode** | ≤ 25 | 26–40 | > 40 |
| 24-hr PSI | ≤ 100 | 101–200 (Unhealthy) | > 200 (Very Unhealthy) |
| WBGT (°C) | < 31 | 31–32.9 | ≥ 33 |
| 2-hr forecast | Fair / cloudy | Showers | Thundery showers ⚡ |

- 55 µg/m³ is the top of NEA's 1-hr PM2.5 Band I ("Normal"). Our GO threshold of 35 is our own,
  more cautious cut-off for hard exercise. We set it ourselves. It isn't medical advice, and the app
  should say so.
- The PSI cut-offs follow NEA's own advice: reduce strenuous outdoor activity when PSI is Unhealthy,
  and avoid it when PSI is Very Unhealthy.
- The WBGT cut-offs follow NEA's heat-stress categories (Low / Moderate / High).

### Ranking

1. Group routes by their nearest NEA region.
2. Rank regions by verdict, then by lowest PM2.5, then by trend (improving beats worsening).
3. Show the best region's routes first. If location permission is given, order routes within a
   region by distance from the user.
4. **If every region is SKIP, the app says so plainly** ("No good outdoor 5K right now. Air is
   improving in the East, check back around 7pm.") and doesn't push a route anyway.

### Be honest about precision

NEA reports PM2.5 for **5 regions**, not per street. The app should say *"best air-quality option
right now"*, never *"safest place to run"*. Show the region reading next to every route so it's
clear where the number comes from.

---

## 3. Screens (only four)

1. **Home: "Should I run now?"**
   - Large verdict for Singapore overall plus the best area ("GO: East, PM2.5 18 ↗ improving").
   - Small map of 5 regions coloured green, amber or red.
   - "Updated 6 min ago."
2. **Best 5Ks right now**
   - List of routes in the best region(s). Each card shows the route name, nearest MRT, shade level
     and the region's verdict.
3. **Route detail**
   - Route line on the OneMap basemap, start point, nearest MRT, water/toilets, notes
     ("Loop twice", "Turn around at Bedok Jetty").
   - Buttons: **Navigate to start** (opens Google/Apple Maps) and **Share**.
4. **Settings**
   - Sensitive mode (asthma / heart / pregnancy / elderly) on or off.
   - About the data, disclaimer, and NEA + OneMap attribution.

No accounts, logins, database or notifications in v1.

---

## 4. Tech stack (and what each piece does)

| Piece | Choice | In plain words |
|---|---|---|
| App | **Next.js** (React), built as a **PWA** | The website. It can be "installed" to the home screen like an app. |
| Styling | **Tailwind CSS** | Makes it look decent quickly. |
| Map | **Leaflet** + **OneMap basemap tiles** | Draws the map. OneMap is SLA's free official Singapore map. Keep its attribution visible. |
| Air/weather data | **NEA via data.gov.sg** | Free official readings. |
| Server bit | **A Next.js API route** (`/api/conditions`) | Fetches NEA every few minutes, caches it, works out the verdicts and sends one small JSON to the app. |
| Routes | **A JSON/GeoJSON file in this repo** ([`data/routes-5k.json`](../data/routes-5k.json)) | No database needed for about 20 routes. |
| Hosting | **Vercel** (free tier) | Puts it on the internet. Each `git push` deploys automatically. |
| Analytics (optional) | **Plausible / PostHog** | Shows whether anyone uses it. |

Data flow:

```
 Phone (PWA) ──► /api/conditions (our server, cached ~5 min) ──► NEA / data.gov.sg
     │                                                            (PM2.5, PSI, WBGT, forecast)
     ├──► data/routes-5k.json  (bundled with the app)
     └──► OneMap tiles         (map background)
```

---

## 5. Making the 5K routes

1. Use the starter list in [`data/routes-5k.json`](../data/routes-5k.json) (20 routes covering all regions).
2. Draw each route as exactly **5.0 km** (±0.1) on [gpx.studio](https://gpx.studio) or
   [plotaroute.com](https://www.plotaroute.com), starting at the listed MRT or park entrance.
   Prefer **loops**, then **out-and-backs** (2.5 km out, turn, 2.5 km back), since both end where they start.
3. Export as GeoJSON and paste the coordinates into the route's `path` field.
4. Change `"status": "draft"` to `"verified"` once someone has actually run or walked it.
5. Fill in shade, water, toilets and lighting. Night runners care about lighting.

Rules for the route list:
- **5.0 km, start = finish**, close to public transport.
- Mostly park connectors / park paths, with few road crossings.
- At least **2 routes per NEA region**, so there's always an alternative when one area is busy or closed.

---

## 6. Build order (small steps)

| Step | Outcome | Rough effort |
|---|---|---|
| 1 | Next.js app skeleton deployed to Vercel ("Hello SG Haze Run") | ½ day |
| 2 | `/api/conditions`: fetch PM2.5 + PSI, compute verdict per region, return JSON | 1 day |
| 3 | Home screen showing the verdict + 5 region colours | 1 day |
| 4 | Routes JSON loaded; "Best 5Ks right now" list | ½ day |
| 5 | Route detail with OneMap + route line + "Navigate to start" | 1 day |
| 6 | Add WBGT + 2-hr forecast to the verdict; trend arrow | 1 day |
| 7 | Sensitive mode, disclaimer, attribution, PWA install | ½ day |
| 8 | Verify all 20 routes on foot / GPS | Ongoing |

A working version takes about 1–2 weeks of evenings with an AI coding assistant.

---

## 7. Later (not in v1)

- **"Best window today"**: combine the PM2.5 trend with the WBGT daily pattern. Example: "Best 5K
  window: 6:30–8pm, East".
- **Push alerts**: "Air in the West just turned GO."
- **Route-level adjustments**: coastal routes with sea breeze vs inland; greenery/traffic exposure.
- **Community reports**: "Visibility is bad at MacRitchie right now."
- **Year-round positioning ("RunNow SG")**: heat and rain matter every day, and haze is the launch hook.

---

## 8. Disclaimers to show in the app

- Readings are regional averages from NEA and may not reflect conditions on a specific path.
- Thresholds are general guidance for healthy adults and are not medical advice. People with
  heart/lung conditions should follow their doctor's advice and NEA's health advisories.
- Map data © OneMap / Singapore Land Authority. Air-quality and weather data © NEA via data.gov.sg.
