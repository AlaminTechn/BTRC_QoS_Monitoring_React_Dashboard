# Map Visualization Library Comparison

**Project:** BTRC QoS Monitoring Dashboard V3
**Context:** Bangladesh division/district choropleth maps for ISP performance monitoring
**Last updated:** 2026-02-24

---

## Quick Reference

| Library | Type | Tiles | API Key | Bundle (gz) | Bangla Labels | Max Zoom |
|---------|------|:-----:|:-------:|:-----------:|:-------------:|:--------:|
| **React-Leaflet** | Tile-based | ✅ OSM/ESRI | ❌ Free | ~90 KB | Via tile server | 19 (building) |
| **ECharts Geo** | SVG Chart | ❌ | ❌ | ~1 MB | ✅ Native `formatter` | Division/District |
| **react-simple-maps** | SVG Vector | ❌ | ❌ | ~50 KB | Tooltip only | Division/District |
| **Mapbox GL** *(not impl.)* | Vector Tiles | ✅ Mapbox | ✅ Paid | ~300 KB | ✅ `language` style | 22 (indoor) |
| **Google Maps** *(not impl.)* | Proprietary | ✅ Google | ✅ Paid | ~200 KB | ✅ Native | 21 (building) |

---

## 1. React-Leaflet (OpenStreetMap)

**Files:** `src/components/maps/ChoroplethMap.jsx`, `ChoroplethMapTiled.jsx`
**Libraries:** `leaflet ^1.9`, `react-leaflet ^5`
**Install:** `yarn add leaflet react-leaflet`

### How it works
Wraps the Leaflet.js mapping library in React components. Renders map tiles
fetched from a CDN (CartoDB, ESRI, OSM) onto an HTML `<canvas>` / `<div>`,
then overlays GeoJSON polygons as SVG layers on top.

### ✅ Pros
- **Google Maps-quality tile detail** — ESRI World Street Map shows building
  footprints, shop areas, water bodies and road names at zoom 18-19, all for free.
- **Full interactivity** — smooth pan, scroll-zoom, click events, tooltips,
  and programmatic `fitBounds` / `flyTo` are built-in.
- **Huge plugin ecosystem** — `leaflet.heat` (heatmap), `leaflet.markercluster`
  (clustering), `leaflet-draw` (polygon drawing), Leaflet.pm, etc.
- **Bangla tile labels** — CartoDB Voyager and OSM HOT tiles render বাংলা script
  labels for Bangladesh place names, road names, and shop signs.
- **World mask** — inverted GeoJSON polygon hides India/Myanmar so only Bangladesh
  is visible (implemented in `ChoroplethMapTiled`).
- **Fullscreen mode** — expand to `100vw × 100vh` with Escape key to exit.
- **Drill-down navigation** — click a division → filter to districts; URL params
  preserve browser history.
- **Offline tiles** — can self-host tiles with a TileServer or MBTiles file.

### ❌ Cons
- **Tile dependency** — requires an internet connection or self-hosted tile server;
  no tiles = blank grey map.
- **Bangla labels from tiles only** — ESRI tiles have English labels baked in;
  switching to Bangla requires using OSM HOT / CartoDB tile servers (lower map quality).
- **Heavier dependency tree** — `leaflet` + `react-leaflet` + icon images add up.
- **SSR incompatible** — Leaflet uses `window` / `document`; requires dynamic
  imports (`next/dynamic` or `React.lazy`) in SSR frameworks.
- **Canvas repaints on large GeoJSON** — 64-district polygons at zoom 15+ can
  cause noticeable frame drops on low-end devices.
- **Map re-mount on data change** — GeoJSON key trick (`key={mapKey}`) needed to
  force re-render when dataset changes.

### 🎯 Best for
- Operational real-time monitoring dashboards
- Field engineers who need to navigate to specific locations
- Drill-down from national → division → district → street level
- Any use case where tile background context (roads, rivers) adds value

### Code example
```jsx
import ChoroplethMapTiled from '../components/maps/ChoroplethMapTiled';

<ChoroplethMapTiled
  geojson={divisionGeoJSON}   // GeoJSON with features.properties.value
  title="Division Violations"
  valueLabel="Violations"
  tileStyle="hybrid-bangla"   // ESRI base + CartoDB Bangla labels
  height="500px"
  onRegionClick={(feature) => navigate(`?division=${feature.properties.NAME_1}`)}
/>
```

---

## 2. ECharts Geo (Apache ECharts)

**File:** `src/components/maps/ChoroplethMapECharts.jsx`
**Libraries:** `echarts ^6`, `echarts-for-react ^3` (already in project)
**Install:** Already installed — no additional packages needed!

