# Geodesis

Geospatial digital twin for climate-resilient agriculture in the Vietnamese Mekong Delta.

[![CI](https://github.com/Rhytam23/geodesis/actions/workflows/ci.yml/badge.svg)](https://github.com/Rhytam23/geodesis/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Click the map or move the climate timeline and every metric, recommendation and chart updates: **Location → Scenario → Simulation → Insights → Export**.

## Features

| Feature | Description |
|---------|-------------|
| Interactive GIS map | Leaflet map with satellite, OSM, terrain and dark layers, province boundaries and salinity/NDVI heatmaps |
| Timeline | Scrub 2026–2050; all values react instantly |
| Explainable decision engine | Weighted scoring (weather, soil, market, satellite, history); each number shows its formula, confidence and source |
| Economic modelling | Revenue, cost, profit, ROI, payback and subsidy eligibility |
| Scenario builder | Adjust rainfall, salinity and AWD adoption with live sliders |
| Role dashboards | Farmer, cooperative, government and researcher views |
| AI advisor | Optional plain-language explanation of a recommendation from an NVIDIA Nemotron model (see below) |
| Demo mode | Five deterministic scenarios: normal, flood, drought, high salinity, government response |

## Quick start

```bash
git clone https://github.com/Rhytam23/geodesis.git
cd geodesis
npm install
npm run dev
```

Open <http://localhost:3000/workspace>. No API keys are needed; live data sources fall back to demonstration data if unreachable.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run format      # Prettier
npm test            # Vitest
npm run ci          # typecheck + lint + test + build
```

## Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is git-ignored; never commit keys.

### AI advisor (optional)

The advisor runs in a serverless function (`api/advisor.ts`) so the key never reaches the browser. It only explains recommendations from the rule-based engine; it does not change them. Without a key, the "Explain this" button reports that the advisor is not configured and everything else works.

| Variable | Description |
|----------|-------------|
| `NEBIUS_API_KEY` | API key for an OpenAI-compatible chat endpoint |
| `NEBIUS_MODEL` | Model ID, e.g. `nvidia/nemotron-3.5-lightning-30b-a3b` |
| `NEBIUS_BASE_URL` | Endpoint base URL, e.g. `https://integrate.api.nvidia.com/v1` |

Do not prefix these with `VITE_`. Set them in `.env.local` and run `vercel dev` to try the advisor locally, or add them under Vercel → Project Settings → Environment Variables and redeploy.

## Architecture

```
map click (lat/lng)
   └─ useLocationData        weather, soil, admin, market, crop, government (parallel, cached)
        └─ decisionEngine    crop recommendations with weighted confidence
             └─ economicService   revenue / cost / profit / payback / subsidy
                  └─ UI panels update reactively
```

All business values flow through `useGeodesisTwin`.

## Project structure

```
src/
  components/   workspace, dashboards, shared UI, map
  context/      demo mode, role, timeline, scenario, UI state
  hooks/        useGeodesisTwin, useLocationData
  integrations/ simulation, decision, map adapters
  pages/        route-level pages
  services/     decision engine, economics, API clients, AI advisor
  types/        TypeScript interfaces
api/            advisor function + OpenAPI spec
tests/          Vitest tests
docs/           architecture, developer guide, deployment
```

## Tech stack

React 18, TypeScript 5, Vite 5, Leaflet, Recharts, Tailwind CSS, Framer Motion, React Router 6, Vitest.

## Data sources

| Service | Purpose | Key |
|---------|---------|-----|
| [Open-Meteo](https://open-meteo.com) | Weather | none |
| [ISRIC SoilGrids](https://rest.isric.org) | Soil properties | none |
| [OpenStreetMap Nominatim](https://nominatim.org) | Reverse geocoding (1 req/sec) | none |

## Deployment

```bash
vercel                      # Vercel CLI
docker-compose up --build   # Docker, http://localhost:8080
npm run build               # static output in dist/
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Developer guide](./docs/DEVELOPER_GUIDE.md)
- [User guide](./docs/USER_GUIDE.md)
- [Roadmap](./docs/ROADMAP.md)
- [OpenAPI spec](./api/openapi.yaml)

## Contributing and security

See [CONTRIBUTING.md](./CONTRIBUTING.md). Report vulnerabilities as described in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
