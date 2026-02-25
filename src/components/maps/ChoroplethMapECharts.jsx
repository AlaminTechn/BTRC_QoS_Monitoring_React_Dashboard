/**
 * ChoroplethMapECharts
 *
 * Bangladesh choropleth rendered with Apache ECharts.
 * Supports 5 rich visual themes — each with a distinct colour palette,
 * background and label style — and a style-switcher matching the
 * react-map-gl / Leaflet tab UI pattern.
 *
 * Themes:
 *   Light    — clean white, blue sequential   (default)
 *   Dark     — deep navy, green sequential
 *   Colorful — light grey, warm-to-cool spectrum
 *   Earth    — dark earth, amber/orange palette
 *   Ocean    — deep sea, cyan/teal palette
 *
 * ECharts does NOT support raster tile layers natively.
 * The themed backgrounds give each view a distinctive cartographic feel.
 *
 * Library: echarts + echarts-for-react (already in project dependencies)
 * API key: Not required
 *
 * Props:
 *   geojson        {object}   GeoJSON FeatureCollection; properties.value required
 *   title          {string}   Chart title
 *   height         {string}   CSS height
 *   valueLabel     {string}   Metric name for tooltip & legend
 *   nameProperty   {string}   GeoJSON property key for region name (default 'NAME_1')
 *   onRegionClick  {function} Callback (featureProperties) => void
 *   showBangla     {boolean}  Show name_bn labels when available
 */

import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// ── Per-instance map registration counter ────────────────────────────────────
let mapIdCounter = 0;

// ── Visual themes ─────────────────────────────────────────────────────────────

