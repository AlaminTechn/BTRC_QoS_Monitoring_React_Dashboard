/**
 * ChoroplethMapECharts
 *
 * Bangladesh choropleth map powered by Apache ECharts (echarts-for-react).
 * No tile server needed — renders as an SVG canvas with ECharts built-in
 * visual map (legend), smooth hover animations, and Bangla label support.
 *
 * Library: echarts + echarts-for-react (already in project dependencies)
 * Tile layer: None — ECharts draws pure SVG polygons
 * API key: Not required
 *
 * Props:
 *   geojson       {object}   GeoJSON FeatureCollection. Each feature must have
 *                            properties.value (number) for choropleth coloring.
 *                            Optional properties.name_bn for Bangla labels.
 *   title         {string}   Chart title
 *   height        {string}   CSS height, e.g. '500px'
 *   valueLabel    {string}   Metric name shown in tooltip and visual-map
 *   nameProperty  {string}   GeoJSON property key used as the region name
 *                            (must match ECharts data's `name` field)
 *                            Default: 'NAME_1' (division GeoJSON)
 *   onRegionClick {function} Callback (featureProperties) => void
 *   showBangla    {boolean}  Show বাংলা labels (requires name_bn in properties)
 */

import React, { useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// Unique map registration key — incremented per instance to avoid conflicts
let mapIdCounter = 0;

const ChoroplethMapECharts = ({
  geojson,
  title = 'Regional Analysis',
  height = '500px',
  valueLabel = 'Value',
  nameProperty = 'NAME_1',
  onRegionClick,
  showBangla = true,
}) => {
  // Stable per-instance map name so multiple instances don't overwrite each other
  const mapName = useMemo(() => `bd-map-${++mapIdCounter}`, []);

  // Register GeoJSON with ECharts whenever data changes
  useEffect(() => {
    if (geojson?.features?.length) {
      echarts.registerMap(mapName, geojson);
    }
  }, [geojson, mapName]);

  // Extract series data from GeoJSON features
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

  const option = useMemo(() => ({
    backgroundColor: '#fff',

    title: title
      ? {
          text: title,
          left: 'left',
          textStyle: { fontSize: 14, fontWeight: 600, color: '#1f2937' },
          padding: [10, 16],
        }
      : undefined,

    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const bn = params.data?.nameBn;
        const nameDisplay = bn ? `${bn} (${params.name})` : params.name;
        return `
          <div style="padding:8px 12px;font-family:sans-serif;">
            <strong style="font-size:13px;">${nameDisplay}</strong><br/>
            <span style="color:#666;">${valueLabel}: </span>
            <strong>${params.value ?? 0}</strong>
          </div>`;
      },
    },

    visualMap: {
      min: 0,
      max: maxValue,
      left: 'left',
      bottom: 20,
      orient: 'vertical',
      text: ['High', 'Low'],
      textStyle: { color: '#555', fontSize: 11 },
      calculable: true,
      inRange: {
        color: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'],
      },
    },

    series: [
      {
        type: 'map',
        map: mapName,
        nameProperty,
        roam: true,           // Enable drag + scroll zoom
        scaleLimit: { min: 0.8, max: 6 },
        data: seriesData,

        label: {
          show: true,
          fontSize: showBangla ? 13 : 11,
          fontWeight: 600,
          color: '#111827',
          fontFamily: showBangla
            ? "'Noto Serif Bengali','Noto Sans Bengali','Vrinda',sans-serif"
            : 'sans-serif',
          // Show Bangla name if available, fall back to English
          formatter: (params) =>
            (showBangla && params.data?.nameBn) ? params.data.nameBn : params.name,
          textShadowColor: 'rgba(255,255,255,0.9)',
          textShadowBlur: 4,
        },

        emphasis: {
          label: { show: true, fontWeight: 700 },
          itemStyle: { areaColor: '#1d4ed8' },
        },

        select: {
          label: { show: true },
          itemStyle: { areaColor: '#1e40af' },
        },

        itemStyle: {
          areaColor: '#dbeafe',
          borderColor: '#ffffff',
          borderWidth: 1.2,
        },
      },
    ],
  }), [mapName, nameProperty, seriesData, maxValue, title, valueLabel, showBangla]);

  // Handle click events
  const onEvents = useMemo(
    () => ({
      click: (params) => {
        if (onRegionClick && params.data) {
          onRegionClick(params.data);
        }
      },
    }),
    [onRegionClick]
  );

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
    <div style={{
      position: 'relative', height,
      border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden',
      background: '#fff',
    }}>
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height: '100%', width: '100%' }}
        notMerge
        lazyUpdate
      />
    </div>
  );
};

export default ChoroplethMapECharts;
