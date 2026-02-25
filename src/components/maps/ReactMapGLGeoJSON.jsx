/**
 * ReactMapGLGeoJSON
 *
 * Bangladesh choropleth rendered with react-map-gl v8 + MapLibre GL JS
 * following the official react-map-gl GeoJSON example pattern:
 *   https://visgl.github.io/react-map-gl/examples/maplibre/geojson
 *
 * Pattern:
 *   • GeoJSON Source  → data prop receives a FeatureCollection
 *   • Fill Layer      → choropleth fill-color driven by a MapLibre
 *                        interpolate expression on `value` property
 *   • Line Layer      → white borders, blue on hover
 *   • onMouseMove     → hoverInfo state { feature, x, y }
 *   • Custom tooltip  → rendered as a fixed-position <div>
 *
 * Free tile styles (no API key):
 *   Light · Streets · Dark · Satellite · OSM
 *
 * Library: react-map-gl ^8.1 + maplibre-gl ^4.7
 */

import React, {
  useState, useMemo, useRef, useCallback,
} from 'react';
import Map, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import ChoroplethMapTiled from './ChoroplethMapTiled';

// ── WebGL probe ──────────────────────────────────────────────────────────────
const probeWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(
      c.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      c.getContext('webgl',  { failIfMajorPerformanceCaveat: false })
    );
  } catch { return false; }
};

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE_ID  = 'geojson-src';
const FILL_ID    = 'geojson-fill';
const LINE_ID    = 'geojson-line';
const HOVER_ID   = 'geojson-hover';

const BD_INITIAL = { longitude: 90.4125, latitude: 23.68, zoom: 6.5 };

// Warm YlOrRd palette — low (yellow) → high (dark red), matches official GeoJSON example
const COLOR_STOPS = [
  [0,   '#ffffb2'],
  [5,   '#fecc5c'],
  [10,  '#fd8d3c'],
  [20,  '#f03b20'],
  [35,  '#bd0026'],
];

// ── Free tile styles ─────────────────────────────────────────────────────────

const SATELLITE_SRC = {
  type: 'raster',
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
  tileSize: 256,
  attribution: 'Tiles &copy; Esri',
  maxzoom: 19,
};

const OSM_SRC = {
  type: 'raster',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  tileSize: 256,
  attribution: '&copy; OpenStreetMap contributors',
  maxzoom: 19,
};

