# Delhi MSME Logistics Platform – Shipper & Carrier Network

An open, Delhi-focused logistics web app that connects MSME shippers with verified carriers. It provides dual onboarding, shipment creation, live tracking on a Leaflet map, community engagement, and a gamified leaderboard for performance. Built with React, Vite, TypeScript, Tailwind (with semantic tokens), shadcn-ui, and Supabase.


**Live Demo:** [urban-lift-ai.vercel.app](https://urban-lift-ai-66.vercel.app/)

---

## Screenshots

| Home | Shipper Dashboard | Carrier Dashboard | Our USP |
|------|--------------------|-------------------|----------------|
| ![Homepage](public/homepage.png) | ![Shipper](public/shipper.png) | ![Carrier](public/carrier.png) | ![USP](public/novelty.png) |

---
## Why this project (Delhi context)
- MSMEs in NCR/Delhi face fragmented capacity, variable rates, and reliability gaps for both last‑mile and line‑haul.
- Carriers struggle to keep utilization high across peak/off‑peak and find direct MSME contracts.
- This app bridges demand and supply with transparent workflows, instant quoting, simple tracking, and community trust signals (leaderboard, profiles).


## Key features
- Dual user flows: separate auth and dashboards for Shippers and Carriers
- Shipment lifecycle: create, quote, dispatch, and track basic shipments
- Live map and picker: Leaflet-based interactive map and origin/destination selection
- Smart matching helpers: deterministic helpers for route/price suggestions in src/lib/matching.ts
- Dashboards: at‑a‑glance stats, recent shipments, quick actions, and live map card
- Community and Leaderboard: social proof, recognition, and engagement for NCR/Delhi logistics
- Responsive UI: mobile-first, semantic tokens for light/dark theming
- Supabase integration: auth, database, and storage ready out‑of‑the‑box


## Screens and routes
- Home: /
- Auth:
  - Shippers: /auth/shipper/login, /auth/shipper/register
  - Carriers: /auth/carrier/login, /auth/carrier/register
- Dashboards: /dashboard/shipper, /dashboard/carrier
- Community: /pages/Community.tsx route (linked in navbar)
- Leaderboard: /pages/Leaderboard.tsx route (linked in navbar)
- Profile & setup: /profile, /profile-setup
- Not found: 404 fallback


## Tech stack
- React 18 + Vite + TypeScript
- Tailwind CSS with semantic tokens (index.css, tailwind.config.ts)
- shadcn-ui + Radix Primitives
- React Router v6
- React Query (TanStack) for data fetching/cache
- Leaflet + React-Leaflet for maps
- Recharts for dashboard visualizations
- Supabase (auth, DB, storage)


## Project structure (high-level)
- src/pages: top-level routed pages (Home, Community, Leaderboard, Auth, Dashboards)
- src/components: reusable building blocks (LiveMap, MapPicker, dashboard cards, UI)
- src/components/ui: shadcn components and primitives
- src/hooks: shared hooks (auth, toasts, mobile)
- src/lib: small utilities (matching helpers, auth helpers)
- src/assets: theme images used by the UI
- src/integrations/supabase: client initialization


## Setup and development
1) Prerequisites
- Node.js 18+ and npm

2) Clone and install
```
git clone <your_repo_url>
cd <your_repo_folder>
npm i
```

3) Start the app (development)
```
npm run dev
```
- Vite dev server runs at http://localhost:8080

4) Supabase configuration (two options)
- Use the bundled configuration (no changes needed):
  The app ships with a working Supabase URL and anon key in src/integrations/supabase/client.ts so you can run it immediately.
- Bring your own Supabase (recommended for production):
  1. Create a new Supabase project
  2. Copy your Project URL and anon public key
  3. Update src/integrations/supabase/client.ts (SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)
  4. Enable email/password auth and create the tables/policies you need (see Data model section below)

5) Build and preview (production)
```
npm run build
npm run preview
```
- Preview starts a local static server and prints the URL in the console.


## Data model and Supabase notes
- Authentication: email/password via Supabase; see src/hooks/useAuth.ts and src/integrations/supabase/client.ts.
- Example tables you may use/extend:
  - profiles (user role: shipper|carrier, company name, KYC fields)
  - shipments (shipper_id, status, origin, destination, price, created_at)
  - carrier_assignments (shipment_id, carrier_id, accepted_at)
  - leaderboard (user_id, points, rank, last_updated)
- Security: enable Row Level Security (RLS). Ensure each table restricts access by auth.uid().
- Storage: optional bucket for documents (e.g., RC/insurance). Apply policies per role.


## Theming and design system
- Use semantic tokens, not raw hex colors.
- Tailwind tokens live in tailwind.config.ts and CSS variables in src/index.css.
- Extend shadcn variants (e.g., hero, premium) in src/components/ui/button.tsx rather than inline overrides.
- Keep one H1 per page, semantic sections, and responsive typography.


## Maps and geolocation
- LiveMap and MapPicker use Leaflet and React-Leaflet.
- If you add tile providers (e.g., Mapbox), store API keys securely; don’t hardcode secrets.


## Delhi-focused UX guidance
- Imagery: Prefer real Delhi/NCR logistics visuals (warehousing at Okhla/Bawana, NH48/24 corridors, ICD Tughlakabad).
- Language: Keep CTAs crisp for MSME shippers and independent carriers.
- Color: Use high-contrast tokens; avoid hard-coded whites/blacks.
- Performance: Lazy load non-critical media; keep LCP focused on hero.


## Roadmap (suggested)
- Shipment quoting: transparent rate cards with corridor-based surcharges (NCR, Jaipur, Agra lanes)
- Live capacity heatmap for carriers
- In-app chat between shipper and assigned carrier
- Milestone tracking: pickup, in-transit, delivered with Proof of Delivery upload
- Notifications: email/SMS for key events
- Dispute and feedback workflows; reputation scores feeding the leaderboard


## Contribution
1) Fork or create a branch
2) Follow design tokens and shadcn variants; no inline color overrides
3) Write accessible, semantic JSX (single H1 per page)
4) Add tests where feasible; keep components small and focused
5) Open a PR describing scope and screenshots


## FAQ
- Can I swap images? Yes. Put assets in src/assets and reference via import. Use descriptive alt text.
- How do I change the hero background or the map background image? Update the imports in src/pages/Index.tsx and ensure loading="lazy" for non-critical images.
- How do I add new UI variants? Extend component variants (e.g., buttons) instead of inline class overrides.


## License
MIT License. See LICENSE if present; otherwise treat this repo as MIT-licensed for development and experimentation.


## Acknowledgements
- Delhi/NCR logistics ecosystem insights and public corridor information
- Leaflet contributors for the excellent open map tooling
- shadcn-ui and Radix teams for accessible UI primitives
