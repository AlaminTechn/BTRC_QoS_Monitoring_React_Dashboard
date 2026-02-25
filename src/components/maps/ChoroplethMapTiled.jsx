/**
 * Choropleth Map Component - Real Map Tiles Version
 *
 * Based on ChoroplethMap.jsx (Metabase style, no tiles).
 * This version adds a CartoDB tile background so roads, rivers,
 * city labels and buildings are visible underneath the choropleth.
 *
 * Differences from ChoroplethMap.jsx:
 *  - Adds <TileLayer> (CartoDB Positron by default)
 *  - fillOpacity reduced 0.85 → 0.65  (tiles show through)
 *  - border stroke semi-transparent    (roads visible at edges)
 *  - attributionControl enabled        (CartoDB ToS requires it)
 *  - tileStyle prop: switch tile theme without changing anything else
 *
 * All other logic (quantile breaks, colour scale, tooltips,
 * legend, drill-down, FitBounds) is IDENTICAL to ChoroplethMap.jsx.
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// =============================================================================
// Tile provider configurations
// =============================================================================
const TILE_PROVIDERS = {
  // Light grey — best contrast for blue choropleth, shows BD roads clearly
  'cartodb-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  // Coloured streets — closest to Google Maps look
  'cartodb-voyager': {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  // Dark background — good for night-mode dashboards
  'cartodb-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  // OpenStreetMap standard — full detail, Bangla labels at higher zoom
  'osm': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

// =============================================================================
// Bangladesh geographic bounds
// Actual extent: 20.67°N–26.63°N, 88.01°E–92.67°E
// Padded slightly so borders aren't clipped at the edges
// =============================================================================
const BANGLADESH_BOUNDS = [
  [20.0, 87.5],  // SW corner  (south of Cox's Bazar, west of Rajshahi)
  [27.0, 93.2],  // NE corner  (north of Sylhet, east of Chittagong Hill Tracts)
];

// Choropleth fill opacity per tile theme
// Kept low so roads, canals and labels show clearly through the fill
const FILL_OPACITY_BY_THEME = {
  'cartodb-light':   0.38,
  'cartodb-voyager': 0.35,
  'cartodb-dark':    0.50,
  'osm':             0.35,
};

// =============================================================================
// Sub-components  (identical to ChoroplethMap.jsx)
// =============================================================================

const FitBounds = ({ geojson }) => {
  const map = useMap();
  useEffect(() => {
    if (geojson && geojson.features) {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        // maxZoom:12 — allows road/canal level detail when drilling into a division
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    }
  }, [geojson, map]);
  return null;
};

/**
 * Tells Leaflet to recalculate tile coverage after the container resizes.
 * Must live inside <MapContainer> to access the map instance via useMap().
 */
const ResizeHandler = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    // Small delay so the DOM finishes the CSS transition before invalidating
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const calculateQuantiles = (values, numBins = 5) => {
  if (!values || values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const breaks = [];
  for (let i = 1; i < numBins; i++) {
    const index = Math.floor((sorted.length * i) / numBins);
    breaks.push(sorted[index]);
  }
  return breaks;
};

const getColorForValue = (value, breaks) => {
  if (!breaks || breaks.length === 0) return '#93c5fd';
  const colors = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];
  if (value <= breaks[0]) return colors[0];
  if (value <= breaks[1]) return colors[1];
  if (value <= breaks[2]) return colors[2];
  if (value <= breaks[3]) return colors[3];
  return colors[4];
};

const formatRangeLabel = (min, max, isLast = false) => {
  const minVal = typeof min === 'number' ? min : parseFloat(min) || 0;
  const maxVal = typeof max === 'number' ? max : parseFloat(max) || 0;
  if (isLast) return `${minVal.toFixed(2)} +`;
  return `${minVal.toFixed(2)} - ${maxVal.toFixed(2)}`;
};

/**
 * Build an inverted-mask GeoJSON Feature:
 *   outer ring = entire world rectangle
 *   holes      = each division / district polygon from the choropleth data
 *
 * Result: a single polygon that is "everything EXCEPT Bangladesh".
 * Rendered with a solid fill it covers India, Myanmar, Bay of Bengal, etc.
 * while leaving Bangladesh's exact outline fully transparent so the
 * tile layer shows through underneath the choropleth colours.
 */
