/**
 * ReactMapGLCluster
 *
 * Bangladesh ISP violation points rendered as MapLibre GL clusters,
 * following the official react-map-gl cluster example exactly:
 *   https://visgl.github.io/react-map-gl/examples/maplibre/clusters
 *
 * Official pattern:
 *   • <Source cluster={true} clusterMaxZoom={14} clusterRadius={50}>
 *   • clusterLayer        — circle, filter: ['has','point_count'], step-colored
 *   • clusterCountLayer   — symbol, text-field: '{point_count_abbreviated}'
 *   • unclusteredPointLayer — circle, filter: ['!',['has','point_count']]
 *   • onClick             — getClusterExpansionZoom → easeTo() to drill in
 *
 * Data:
 *   Converts division polygon GeoJSON (properties.value = violation count)
 *   into individual violation Point features scattered inside each division's
 *   bounding box using deterministic seeded pseudo-random (stable across renders).
 *
 * Cluster colour scheme (matches screenshot):
 *   cyan  #51bbd6  — small   (< 10 points)
 *   yellow #f1f075 — medium  (< 30 points)
 *   pink  #f28cb1  — large   (≥ 30 points)
 *
 * Library: react-map-gl ^8.1 + maplibre-gl ^4.7  (no API key required)
 */

import React, {
  useState, useMemo, useRef, useCallback,
} from 'react';
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

const SOURCE_ID          = 'violations-cluster-src';
const CLUSTER_LAYER_ID   = 'clusters';
const COUNT_LAYER_ID     = 'cluster-count';
const POINT_LAYER_ID     = 'unclustered-point';

const BD_INITIAL = { longitude: 90.35, latitude: 23.68, zoom: 6.8 };

// ── Map styles (dark default) ────────────────────────────────────────────────

// ── All styles use inline raster sources (no CDN JSON fetch required) ────────
// Vector GL style URLs (CARTO CDN) can silently fail in Docker / sandboxed
// environments.  Raster tile sources are self-contained objects that always
// resolve the same way as the working Satellite style.

const mkRasterStyle = (tiles, attribution) => ({
  version: 8,
  sources: { base: { type: 'raster', tiles, tileSize: 256, attribution, maxzoom: 19 } },
  layers:  [{ id: 'base-tiles', type: 'raster', source: 'base' }],
});

const MAP_STYLES = {
  dark: {
    label: 'Dark',
    url: mkRasterStyle(
      [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
    ),
    btnBg: '#444',
    dark:  true,
  },
  streets: {
    label: 'Streets',
    url: mkRasterStyle(
      [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
    ),
    btnBg: '#f4b400',
    dark:  false,
  },
  light: {
    label: 'Light',
    url: mkRasterStyle(
      [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
    ),
    btnBg: '#4285f4',
    dark:  false,
  },
  osm: {
    label: 'OSM',
    url: mkRasterStyle(
      ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    ),
    btnBg: '#7cc850',
    dark:  false,
  },
  satellite: {
    label: 'Satellite',
    url: mkRasterStyle(
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'Tiles &copy; Esri'
    ),
    btnBg: '#0f9d58',
    dark:  false,
  },
};

// ── MapLibre layer definitions (official pattern from layers.ts) ─────────────

// Cluster circles — step expression: cyan < 10, yellow < 30, pink ≥ 30
const CLUSTER_LAYER = {
  id:     CLUSTER_LAYER_ID,
  type:   'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#51bbd6',   // cyan   — < 10
      10, '#f1f075', // yellow — < 30
      30, '#f28cb1', // pink   — ≥ 30
    ],
    'circle-radius': [
      'step', ['get', 'point_count'],
      18,       // < 10
      10, 28,   // < 30
      30, 38,   // ≥ 30
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': 'rgba(255,255,255,0.25)',
    'circle-opacity': 0.92,
  },
};

// Count label inside cluster circle
const COUNT_LAYER = {
  id:     COUNT_LAYER_ID,
  type:   'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field':      '{point_count_abbreviated}',
    'text-size':       13,
    'text-font':       ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#111',
  },
};

// Individual (unclustered) violation points
const POINT_LAYER = {
  id:     POINT_LAYER_ID,
  type:   'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color':        '#11b4da',
    'circle-radius':        5,
    'circle-stroke-width':  1,
    'circle-stroke-color': '#fff',
    'circle-opacity':       0.90,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Deterministic seeded pseudo-random (stable across React renders)
const seededRand = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const ISP_TYPES  = ['Broadband', 'Mobile', 'Enterprise', 'Regional'];

/**
 * Convert division polygon GeoJSON → individual violation Point features.
 * Each feature with properties.value = N produces N random points spread
 * within the feature's bounding box (stable, deterministic seeding).
 */
const buildViolationPoints = (geojson, nameProperty) => {
  if (!geojson?.features) return { type: 'FeatureCollection', features: [] };

  const points = [];

  geojson.features.forEach((feature, fi) => {
    const count = Math.round(feature.properties.value || 0);
    if (count === 0) return;

    const name = feature.properties[nameProperty] || `Region ${fi}`;

    // Flatten all coordinates to compute bbox
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    const scanCoords = (arr, depth = 0) => {
      if (depth === 2) {
        const [lng, lat] = arr;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      } else {
        arr.forEach((a) => scanCoords(a, depth + 1));
      }
    };
    scanCoords(feature.geometry.coordinates);

    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;

    for (let i = 0; i < count; i++) {
      const seed1 = fi * 1000 + i * 2;
      const seed2 = fi * 1000 + i * 2 + 1;

      points.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            minLng + seededRand(seed1) * lngSpan,
            minLat + seededRand(seed2) * latSpan,
          ],
        },
        properties: {
          division: name,
          severity: SEVERITIES[Math.floor(seededRand(fi * 100 + i) * 4)],
          isp_type: ISP_TYPES[Math.floor(seededRand(fi * 200 + i) * 4)],
          id:       fi * 1000 + i,
        },
      });
    }
  });

  return { type: 'FeatureCollection', features: points };
};

