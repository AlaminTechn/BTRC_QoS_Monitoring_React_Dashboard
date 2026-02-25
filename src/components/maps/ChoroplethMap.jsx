/**
 * ChoroplethMap — React-Leaflet
 *
 * Bangladesh division choropleth with real tile backgrounds.
 * Supports 5 tile styles, each with a matching choropleth colour palette.
 *
 * Tile providers (all free, no API key):
 *   Light     — CARTO Positron    + Blue sequential
 *   Streets   — CARTO Voyager     + Warm (YlOrRd)
 *   Dark      — CARTO Dark Matter + Green sequential
 *   Satellite — ESRI World Imagery+ Purple sequential
 *   OSM       — OpenStreetMap Std + Teal sequential
 *
 * Library: react-leaflet v5 + leaflet v1.9
 * API key: Not required
 *
 * Props:
 *   geojson       {object}   GeoJSON FeatureCollection; properties.value required
 *   title         {string}   Map title
 *   height        {string}   CSS height of the container
 *   valueLabel    {string}   Metric name shown in legend and tooltip
 *   nameProperty  {string}   GeoJSON property for English region name
 *   onRegionClick {function} Callback (featureProperties) => void
 *   showBangla    {boolean}  Show বাংলা name in tooltip when available
 */

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Bangladesh bounding box [[SW_lat, SW_lng], [NE_lat, NE_lng]]
// Covers all 8 divisions with a natural border margin.
const BD_BOUNDS = [[20.34, 88.0], [26.64, 92.68]];

// Fix Leaflet default marker icon path (Webpack/Vite asset hashing)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Tile styles ───────────────────────────────────────────────────────────────