const createWorldMask = (geojson) => {
  if (!geojson?.features?.length) return null;

  // Outer ring covers the whole world — GeoJSON uses [lng, lat] order
  const worldRing = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
  ];

  // Collect the exterior ring of every polygon in the choropleth GeoJSON
  const holes = [];
  geojson.features.forEach(({ geometry }) => {
    if (!geometry) return;
    if (geometry.type === 'Polygon') {
      holes.push(geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((poly) => holes.push(poly[0]));
    }
  });

  if (!holes.length) return null;

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [worldRing, ...holes] },
    properties: {},
  };
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChoroplethMapTiled
 *
 * @param {object}   geojson        - GeoJSON FeatureCollection with properties.value
 * @param {string}   title          - Map title shown top-left
 * @param {function} onRegionClick  - Drill-down callback (feature) => {}
 * @param {string}   height         - CSS height of the map container
 * @param {string}   valueLabel     - Metric label shown in legend & tooltip
 * @param {string}   tileStyle      - Tile theme: 'cartodb-light' | 'cartodb-voyager' |
 *                                    'cartodb-dark' | 'osm'  (default: 'cartodb-light')
 */
const ChoroplethMapTiled = ({
  geojson,
  title = 'Regional Analysis',
  onRegionClick,
  height = '500px',
  valueLabel = 'Value',
  tileStyle = 'cartodb-light',
  minZoom = 6,
  maxBoundsViscosity = 1.0,
}) => {
  const [mapKey, setMapKey]                 = useState(0);
  const [quantileBreaks, setQuantileBreaks] = useState([]);
  const [valueRange, setValueRange]         = useState({ min: 0, max: 100 });
  const [isFullscreen, setIsFullscreen]     = useState(false);

  const tileConfig  = TILE_PROVIDERS[tileStyle] || TILE_PROVIDERS['cartodb-light'];
  const fillOpacity = FILL_OPACITY_BY_THEME[tileStyle] ?? 0.65;

  // Inverted mask — recomputed only when the GeoJSON data changes
  const worldMask = React.useMemo(() => createWorldMask(geojson), [geojson]);

  // Escape key exits fullscreen; lock body scroll while fullscreen is active
  useEffect(() => {
    if (!isFullscreen) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  // ── Recalculate breaks when data changes ──────────────────────────────────
  useEffect(() => {
    if (geojson && geojson.features) {
      const values = geojson.features
        .map(f => f.properties.value)
        .filter(v => v !== null && v !== undefined && !isNaN(v));

      if (values.length > 0) {
        setQuantileBreaks(calculateQuantiles(values, 5));
        setValueRange({ min: Math.min(...values), max: Math.max(...values) });
      } else {
        setQuantileBreaks([0, 0, 0, 0]);
        setValueRange({ min: 0, max: 0 });
      }
    }
  }, [geojson]);

  // Force map re-mount when data changes so GeoJSON re-renders cleanly
  useEffect(() => { setMapKey(prev => prev + 1); }, [geojson]);

  // ── GeoJSON style ─────────────────────────────────────────────────────────
  const style = (feature) => {
    const value = feature.properties.value || 0;
    return {
      fillColor:   getColorForValue(value, quantileBreaks),
      weight:      1.5,
      opacity:     1,
      color:       'rgba(255, 255, 255, 0.80)', // semi-transparent white — tile roads visible at edges
      fillOpacity: fillOpacity,                 // let tiles show through
    };
  };

  const highlightFeature = (e) => {
    e.target.setStyle({ weight: 3, color: '#1f2937', fillOpacity: Math.min(fillOpacity + 0.2, 0.9) });
    e.target.bringToFront();
  };

  const resetHighlight = (e) => { e.target.setStyle(style(e.target.feature)); };

  const onFeatureClick = (feature) => {
    if (onRegionClick) onRegionClick(feature);
  };

  // ── Tooltip & event binding ───────────────────────────────────────────────
  const onEachFeature = (feature, layer) => {
    const name = feature.properties.shapeName
      || feature.properties.NAME_1
      || feature.properties.name
      || 'Unknown';
    const value    = feature.properties.value ?? 0;
    const rowData  = feature.properties.rowData;
    const displayValue = typeof value === 'number'
      ? (Number.isInteger(value) ? value.toString() : value.toFixed(2))
      : value;

    let tooltipContent;
    if (rowData && Array.isArray(rowData) && rowData.length >= 8) {
      tooltipContent = `
        <div style="padding:10px;font-family:sans-serif;min-width:200px;">
          <strong style="font-size:14px;display:block;margin-bottom:8px;">${name}</strong>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">Division:</td>
              <td style="font-weight:600;padding:2px 0;">${rowData[0]}</td>
            </tr>
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">Avg Download:</td>
              <td style="font-weight:600;padding:2px 0;">${typeof rowData[2]==='number'?rowData[2].toFixed(2):rowData[2]} Mbps</td>
            </tr>
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">Avg Upload:</td>
              <td style="font-weight:600;padding:2px 0;">${typeof rowData[3]==='number'?rowData[3].toFixed(2):rowData[3]} Mbps</td>
            </tr>
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">Avg Latency:</td>
              <td style="font-weight:600;padding:2px 0;">${typeof rowData[4]==='number'?rowData[4].toFixed(2):rowData[4]} ms</td>
            </tr>
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">Availability:</td>
              <td style="font-weight:600;padding:2px 0;">${typeof rowData[5]==='number'?rowData[5].toFixed(2):rowData[5]}%</td>
            </tr>
            <tr>
              <td style="color:#666;padding:2px 8px 2px 0;">PoP Count:</td>
              <td style="font-weight:600;padding:2px 0;">${rowData[7]||0}</td>
            </tr>
          </table>
        </div>`;
    } else {
      tooltipContent = `
        <div style="padding:8px;font-family:sans-serif;">
          <strong style="font-size:14px;">${name}</strong><br/>
          <span style="color:#666;">${valueLabel}: <strong>${displayValue}</strong></span>
        </div>`;
    }

    layer.bindTooltip(tooltipContent, {
      permanent:  false,
      direction:  'auto',
      className:  'custom-tooltip',
      opacity:    0.95,
    });

    layer.on({
      mouseover: highlightFeature,
      mouseout:  resetHighlight,
      click:     () => onFeatureClick(feature),
    });
  };

  // ── Legend ────────────────────────────────────────────────────────────────
  const legendItems = React.useMemo(() => {
    if (quantileBreaks.length === 0) return [];
    const colors = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];
    const items  = [];
    items.push({ color: colors[0], label: formatRangeLabel(valueRange.min, quantileBreaks[0]) });
    for (let i = 0; i < quantileBreaks.length - 1; i++) {
      items.push({ color: colors[i + 1], label: formatRangeLabel(quantileBreaks[i], quantileBreaks[i + 1]) });
    }
    items.push({ color: colors[colors.length - 1], label: formatRangeLabel(quantileBreaks[quantileBreaks.length - 1], valueRange.max, true) });
    return items;
  }, [quantileBreaks, valueRange]);

  // ── Tile style selector labels ─────────────────────────────────────────────
  const STYLE_LABELS = {
    'cartodb-light':   'Light',
    'cartodb-voyager': 'Street',
    'cartodb-dark':    'Dark',
    'osm':             'OSM',
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return (
      <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #d9d9d9', borderRadius:'4px', background:'#f5f5f5' }}>
        <div style={{ textAlign:'center', color:'#999' }}>
          <p>No geographic data available</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const containerStyle = isFullscreen
    ? {
        position:     'fixed',
        top:          0,
        left:         0,
        width:        '100vw',
        height:       '100vh',
        zIndex:       9999,
        borderRadius: 0,
        border:       'none',
        overflow:     'hidden',
      }
    : {
        position:     'relative',
        height,
        border:       '1px solid #d9d9d9',
        borderRadius: '4px',
        overflow:     'hidden',
      };

  return (
    <div style={containerStyle}>

      {/* Title */}
      {title && (
        <div style={{
          position:'absolute', top:10, left:10, zIndex:1000,
          background:'rgba(255,255,255,0.95)', padding:'8px 16px',
          borderRadius:'4px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
          fontWeight:'600', fontSize:'14px',
        }}>
          {title}
        </div>
      )}

      {/* Top-right controls: style badge + expand/minimize button */}
      <div style={{
        position:'absolute', top:10, right:10, zIndex:1001,
        display:'flex', gap:6, alignItems:'center',
      }}>
        {/* Tile style + drill-down hint badge */}
        <div style={{
          background:'rgba(59,130,246,0.9)', color:'white',
          padding:'4px 10px', borderRadius:'4px', fontSize:'11px', fontWeight:'500',
          display:'flex', gap:'6px', alignItems:'center',
        }}>
          <span>{STYLE_LABELS[tileStyle] ?? tileStyle} Map</span>
          <span style={{ opacity:0.6 }}>· Click to drill-down</span>
        </div>

        {/* Expand / Minimize button */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Minimize  (Esc)' : 'Expand to full screen'}
          style={{
            background:   'rgba(255,255,255,0.95)',
            border:       '1px solid #d1d5db',
            borderRadius: '6px',
            padding:      '5px 9px',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          5,
            fontSize:     11,
            fontWeight:   600,
            color:        '#374151',
            boxShadow:    '0 1px 4px rgba(0,0,0,0.15)',
            lineHeight:   1,
            userSelect:   'none',
          }}
        >
          {isFullscreen ? (
            <>
              {/* Minimize icon — arrows pointing inward */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 5h4V1M12 5H8V1M1 8h4v4M12 8H8v4" />
              </svg>
              Minimize
            </>
          ) : (
            <>
              {/* Expand icon — arrows pointing outward */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 1H1v4M8 1h4v4M5 12H1V8M8 12h4V8" />
              </svg>
              Full Screen
            </>
          )}
        </button>
      </div>

      <MapContainer
        key={mapKey}
        center={[23.8103, 90.4125]}   // Centre of Bangladesh
        zoom={7}
        minZoom={minZoom}
        maxZoom={19}                   // Street/building level zoom
        maxBounds={BANGLADESH_BOUNDS}  // Panning locked to BD bounding box
        maxBoundsViscosity={maxBoundsViscosity}
        style={{ height:'100%', width:'100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}      // Required by CartoDB ToS
      >
        {/* ── Recalculate tiles after fullscreen resize ── */}
        <ResizeHandler trigger={isFullscreen} />

        {/* ── Base tile layer — restricted to BD bounds for performance ── */}
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
          bounds={BANGLADESH_BOUNDS}
        />

        {/* ── World mask — covers everything outside Bangladesh ── */}
        {worldMask && (
          <GeoJSON
            key={`mask-${mapKey}`}
            data={worldMask}
            style={{
              fillColor:   '#f0f2f5',  // Ant Design layout background — blends with page
              fillOpacity: 1,          // Fully opaque — no tiles bleed through outside BD
              weight:      0,          // No border on the mask itself
              stroke:      false,
            }}
            interactive={false}        // Mask is not clickable
          />
        )}

        {/* ── Choropleth overlay ── */}
        {geojson && (
          <>
            <GeoJSON
              data={geojson}
              style={style}
              onEachFeature={onEachFeature}
            />
            <FitBounds geojson={geojson} />
          </>
        )}
      </MapContainer>

      {/* Legend */}
      {legendItems.length > 0 && (
        <div style={{
          position:'absolute', bottom:30, left:10, zIndex:1000,
          background:'rgba(255,255,255,0.95)', padding:'12px',
          borderRadius:'4px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', fontSize:'11px',
        }}>
          <div style={{ fontWeight:'bold', marginBottom:'8px', fontSize:'12px', color:'#333' }}>
            {valueLabel}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {legendItems.map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:20, height:15, background:item.color, border:'1px solid #ccc', flexShrink:0 }} />
                <span style={{ color:'#666', fontSize:'11px', whiteSpace:'nowrap' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoroplethMapTiled;
