/**
 * ChoroplethMapGoogle
 *
 * Bangladesh choropleth map rendered using the Google Maps Platform.
 * Overlays a semi-transparent division/district fill layer on top of real
 * Google Maps tiles so roads, rivers, buildings and Bangla place-names
 * are fully visible at any zoom level.
 *
 * Map types supported: Road · Satellite · Hybrid · Terrain
 *
 * API key:  VITE_GOOGLE_MAPS_API_KEY in .env
 *           Get a free key → https://console.cloud.google.com/google/maps-apis
 *
 * Library: @react-google-maps/api  ^2.x
 * Install: yarn add @react-google-maps/api
 *
 * Props (same shared interface as other choropleth components):
 *   geojson        {object}   GeoJSON FeatureCollection; features.properties.value
 *   title          {string}   Title shown top-left
 *   height         {string}   CSS height of the container
 *   valueLabel     {string}   Metric name for legend & tooltip
 *   nameProperty   {string}   GeoJSON property key for English name (default 'NAME_1')
 *   onRegionClick  {function} (featureProperties) => void
 *   showBangla     {boolean}  Show name_bn in InfoWindow when available
 */

import React, {
  useEffect, useRef, useState, useMemo, useCallback,
} from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

// ── Constants ────────────────────────────────────────────────────────────────

const BANGLADESH_CENTER = { lat: 23.8103, lng: 90.4125 };

// Blue quantile palette — identical to the other choropleth components
const COLORS = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

const MAP_TYPE_OPTIONS = [
  { key: 'roadmap',   label: 'Road',      active: '#4285f4', hover: '#1a73e8' },
  { key: 'satellite', label: 'Satellite', active: '#0f9d58', hover: '#0b8043' },
  { key: 'hybrid',    label: 'Hybrid',    active: '#f4b400', hover: '#e09b00' },
  { key: 'terrain',   label: 'Terrain',   active: '#db4437', hover: '#c62828' },
];