const MAP_STYLES = {
  light: {
    label: 'Light',
    url:   'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    btnBg: '#4285f4',
    dark:  false,
  },
  streets: {
    label: 'Streets',
    url:   'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    btnBg: '#f4b400',
    dark:  false,
  },
  dark: {
    label: 'Dark',
    url:   'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    btnBg: '#555',
    dark:  true,
  },
  satellite: {
    label: 'Satellite',
    url: {
      version: 8,
      sources: { sat: SATELLITE_SRC },
      layers:  [{ id: 'sat', type: 'raster', source: 'sat' }],
    },
    btnBg: '#0f9d58',
    dark:  false,
  },
  osm: {
    label: 'OSM',
    url: {
      version: 8,
      sources: { osm: OSM_SRC },
      layers:  [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    btnBg: '#7cc850',
    dark:  false,
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

// Build inverted mask — world polygon with Bangladesh divisions cut as holes
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

// ── WebGL fallback ───────────────────────────────────────────────────────────

const WebGLFallback = ({ geojson, title, height, valueLabel, nameProperty, onRegionClick }) => (
  <div style={{ position: 'relative', height }}>
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
      </span>
    </div>
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

// ── Main Component ────────────────────────────────────────────────────────────

const ReactMapGLGeoJSON = ({
  geojson,
  title        = 'GeoJSON Layer',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  const [webglOK]     = useState(() => probeWebGL());
  const [activeStyle, setActiveStyle] = useState('light');
  const [hoverInfo,   setHoverInfo]   = useState(null); // { feature, x, y }
  const [cursor,      setCursor]      = useState('auto');

  const mapRef       = useRef(null);
  const hoveredIdRef = useRef(null);

  const style = MAP_STYLES[activeStyle];

  // ── Quantile colour breaks ──────────────────────────────────────────────
  const breaks = useMemo(() => {
    if (!geojson?.features) return [];
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    return calcQuantiles(vals);
  }, [geojson]);

  // ── Legend items (warm YlOrRd palette) ─────────────────────────────────
  const legendItems = useMemo(() => {
    if (!breaks.length || !geojson?.features) return [];
    const vals = geojson.features
      .map((f) => f.properties.value)
      .filter((v) => v != null && !isNaN(v));
    const WARM = ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];
    const min  = Math.min(...vals);
    const items = [{ color: WARM[0], label: `${fmt1(min)} – ${fmt1(breaks[0])}` }];
    for (let i = 0; i < breaks.length - 1; i++) {
      items.push({ color: WARM[i + 1], label: `${fmt1(breaks[i])} – ${fmt1(breaks[i + 1])}` });
    }
    items.push({ color: WARM[4], label: `${fmt1(breaks[breaks.length - 1])} +` });
    return items;
  }, [breaks, geojson]);

  // ── Inverted mask (world minus Bangladesh) ──────────────────────────────
  const maskGeoJSON = useMemo(() => buildMask(geojson), [geojson]);

  // ── Fill layer — MapLibre interpolate expression (warm YlOrRd) ─────────
  // Opacity fades as zoom increases so roads/labels show through at street level
  const fillLayer = useMemo(() => ({
    id:   FILL_ID,
    type: 'fill',
    paint: {
      'fill-color': breaks.length === 4
        ? [
            'interpolate', ['linear'], ['get', 'value'],
            breaks[0] * 0,  '#ffffb2',
            breaks[0],      '#fecc5c',
            breaks[1],      '#fd8d3c',
            breaks[2],      '#f03b20',
            breaks[3],      '#bd0026',
          ]
        : '#fd8d3c',
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.88,
        // Zoom-based fade: more transparent as you zoom in
        ['interpolate', ['linear'], ['zoom'],
          6,  0.65,  // full Bangladesh overview
          10, 0.40,  // district level
          14, 0.18,  // city/street level
        ],
      ],
    },
  }), [breaks]);

  // ── Hover highlight line layer ──────────────────────────────────────────
  const hoverLayer = useMemo(() => ({
    id:     HOVER_ID,
    type:   'line',
    filter: ['==', ['id'], hoveredIdRef.current ?? ''],
    paint:  { 'line-color': '#1e40af', 'line-width': 3 },
  }), []); // updated dynamically via setFeatureState

  // ── Default border line layer ───────────────────────────────────────────
  const lineLayer = {
    id:   LINE_ID,
    type: 'line',
    paint: {
      'line-color': '#ffffff',
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        3,
        1.2,
      ],
    },
  };

  // ── Style switch ────────────────────────────────────────────────────────
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
    setHoverInfo(null);
    setCursor('auto');
    setActiveStyle(key);
  }, []);

  // ── onMouseMove — official GeoJSON example pattern ──────────────────────
  // Follows: https://visgl.github.io/react-map-gl/examples/maplibre/geojson
  // Use event.features (interactiveLayerIds declared on <Map>) and
  // event.point for tooltip positioning.
  const onMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = e.features;

    if (features?.length > 0) {
      const feature = features[0];
      const fid     = feature.id;

      // Un-hover previous
      if (hoveredIdRef.current != null && hoveredIdRef.current !== fid) {
        try {
          map.setFeatureState(
            { source: SOURCE_ID, id: hoveredIdRef.current },
            { hover: false }
          );
        } catch (_) {}
      }

      // Hover current
      hoveredIdRef.current = fid;
      try {
        map.setFeatureState({ source: SOURCE_ID, id: fid }, { hover: true });
      } catch (_) {}

      const props  = feature.properties;
      const name   = props[nameProperty] || 'Unknown';
      const nameBn = showBangla && props.name_bn ? props.name_bn : null;

      setCursor('pointer');
      // Use event.point (pixel coordinates) for the tooltip overlay
      setHoverInfo({
        x:      e.point.x,
        y:      e.point.y,
        name:   nameBn || name,
        value:  props.value ?? 0,
        feature,
      });
    } else {
      // Off all features
      if (hoveredIdRef.current != null) {
        try {
          map.setFeatureState(
            { source: SOURCE_ID, id: hoveredIdRef.current },
            { hover: false }
          );
        } catch (_) {}
        hoveredIdRef.current = null;
      }
      setCursor('auto');
      setHoverInfo(null);
    }
  }, [nameProperty, showBangla]);

  const onMouseLeave = useCallback(() => {
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
    setCursor('auto');
    setHoverInfo(null);
  }, []);

  const onClick = useCallback((e) => {
    if (e.features?.length > 0) {
      onRegionClick?.(e.features[0].properties);
    }
  }, [onRegionClick]);

  // ── WebGL unavailable ───────────────────────────────────────────────────
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

  // ── Empty state ─────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'relative', height,
      border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden',
    }}>

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: style.dark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)',
          color: style.dark ? '#eee' : '#1f2937',
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
          const active = activeStyle === key;
          return (
            <button
              key={key}
              onClick={() => handleStyleChange(key)}
              style={{
                padding: '5px 11px', fontSize: 11, fontWeight: 600,
                border: 'none', borderRadius: 4, cursor: 'pointer',
                background: active ? s.btnBg : 'rgba(255,255,255,0.94)',
                color:      active ? '#fff' : '#333',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.20)',
                transition: 'background 0.15s',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* MapLibre Map — GeoJSON Source + Layers */}
      <Map
        ref={mapRef}
        initialViewState={BD_INITIAL}
        style={{ height: '100%', width: '100%' }}
        mapStyle={style.url}
        interactiveLayerIds={[FILL_ID]}
        cursor={cursor}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" style={{ marginBottom: 36 }} />
        <FullscreenControl position="top-right" style={{ marginTop: 44 }} />

        {/*
         * GeoJSON Source — official pattern:
         *   <Source id="..." type="geojson" data={geojson} promoteId={nameProperty}>
         *     <Layer {...fillLayer} />
         *     <Layer {...lineLayer} />
         *   </Source>
         */}
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={geojson}
          promoteId={nameProperty}
        >
          <Layer {...fillLayer} />
          <Layer {...lineLayer} />
        </Source>

        {/* Mask: dims everything outside Bangladesh divisions */}
        {maskGeoJSON && (
          <Source id="bd-mask-geojson" type="geojson" data={maskGeoJSON}>
            <Layer
              id="bd-mask-geojson-fill"
              type="fill"
              paint={{
                'fill-color':   style.dark ? '#050a14' : '#ddd8ce',
                'fill-opacity': 0.76,
              }}
            />
          </Source>
        )}
      </Map>

      {/*
       * Hover tooltip — official GeoJSON example renders a floating <div>
       * positioned at event.point (pixel coords) rather than a map Popup.
       * This avoids map re-projections and works reliably on raster styles.
       */}
      {hoverInfo && (
        <div style={{
          position:   'absolute',
          left:       hoverInfo.x + 12,
          top:        hoverInfo.y - 10,
          zIndex:     20,
          background: style.dark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.97)',
          color:      style.dark ? '#eee' : '#111',
          padding:    '8px 12px',
          borderRadius: 5,
          boxShadow:  '0 2px 8px rgba(0,0,0,0.22)',
          fontSize:   12,
          pointerEvents: 'none',
          minWidth:   130,
        }}>
          <div style={{
            fontWeight: 700,
            fontFamily: "'Noto Serif Bengali', sans-serif",
            fontSize:   13,
            marginBottom: 4,
          }}>
            {hoverInfo.name}
          </div>
          <div style={{ color: style.dark ? '#aaa' : '#555' }}>
            {valueLabel}:{' '}
            <strong style={{ color: style.dark ? '#fecc5c' : '#f03b20' }}>
              {hoverInfo.value}
            </strong>
          </div>
          <div style={{
            marginTop: 6, paddingTop: 5,
            borderTop: `1px solid ${style.dark ? '#333' : '#eee'}`,
            fontSize: 10,
            color: style.dark ? '#666' : '#bbb',
          }}>
            Click to drill down
          </div>
        </div>
      )}

      {/* Colour legend */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 36, left: 10, zIndex: 10,
          background: style.dark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)',
          padding: '10px 12px', borderRadius: 4,
          boxShadow: '0 1px 6px rgba(0,0,0,0.16)', fontSize: 11,
        }}>
          <div style={{
            fontWeight: 700, marginBottom: 6, fontSize: 11,
            color: style.dark ? '#ddd' : '#333',
          }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{
                width: 18, height: 13,
                background: item.color,
                border: '1px solid #ccc', flexShrink: 0,
              }} />
              <span style={{ color: style.dark ? '#ccc' : '#555', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Library badge */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(240,59,32,0.88)', color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        react-map-gl · GeoJSON Layer
      </div>
    </div>
  );
};

export default ReactMapGLGeoJSON;