const THEMES = {
  light: {
    label:       'Light',
    btnBg:       '#4285f4',
    bg:          '#f0f4ff',
    borderColor: '#ffffff',
    borderWidth: 1.4,
    labelColor:  '#1f2937',
    labelShadow: 'rgba(255,255,255,0.95)',
    emphasisArea:'#1d4ed8',
    selectArea:  '#1e40af',
    palette:     ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
    vmTextColor: '#374151',
    vmBg:        'rgba(255,255,255,0.9)',
  },
  dark: {
    label:       'Dark',
    btnBg:       '#1e293b',
    bg:          '#0f172a',
    borderColor: '#334155',
    borderWidth: 1.2,
    labelColor:  '#e2e8f0',
    labelShadow: 'rgba(0,0,0,0.8)',
    emphasisArea:'#059669',
    selectArea:  '#047857',
    palette:     ['#d1fae5', '#6ee7b7', '#34d399', '#059669', '#064e3b'],
    vmTextColor: '#e2e8f0',
    vmBg:        'rgba(15,23,42,0.92)',
  },
  colorful: {
    label:       'Colorful',
    btnBg:       '#e11d48',
    bg:          '#f8f9fa',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    labelColor:  '#111827',
    labelShadow: 'rgba(255,255,255,0.9)',
    emphasisArea:'#b45309',
    selectArea:  '#92400e',
    // Warm-to-cool diverging spectrum (matches GeoJSON example 3rd screenshot)
    palette:     ['#fee2e2', '#fca5a5', '#f97316', '#15803d', '#1d4ed8'],
    vmTextColor: '#374151',
    vmBg:        'rgba(255,255,255,0.92)',
  },
  earth: {
    label:       'Earth',
    btnBg:       '#92400e',
    bg:          '#1c1410',
    borderColor: '#3b2f1e',
    borderWidth: 1.2,
    labelColor:  '#fde68a',
    labelShadow: 'rgba(0,0,0,0.9)',
    emphasisArea:'#d97706',
    selectArea:  '#b45309',
    // Amber / burnt-orange on dark earth background
    palette:     ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#92400e'],
    vmTextColor: '#fde68a',
    vmBg:        'rgba(28,20,16,0.92)',
  },
  ocean: {
    label:       'Ocean',
    btnBg:       '#0e7490',
    bg:          '#0c1a2e',
    borderColor: '#1e3a5f',
    borderWidth: 1.2,
    labelColor:  '#a5f3fc',
    labelShadow: 'rgba(0,0,0,0.85)',
    emphasisArea:'#0891b2',
    selectArea:  '#0e7490',
    // Deep-sea teal/cyan palette
    palette:     ['#cffafe', '#67e8f9', '#22d3ee', '#0891b2', '#164e63'],
    vmTextColor: '#a5f3fc',
    vmBg:        'rgba(12,26,46,0.92)',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const ChoroplethMapECharts = ({
  geojson,
  title        = 'Regional Analysis',
  height       = '500px',
  valueLabel   = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla   = true,
}) => {
  // Stable per-instance map name
  const mapName = useMemo(() => `bd-map-${++mapIdCounter}`, []);

  const [activeTheme, setActiveTheme] = useState('light');
  const theme = THEMES[activeTheme];

  // Register GeoJSON with ECharts
  useEffect(() => {
    if (geojson?.features?.length) {
      echarts.registerMap(mapName, geojson);
    }
  }, [geojson, mapName]);

  // Series data
  const seriesData = useMemo(() => {
    if (!geojson?.features) return [];
    return geojson.features.map((f) => ({
      name:   f.properties[nameProperty] || 'Unknown',
      value:  f.properties.value ?? 0,
      nameBn: f.properties.name_bn || null,
    }));
  }, [geojson, nameProperty]);

  const maxValue = useMemo(
    () => Math.max(...seriesData.map((d) => d.value || 0), 1),
    [seriesData]
  );

  // ECharts option — rebuilt when theme or data changes
  const option = useMemo(() => ({
    backgroundColor: theme.bg,

    title: title ? {
      text:       title,
      left:       'left',
      textStyle:  { fontSize: 14, fontWeight: 700, color: theme.labelColor },
      padding:    [14, 16],
    } : undefined,

    tooltip: {
      trigger: 'item',
      backgroundColor: theme.vmBg,
      borderColor:     theme.borderColor,
      textStyle:       { color: theme.vmTextColor, fontSize: 12 },
      formatter: (params) => {
        const bn = params.data?.nameBn;
        const nameDisplay = (showBangla && bn) ? `${bn} (${params.name})` : params.name;
        return `
          <div style="padding:8px 12px;font-family:'Noto Serif Bengali',sans-serif;min-width:130px;">
            <strong style="font-size:13px;display:block;margin-bottom:4px;">${nameDisplay}</strong>
            <span style="font-size:11px;opacity:0.75;">${valueLabel}: </span>
            <strong style="font-size:12px;">${params.value ?? 0}</strong>
          </div>`;
      },
    },

    visualMap: {
      min:        0,
      max:        maxValue,
      left:       16,
      bottom:     24,
      orient:     'vertical',
      text:       ['High', 'Low'],
      textStyle:  { color: theme.vmTextColor, fontSize: 11 },
      calculable: true,
      itemWidth:  14,
      itemHeight: 100,
      inRange: { color: theme.palette },
    },

    series: [{
      type:          'map',
      map:           mapName,
      nameProperty,
      roam:          true,
      scaleLimit:    { min: 0.85, max: 8 },
      data:          seriesData,
      aspectScale:   1,
      layoutCenter:  ['55%', '52%'],
      layoutSize:    '88%',

      label: {
        show:             true,
        fontSize:         showBangla ? 12 : 10,
        fontWeight:       600,
        color:            theme.labelColor,
        fontFamily:       showBangla
          ? "'Noto Serif Bengali','Noto Sans Bengali','Vrinda',sans-serif"
          : 'sans-serif',
        formatter:        (params) =>
          (showBangla && params.data?.nameBn) ? params.data.nameBn : params.name,
        textShadowColor:  theme.labelShadow,
        textShadowBlur:   5,
        textShadowOffsetX: 0,
        textShadowOffsetY: 1,
      },

      emphasis: {
        disabled: false,
        label:    { show: true, fontWeight: 800, fontSize: showBangla ? 13 : 11 },
        itemStyle: {
          areaColor:   theme.emphasisArea,
          shadowBlur:  20,
          shadowColor: 'rgba(0,0,0,0.5)',
        },
      },

      select: {
        label:     { show: true },
        itemStyle: { areaColor: theme.selectArea },
      },

      itemStyle: {
        areaColor:   theme.palette[0],
        borderColor: theme.borderColor,
        borderWidth: theme.borderWidth,
        shadowBlur:  4,
        shadowColor: 'rgba(0,0,0,0.12)',
      },
    }],
  }), [mapName, nameProperty, seriesData, maxValue, title, valueLabel, showBangla, theme]);

  // Click handler
  const onEvents = useMemo(
    () => ({
      click: (params) => {
        if (onRegionClick && params.data) onRegionClick(params.data);
      },
    }),
    [onRegionClick]
  );

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
      border: `1px solid ${theme.borderColor}`,
      borderRadius: 6, overflow: 'hidden',
      background: theme.bg,
    }}>

      {/* Theme switcher — top-right, matches style of other map components */}
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
                  : (theme.bg === '#0f172a' || theme.bg === '#1c1410' || theme.bg === '#0c1a2e')
                    ? 'rgba(50,50,60,0.92)'
                    : 'rgba(255,255,255,0.92)',
                color:      active
                  ? '#fff'
                  : (theme.bg === '#0f172a' || theme.bg === '#1c1410' || theme.bg === '#0c1a2e')
                    ? '#ccc'
                    : '#333',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.22)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ECharts map */}
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height: '100%', width: '100%' }}
        notMerge
        lazyUpdate
      />

      {/* Library badge */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 10,
        background: 'rgba(114,46,209,0.88)', color: '#fff',
        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      }}>
        ECharts · {theme.label} Theme
      </div>
    </div>
  );
};

export default ChoroplethMapECharts;