### How it works
Uses ECharts' `map` series type. After calling `echarts.registerMap('name', geojsonData)`,
ECharts renders the map as canvas-based SVG with built-in animations, a visual-map
(gradient legend), and interactive zoom/pan via the `roam: true` setting.

### ✅ Pros
- **Zero new dependencies** — `echarts` and `echarts-for-react` are already in
  `package.json`. Drop the component in and it works.
- **Native Bangla labels** — the `label.formatter` callback receives the full data
  object, so `params.data.nameBn` renders বাংলা directly on the polygon face.
  No tile server involved.
- **Built-in visual-map (legend)** — gradient bar with brush selection is included
  without any extra code.
- **Smooth CSS animations** — region highlights and data transitions animate automatically.
- **Integrates with ECharts charts** — dispatch events between the geo map and bar/line
  charts on the same page (linked brushing).
- **Canvas rendering** — handles 10,000+ polygon points without SVG DOM overhead.
- **Tooltip theming** — consistent with other ECharts components on the page.

### ❌ Cons
- **Large bundle** — full ECharts is ~1 MB (though tree-shakeable in v5+, complex setup).
- **No tile layer** — background is a blank fill colour; roads, buildings and
  water bodies are not visible.
- **Limited to choropleth + scatter** — no heatmap tile layer, no route drawing,
  no clustering.
- **`roam` UX less polished** — ECharts' pan/zoom is functional but not as smooth
  as Leaflet's native tile loading.
- **`registerMap` is global** — must use unique map names per instance to avoid
  collisions between multiple map components on the same page.
- **Projection options** — limited to what ECharts exposes; can't use custom D3
  projections.

### 🎯 Best for
- Analytical dashboards that already use ECharts for charts
- Reports where Bangla labels on the map are critical
- Offline-capable deployments (no tile CDN needed)
- Embedding maps inside ECharts dashboards with linked brushing

### Code example
```jsx
import ChoroplethMapECharts from '../components/maps/ChoroplethMapECharts';

<ChoroplethMapECharts
  geojson={divisionGeoJSON}   // GeoJSON — features.properties.value + name_bn
  title="Division Violations"
  valueLabel="Violations"
  nameProperty="NAME_1"       // Must match GeoJSON feature property key
  height="500px"
  showBangla                  // Renders বাংলা label.formatter
  onRegionClick={(data) => console.log(data.name, data.nameBn)}
/>
```

---

## 3. react-simple-maps (SVG / D3-geo)

**File:** `src/components/maps/ChoroplethMapSVG.jsx`
**Library:** `react-simple-maps ^3.0`
**Install:** `yarn add react-simple-maps`

### How it works
Uses D3-geo projections (`geoMercator`) to project GeoJSON coordinates onto a 2-D
SVG plane. Each GeoJSON feature becomes an SVG `<path>` element. Colour fills,
hover styles, zoom and pan are handled by D3's `ZoomableGroup` and React state.

### ✅ Pros
- **Smallest bundle** — ~50 KB gzipped (just D3-geo + react bindings).
- **Pixel-perfect SVG** — scales to any DPI without blurring; print and export look sharp.
- **True SSR compatible** — no `window` usage; works in Next.js, Remix, Gatsby
  without `dynamic` imports.
- **No tile CDN** — fully offline after initial JS load.
- **Simple API** — `ComposableMap > Geographies > Geography` is three components.
- **Full D3 projection control** — Mercator, Albers, Conic Equal Area, Azimuthal, etc.
- **Easy SVG export** — grab the `<svg>` DOM node and save as `.svg` or convert to PNG.

### ❌ Cons
- **No tile background** — roads, buildings, rivers not visible.
- **SVG performance limit** — 500+ complex polygons (district level) can lag
  in Chrome; canvas not available.
- **Manual projection tuning** — `center` and `scale` in `projectionConfig` need
  to be adjusted for each geographic region.
- **Custom tooltip required** — no built-in tooltip; must implement `onMouseEnter`
  / `onMouseLeave` with `position: fixed` overlay.
- **Bangla labels** — can be added via custom `<text>` SVG elements at centroid,
  but requires computing centroids manually (D3 `geoCentroid`).
- **Less interactive** — no built-in clustering, heatmap, or route drawing.
- **Accessibility** — SVG paths need ARIA labels manually for screen readers.

### 🎯 Best for
- Printed regulatory reports (PDF export)
- Lightweight embedded widgets in emails or static HTML pages
- SSR / Next.js / Remix dashboards
- Cases where bundle size is the top constraint

