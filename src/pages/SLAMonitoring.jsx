/**
 * SLA Monitoring Tab (R2.1)
 * Cards 76-81: SLA compliance metrics, violations, ISP performance
 */

import React, { useState } from 'react';
import { Row, Col, Card, Spin, Alert, Divider, Space } from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, WarningOutlined, AlertOutlined } from '@ant-design/icons';
import ScalarCard from '../components/charts/ScalarCard';
import DataTable from '../components/charts/DataTable';
import FilterPanel from '../components/filters/FilterPanel';
import useMetabaseData from '../hooks/useMetabaseData';

const SLAMonitoring = ({ startDate = null, endDate = null }) => {
  // Local geographic filter state
  const [filters, setFilters] = useState({
    division: undefined,
    district: undefined,
    isp: undefined,
  });

  // Merge global date range into every API call
  const effectiveFilters = React.useMemo(() => ({
    ...filters,
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate   ? { end_date:   endDate   } : {}),
  }), [filters, startDate, endDate]);

  // Fetch data from Metabase cards (cards 79-80 support date filter; 76-78 do not)
  const { data: complianceData, loading: loading76, error: error76 } = useMetabaseData(76, filters);
  const { data: criticalData,   loading: loading77, error: error77 } = useMetabaseData(77, filters);
  const { data: ispsBelowData,  loading: loading78, error: error78 } = useMetabaseData(78, filters);
  const { data: packageData,    loading: loading79, error: error79 } = useMetabaseData(79, effectiveFilters);
  const { data: trendData,      loading: loading80, error: error80 } = useMetabaseData(80, effectiveFilters);
  // Card 81 moved to R2.2 Regional Analysis tab

  // Combine loading and error states
  const dataLoading = loading76 || loading77 || loading78 || loading79 || loading80;
  const hasError = error76 || error77 || error78 || error79 || error80;

  // Extract scalar values
  const complianceRate = complianceData?.rows?.[0]?.[0] || 0;
  const criticalCount = criticalData?.rows?.[0]?.[0] || 0;
  const ispsBelowThreshold = ispsBelowData?.rows?.[0]?.[0] || 0;

  // Transform trend data for table
  const trendTableData = React.useMemo(() => {
    if (!trendData || !trendData.rows) return [];

    return trendData.rows.map((row, index) => ({
      key: `trend-${index}`,
      0: row[0], // Date
      1: row[1], // Compliance %
    }));
  }, [trendData]);

  // Transform package data for table
  const packageTableData = React.useMemo(() => {
    if (!packageData || !packageData.rows) return [];

    return packageData.rows.map((row, index) => ({
      key: `pkg-${index}`,
      0: row[0], // Package Tier
      1: row[1], // Target Download
      2: row[2], // Actual Avg
      3: row[3], // Compliance %
    }));
  }, [packageData]);

  // Filter options (empty for SLA Monitoring tab - filters handled in Regional Analysis)
  const divisions = [];
  const districts = [];
  const isps = [];

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      division: undefined,
      district: undefined,
      isp: undefined,
    });
  };

  // Table columns
  const packageColumns = [
    { title: 'Package Tier', dataIndex: 0, key: 'package', width: 200 },
    { title: 'Target Download (Mbps)', dataIndex: 1, key: 'target', width: 150, render: (val) => {
      return typeof val === 'number' ? val.toFixed(2) : (val || 'N/A');
    }},
    { title: 'Actual Avg (Mbps)', dataIndex: 2, key: 'actual', width: 150, render: (val) => {
      return typeof val === 'number' ? val.toFixed(2) : (val || 'N/A');
    }},
    { title: 'Compliance %', dataIndex: 3, key: 'compliance', width: 120, render: (val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      const percent = isNaN(numVal) ? 0 : numVal;
      const color = percent >= 90 ? '#10b981' : percent >= 70 ? '#f59e0b' : '#ef4444';
      return <span style={{ color, fontWeight: 'bold' }}>{typeof val === 'number' ? val.toFixed(1) : percent.toFixed(1)}%</span>;
    }},
  ];

  // Scorecard columns moved to R2.2 Regional Analysis tab

  const trendColumns = [
    { title: 'Date', dataIndex: 0, key: 'date', width: 200 },
    { title: 'SLA Compliance %', dataIndex: 1, key: 'compliance', width: 150, render: (val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      const percent = isNaN(numVal) ? 0 : numVal;
      const color = percent >= 90 ? '#10b981' : percent >= 70 ? '#f59e0b' : '#ef4444';
      return <span style={{ color, fontWeight: 'bold' }}>{typeof val === 'number' ? val.toFixed(2) : percent.toFixed(2)}%</span>;
    }},
  ];

  return (
    <div style={{ width: '100%', padding: '32px', background: '#f0f2f5', minHeight: '70vh' }}>
      {/* Page Header */}
      <Card
        bordered={false}
        style={{ marginBottom: 24, marginTop: 16 }}
        bodyStyle={{ padding: '32px 40px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DatabaseOutlined style={{ fontSize: 32, color: '#3b82f6' }} />
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 'bold',
              margin: 0,
              color: '#1f2937'
            }}>
              SLA Monitoring
            </h1>
            <p style={{
              fontSize: 14,
              color: '#6b7280',
              margin: 0
            }}>
              Real-time SLA compliance tracking and ISP performance scorecard
            </p>
          </div>
        </div>
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
          loading={dataLoading}
        />
      </div>

      {/* Error Alert */}
      {hasError && (
        <Alert
          title="Error Loading Data"
          description="Some cards failed to load data from Metabase. Please check your connection and try again."
          type="error"
          closable
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Key Metrics Section */}
      <div style={{ marginBottom: 24 }}>
        <Divider orientation="left" style={{ fontSize: 18, fontWeight: 'bold' }}>
          Key Performance Indicators
        </Divider>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ScalarCard
            value={complianceRate}
            title="Overall SLA Compliance Rate"
            unit="%"
            icon={<CheckCircleOutlined />}
            color="#10b981"
            loading={loading76}
            precision={2}
            subtitle="Percentage of measurements meeting SLA"
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            value={criticalCount}
            title="Critical Violations"
            icon={<AlertOutlined />}
            color="#ef4444"
            loading={loading77}
            precision={0}
            subtitle="High severity SLA violations"
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            value={ispsBelowThreshold}
            title="ISPs Below Threshold"
            icon={<WarningOutlined />}
            color="#f59e0b"
            loading={loading78}
            precision={0}
            subtitle="ISPs not meeting minimum SLA"
          />
        </Col>
      </Row>

      {/* Compliance Trend Section */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <Divider orientation="left" style={{ fontSize: 18, fontWeight: 'bold' }}>
          Compliance Trend Analysis
        </Divider>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title="SLA Compliance Trend Over Time"
            bordered={false}
            bodyStyle={{ padding: '24px' }}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {loading80 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
              </div>
            ) : error80 ? (
              <Alert
                title="Failed to load trend data"
                description={error80.message}
                type="warning"
                showIcon
              />
            ) : (
              <DataTable
                columns={trendColumns}
                dataSource={trendTableData}
                loading={loading80}
                pageSize={15}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Package Performance Section */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        <Divider orientation="left" style={{ fontSize: 18, fontWeight: 'bold' }}>
          Performance by Package Tier
        </Divider>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title="SLA Compliance by Package Tier"
            bordered={false}
            bodyStyle={{ padding: '24px' }}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {loading79 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
              </div>
            ) : error79 ? (
              <Alert
                title="Failed to load package data"
                description={error79.message}
                type="warning"
                showIcon
              />
            ) : (
              <DataTable
                columns={packageColumns}
                dataSource={packageTableData}
                loading={loading79}
                pageSize={10}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ISP Performance Scorecard moved to R2.2 Regional Analysis tab */}
    </div>
  );
};

export default SLAMonitoring;
