/**
 * ChoroplethMapSVG
 *
 * Bangladesh choropleth map rendered as pure SVG using react-simple-maps (D3-geo).
 * No tile server, no API key, no canvas — just crisp scalable vector polygons.
 * Supports 5 rich visual themes and mouse pan + scroll-zoom via ZoomableGroup.
 *
 * Themes:
 *   Light    — white background, blue sequential   (default)
 *   Dark     — deep navy, green sequential
 *   Colorful — light grey, warm-to-cool diverging
 *   Earth    — dark earth, amber/orange palette
 *   Ocean    — deep sea, cyan/teal palette
 *
 * Library: react-simple-maps (D3-geo under the hood)
 * Tile layer: None — pure SVG vector rendering
 * API key:  Not required
 * Bundle:   ~50 KB gzipped
 *
 * Props:
 *   geojson       {object}   GeoJSON FeatureCollection; properties.value required
 *   title         {string}   Chart title
 *   height        {string}   CSS height
 *   valueLabel    {string}   Metric name for tooltip & legend
 *   nameProperty  {string}   GeoJSON property key for region name (default 'NAME_1')
 *   onRegionClick {function} Callback (featureProperties) => void
 *   showBangla    {boolean}  Show বাংলা names in tooltip when available
 */

import React, { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

// ── Visual themes ─────────────────────────────────────────────────────────────

const THEMES = {
  light: {
    label:       'Light',
    btnBg:       '#4285f4',
    bg:          '#f0f4ff',
    waterBg:     '#c8ddf5',
    stroke:      '#ffffff',
    strokeWidth: 0.9,
    palette:     ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
    hoverFill:   '#1d4ed8',
    labelColor:  '#1f2937',
    labelBg:     'rgba(255,255,255,0.95)',
    tooltipBg:   'rgba(255,255,255,0.97)',
    tooltipColor:'#374151',
    legendBg:    'rgba(255,255,255,0.95)',
    legendColor: '#333',
    legendBorder:'#e5e7eb',
    badgeBg:     'rgba(16,185,129,0.9)',
  },
  dark: {
    label:       'Dark',
    btnBg:       '#1e293b',
    bg:          '#0f172a',
    waterBg:     '#0c1f3a',
    stroke:      '#334155',
    strokeWidth: 1.0,
    palette:     ['#d1fae5', '#6ee7b7', '#34d399', '#059669', '#064e3b'],
    hoverFill:   '#34d399',
    labelColor:  '#e2e8f0',
    labelBg:     'rgba(15,23,42,0.92)',
    tooltipBg:   'rgba(15,23,42,0.97)',
    tooltipColor:'#e2e8f0',
    legendBg:    'rgba(15,23,42,0.88)',
    legendColor: '#e2e8f0',
    legendBorder:'#334155',
    badgeBg:     'rgba(16,185,129,0.9)',
  },
  colorful: {
    label:       'Colorful',
    btnBg:       '#e11d48',
    bg:          '#f8f9fa',
    waterBg:     '#dde4ef',
    stroke:      '#e2e8f0',
    strokeWidth: 1.2,
    palette:     ['#fee2e2', '#fca5a5', '#f97316', '#15803d', '#1d4ed8'],
    hoverFill:   '#b45309',
    labelColor:  '#111827',
    labelBg:     'rgba(255,255,255,0.92)',
    tooltipBg:   'rgba(255,255,255,0.97)',
    tooltipColor:'#374151',
    legendBg:    'rgba(255,255,255,0.95)',
    legendColor: '#333',
    legendBorder:'#e5e7eb',
    badgeBg:     'rgba(225,29,72,0.9)',
  },
  earth: {
    label:       'Earth',
    btnBg:       '#92400e',
    bg:          '#1c1410',
    waterBg:     '#131007',
    stroke:      '#3b2f1e',
    strokeWidth: 1.0,
    palette:     ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#92400e'],
    hoverFill:   '#d97706',
    labelColor:  '#fde68a',
    labelBg:     'rgba(28,20,16,0.92)',
    tooltipBg:   'rgba(28,20,16,0.97)',
    tooltipColor:'#fde68a',
    legendBg:    'rgba(28,20,16,0.88)',
    legendColor: '#fde68a',
    legendBorder:'#3b2f1e',
    badgeBg:     'rgba(146,64,14,0.9)',
  },
  ocean: {
    label:       'Ocean',
    btnBg:       '#0e7490',
    bg:          '#0c1a2e',
    waterBg:     '#071424',
    stroke:      '#1e3a5f',
    strokeWidth: 1.0,
    palette:     ['#cffafe', '#67e8f9', '#22d3ee', '#0891b2', '#164e63'],
    hoverFill:   '#0891b2',
    labelColor:  '#a5f3fc',
    labelBg:     'rgba(12,26,46,0.92)',
    tooltipBg:   'rgba(12,26,46,0.97)',
    tooltipColor:'#a5f3fc',
    legendBg:    'rgba(12,26,46,0.88)',
    legendColor: '#a5f3fc',
    legendBorder:'#1e3a5f',
    badgeBg:     'rgba(14,116,144,0.9)',
  },
};

// ── Colour helpers ─────────────────────────────────────────────────────────────

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

const formatVal = (v) =>
  typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v;

// ── Projection (react-simple-maps v3 / D3-geo Mercator) ───────────────────────
// rotate: brings BD longitude 90.35°E to the center meridian of the globe.
// center: [0, 23.69] — latitude offset (relative to rotated globe) — BD midpoint.
// scale:  5500 — at width=960 this makes Bangladesh ~450px wide (fills ~47% of SVG).
const PROJECTION_CONFIG = {
  rotate: [-90.35, 0, 0],
  center: [0, 23.69],
  scale:  5500,
};

// ── Component ─────────────────────────────────────────────────────────────────

const ChoroplethMapSVG = ({
  geojson,
  title        = 'Regional Analysis',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  const [activeTheme, setActiveTheme]   = useState('light');
  const [tooltip,     setTooltip]       = useState({ visible: false, x: 0, y: 0, html: '' });
  const [hoveredName, setHoveredName]   = useState(null);
  const [zoom,        setZoom]          = useState(1);

  const theme = THEMES[activeTheme];

  // Compute colour breaks from feature values
  const { breaks, min, max } = useMemo(() => {
    if (!geojson?.features) return { breaks: [], min: 0, max: 0 };
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    return {
      breaks: calculateQuantiles(vals, 5),
      min:    vals.length ? Math.min(...vals) : 0,
      max:    vals.length ? Math.max(...vals) : 0,
    };
  }, [geojson]);

  // Legend items
  const legendItems = useMemo(() => {
    if (!breaks.length || !theme) return [];
    const fmt = (v) => (typeof v === 'number' ? v.toFixed(1) : v);
    const items = [{ color: theme.palette[0], label: `${fmt(min)} – ${fmt(breaks[0])}` }];
    for (let i = 0; i < breaks.length - 1; i++) {
      items.push({ color: theme.palette[i + 1], label: `${fmt(breaks[i])} – ${fmt(breaks[i + 1])}` });
    }
    items.push({ color: theme.palette[theme.palette.length - 1], label: `${fmt(breaks[breaks.length - 1])} +` });
    return items;
  }, [breaks, min, theme]);

  const handleMouseEnter = (geo, event) => {
    const p      = geo.properties;
    const name   = p[nameProperty] || 'Unknown';
    const nameBn = showBangla && p.name_bn ? p.name_bn : null;
    const label  = nameBn ? `${nameBn} (${name})` : name;
    const value  = p.value ?? 0;

    setHoveredName(name);
    setTooltip({
      visible: true,
      x: event.clientX + 14,
      y: event.clientY - 36,
      html: `<strong style="font-size:13px;font-family:'Noto Serif Bengali',sans-serif;">${label}</strong>
             <br/><span style="font-family:sans-serif;font-size:11px;opacity:0.75;">${valueLabel}: </span>
             <strong style="font-family:sans-serif;font-size:12px;">${formatVal(value)}</strong>`,
    });
  };

  const handleMouseMove = (event) => {
    setTooltip((t) => ({ ...t, x: event.clientX + 14, y: event.clientY - 36 }));
  };

  const handleMouseLeave = () => {
    setHoveredName(null);
    setTooltip((t) => ({ ...t, visible: false }));
  };

  // Dark-background themes
  const isDark = ['dark', 'earth', 'ocean'].includes(activeTheme);

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
      border: `1px solid ${theme.legendBorder}`,
      borderRadius: 6, overflow: 'hidden',
      background: theme.bg,
    }}>

      {/* ── Theme switcher — top-right ──────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        display: 'flex', gap: 4,
      }}>
        {Object.entries(THEMES).map(([key, t]) => {
          const active = activeTheme === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              style={{
                padding:    '5px 11px',
                fontSize:   11,
                fontWeight: 600,
                border:     'none',
                borderRadius: 4,
                cursor:     'pointer',
                background: active
                  ? t.btnBg
                  : isDark
                    ? 'rgba(50,50,60,0.92)'
                    : 'rgba(255,255,255,0.92)',
                color: active
                  ? '#fff'
                  : isDark ? '#ccc' : '#333',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.22)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Zoom controls — top-left corner ────────────────────────── */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {[{ label: '+', delta: 0.5 }, { label: '−', delta: -0.5 }, { label: '⌂', reset: true }].map(({ label, delta, reset }) => (
          <button
            key={label}
            onClick={() => setZoom((z) => reset ? 1 : Math.max(0.8, Math.min(8, z + delta)))}
            style={{
              width: 28, height: 28,
              padding: 0, border: 'none',
              borderRadius: 4, cursor: 'pointer',
              fontSize: label === '⌂' ? 14 : 18,
              fontWeight: 600, lineHeight: 1,
              background: isDark ? 'rgba(50,50,60,0.92)' : 'rgba(255,255,255,0.92)',
              color: isDark ? '#ccc' : '#333',
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── SVG map (react-simple-maps) ─────────────────────────────── */}
      {/*
        width={960} height={600} sets the SVG viewBox dimensions so D3-geo
        can calculate the correct Mercator translate ([480, 300]).
        style={{ width:'100%', height:'100%' }} scales it responsively.
      */}
      <ComposableMap
        width={960}
        height={600}
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        style={{ width: '100%', height: '100%', background: theme.bg }}
      >
        <ZoomableGroup
          zoom={zoom}
          onMoveEnd={({ zoom: z }) => setZoom(z)}
          minZoom={0.8}
          maxZoom={8}
        >
          <Geographies geography={geojson}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const value   = geo.properties.value ?? 0;
                const isHover = hoveredName === geo.properties[nameProperty];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isHover ? theme.hoverFill : getColor(value, breaks, theme.palette)}
                    stroke={theme.stroke}
                    strokeWidth={theme.strokeWidth / zoom}
                    style={{
                      default:  { outline: 'none', transition: 'fill 0.15s' },
                      hover:    { outline: 'none', cursor: 'pointer', fill: theme.hoverFill },
                      pressed:  { outline: 'none', fill: theme.hoverFill },
                    }}
                    onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onRegionClick?.(geo.properties)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 32, left: 10, zIndex: 10,
          background: theme.legendBg,
          border: `1px solid ${theme.legendBorder}`,
          padding: '10px 12px',
          borderRadius: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: theme.legendColor, fontSize: 11 }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{
                width: 18, height: 13,
                background: item.color,
                border: `1px solid ${theme.legendBorder}`,
                flexShrink: 0,
                borderRadius: 2,
              }} />
              <span style={{ color: theme.legendColor, whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Library badge ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: theme.badgeBg, color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        SVG · react-simple-maps · {theme.label}
      </div>

      {/* ── Zoom level indicator ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 10, left: 46, zIndex: 10,
        fontSize: 10, color: theme.legendColor, opacity: 0.65,
      }}>
        Zoom {zoom.toFixed(1)}× · Drag to pan
      </div>

      {/* ── Floating tooltip ──────────────────────────────────────────── */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top:  tooltip.y,
            zIndex: 9999,
            pointerEvents: 'none',
            background: theme.tooltipBg,
            border: `1px solid ${theme.legendBorder}`,
            color: theme.tooltipColor,
            padding: '8px 12px',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            fontSize: 12,
            lineHeight: 1.6,
            maxWidth: 220,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
};

export default ChoroplethMapSVG;