### Code example
```jsx
import ChoroplethMapSVG from '../components/maps/ChoroplethMapSVG';

<ChoroplethMapSVG
  geojson={divisionGeoJSON}
  title="Division Violations"
  valueLabel="Violations"
  nameProperty="NAME_1"
  height="500px"
  showBangla              // Shows বাংলা in floating tooltip (name_bn property)
  projectionConfig={{ center: [90.4, 23.7], scale: 4800 }}
  onRegionClick={(props) => console.log(props.NAME_1)}
/>
```

---

## 4. Mapbox GL (react-map-gl) — *Not implemented, reference only*

**Library:** `react-map-gl`, `mapbox-gl`
**API Key:** ✅ Required (free tier: 50,000 map loads/month)
**Install:** `yarn add react-map-gl mapbox-gl`

### ✅ Pros
- Vector tiles — smooth zoom at any level, no pixelation.
- `language` style property changes all labels to any locale (Bangla: `mul`).
- `FillLayer` for choropleth is GPU-accelerated — handles millions of polygons.
- Deck.gl integration for 3-D extrusions, arc layers, heat maps.
- Satellite + Streets hybrid styles available.

### ❌ Cons
- **Requires Mapbox access token** — must register at mapbox.com.
- **Paid beyond free tier** (>50K loads/month).
- **Mapbox license changed in 2021** — `mapbox-gl` v2+ is proprietary; community
  maintains `maplibre-gl` as the open-source fork.
- Larger setup (style JSON, token management).

### Alternative: MapLibre GL
`maplibre-gl` is a fully open-source fork of Mapbox GL v1. Free, no API key,
same API. Use with free tile providers:
- `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png`

---

## 5. Google Maps API — *Not implemented, reference only*

**Library:** `@react-google-maps/api`
**API Key:** ✅ Required (Google Cloud Console)
**Billing:** Pay-as-you-go after free $200/month credit

### ✅ Pros
- Best-in-class tile quality and Bangla label support globally.
- Satellite, terrain, and hybrid views.
- Familiar UX for end users.
- Street View, Directions API integration.

### ❌ Cons
- **Cost** — $7 per 1,000 map loads after free credit exhausted.
- **Vendor lock-in** — tied to Google's infrastructure.
- **Government projects** — may require data residency / privacy review.
- **API key security** — must restrict key to domains in production.

---

## Decision Guide

```
Do you need street/building detail?
├─ YES → React-Leaflet (free tiles) or Mapbox GL (premium)
└─ NO
   ├─ Is ECharts already in your project?
   │  └─ YES → ChoroplethMapECharts (zero extra deps, Bangla labels built-in)
   └─ Is bundle size or SSR critical?
      ├─ YES → react-simple-maps (lightest, SSR-safe)
      └─ NO  → ECharts Geo (better animations, built-in legend)
```

## BTRC Dashboard Recommendation

| Use case | Recommended |
|----------|-------------|
| Division / District drill-down map (R2.2) | **React-Leaflet** (`ChoroplethMapTiled`) |
| Analytical report with Bangla labels | **ECharts Geo** (`ChoroplethMapECharts`) |
| PDF export / print report | **react-simple-maps** (`ChoroplethMapSVG`) |
| National overview (lightweight) | **react-simple-maps** or **ECharts Geo** |

---

## File Reference

```
btrc-react-regional/
├── src/components/maps/
│   ├── ChoroplethMap.jsx          # Leaflet (no tiles — original)
│   ├── ChoroplethMapTiled.jsx     # Leaflet + tile layers (recommended)
│   ├── ChoroplethMapECharts.jsx   # Apache ECharts geo series ← NEW
│   └── ChoroplethMapSVG.jsx       # react-simple-maps SVG/D3  ← NEW
├── src/pages/
│   └── MapVisualization.jsx       # Comparison page            ← NEW
└── MAP_VISUALIZATION_COMPARISON.md  # This file
```

## Shared Props Interface

All four components accept a compatible props interface:

| Prop | Type | Description |
|------|------|-------------|
| `geojson` | `object` | GeoJSON FeatureCollection. `feature.properties.value` = numeric metric. Optional `feature.properties.name_bn` for Bangla names. |
| `title` | `string` | Map title shown in top-left overlay |
| `height` | `string` | CSS height, e.g. `'500px'` |
| `valueLabel` | `string` | Metric name for legend and tooltip |
| `nameProperty` | `string` | GeoJSON property key for region name (`NAME_1` / `shapeName`) |
| `onRegionClick` | `function` | `(featureProperties) => void` drill-down callback |
| `showBangla` | `boolean` | Prefer `name_bn` Bangla labels where supported |