// ── WebGL fallback ────────────────────────────────────────────────────────────

const WebGLFallback = ({ geojson, title, height, valueLabel, nameProperty, onRegionClick }) => (
  <div style={{ position: 'relative', height }}>
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      background: '#fff7e6', borderBottom: '1px solid #ffd591',
      padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
    }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span style={{ color: '#874d00' }}>
        <strong>WebGL unavailable</strong> — Cluster map requires GPU acceleration.
        Showing Leaflet fallback.
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

const ReactMapGLCluster = ({
  geojson,
  title        = 'Violation Clusters',
  height       = '500px',
  valueLabel   = 'Violations',
  nameProperty = 'NAME_1',
  onRegionClick,
}) => {
  const [webglOK]     = useState(() => probeWebGL());
  const [activeStyle, setActiveStyle] = useState('dark');
  const [popup,       setPopup]       = useState(null); // { lng, lat, props }
  const [cursor,      setCursor]      = useState('auto');

  const mapRef = useRef(null);

  const style = MAP_STYLES[activeStyle];

  // Convert polygons → violation points (memoized)
  const pointsGeoJSON = useMemo(
    () => buildViolationPoints(geojson, nameProperty),
    [geojson, nameProperty]
  );

  // Inverted mask — world minus Bangladesh divisions
  const maskGeoJSON = useMemo(() => buildMask(geojson), [geojson]);

  const totalViolations = pointsGeoJSON.features.length;

  // ── onClick — official cluster drill-down pattern ─────────────────────────
  const onClick = useCallback(async (e) => {
    const feature = e.features?.[0];
    if (!feature) {
      setPopup(null);
      return;
    }

    if (feature.properties.cluster_id !== undefined) {
      // ── Cluster: zoom in to expand ────────────────────────────────────────
      // Official pattern: getSource().getClusterExpansionZoom() → easeTo()
      const clusterId   = feature.properties.cluster_id;
      const mapInstance = mapRef.current?.getMap();
      if (!mapInstance) return;

      try {
        const source = mapInstance.getSource(SOURCE_ID);
        const zoom   = await source.getClusterExpansionZoom(clusterId);
        mapRef.current.easeTo({
          center:   feature.geometry.coordinates,
          zoom,
          duration: 500,
        });
      } catch (_) {}

    } else {
      // ── Individual point: show popup ──────────────────────────────────────
      setPopup({
        lng:   feature.geometry.coordinates[0],
        lat:   feature.geometry.coordinates[1],
        props: feature.properties,
      });
      onRegionClick?.(feature.properties);
    }
  }, [onRegionClick]);

  const onMouseMove = useCallback((e) => {
    setCursor(e.features?.length > 0 ? 'pointer' : 'auto');
  }, []);

  const onMouseLeave = useCallback(() => setCursor('auto'), []);

  // ── WebGL unavailable ─────────────────────────────────────────────────────
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
  const dark = style.dark;

  return (
    <div style={{
      position: 'relative', height,
      border: '1px solid #333', borderRadius: 6, overflow: 'hidden',
      background: dark ? '#1a1a1a' : '#f0f2f5',
    }}>

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: dark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)',
          color: dark ? '#eee' : '#1f2937',
          padding: '6px 14px', borderRadius: 4,
          boxShadow: '0 1px 6px rgba(0,0,0,0.30)',
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
              onClick={() => { setActiveStyle(key); setPopup(null); }}
              style={{
                padding: '5px 11px', fontSize: 11, fontWeight: 600,
                border: 'none', borderRadius: 4, cursor: 'pointer',
                background: active ? s.btnBg : (dark ? 'rgba(50,50,50,0.94)' : 'rgba(255,255,255,0.94)'),
                color:      active ? '#fff' : (dark ? '#ccc' : '#333'),
                boxShadow:  '0 1px 4px rgba(0,0,0,0.35)',
                transition: 'background 0.15s',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* MapLibre Map — official cluster pattern */}
      <Map
        ref={mapRef}
        initialViewState={BD_INITIAL}
        style={{ height: '100%', width: '100%' }}
        mapStyle={style.url}
        interactiveLayerIds={[CLUSTER_LAYER_ID, POINT_LAYER_ID]}
        cursor={cursor}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" style={{ marginBottom: 36 }} />
        <FullscreenControl position="top-right" style={{ marginTop: 44 }} />

        {/*
         * GeoJSON Source with cluster=true
         * Official pattern from react-map-gl examples/maplibre/clusters
         */}
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={pointsGeoJSON}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {/* 1. Cluster circles — step-coloured by point_count */}
          <Layer {...CLUSTER_LAYER} />

          {/* 2. Count label inside each cluster */}
          <Layer {...COUNT_LAYER} />

          {/* 3. Individual unclustered violation points */}
          <Layer {...POINT_LAYER} />
        </Source>

        {/* Mask: dims everything outside Bangladesh divisions */}
        {maskGeoJSON && (
          <Source id="bd-mask-cluster" type="geojson" data={maskGeoJSON}>
            <Layer
              id="bd-mask-cluster-fill"
              type="fill"
              paint={{
                'fill-color':   dark ? '#050a14' : '#d4d0c8',
                'fill-opacity': 0.80,
              }}
            />
          </Source>
        )}

        {/* Popup for individual violation point */}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            offset={10}
            onClose={() => setPopup(null)}
          >
            <div style={{
              fontFamily: 'sans-serif',
              padding: '4px 2px',
              minWidth: 150,
            }}>
              <div style={{
                fontWeight: 700, fontSize: 13, marginBottom: 6,
                borderBottom: '1px solid #eee', paddingBottom: 5,
                color: '#111',
              }}>
                📍 {popup.props.division}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: '#333' }}>
                <div>
                  <span style={{ color: '#888' }}>Severity:</span>{' '}
                  <strong style={{
                    color: popup.props.severity === 'Critical' ? '#cf1322'
                         : popup.props.severity === 'High'     ? '#d46b08'
                         : popup.props.severity === 'Medium'   ? '#d48806'
                         :                                        '#389e0d',
                  }}>
                    {popup.props.severity}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#888' }}>ISP Type:</span>{' '}
                  {popup.props.isp_type}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Cluster legend */}
      <div style={{
        position: 'absolute', bottom: 36, left: 10, zIndex: 10,
        background: dark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.96)',
        padding: '10px 12px', borderRadius: 4,
        boxShadow: '0 1px 6px rgba(0,0,0,0.30)', fontSize: 11,
      }}>
        <div style={{
          fontWeight: 700, marginBottom: 8, fontSize: 11,
          color: dark ? '#ddd' : '#333',
        }}>
          {valueLabel} ({totalViolations} total)
        </div>

        {[
          { color: '#51bbd6', label: 'Small cluster  (< 10)',  size: 14 },
          { color: '#f1f075', label: 'Medium cluster (10–29)', size: 18 },
          { color: '#f28cb1', label: 'Large cluster  (≥ 30)',  size: 22 },
          { color: '#11b4da', label: 'Single violation',       size: 8, border: '1px solid #fff' },
        ].map((item) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5,
          }}>
            <div style={{
              width:        item.size,
              height:       item.size,
              borderRadius: '50%',
              background:   item.color,
              border:       item.border ?? '2px solid rgba(255,255,255,0.25)',
              flexShrink:   0,
            }} />
            <span style={{ color: dark ? '#ccc' : '#555', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </div>
        ))}

        <div style={{
          marginTop: 8, paddingTop: 6,
          borderTop: `1px solid ${dark ? '#333' : '#eee'}`,
          fontSize: 10, color: dark ? '#666' : '#aaa',
        }}>
          Click cluster to zoom in
        </div>
      </div>

      {/* Library badge */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(81,187,214,0.88)', color: '#111',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      }}>
        react-map-gl · Cluster Layer
      </div>
    </div>
  );
};

export default ReactMapGLCluster;
