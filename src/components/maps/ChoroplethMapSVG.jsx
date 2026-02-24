/**
 * ChoroplethMapSVG
 *
 * Bangladesh choropleth map rendered as pure SVG using react-simple-maps.
 * No tile server, no API key, no canvas — just crisp vector polygons.
 * Ideal for print, export, and lightweight analytics dashboards.
 *
 * Library: react-simple-maps (D3-geo projections under the hood)
 * Tile layer: None — pure SVG vector rendering
 * API key: Not required
 * Bundle impact: ~50 KB gzipped
 *
 * Props:
 *   geojson       {object}   GeoJSON FeatureCollection. Each feature must have
 *                            properties.value (number) and optionally name_bn.
 *   title         {string}   Title shown above the map
 *   height        {string}   CSS height of the container
 *   valueLabel    {string}   Metric name shown in legend and tooltip
 *   nameProperty  {string}   GeoJSON property for the English region name
 *                            Default: 'NAME_1' (division GeoJSON)
 *   onRegionClick {function} Callback (featureProperties) => void
 *   showBangla    {boolean}  Prefer বাংলা names in tooltips/labels if available
 *   projectionConfig {object} Override { center, scale } for fine-tuning the
 *                            D3 Mercator projection. Default fits Bangladesh.
 */

import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

// Quantile colour scale (5 bins, blue palette — matches other map components)
const COLORS = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

const calculateQuantiles = (values, numBins = 5) => {
  if (!values?.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  return Array.from({ length: numBins - 1 }, (_, i) =>
    sorted[Math.floor((sorted.length * (i + 1)) / numBins)]
  );
};

const getColor = (value, breaks) => {
  if (!breaks?.length) return COLORS[0];
  const idx = breaks.findIndex((b) => value <= b);
  return idx === -1 ? COLORS[COLORS.length - 1] : COLORS[idx];
};

const formatVal = (v) =>
  typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v;

// Default projection: Mercator centred on Bangladesh
const DEFAULT_PROJECTION = { center: [90.4, 23.7], scale: 4800 };

const ChoroplethMapSVG = ({
  geojson,
  title = 'Regional Analysis',
  height = '500px',
  valueLabel = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla = true,
  projectionConfig = DEFAULT_PROJECTION,
}) => {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, html: '' });
  const [hoveredName, setHoveredName] = useState(null);

  // Compute colour breaks from feature values
  const { breaks, min, max } = useMemo(() => {
    if (!geojson?.features) return { breaks: [], min: 0, max: 0 };
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    return {
      breaks: calculateQuantiles(vals, 5),
      min:    Math.min(...vals),
      max:    Math.max(...vals),
    };
  }, [geojson]);

  const handleMouseEnter = (geo, event) => {
    const p      = geo.properties;
    const name   = p[nameProperty] || 'Unknown';
    const nameBn = showBangla && p.name_bn ? p.name_bn : null;
    const label  = nameBn ? `${nameBn}` : name;
    const value  = p.value ?? 0;

    setHoveredName(name);
    setTooltip({
      visible: true,
      x: event.clientX + 12,
      y: event.clientY - 28,
      html: `<strong style="font-size:13px;font-family:'Noto Serif Bengali',sans-serif;">${label}</strong>
             <br/><span style="color:#666;font-family:sans-serif;">${valueLabel}: <strong>${formatVal(value)}</strong></span>`,
    });
  };

  const handleMouseMove = (event) => {
    setTooltip((t) => ({ ...t, x: event.clientX + 12, y: event.clientY - 28 }));
  };

  const handleMouseLeave = () => {
    setHoveredName(null);
    setTooltip((t) => ({ ...t, visible: false }));
  };

  // Legend items
  const legendItems = useMemo(() => {
    if (!breaks.length) return [];
    const fmt = (v) => (typeof v === 'number' ? v.toFixed(1) : v);
    const items = [{ color: COLORS[0], label: `${fmt(min)} – ${fmt(breaks[0])}` }];
    for (let i = 0; i < breaks.length - 1; i++) {
      items.push({ color: COLORS[i + 1], label: `${fmt(breaks[i])} – ${fmt(breaks[i + 1])}` });
    }
    items.push({ color: COLORS[COLORS.length - 1], label: `${fmt(breaks[breaks.length - 1])} +` });
    return items;
  }, [breaks, min]);

  if (!geojson?.features?.length) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #d9d9d9', borderRadius: 4, background: '#f5f5f5',
      }}>
        <p style={{ color: '#999' }}>No geographic data available</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden', background: '#f8faff' }}>

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', padding: '6px 14px',
          borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
          fontWeight: 600, fontSize: 13, color: '#1f2937',
        }}>
          {title}
        </div>
      )}

      {/* Library badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        background: 'rgba(16,185,129,0.9)', color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        SVG · react-simple-maps
      </div>

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={projectionConfig}
        style={{ width: '100%', height: '100%' }}
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
                  fill={isHover ? '#2563eb' : getColor(value, breaks)}
                  stroke="#ffffff"
                  strokeWidth={0.8}
                  style={{
                    default:  { outline: 'none' },
                    hover:    { outline: 'none', cursor: 'pointer' },
                    pressed:  { outline: 'none' },
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
      </ComposableMap>

      {/* Legend */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 24, left: 10, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', padding: '10px 12px',
          borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#333', fontSize: 11 }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{ width: 18, height: 13, background: item.color, border: '1px solid #ccc', flexShrink: 0 }} />
              <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Floating tooltip — rendered via fixed portal-like positioning */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed', left: tooltip.x, top: tooltip.y,
            zIndex: 9999, pointerEvents: 'none',
            background: 'rgba(255,255,255,0.97)', padding: '8px 12px',
            borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            fontSize: 12, lineHeight: 1.6, maxWidth: 220,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      {/* Zoom hint */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        fontSize: 10, color: '#999',
      }}>
        Hover to inspect · Click to drill down
      </div>
    </div>
  );
};

export default ChoroplethMapSVG;
