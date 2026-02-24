/**
 * Map Visualization Comparison Page
 *
 * Demonstrates three different map rendering approaches for Bangladesh
 * division-level choropleth maps.  All three maps show the same demo
 * dataset so the visual quality and behaviour can be compared directly.
 *
 * Libraries compared:
 *   1. React-Leaflet  — tile-based, OpenStreetMap tiles, full interactivity
 *   2. ECharts Geo    — canvas SVG chart, built-in animations & visual-map
 *   3. react-simple-maps — pure SVG vector, D3-geo projections, lightweight
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Card, Tag, Table, Spin, Alert, Row, Col, Statistic, Badge } from 'antd';
import {
  GlobalOutlined,
  BarChartOutlined,
  NodeIndexOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import ChoroplethMap        from '../components/maps/ChoroplethMap';
import ChoroplethMapECharts from '../components/maps/ChoroplethMapECharts';
import ChoroplethMapSVG     from '../components/maps/ChoroplethMapSVG';

// =============================================================================
// Demo data — 8 Bangladesh divisions, sample ISP violation counts
// Used by all three maps so the comparison is fair (identical values)
// =============================================================================
const DEMO_DATA = [
  { name: 'Dhaka',       value: 42, nameBn: 'ঢাকা' },
  { name: 'Chattagram',  value: 28, nameBn: 'চট্টগ্রাম' },
  { name: 'Rajshahi',    value: 15, nameBn: 'রাজশাহী' },
  { name: 'Khulna',      value: 22, nameBn: 'খুলনা' },
  { name: 'Barisal',     value: 8,  nameBn: 'বরিশাল' },
  { name: 'Sylhet',      value: 19, nameBn: 'সিলেট' },
  { name: 'Rangpur',     value: 11, nameBn: 'রংপুর' },
  { name: 'Mymensingh',  value: 16, nameBn: 'ময়মনসিংহ' },
];

// =============================================================================
// Library metadata
// =============================================================================
const LIBRARIES = {
  leaflet: {
    key:          'leaflet',
    name:         'React-Leaflet',
    subtitle:     'Tile-based interactive map',
    icon:         <GlobalOutlined />,
    color:        '#1890ff',
    tagColor:     'blue',
    npm:          'react-leaflet + leaflet',
    version:      'v5 + v1.9',
    bundle:       '~90 KB',
    apiKey:       false,
    tiles:        true,
    bangla:       'Via OSM tile server',
    zoomLevel:    'Building (zoom 19)',
    pros: [
      'Real tile layers — roads, buildings, water bodies',
      'Highest zoom detail (streets, buildings at z19)',
      'Huge plugin ecosystem (heatmap, clustering, drawing)',
      'Familiar Google Maps-style UX',
      'Fully interactive — pan, zoom, click events',
      'Offline tile support possible',
    ],
    cons: [
      'Largest bundle size among the three',
      'Requires a tile server (CDN or self-hosted)',
      'Bangla labels depend on tile provider',
      'Canvas rendering can lag on 1000+ polygons',
      'Heavier dependency tree',
    ],
    bestFor: 'Operational dashboards, field monitoring, drill-down navigation',
  },
  echarts: {
    key:          'echarts',
    name:         'ECharts Geo',
    subtitle:     'Chart library with geo series',
    icon:         <BarChartOutlined />,
    color:        '#722ed1',
    tagColor:     'purple',
    npm:          'echarts + echarts-for-react',
    version:      'v6 + v3',
    bundle:       '~1 MB (full build)',
    apiKey:       false,
    tiles:        false,
    bangla:       'Native (label.formatter)',
    zoomLevel:    'Division / District only',
    pros: [
      'Already in project dependencies — zero extra install',
      'Native Bangla label support via formatter',
      'Built-in visual-map (gradient legend) with range brush',
      'Smooth zoom & pan animations out of the box',
      'Integrates seamlessly with other ECharts charts',
      'Supports canvas rendering for 10 000+ polygons',
      'Great tooltip theming',
    ],
    cons: [
      'Large bundle (ECharts full ~1 MB, tree-shaking complex)',
      'No tile layer — roads/buildings not visible',
      'Less "map-like" — more "chart" feel',
      'Limited projection options vs Leaflet/D3',
      'roam (drag/zoom) UX is less smooth than Leaflet',
    ],
    bestFor: 'Analytical dashboards already using ECharts, report generation',
  },
  svg: {
    key:          'svg',
    name:         'react-simple-maps',
    subtitle:     'Pure SVG vector rendering',
    icon:         <NodeIndexOutlined />,
    color:        '#13c2c2',
    tagColor:     'cyan',
    npm:          'react-simple-maps',
    version:      'v3.0',
    bundle:       '~50 KB',
    apiKey:       false,
    tiles:        false,
    bangla:       'Via tooltip & custom labels',
    zoomLevel:    'Division / District only',
    pros: [
      'Smallest bundle of the three',
      'Pure SVG — scales perfectly, crisp on HiDPI/retina',
      'No tile server dependency',
      'Easy to export as SVG or PNG',
      'Full D3-geo projection control',
      'Works server-side (SSR) out of the box',
      'Simple, focused API',
    ],
    cons: [
      'No tile background — buildings, roads not visible',
      'SVG rendering slows on 500+ complex polygons',
      'Less interactive (no built-in clustering, heatmap)',
      'Projection config requires manual tuning per region',
      'Tooltip UX requires custom implementation',
    ],
    bestFor: 'Print reports, embedded widgets, lightweight SaaS dashboards',
  },
};

// =============================================================================
// Comparison table data
// =============================================================================
const COMPARISON_COLUMNS = [
  { title: 'Feature',         dataIndex: 'feature',  key: 'feature',  width: 180, render: (v) => <strong>{v}</strong> },
  { title: 'React-Leaflet',   dataIndex: 'leaflet',  key: 'leaflet',  render: renderCell },
  { title: 'ECharts Geo',     dataIndex: 'echarts',  key: 'echarts',  render: renderCell },
  { title: 'react-simple-maps', dataIndex: 'svg',    key: 'svg',      render: renderCell },
];

function renderCell(val) {
  if (val === true)  return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
  if (val === false) return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
  return <span style={{ fontSize: 12 }}>{val}</span>;
}

const COMPARISON_DATA = [
  { key: '1', feature: 'Tile layer (roads/buildings)', leaflet: true,       echarts: false,         svg: false },
  { key: '2', feature: 'Bangla labels',               leaflet: 'Via tiles', echarts: 'label.fmt',   svg: 'Tooltip' },
  { key: '3', feature: 'Zoom to street level',        leaflet: true,        echarts: false,         svg: false },
  { key: '4', feature: 'Built-in legend',             leaflet: false,       echarts: true,          svg: false },
  { key: '5', feature: 'API key required',            leaflet: false,       echarts: false,         svg: false },
  { key: '6', feature: 'Bundle size',                 leaflet: '~90 KB',    echarts: '~1 MB',       svg: '~50 KB' },
  { key: '7', feature: 'SVG export',                  leaflet: false,       echarts: 'PNG only',    svg: true },
  { key: '8', feature: 'SSR compatible',              leaflet: false,       echarts: 'Partial',     svg: true },
  { key: '9', feature: 'Smooth pan/zoom',             leaflet: true,        echarts: 'Partial',     svg: true },
  { key: '10', feature: 'Plugin ecosystem',           leaflet: 'Huge',      echarts: 'ECharts ext', svg: 'Minimal' },
  { key: '11', feature: 'Offline capable',            leaflet: 'With tiles',echarts: true,          svg: true },
];

// =============================================================================
// Helper: Build enhanced GeoJSON from raw GeoJSON + DEMO_DATA
// =============================================================================
const buildEnhancedGeoJSON = (geoJson) => {
  if (!geoJson?.features) return null;
  const dataMap = Object.fromEntries(DEMO_DATA.map((d) => [d.name, d]));
  const clone = JSON.parse(JSON.stringify(geoJson));
  clone.features.forEach((f) => {
    const d = dataMap[f.properties.NAME_1];
    f.properties.value  = d?.value  ?? 0;
    f.properties.name_bn = d?.nameBn ?? null;
  });
  return clone;
};

// =============================================================================
// Library info card
// =============================================================================
const LibraryCard = ({ lib }) => (
  <Card
    size="small"
    style={{ marginTop: 16, border: `1px solid ${lib.color}22` }}
    bodyStyle={{ padding: '12px 16px' }}
  >
    <Row gutter={[24, 12]}>
      <Col xs={24} md={8}>
        <div style={{ fontSize: 13, fontWeight: 700, color: lib.color, marginBottom: 8 }}>
          {lib.icon} &nbsp;{lib.name}
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{lib.subtitle}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Tag color={lib.tagColor}>{lib.npm}</Tag>
          <Tag color={lib.apiKey ? 'red' : 'green'}>{lib.apiKey ? 'API Key Required' : 'Free / No Key'}</Tag>
          <Tag color={lib.tiles ? 'blue' : 'default'}>{lib.tiles ? 'Tile Layer ✓' : 'No Tiles'}</Tag>
        </div>
        <Row gutter={12} style={{ marginTop: 12 }}>
          <Col span={12}><Statistic title="Bundle" value={lib.bundle} valueStyle={{ fontSize: 14 }} /></Col>
          <Col span={12}><Statistic title="Zoom" value={lib.zoomLevel} valueStyle={{ fontSize: 11 }} /></Col>
        </Row>
      </Col>

      <Col xs={24} md={8}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#52c41a', marginBottom: 6 }}>✅ Pros</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#333', lineHeight: 1.7 }}>
          {lib.pros.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </Col>

      <Col xs={24} md={8}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f', marginBottom: 6 }}>❌ Cons</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#333', lineHeight: 1.7 }}>
          {lib.cons.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <div style={{ marginTop: 10, padding: '6px 10px', background: '#f0f9ff', borderRadius: 4, fontSize: 11, color: '#0369a1' }}>
          <strong>Best for:</strong> {lib.bestFor}
        </div>
      </Col>
    </Row>
  </Card>
);

// =============================================================================
// Main Page
// =============================================================================
const MapVisualization = () => {
  const [geojson, setGeojson]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeLib, setActiveLib] = useState('leaflet');

  // Load division GeoJSON once
  useEffect(() => {
    fetch('/geodata/bangladesh_divisions_8.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGeojson)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Merge demo values into GeoJSON features
  const enhancedGeoJSON = useMemo(() => buildEnhancedGeoJSON(geojson), [geojson]);

  const tabItems = [
    {
      key:   'leaflet',
      label: (
        <span>
          <GlobalOutlined style={{ marginRight: 6 }} />
          React-Leaflet
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>Tiles + OSM</Tag>
        </span>
      ),
      children: (
        <div>
          <ChoroplethMap
            geojson={enhancedGeoJSON}
            title="Division Violations — React-Leaflet"
            valueLabel="Violations"
            height="540px"
          />
          <LibraryCard lib={LIBRARIES.leaflet} />
        </div>
      ),
    },
    {
      key:   'echarts',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 6 }} />
          ECharts Geo
          <Tag color="purple" style={{ marginLeft: 8, fontSize: 10 }}>SVG Canvas</Tag>
        </span>
      ),
      children: (
        <div>
          <ChoroplethMapECharts
            geojson={enhancedGeoJSON}
            title="Division Violations — ECharts Geo"
            valueLabel="Violations"
            nameProperty="NAME_1"
            height="540px"
            showBangla
          />
          <LibraryCard lib={LIBRARIES.echarts} />
        </div>
      ),
    },
    {
      key:   'svg',
      label: (
        <span>
          <NodeIndexOutlined style={{ marginRight: 6 }} />
          SVG Maps
          <Tag color="cyan" style={{ marginLeft: 8, fontSize: 10 }}>D3 Vector</Tag>
        </span>
      ),
      children: (
        <div>
          <ChoroplethMapSVG
            geojson={enhancedGeoJSON}
            title="Division Violations — react-simple-maps"
            valueLabel="Violations"
            nameProperty="NAME_1"
            height="540px"
            showBangla
          />
          <LibraryCard lib={LIBRARIES.svg} />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="Loading GeoJSON…" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={`Failed to load GeoJSON: ${error}`} style={{ margin: 24 }} />;
  }

  return (
    <div style={{ padding: '24px 32px', background: '#f0f2f5', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            🗺️ Map Visualization Comparison
          </h1>
          <Badge count="Demo Data" style={{ background: '#faad14' }} />
        </div>
        <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
          Three different map libraries rendering the same Bangladesh division data.
          Same dataset · Same colour scale · Different rendering engines.
        </p>
      </div>

      {/* Quick-reference stats row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {Object.values(LIBRARIES).map((lib) => (
          <Col key={lib.key} xs={24} sm={8}>
            <Card
              size="small"
              style={{
                borderTop: `3px solid ${lib.color}`,
                cursor: 'pointer',
                boxShadow: activeLib === lib.key ? `0 0 0 2px ${lib.color}` : 'none',
              }}
              bodyStyle={{ padding: '12px 16px' }}
              onClick={() => setActiveLib(lib.key)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: lib.color }}>
                  {lib.icon} &nbsp;{lib.name}
                </span>
                <Tag color={lib.tagColor}>{lib.bundle}</Tag>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{lib.subtitle}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Map tabs */}
      <Card bodyStyle={{ padding: '0 16px 16px' }}>
        <Tabs
          activeKey={activeLib}
          onChange={setActiveLib}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* Feature comparison table */}
      <Card
        title="Feature Comparison"
        style={{ marginTop: 24 }}
        size="small"
      >
        <Table
          columns={COMPARISON_COLUMNS}
          dataSource={COMPARISON_DATA}
          pagination={false}
          size="small"
          bordered
        />
        <p style={{ marginTop: 12, fontSize: 11, color: '#999' }}>
          * Bundle sizes are approximate gzipped production sizes.
          See <code>MAP_VISUALIZATION_COMPARISON.md</code> for full analysis.
        </p>
      </Card>
    </div>
  );
};

export default MapVisualization;
