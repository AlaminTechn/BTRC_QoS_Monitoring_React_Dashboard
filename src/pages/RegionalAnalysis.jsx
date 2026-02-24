/**
 * Regional Analysis Dashboard (Tab R2.2)
 * Main page component for Regional Analysis
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spin, Alert, Breadcrumb, Space, Divider, Button } from 'antd';
import { HomeOutlined, EnvironmentOutlined, DatabaseOutlined } from '@ant-design/icons';
import ChoroplethMap from '../components/maps/ChoroplethMapTiled';
import BarChart from '../components/charts/BarChart';
import DataTable from '../components/charts/DataTable';
import MiniBar from '../components/charts/MiniBar';
import FilterPanel from '../components/filters/FilterPanel';
import useMetabaseData from '../hooks/useMetabaseData';
import {
  transformToBarChart,
  transformToTable,
  transformToGeoJSON,
  applyNameMapping,
  DIVISION_NAME_MAPPING,
  DISTRICT_NAME_MAPPING,
} from '../utils/dataTransform';

const RegionalAnalysis = ({ startDate = null, endDate = null, lockedDivision = null, showISPFilter = true }) => {
  // Local geographic filter state
  // If lockedDivision is set (Regional Officers), pre-lock their division
  const [filters, setFilters] = useState({
    division: lockedDivision || undefined,
    district: undefined,
    isp: undefined,
  });

  // Keep division locked when lockedDivision prop changes
  React.useEffect(() => {
    if (lockedDivision) {
      setFilters((prev) => ({ ...prev, division: lockedDivision }));
    }
  }, [lockedDivision]);

  // GeoJSON data
  const [divisionGeoJSON, setDivisionGeoJSON] = useState(null);
  const [districtGeoJSON, setDistrictGeoJSON] = useState(null);

  // Merge global date range into every API call that supports it
  const effectiveFilters = React.useMemo(() => ({
    ...filters,
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate   ? { end_date:   endDate   } : {}),
  }), [filters, startDate, endDate]);

  // Fetch violation data (Card 87) — supports date filter
  const {
    data: violationData,
    loading: violationLoading,
    error: violationError,
  } = useMetabaseData(87, effectiveFilters);

  // Fetch district ranking data (Card 80) — supports date filter
  const {
    data: districtRankingData,
    loading: districtLoading,
    error: districtError,
  } = useMetabaseData(80, effectiveFilters);

  // Fetch ISP Performance data (Card 81) — supports date filter
  const {
    data: ispPerformanceData,
    loading: ispPerformanceLoading,
  } = useMetabaseData(81, effectiveFilters);

  // Aggregate data for divisions (sum by division)
  const divisionData = React.useMemo(() => {
    if (!violationData || !violationData.rows) {
      console.log('⚠️ No violation data available');
      return null;
    }

    console.log('📊 Raw violation data:', violationData.rows.slice(0, 5));

    const divisionMap = {};
    violationData.rows.forEach((row) => {
      const division = row[0]; // Division name
      const total = row[2]; // Total violations

      if (!divisionMap[division]) {
        divisionMap[division] = 0;
      }
      divisionMap[division] += total;
    });

    // Convert to array format [[Division, Total], ...]
    const rows = Object.entries(divisionMap).map(([division, total]) => [division, total]);

    console.log('📊 Aggregated division data:', rows);

    return {
      rows,
      columns: [
        { name: 'Division', displayName: 'Division', type: 'type/Text' },
        { name: 'Total', displayName: 'Total Violations', type: 'type/BigInteger' },
      ],
      metadata: { rowCount: rows.length },
    };
  }, [violationData]);

  // District ranking data (Card 80) - filtered by Metabase query
  // Format: [Division, District, Avg Download, Avg Upload, Avg Latency, Availability %, ISP Count, PoP Count]
  const districtData = React.useMemo(() => {
    if (!districtRankingData || !districtRankingData.rows) {
      console.log('⚠️ No district ranking data available');
      return null;
    }

    console.log('📊 Raw district data (first 5 rows):', districtRankingData.rows.slice(0, 5));
    console.log('📊 District names from Card 80:', districtRankingData.rows.map(r => r[1]));

    return {
      rows: districtRankingData.rows,
      columns: districtRankingData.columns,
      metadata: { rowCount: districtRankingData.rows.length },
    };
  }, [districtRankingData]);

  // Load GeoJSON files
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // Division GeoJSON (use local file)
        const divPath = import.meta.env.VITE_GEOJSON_DIVISIONS || '/geodata/bangladesh_divisions_8.geojson';
        console.log('Loading division GeoJSON from:', divPath);
        const divResponse = await fetch(divPath);

        if (!divResponse.ok) {
          throw new Error(`Failed to load division GeoJSON: ${divResponse.status} ${divResponse.statusText}`);
        }

        const divGeoJSON = await divResponse.json();
        console.log('Division GeoJSON loaded:', divGeoJSON.features?.length, 'features');
        setDivisionGeoJSON(divGeoJSON);

        // District GeoJSON (use local file)
        const distPath = import.meta.env.VITE_GEOJSON_DISTRICTS || '/geodata/bgd_districts.geojson';
        console.log('Loading district GeoJSON from:', distPath);
        const distResponse = await fetch(distPath);

        if (!distResponse.ok) {
          throw new Error(`Failed to load district GeoJSON: ${distResponse.status} ${distResponse.statusText}`);
        }

        const distGeoJSON = await distResponse.json();
        console.log('District GeoJSON loaded:', distGeoJSON.features?.length, 'features');
        setDistrictGeoJSON(distGeoJSON);
      } catch (error) {
        console.error('Failed to load GeoJSON:', error);
        alert(`GeoJSON Loading Error: ${error.message}\n\nPlease ensure geodata files are in the public/geodata/ folder.`);
      }
    };

    loadGeoJSON();
  }, []);

  // Transform data for charts
  const divisionChartData =
    divisionData && divisionData.rows
      ? transformToBarChart(divisionData.rows, divisionData.columns)
      : { categories: [], values: [] };

  const districtChartData =
    districtData && districtData.rows
      ? transformToBarChart(districtData.rows, districtData.columns)
      : { categories: [], values: [] };

  // Transform data for tables
  const divisionTableData =
    divisionData && divisionData.rows
      ? divisionData.rows.map((row, index) => ({
          key: `div-${index}`,
          0: row[0], // Division name
          1: row[1], // Total violations
        }))
      : [];

  const districtTableData =
    districtData && districtData.rows
      ? districtData.rows.map((row, index) => ({
          key: `dist-${index}`,
          0: row[0], // Division
          1: row[1], // District
          2: row[2], // Avg Download (Mbps)
          3: row[3], // Avg Upload (Mbps)
          4: row[4], // Avg Latency (ms)
          5: row[5], // Availability (%)
          6: row[6], // ISP Count
          7: row[7], // PoP Count
        }))
      : [];

  // Transform data for maps
  const divisionMapData = React.useMemo(() => {
    if (!divisionData || !divisionData.rows || !divisionGeoJSON) {
      console.log('⚠️ Division map data not ready', {
        hasDivisionData: !!divisionData,
        hasRows: !!divisionData?.rows,
        hasGeoJSON: !!divisionGeoJSON
      });
      return null;
    }

    console.log('🗺️ DIVISION MAP: Creating map data');
    console.log('📊 Division data (all rows with values):');
    divisionData.rows.forEach((row, i) => {
      console.log(`  [${i}] ${row[0]} = ${row[1]} violations`);
    });

    const mappedRows = applyNameMapping(divisionData.rows, DIVISION_NAME_MAPPING, 0);
    console.log('📊 Division data after mapping:');
    mappedRows.forEach((row, i) => {
      console.log(`  [${i}] ${row[0]} = ${row[1]} violations`);
    });

    const result = transformToGeoJSON(mappedRows, divisionGeoJSON, 'NAME_1', 0, 1);
    console.log('🗺️ Division map GeoJSON features with values:');
    result.features.forEach((f, i) => {
      if (i < 10) { // Log first 10
        console.log(`  ${f.properties.NAME_1 || f.properties.shapeName} = ${f.properties.value}`);
      }
    });

    return result;
  }, [divisionData, divisionGeoJSON]);

  const districtMapData = React.useMemo(() => {
    if (!districtData?.rows || !districtGeoJSON) return null;

    console.log('🗺️ DISTRICT MAP: Creating map data');
    console.log('📊 District data sample (first 3 rows):', districtData.rows.slice(0, 3));
    console.log('📊 District names before mapping:', districtData.rows.map(r => r[1]).slice(0, 10));

    // Apply name mapping to column 1 (District names)
    const mappedRows = applyNameMapping(districtData.rows, DISTRICT_NAME_MAPPING, 1);
    console.log('📊 District names after mapping:', mappedRows.map(r => r[1]).slice(0, 10));

    return transformToGeoJSON(
      mappedRows,
      districtGeoJSON,
      'shapeName',
      1, // nameColumn: District name is in column 1
      2  // valueColumn: Avg Download is in column 2 (for coloring)
    );
  }, [districtData, districtGeoJSON]);

  // Get unique divisions, districts, ISPs for filters
  const divisions = divisionData?.rows
    ? [...new Set(divisionData.rows.map((row) => row[0]))].sort()
    : [];

  // Get districts filtered by selected division
  const districts = React.useMemo(() => {
    if (!districtData?.rows) return [];

    let filteredRows = districtData.rows;

    // Filter by selected division (Card 80: row[0] = Division, row[1] = District)
    if (filters.division) {
      filteredRows = filteredRows.filter((row) => row[0] === filters.division);
      console.log(`🔍 Filtering districts by division: ${filters.division}, found ${filteredRows.length} districts`);
    }

    // Extract unique district names (column 1)
    const uniqueDistricts = [...new Set(filteredRows.map((row) => row[1]))].sort();
    console.log('📊 Available districts:', uniqueDistricts);
    return uniqueDistricts;
  }, [districtData, filters.division]);

  // Extract unique ISPs from Card 81 (column 2 = ISP)
  const isps = React.useMemo(() => {
    if (!ispPerformanceData?.rows) return [];

    const ispNames = ispPerformanceData.rows.map((row) => row[2]).filter(Boolean);
    const uniqueIsps = [...new Set(ispNames)].sort();

    console.log('Card 81 raw data sample:', ispPerformanceData.rows.slice(0, 3));
    console.log('Extracted ISP names:', uniqueIsps);

    return uniqueIsps;
  }, [ispPerformanceData]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    // Keep locked division even if filter panel tries to clear it
    setFilters(lockedDivision ? { ...newFilters, division: lockedDivision } : newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      division: lockedDivision || undefined, // don't reset a locked division
      district: undefined,
      isp: undefined,
    });
  };

  // Handle region click on map
  const handleDivisionClick = (feature) => {
    const divisionName = feature.properties.NAME_1 || feature.properties.shapeName || feature.properties.name;
    console.log('🖱️ Division clicked:', divisionName, 'from feature:', feature.properties);
    // Reverse mapping
    const dbName =
      Object.keys(DIVISION_NAME_MAPPING).find(
        (key) => DIVISION_NAME_MAPPING[key] === divisionName
      ) || divisionName;
    console.log('🖱️ Setting filter to division:', dbName);
    setFilters({ ...filters, division: dbName, district: undefined });
  };

  const handleDistrictClick = (feature) => {
    const districtName = feature.properties.shapeName || feature.properties.name;
    // Reverse mapping
    const dbName =
      Object.keys(DISTRICT_NAME_MAPPING).find(
        (key) => DISTRICT_NAME_MAPPING[key] === districtName
      ) || districtName;
    setFilters({ ...filters, district: dbName });
  };

  // Handle bar click
  const handleBarClick = (data) => {
    if (!filters.division) {
      // Clicked on division bar
      setFilters({ ...filters, division: data.name, district: undefined });
    } else {
      // Clicked on district bar
      setFilters({ ...filters, district: data.name });
    }
  };

  // Table columns with sorting
  const divisionColumns = [
    {
      title: 'Division',
      dataIndex: 0,
      key: 'division',
      width: 200,
      sorter: (a, b) => (a[0] || '').localeCompare(b[0] || ''),
      render: (value) => (
        <span style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }}>
          {value}
        </span>
      ),
    },
    {
      title: 'Total Violations',
      dataIndex: 1,
      key: 'total',
      width: 150,
      sorter: (a, b) => (a[1] || 0) - (b[1] || 0),
      defaultSortOrder: 'descend',
      render: (value) => (
        <span style={{ fontWeight: 'bold', color: value > 20 ? '#ef4444' : '#6b7280' }}>
          {value || 0}
        </span>
      ),
    },
  ];

  const districtColumns = [
    {
      title: 'Division',
      dataIndex: 0,
      key: 'division',
      width: 120,
      sorter: (a, b) => (a[0] || '').localeCompare(b[0] || ''),
      render: (value) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {value}
        </span>
      ),
    },
    {
      title: 'District',
      dataIndex: 1,
      key: 'district',
      width: 150,
      sorter: (a, b) => (a[1] || '').localeCompare(b[1] || ''),
      render: (value) => (
        <span style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 500 }}>
          {value}
        </span>
      ),
    },
    {
      title: 'Avg Download (Mbps)',
      dataIndex: 2,
      key: 'download',
      width: 180,
      sorter: (a, b) => (a[2] || 0) - (b[2] || 0),
      defaultSortOrder: 'descend',
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={50}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(2)}
          />
        );
      },
    },
    {
      title: 'Avg Upload (Mbps)',
      dataIndex: 3,
      key: 'upload',
      width: 170,
      sorter: (a, b) => (a[3] || 0) - (b[3] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={15}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(2)}
          />
        );
      },
    },
    {
      title: 'Avg Latency (ms)',
      dataIndex: 4,
      key: 'latency',
      width: 160,
      sorter: (a, b) => (a[4] || 0) - (b[4] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={100}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(1)}
          />
        );
      },
    },
    {
      title: 'Availability (%)',
      dataIndex: 5,
      key: 'availability',
      width: 170,
      sorter: (a, b) => (a[5] || 0) - (b[5] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        const percent = isNaN(numVal) ? 0 : numVal;
        const color = percent >= 95 ? '#10b981' : percent >= 90 ? '#f59e0b' : '#ef4444';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '13px', color, fontWeight: 'bold' }}>
              {numVal.toFixed(2)}%
            </span>
            <div
              style={{
                width: '60px',
                height: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  // ISP Performance columns (Card 81: Division, District, ISP, License Category,
  // PoP Count, Avg Download, Avg Upload, Avg Latency, Availability %, Violations)
  const ispPerformanceColumns = [
    {
      title: 'ISP',
      dataIndex: 2,
      key: 'isp',
      width: 180,
      fixed: 'left',
      sorter: (a, b) => (a[2] || '').localeCompare(b[2] || ''),
      render: (value) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {value}
        </span>
      ),
    },
    {
      title: 'License Category',
      dataIndex: 3,
      key: 'license',
      width: 150,
      sorter: (a, b) => (a[3] || '').localeCompare(b[3] || ''),
    },
    {
      title: 'PoP Count',
      dataIndex: 4,
      key: 'pop_count',
      width: 100,
      sorter: (a, b) => (a[4] || 0) - (b[4] || 0),
      render: (value) => value || 0,
    },
    {
      title: 'Avg Download (Mbps)',
      dataIndex: 5,
      key: 'download',
      width: 180,
      sorter: (a, b) => (a[5] || 0) - (b[5] || 0),
      defaultSortOrder: 'descend',
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={50}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(2)}
          />
        );
      },
    },
    {
      title: 'Avg Upload (Mbps)',
      dataIndex: 6,
      key: 'upload',
      width: 170,
      sorter: (a, b) => (a[6] || 0) - (b[6] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={15}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(2)}
          />
        );
      },
    },
    {
      title: 'Avg Latency (ms)',
      dataIndex: 7,
      key: 'latency',
      width: 160,
      sorter: (a, b) => (a[7] || 0) - (b[7] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(numVal)) return 'N/A';
        return (
          <MiniBar
            value={numVal}
            max={100}
            color="#509ee3"
            width={60}
            formatValue={(val) => val.toFixed(1)}
          />
        );
      },
    },
    {
      title: 'Availability (%)',
      dataIndex: 8,
      key: 'availability',
      width: 170,
      sorter: (a, b) => (a[8] || 0) - (b[8] || 0),
      render: (value) => {
        const numVal = typeof value === 'number' ? value : parseFloat(value);
        const percent = isNaN(numVal) ? 0 : numVal;
        const color = percent >= 95 ? '#10b981' : percent >= 90 ? '#f59e0b' : '#ef4444';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '13px', color, fontWeight: 'bold' }}>
              {numVal.toFixed(2)}%
            </span>
            <div
              style={{
                width: '60px',
                height: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: 'Violations',
      dataIndex: 9,
      key: 'violations',
      width: 130,
      sorter: (a, b) => (a[9] || 0) - (b[9] || 0),
      render: (value) => {
        const numVal = value || 0;
        const color = numVal > 5 ? '#ef4444' : '#509ee3';
        return (
          <MiniBar
            value={numVal}
            max={10}
            color={color}
            width={60}
            formatValue={(val) => val}
          />
        );
      },
    },
  ];

  // ISP Performance table data (automatically filtered by Metabase query)
  const ispPerformanceTableData = React.useMemo(() => {
    if (!ispPerformanceData || !ispPerformanceData.rows) return [];

    // Data is already filtered by Division/District/ISP via Metabase template tags
    return ispPerformanceData.rows.map((row, index) => ({
      key: `isp-perf-${index}`,
      0: row[0],  // Division
      1: row[1],  // District
      2: row[2],  // ISP
      3: row[3],  // License Category
      4: row[4],  // PoP Count
      5: row[5],  // Avg Download (Mbps)
      6: row[6],  // Avg Upload (Mbps)
      7: row[7],  // Avg Latency (ms)
      8: row[8],  // Availability (%)
      9: row[9],  // Violations
    }));
  }, [ispPerformanceData]);

  return (
    <div style={{ background: '#f0f2f5', width: '100%', minHeight: '70vh' }}>
      {/* Page Container - Full Width */}
      <div style={{ width: '100%', padding: '32px' }}>

        {/* Breadcrumb Navigation */}
        <Breadcrumb style={{ marginBottom: 16, marginTop: 16 }}>
          <Breadcrumb.Item>
            <HomeOutlined />
            <span style={{ marginLeft: 8 }}>Home</span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <DatabaseOutlined />
            <span style={{ marginLeft: 8 }}>Regulatory Dashboard</span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <EnvironmentOutlined />
            <span style={{ marginLeft: 8 }}>Regional Analysis</span>
          </Breadcrumb.Item>
          {filters.division && (
            <Breadcrumb.Item>{filters.division}</Breadcrumb.Item>
          )}
          {filters.district && (
            <Breadcrumb.Item>{filters.district}</Breadcrumb.Item>
          )}
        </Breadcrumb>

        {/* Page Header */}
        <Card
          bordered={false}
          style={{ marginBottom: 24 }}
          bodyStyle={{ padding: '24px 32px' }}
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 'bold',
              margin: 0,
              color: '#1f2937'
            }}>
              Regional Violation Analysis
            </h1>
            <p style={{
              fontSize: 14,
              color: '#6b7280',
              margin: 0
            }}>
              SLA violation distribution across divisions and districts
            </p>
          </Space>
        </Card>

        {/* Filters */}
        <div style={{ marginBottom: 24 }}>
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            divisions={divisions}
            districts={districts}
            isps={isps}
            loading={violationLoading || districtLoading || ispPerformanceLoading}
          />
        </div>

        {/* Error alerts */}
        {(violationError || districtError) && (
          <Alert
            title="Error Loading Data"
            description={violationError?.message || districtError?.message}
            type="error"
            closable
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Division Level */}
        {!filters.division && (
          <>
            {/* Section Header */}
            <div style={{ marginBottom: 24 }}>
              <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
                Division Level Analysis
              </Divider>
              <p style={{ color: '#6b7280', marginLeft: 24, marginTop: -12 }}>
                Overview of violations across all 8 divisions
              </p>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title="Division Violation Map"
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  {violationLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <ChoroplethMap
                      geojson={divisionMapData}
                      title="Division Violations"
                      valueLabel="Violations"
                      onRegionClick={handleDivisionClick}
                      height="500px"
                      tileStyle="osm"
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title="Division Violation Ranking"
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  {violationLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <BarChart
                      categories={divisionChartData.categories}
                      values={divisionChartData.values}
                      title="Total Violations by Division"
                      yAxisLabel="Total Violations"
                      seriesName="Violations"
                      onBarClick={handleBarClick}
                      height={500}
                      color="#ef4444"
                    />
                  )}
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <Card
                  title="Division Violation Summary"
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                <DataTable
                  columns={divisionColumns}
                  dataSource={divisionTableData}
                  loading={violationLoading}
                  pageSize={8}
                  showPagination={false}
                  onRowClick={(record) => {
                    // Drill down into division
                    setFilters({ ...filters, division: record[0], district: undefined });
                  }}
                />
              </Card>
            </Col>
          </Row>
        </>
        )}

        {/* District Level */}
        {filters.division && !filters.district && (
          <>
            {/* Section Header */}
            <div style={{ marginBottom: 24 }}>
              <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
                District Level Analysis - {filters.division}
              </Divider>
              <p style={{ color: '#6b7280', marginLeft: 24, marginTop: -12 }}>
                Detailed violations breakdown by district in {filters.division} division
              </p>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title="District Violation Map"
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  {districtLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <ChoroplethMap
                      geojson={districtMapData}
                      title={`Districts in ${filters.division}`}
                      valueLabel="Avg Download (Mbps)"
                      onRegionClick={handleDistrictClick}
                      height="500px"
                      tileStyle="osm"
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title="R2.4 District Ranking Table"
                  bordered={false}
                  bodyStyle={{ padding: '24px' }}
                  style={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  {districtLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <DataTable
                      columns={districtColumns}
                      dataSource={districtTableData}
                      loading={districtLoading}
                      pageSize={10}
                      onRowClick={(record) => {
                        // Drill down into district
                        setFilters({ ...filters, district: record[1] });
                      }}
                      scroll={{ x: 1200 }}
                    />
                  )}
                </Card>
              </Col>
            </Row>
        </>
        )}

        {/* R2.3: ISP Performance by Area (ALWAYS VISIBLE at bottom, filtered by division/district) */}
        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            R2.3 ISP Performance by Area
          </Divider>
          <p style={{ color: '#6b7280', marginLeft: 24, marginTop: -12 }}>
            {filters.district
              ? `ISP performance in ${filters.district}, ${filters.division}`
              : filters.division
              ? `ISP performance in ${filters.division} division`
              : 'ISP performance nationwide'}
          </p>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              title={
                filters.district
                  ? `ISPs in ${filters.district}`
                  : filters.division
                  ? `ISPs in ${filters.division}`
                  : 'All ISPs Nationwide'
              }
              bordered={false}
              bodyStyle={{ padding: '24px' }}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              {ispPerformanceLoading ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                  <Spin size="large" />
                </div>
              ) : (
                <DataTable
                  columns={ispPerformanceColumns}
                  dataSource={ispPerformanceTableData}
                  loading={ispPerformanceLoading}
                  pageSize={15}
                  scroll={{ x: 1400 }}
                />
              )}
            </Card>
          </Col>
        </Row>

      </div>
      {/* End Page Container */}
    </div>
  );
};

export default RegionalAnalysis;
