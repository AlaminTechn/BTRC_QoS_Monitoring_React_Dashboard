/**
 * ChoroplethMapGL
 *
 * Bangladesh division/district choropleth rendered with react-map-gl v8 +
 * MapLibre GL JS.  WebGL-accelerated vector rendering with GPU-level
 * feature-state hover, MapLibre step-expression choropleth colouring,
 * and five free tile styles — no API key required.
 *
 * Map styles (all free, no key):
 *   Light    — CARTO Positron GL  (clean, best for data viz)
 *   Streets  — CARTO Voyager GL   (coloured roads, full detail)
 *   Dark     — CARTO Dark Matter  (night-mode dashboards)
 *   Satellite— ESRI World Imagery (high-res aerial photography)
 *   Hybrid   — ESRI satellite + CartoDB label overlay (Bangla place-names)
 *
 * Library: react-map-gl ^8.1  + maplibre-gl ^4.7
 * Install: yarn add react-map-gl maplibre-gl
 *
 * Props (identical interface to other choropleth components):
 *   geojson        {object}    GeoJSON FeatureCollection; properties.value required
 *   title          {string}    Title overlay top-left
 *   height         {string}    CSS height of container
 *   valueLabel     {string}    Metric name for legend & popup
 *   nameProperty   {string}    GeoJSON property key for English region name
 *   onRegionClick  {function}  (featureProperties) => void  drill-down callback
 *   showBangla     {boolean}   Prefer name_bn in popup when available
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import ChoroplethMapTiled from './ChoroplethMapTiled';

// ── WebGL availability probe ──────────────────────────────────────────────────
// maplibre-gl.supported() can return true even when context creation fails in a
// sandboxed / GPU-disabled browser.  We probe by actually creating a WebGL2
// context (same path MapLibre takes internally).
const probeWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl',  { failIfMajorPerformanceCaveat: false });
    return !!gl;
  } catch {
    return false;
  }
};

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE_ID   = 'choropleth-src';
const FILL_LAYER  = 'choropleth-fill';
const LINE_LAYER  = 'choropleth-outline';

// Green sequential palette — stands out on Dark Matter base
const COLORS = ['#d1fae5', '#6ee7b7', '#34d399', '#059669', '#064e3b'];

const BANGLADESH_INITIAL = { longitude: 90.4125, latitude: 23.8103, zoom: 6.8 };

// ── Five free map styles (zero API key) ──────────────────────────────────────

const SATELLITE_RASTER_SOURCE = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  attribution: 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
  maxzoom: 19,
};

const CARTO_LABELS_SOURCE = {
  type: 'raster',
  tiles: [
    'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
  ],
  tileSize: 256,
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
};

const MAP_STYLES = {
  light: {
    label:          'Light',
    url:            'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    btnBg:          '#4285f4',
    fillOpacity:    0.62,
    legendDark:     false,
  },
  streets: {
    label:          'Streets',
    url:            'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    btnBg:          '#f4b400',
    fillOpacity:    0.58,
    legendDark:     false,
  },
  dark: {
    label:          'Dark',
    url:            'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    btnBg:          '#555',
    fillOpacity:    0.68,
    legendDark:     true,
  },
  satellite: {
    label:          'Satellite',
    url: {
      version: 8,
      sources: { 'esri-satellite': SATELLITE_RASTER_SOURCE },
      layers:  [{ id: 'satellite-base', type: 'raster', source: 'esri-satellite' }],
    },
    btnBg:          '#0f9d58',
    fillOpacity:    0.55,
    legendDark:     false,
  },
  hybrid: {
    label:          'Hybrid',
    url: {
      version: 8,
      sources: {
        'esri-satellite': SATELLITE_RASTER_SOURCE,
        'carto-labels':   CARTO_LABELS_SOURCE,
      },
      layers: [
        { id: 'satellite-base',   type: 'raster', source: 'esri-satellite' },
        { id: 'carto-label-layer', type: 'raster', source: 'carto-labels',
          paint: { 'raster-opacity': 0.85 } },
      ],
    },
    btnBg:          '#db4437',
    fillOpacity:    0.52,
    legendDark:     false,
  },
  // OpenStreetMap raster — max geographic detail: streets, lakes, forests,
  // parks, buildings (z16+), Bangla labels at higher zoom
  osm: {
    label:          'OSM',
    url: {
      version: 8,
      sources: {
        'osm-raster': {
          type:        'raster',
          tiles:       ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize:    256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxzoom:     19,
        },
      },
      layers: [{ id: 'osm-base', type: 'raster', source: 'osm-raster' }],
    },
    btnBg:          '#7cc850',
    fillOpacity:    0.45,
    legendDark:     false,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const calcQuantiles = (values, n = 5) => {
  if (!values?.length) return [];
  const s = [...values].sort((a, b) => a - b);
  return Array.from({ length: n - 1 }, (_, i) =>
    s[Math.floor((s.length * (i + 1)) / n)]
  );
};

const fmt1 = (v) => (typeof v === 'number' ? v.toFixed(1) : String(v ?? ''));

// Build inverted mask — world polygon with Bangladesh divisions cut as holes.
// Covers India/Myanmar/Bay of Bengal etc., leaves Bangladesh area clear.
const buildMask = (geojson) => {
  if (!geojson?.features?.length) return null;
  const worldRing = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]];
  const holes = [];
  geojson.features.forEach((feat) => {
    const { type, coordinates } = feat.geometry;
    if (type === 'Polygon') {
      holes.push(coordinates[0]);
    } else if (type === 'MultiPolygon') {
      coordinates.forEach((poly) => holes.push(poly[0]));
    }
  });
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [worldRing, ...holes] } }],
  };
};

// ── Component ────────────────────────────────────────────────────────────────

// ── WebGL-unavailable fallback ────────────────────────────────────────────────
// Shown when the browser's GPU sandbox blocks WebGL context creation.
// Re-uses ChoroplethMapTiled (Leaflet / Canvas 2D) so the user still sees
// a fully interactive choropleth.
const WebGLFallback = ({ geojson, title, height, valueLabel, nameProperty, onRegionClick }) => (
  <div style={{ position: 'relative', height }}>
    {/* Banner */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      background: '#fff7e6', borderBottom: '1px solid #ffd591',
      padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 12,
    }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span style={{ color: '#874d00' }}>
        <strong>WebGL unavailable</strong> — MapLibre GL requires GPU acceleration.
        Showing Leaflet (Canvas) fallback.
        To enable: Chrome menu → Settings → System → <em>Use hardware acceleration</em>.
      </span>
    </div>
    {/* Leaflet choropleth underneath the banner — OSM tiles, free zoom */}
    <div style={{ paddingTop: 38, height: '100%', boxSizing: 'border-box' }}>
      <ChoroplethMapTiled
        geojson={geojson}
        title={title}
        valueLabel={valueLabel}
        nameProperty={nameProperty}
        onRegionClick={onRegionClick}
        height={`calc(${height} - 38px)`}
        tileStyle="osm"
        minZoom={3}
        maxBoundsViscosity={0.15}
      />
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const ChoroplethMapGL = ({
  geojson,
  title        = 'Regional Analysis',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  // Run probe once — useState initialiser runs synchronously before first render
  const [webglOK] = useState(() => probeWebGL());

  const [activeStyle, setActiveStyle] = useState('dark');
  const [cursor,      setCursor]      = useState('auto');
  const [popup,       setPopup]       = useState({
    visible: false, lng: 0, lat: 0, label: '', value: 0,
  });

  const mapRef       = useRef(null);
  const hoveredIdRef = useRef(null);     // track hover without re-renders

  const style = MAP_STYLES[activeStyle];

  // ── Quantile colour breaks ────────────────────────────────────────────────
  const breaks = useMemo(() => {
    if (!geojson?.features) return [];
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    return calcQuantiles(vals);
  }, [geojson]);

  // ── Legend items ──────────────────────────────────────────────────────────
  const legendItems = useMemo(() => {
    if (!breaks.length || !geojson?.features) return [];
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    const min   = Math.min(...vals);
    const items = [{ color: COLORS[0], label: `${fmt1(min)} – ${fmt1(breaks[0])}` }];
    for (let i = 0; i < breaks.length - 1; i++) {
      items.push({ color: COLORS[i + 1], label: `${fmt1(breaks[i])} – ${fmt1(breaks[i + 1])}` });
    }
    items.push({
      color: COLORS[COLORS.length - 1],
      label: `${fmt1(breaks[breaks.length - 1])} +`,
    });
    return items;
  }, [breaks, geojson]);

  // ── Inverted mask (world minus Bangladesh) ───────────────────────────────
  const maskGeoJSON = useMemo(() => buildMask(geojson), [geojson]);

  // ── Fill layer paint — MapLibre step expression (green palette on dark) ──
  // Opacity fades as zoom increases so roads/labels show through at street level
  const fillPaint = useMemo(() => ({
    'fill-color': breaks.length === 4
      ? [
          'step', ['get', 'value'],
          COLORS[0],
          breaks[0], COLORS[1],
          breaks[1], COLORS[2],
          breaks[2], COLORS[3],
          breaks[3], COLORS[4],
        ]
      : COLORS[2],
    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.90,
      // Zoom-based fade: full opacity at overview, nearly transparent at street level
      ['interpolate', ['linear'], ['zoom'],
        6,  style.fillOpacity,        // ~0.68 at full Bangladesh view
        10, style.fillOpacity * 0.55, // ~0.38 at district zoom
        14, 0.15,                     // ~0.15 at city/street level
      ],
    ],
  }), [breaks, style.fillOpacity]);

  // ── Outline layer paint — also feature-state driven ───────────────────────
  const linePaint = useMemo(() => ({
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#1e3a5f',
      '#ffffff',
    ],
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      2.8,
      1.2,
    ],
  }), []);

  // ── Style switch — clear hover state so it doesn't leak across styles ─────
  const handleStyleChange = useCallback((key) => {
    const map = mapRef.current?.getMap();
    if (map && hoveredIdRef.current != null) {
      try {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredIdRef.current },
          { hover: false }
        );
      } catch (_) {}
      hoveredIdRef.current = null;
    }
    setPopup((p) => ({ ...p, visible: false }));
    setCursor('auto');
    setActiveStyle(key);
  }, []);

  // ── Mouse move — set hover feature state + update popup ───────────────────
  const onMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (e.features?.length > 0) {
      const feature = e.features[0];
      const fid     = feature.id;

      // Remove highlight from previously hovered feature
      if (hoveredIdRef.current != null && hoveredIdRef.current !== fid) {
        try {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
        } catch (_) {}
      }

      // Highlight new feature
      hoveredIdRef.current = fid;
      try {
        map.setFeatureState({ source: SOURCE_ID, id: fid }, { hover: true });
      } catch (_) {}

      const props  = feature.properties;
      const name   = props[nameProperty] || 'Unknown';
      const nameBn = showBangla && props.name_bn ? props.name_bn : null;

      setCursor('pointer');
      setPopup({
        visible: true,
        lng:     e.lngLat.lng,
        lat:     e.lngLat.lat,
        label:   nameBn || name,
        value:   props.value ?? 0,
      });
    } else {
      // Cursor moved off all features
      if (hoveredIdRef.current != null) {
        try {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
        } catch (_) {}
        hoveredIdRef.current = null;
      }
      setCursor('auto');
      setPopup((p) => ({ ...p, visible: false }));
    }
  }, [nameProperty, showBangla]);

  // ── Mouse leave ───────────────────────────────────────────────────────────
  const onMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map && hoveredIdRef.current != null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
      } catch (_) {}
      hoveredIdRef.current = null;
    }
    setCursor('auto');
    setPopup((p) => ({ ...p, visible: false }));
  }, []);

  // ── Click — drill-down callback ───────────────────────────────────────────
  const onClick = useCallback((e) => {
    if (e.features?.length > 0) {
      onRegionClick?.(e.features[0].properties);
    }
  }, [onRegionClick]);

  // ── WebGL unavailable → Leaflet fallback ─────────────────────────────────
  if (!webglOK) {
    return (
      <WebGLFallback
        geojson={geojson}
        title={title}
        height={height}
        valueLabel={valueLabel}
        nameProperty={nameProperty}
        onRegionClick={onRegionClick}
      />
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!geojson?.features?.length) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #d9d9d9', borderRadius: 6, background: '#f5f5f5',
      }}>
        <p style={{ color: '#999' }}>No geographic data available</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'relative', height,
      border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden',
    }}>

      {/* Title overlay */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: activeStyle === 'dark'
            ? 'rgba(30,30,30,0.92)'
            : 'rgba(255,255,255,0.96)',
          color: activeStyle === 'dark' ? '#eee' : '#1f2937',
          padding: '6px 14px', borderRadius: 4,
          boxShadow: '0 1px 6px rgba(0,0,0,0.16)',
          fontWeight: 600, fontSize: 13,
        }}>
          {title}
        </div>
      )}

      {/* Style switcher */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        display: 'flex', gap: 4,
      }}>
        {Object.entries(MAP_STYLES).map(([key, s]) => {
          const isActive = activeStyle === key;
          return (
            <button
              key={key}
              onClick={() => handleStyleChange(key)}
              style={{
                padding:    '5px 11px',
                fontSize:   11,
                fontWeight: 600,
                border:     'none',
                borderRadius: 4,
                cursor:     'pointer',
                background: isActive ? s.btnBg : 'rgba(255,255,255,0.94)',
                color:      isActive ? '#fff' : '#333',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.20)',
                transition: 'background 0.15s',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* MapLibre GL Map */}
      <Map
        ref={mapRef}
        initialViewState={BANGLADESH_INITIAL}
        style={{ height: '100%', width: '100%' }}
        mapStyle={style.url}
        interactiveLayerIds={[FILL_LAYER]}
        cursor={cursor}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {/* Navigation (zoom / compass / reset bearing) */}
        <NavigationControl position="bottom-right" />

        {/* Scale bar */}
        <ScaleControl position="bottom-left" unit="metric" style={{ marginBottom: 36 }} />

        {/* Full-screen button — positioned below the style switcher */}
        <FullscreenControl position="top-right" style={{ marginTop: 44 }} />

        {/* ── GeoJSON source + choropleth layers ── */}
        <Source
          key={nameProperty}        /* remount if nameProperty changes */
          id={SOURCE_ID}
          type="geojson"
          data={geojson}
          promoteId={nameProperty}  /* promotes NAME_1 as feature ID for setFeatureState */
        >
          {/* Fill — choropleth colours */}
          <Layer
            id={FILL_LAYER}
            type="fill"
            paint={fillPaint}
          />
          {/* Outline — white borders, thicker on hover */}
          <Layer
            id={LINE_LAYER}
            type="line"
            paint={linePaint}
          />
        </Source>

        {/* ── Mask: dims everything outside Bangladesh ── */}
        {maskGeoJSON && (
          <Source id="bd-mask" type="geojson" data={maskGeoJSON}>
            <Layer
              id="bd-mask-fill"
              type="fill"
              paint={{
                'fill-color':   style.legendDark ? '#050a14' : '#d8d4cc',
                'fill-opacity': 0.78,
              }}
            />
          </Source>
        )}

        {/* ── Hover popup ── */}
        {popup.visible && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            closeButton={false}
            offset={12}
          >
            <div style={{
              fontFamily: 'sans-serif',
              padding: '3px 5px',
              minWidth: 130,
            }}>
              <strong style={{
                fontSize: 13,
                fontFamily: "'Noto Serif Bengali', sans-serif",
                display: 'block',
                marginBottom: 4,
                color: '#111',
              }}>
                {popup.label}
              </strong>
              <span style={{ color: '#555', fontSize: 12 }}>
                {valueLabel}: <strong>{popup.value}</strong>
              </span>
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Colour legend ── */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 36, left: 10, zIndex: 10,
          background: style.legendDark
            ? 'rgba(30,30,30,0.92)'
            : 'rgba(255,255,255,0.96)',
          padding: '10px 12px', borderRadius: 4,
          boxShadow: '0 1px 6px rgba(0,0,0,0.16)', fontSize: 11,
        }}>
          <div style={{
            fontWeight: 700, marginBottom: 6, fontSize: 11,
            color: style.legendDark ? '#ddd' : '#333',
          }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3,
            }}>
              <div style={{
                width: 18, height: 13,
                background: item.color,
                border: '1px solid #ccc',
                flexShrink: 0,
              }} />
              <span style={{
                color: style.legendDark ? '#ccc' : '#555',
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Library badge */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(109,74,255,0.90)', color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        MapLibre GL · react-map-gl v8
      </div>
    </div>
  );
};

export default ChoroplethMapGL;