const MAP_STYLES = {
  light: {
    label:       'Light',
    url:         'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    subdomains:  'abcd',
    maxZoom:     19,
    // CARTO Positron = light grey base → blue choropleth sits cleanly on top
    palette:     ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
    hoverColor:  '#1e40af',
    borderColor: '#ffffff',
    fillOpacity: 0.70,
    isDark:      false,
    badgeBg:     'rgba(59,130,246,0.9)',
    legendBg:    'rgba(255,255,255,0.95)',
    legendText:  '#333',
    titleBg:     'rgba(255,255,255,0.95)',
    titleText:   '#111827',
    btnActiveBg: '#3b82f6',
  },
  streets: {
    label:       'Streets',
    url:         'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    subdomains:  'abcd',
    maxZoom:     19,
    // Voyager = warm beige road map → warm orange-red choropleth
    palette:     ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'],
    hoverColor:  '#7f1d1d',
    borderColor: '#fff5e6',
    fillOpacity: 0.65,
    isDark:      false,
    badgeBg:     'rgba(240,59,32,0.88)',
    legendBg:    'rgba(255,255,255,0.95)',
    legendText:  '#333',
    titleBg:     'rgba(255,255,255,0.95)',
    titleText:   '#111827',
    btnActiveBg: '#f03b20',
  },
  dark: {
    label:       'Dark',
    url:         'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    subdomains:  'abcd',
    maxZoom:     19,
    // Dark Matter = near-black canvas → bright green choropleth pops
    palette:     ['#d1fae5', '#6ee7b7', '#34d399', '#059669', '#064e3b'],
    hoverColor:  '#34d399',
    borderColor: '#334155',
    fillOpacity: 0.72,
    isDark:      true,
    badgeBg:     'rgba(5,150,105,0.9)',
    legendBg:    'rgba(15,23,42,0.92)',
    legendText:  '#e2e8f0',
    titleBg:     'rgba(15,23,42,0.92)',
    titleText:   '#e2e8f0',
    btnActiveBg: '#059669',
  },
  satellite: {
    label:       'Satellite',
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    subdomains:  '',
    maxZoom:     18,
    // Satellite imagery → semi-transparent purple choropleth overlay
    palette:     ['#f3e8ff', '#d8b4fe', '#a855f7', '#7c3aed', '#4c1d95'],
    hoverColor:  '#c026d3',
    borderColor: 'rgba(255,255,255,0.5)',
    fillOpacity: 0.60,
    isDark:      true,
    badgeBg:     'rgba(124,58,237,0.9)',
    legendBg:    'rgba(0,0,0,0.78)',
    legendText:  '#e9d5ff',
    titleBg:     'rgba(0,0,0,0.78)',
    titleText:   '#e9d5ff',
    btnActiveBg: '#7c3aed',
  },
  osm: {
    label:       'OSM',
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains:  'abc',
    maxZoom:     19,
    // OSM standard = colourful road map → teal/cyan choropleth
    palette:     ['#ccfbf1', '#5eead4', '#14b8a6', '#0d9488', '#134e4a'],
    hoverColor:  '#0f766e',
    borderColor: '#ffffff',
    fillOpacity: 0.65,
    isDark:      false,
    badgeBg:     'rgba(13,148,136,0.9)',
    legendBg:    'rgba(255,255,255,0.95)',
    legendText:  '#333',
    titleBg:     'rgba(255,255,255,0.95)',
    titleText:   '#111827',
    btnActiveBg: '#0d9488',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const calculateQuantiles = (values, numBins = 5) => {
  if (!values?.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  return Array.from({ length: numBins - 1 }, (_, i) =>
    sorted[Math.floor((sorted.length * (i + 1)) / numBins)]
  );
};

const getColor = (value, breaks, palette) => {
  if (!breaks?.length) return palette[0];
  const idx = breaks.findIndex((b) => value <= b);
  return idx === -1 ? palette[palette.length - 1] : palette[idx];
};

const fmt = (v) =>
  typeof v === 'number' ? (Number.isInteger(v) ? v.toString() : v.toFixed(2)) : String(v ?? 0);

// ── TileLayer swapper — must live inside MapContainer ─────────────────────────

const TileLayerSwitcher = ({ style }) => (
  <TileLayer
    key={style.label}          // key forces Leaflet to replace the layer
    url={style.url}
    attribution={style.attribution}
    subdomains={style.subdomains || 'abc'}
    maxZoom={style.maxZoom}
  />
);

// ── Main component ────────────────────────────────────────────────────────────

const ChoroplethMap = ({
  geojson,
  title        = 'Regional Analysis',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  const [activeStyle, setActiveStyle] = useState('light');

  const style = MAP_STYLES[activeStyle];

  // Key that changes only when geojson data or tile style changes.
  // Rekeys the GeoJSON layer (not the MapContainer) so the viewport stays fixed.
  const geojsonKey = useMemo(
    () => `${activeStyle}-${geojson?.features?.length ?? 0}`,
    [activeStyle, geojson]
  );

  // Colour breaks
  const { breaks, min } = useMemo(() => {
    if (!geojson?.features) return { breaks: [], min: 0 };
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    return {
      breaks: calculateQuantiles(vals, 5),
      min:    vals.length ? Math.min(...vals) : 0,
    };
  }, [geojson]);

  // Legend items
  const legendItems = useMemo(() => {
    if (!breaks.length) return [];
    const fmtN = (v) => (typeof v === 'number' ? v.toFixed(1) : v);
    const items = [{ color: style.palette[0], label: `${fmtN(min)} – ${fmtN(breaks[0])}` }];
    for (let i = 0; i < breaks.length - 1; i++) {
      items.push({ color: style.palette[i + 1], label: `${fmtN(breaks[i])} – ${fmtN(breaks[i + 1])}` });
    }
    items.push({ color: style.palette[style.palette.length - 1], label: `${fmtN(breaks[breaks.length - 1])} +` });
    return items;
  }, [breaks, min, style]);

  // Leaflet GeoJSON style fn — recreated when style changes
  const featureStyle = useMemo(() => (feature) => ({
    fillColor:   getColor(feature.properties.value ?? 0, breaks, style.palette),
    fillOpacity: style.fillOpacity,
    weight:      1.2,
    opacity:     1,
    color:       style.borderColor,
  }), [breaks, style]);

  // onEachFeature — binds tooltip and hover
  const onEachFeature = useMemo(() => (feature, layer) => {
    const p      = feature.properties;
    const name   = p[nameProperty] || p.shapeName || p.name || 'Unknown';
    const nameBn = showBangla && p.name_bn ? p.name_bn : null;
    const label  = nameBn ? `${nameBn} (${name})` : name;
    const value  = p.value ?? 0;

    layer.bindTooltip(`
      <div style="padding:8px 12px;font-family:'Noto Serif Bengali',sans-serif;min-width:130px;">
        <strong style="font-size:13px;display:block;margin-bottom:4px;">${label}</strong>
        <span style="font-size:11px;opacity:0.75;font-family:sans-serif;">${valueLabel}: </span>
        <strong style="font-size:12px;font-family:sans-serif;">${fmt(value)}</strong>
      </div>`, {
      permanent:  false,
      direction:  'auto',
      opacity:    0.97,
    });

    layer.on({
      mouseover(e) {
        e.target.setStyle({
          weight:      3,
          color:       style.hoverColor,
          fillOpacity: Math.min(style.fillOpacity + 0.18, 0.95),
        });
        e.target.bringToFront();
      },
      mouseout(e) {
        e.target.setStyle(featureStyle(feature));
      },
      click() {
        onRegionClick?.(p);
      },
    });
  }, [nameProperty, showBangla, valueLabel, style, featureStyle, onRegionClick]);

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

  return (
    <div style={{
      position: 'relative', height,
      border: `1px solid ${style.isDark ? '#334155' : '#d9d9d9'}`,
      borderRadius: 6, overflow: 'hidden',
    }}>

      {/* ── Title ────────────────────────────────────────────────── */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 1000,
          background: style.titleBg,
          padding: '7px 14px', borderRadius: 5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          fontWeight: 600, fontSize: 13, color: style.titleText,
        }}>
          {title}
        </div>
      )}

      {/* ── Style switcher — top-right ────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        display: 'flex', gap: 4,
      }}>
        {Object.entries(MAP_STYLES).map(([key, s]) => {
          const active = activeStyle === key;
          return (
            <button
              key={key}
              onClick={() => setActiveStyle(key)}
              style={{
                padding:    '5px 10px',
                fontSize:   11,
                fontWeight: 600,
                border:     'none',
                borderRadius: 4,
                cursor:     'pointer',
                background: active
                  ? s.btnActiveBg
                  : style.isDark
                    ? 'rgba(30,41,59,0.92)'
                    : 'rgba(255,255,255,0.92)',
                color: active
                  ? '#fff'
                  : style.isDark ? '#cbd5e1' : '#374151',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.22)',
                transition: 'background 0.15s',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Leaflet map ───────────────────────────────────────────── */}
      <MapContainer
        // Static bounds = Bangladesh bbox. MapContainer never remounts so the
        // viewport is stable — switching tiles or reloading GeoJSON won't pan/zoom.
        bounds={BD_BOUNDS}
        boundsOptions={{ padding: [14, 14] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl
        attributionControl
      >
        {/* Tile layer — key forces Leaflet to swap it when style changes */}
        <TileLayerSwitcher style={style} />

        {/* Choropleth overlay — rekeyed on data/style change, MapContainer stays */}
        <GeoJSON
          key={geojsonKey}
          data={geojson}
          style={featureStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* ── Legend ───────────────────────────────────────────────── */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 32, left: 10, zIndex: 1000,
          background: style.legendBg,
          padding: '10px 12px', borderRadius: 5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: style.legendText, fontSize: 11 }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{
                width: 18, height: 13, background: item.color,
                border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, flexShrink: 0,
              }} />
              <span style={{ color: style.legendText, whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Library badge ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
        background: style.badgeBg, color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        Leaflet · {style.label} · react-leaflet v5
      </div>
    </div>
  );
};

export default ChoroplethMap;