// Static Google Map options — keep UX clean, rely on custom controls
// renderingType:'RASTER' forces the legacy Canvas 2D renderer so the map
// works in sandboxed / GPU-disabled environments that block WebGL.
const GMAP_OPTIONS = {
  mapTypeControl:       false,
  streetViewControl:    false,
  fullscreenControl:    true,
  zoomControl:          true,
  scaleControl:         true,
  rotateControl:        false,
  gestureHandling:      'cooperative',
  renderingType:        'RASTER',   // ← Canvas 2D fallback, no WebGL required
  restriction: {
    latLngBounds: {
      north: 26.65,
      south: 20.60,
      east:  92.70,
      west:  87.95,
    },
    strictBounds: false,
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

const getColor = (value, breaks) => {
  if (!breaks?.length) return COLORS[0];
  const i = breaks.findIndex((b) => value <= b);
  return i === -1 ? COLORS[COLORS.length - 1] : COLORS[i];
};

const fmt1 = (v) => (typeof v === 'number' ? v.toFixed(1) : String(v ?? ''));

// ── Main Component ───────────────────────────────────────────────────────────

const ChoroplethMapGoogle = ({
  geojson,
  title        = 'Regional Analysis',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  const [mapType,   setMapType]   = useState('roadmap');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [infoWin,   setInfoWin]   = useState({ visible: false, pos: null, html: '' });

  const mapRef       = useRef(null);
  const listenersRef = useRef([]);

  // ── API key ───────────────────────────────────────────────────────────────
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

  const { isLoaded, loadError } = useJsApiLoader({
    id:               'google-map-script',
    googleMapsApiKey: apiKey,
  });

  // ── Colour breaks ─────────────────────────────────────────────────────────
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
    const min = Math.min(...vals);
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

  // ── Map load callback ─────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapLoaded(true);
  }, []);

  // ── Sync data layer whenever map / geojson / breaks change ────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !geojson?.features?.length) return;
    const map = mapRef.current;

    // Remove stale event listeners
    listenersRef.current.forEach((l) =>
      window.google.maps.event.removeListener(l)
    );
    listenersRef.current = [];

    // Clear previous features from data layer
    map.data.forEach((f) => map.data.remove(f));

    // Load GeoJSON into the Data layer
    map.data.addGeoJson(geojson);

    // Choropleth fill colours
    map.data.setStyle((feature) => ({
      fillColor:   getColor(feature.getProperty('value') || 0, breaks),
      fillOpacity: 0.60,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      cursor:       'pointer',
    }));

    // ── Hover highlight ──
    const overL = map.data.addListener('mouseover', (e) => {
      map.data.overrideStyle(e.feature, {
        fillOpacity:  0.88,
        strokeWeight: 3,
        strokeColor:  '#1e3a5f',
      });
      const name   = e.feature.getProperty(nameProperty) || 'Unknown';
      const nameBn = showBangla ? (e.feature.getProperty('name_bn') || null) : null;
      const label  = nameBn || name;
      const value  = e.feature.getProperty('value') ?? 0;
      setInfoWin({
        visible: true,
        pos:     e.latLng,
        html: `
          <div style="font-family:sans-serif;padding:2px 4px;min-width:140px;">
            <strong style="font-size:13px;font-family:'Noto Serif Bengali',sans-serif;display:block;margin-bottom:4px;">
              ${label}
            </strong>
            <span style="color:#555;font-size:12px;">
              ${valueLabel}: <strong>${value}</strong>
            </span>
          </div>`,
      });
    });

    // ── Mouse out ──
    const outL = map.data.addListener('mouseout', () => {
      map.data.revertStyle();
      setInfoWin((s) => ({ ...s, visible: false }));
    });

    // ── Click — drill-down ──
    const clickL = map.data.addListener('click', (e) => {
      const props = {};
      e.feature.forEachProperty((val, key) => { props[key] = val; });
      onRegionClick?.(props);
    });

    listenersRef.current = [overL, outL, clickL];

    return () => {
      listenersRef.current.forEach((l) =>
        window.google.maps.event.removeListener(l)
      );
      listenersRef.current = [];
    };
  }, [mapLoaded, geojson, breaks, nameProperty, showBangla, valueLabel, onRegionClick]);

  // ── No API key — show setup instructions ─────────────────────────────────
  if (!apiKey) {
    return (
      <div style={{
        height, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        border: '1px solid #ffd591', borderRadius: 6, background: '#fffbe6',
        padding: 24,
      }}>
        <span style={{ fontSize: 40 }}>🔑</span>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#ad6800' }}>
          Google Maps API Key Required
        </div>
        <div style={{
          fontSize: 12, color: '#614700', textAlign: 'center',
          maxWidth: 480, lineHeight: 1.8,
        }}>
          Add your key to{' '}
          <code style={{ background: '#fff3c4', padding: '1px 5px', borderRadius: 3 }}>
            btrc-react-regional/.env
          </code>
          <br />
          <code style={{
            background: '#fff3c4', padding: '3px 8px',
            borderRadius: 3, fontSize: 11, display: 'inline-block', marginTop: 6,
          }}>
            VITE_GOOGLE_MAPS_API_KEY=AIzaSy…
          </code>
          <br /><br />
          Then restart Vite:&nbsp;
          <code style={{ background: '#fff3c4', padding: '1px 5px', borderRadius: 3 }}>
            docker compose restart react-regional
          </code>
          <br /><br />
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#1890ff' }}
          >
            Get a free key at Google Cloud Console →
          </a>
        </div>
      </div>
    );
  }

  // ── SDK load error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div style={{
        height, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        border: '1px solid #ffa39e', borderRadius: 6, background: '#fff2f0',
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#a8071a' }}>
          Failed to load Google Maps SDK
        </div>
        <div style={{ fontSize: 12, color: '#cf1322' }}>{loadError.message}</div>
        <div style={{ fontSize: 11, color: '#999' }}>
          Check your API key restrictions and browser console for details.
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #d9d9d9', borderRadius: 6, background: '#f5f5f5',
      }}>
        <span style={{ color: '#666', fontSize: 14 }}>Loading Google Maps SDK…</span>
      </div>
    );
  }

  // ── Map render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'relative', height,
      border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden',
    }}>

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          background: 'rgba(255,255,255,0.96)', padding: '6px 14px',
          borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
          fontWeight: 600, fontSize: 13, color: '#1f2937',
        }}>
          {title}
        </div>
      )}

      {/* Map type toggle buttons */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        display: 'flex', gap: 4,
      }}>
        {MAP_TYPE_OPTIONS.map((opt) => {
          const isActive = mapType === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setMapType(opt.key)}
              style={{
                padding: '5px 11px', fontSize: 11, fontWeight: 600,
                border: 'none', borderRadius: 4, cursor: 'pointer',
                background:  isActive ? opt.active : 'rgba(255,255,255,0.94)',
                color:       isActive ? '#fff' : '#333',
                boxShadow:   '0 1px 4px rgba(0,0,0,0.18)',
                transition:  'background 0.15s, color 0.15s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%' }}
        center={BANGLADESH_CENTER}
        zoom={7}
        mapTypeId={mapType}
        onLoad={onMapLoad}
        options={GMAP_OPTIONS}
      >
        {infoWin.visible && infoWin.pos && (
          <InfoWindow
            position={infoWin.pos}
            onCloseClick={() => setInfoWin((s) => ({ ...s, visible: false }))}
            options={{ disableAutoPan: true, pixelOffset: new window.google.maps.Size(0, -8) }}
          >
            <div dangerouslySetInnerHTML={{ __html: infoWin.html }} />
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Colour legend */}
      {legendItems.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 30, left: 10, zIndex: 10,
          background: 'rgba(255,255,255,0.96)', padding: '10px 12px',
          borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,0.14)', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#333', fontSize: 11 }}>
            {valueLabel}
          </div>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{
                width: 18, height: 13, background: item.color,
                border: '1px solid #ccc', flexShrink: 0,
              }} />
              <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Library badge */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(66,133,244,0.90)', color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        Google Maps · @react-google-maps/api
      </div>
    </div>
  );
};

export default ChoroplethMapGoogle;
