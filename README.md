# SG Haze Run 🏃‍♀️🌫️

**"I want to run 5K right now. Where in Singapore should I go?"**

A mobile-first web app (PWA). It reads live NEA air-quality and heat data, gives a simple
**GO / GO EASY / SKIP** verdict for each part of Singapore, and recommends a **5K route** in the
area with the cleanest air right now.

- 📋 Product & build plan: [`docs/PLAN.md`](docs/PLAN.md)
- 🗺️ Starter 5K route list: [`data/routes-5k.json`](data/routes-5k.json)

**Stack:** Next.js + Tailwind · Leaflet + OneMap tiles · NEA data via data.gov.sg · hosted on Vercel.

> Readings are regional, and verdicts are general guidance, not medical advice.

## Previewing without live data

Set `NEA_MOCK=clear`, `mixed` or `haze` when running locally (`NEA_MOCK=haze npm run dev`) to see the
home screen with sample readings instead of calling NEA. Never set this on Vercel.
