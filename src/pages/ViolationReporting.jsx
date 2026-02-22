/**
 * Violation Reporting Tab (R2.3)
 * Cards 82-87: KPI scalars, Detail Table, Trend Chart, District Breakdown
 */

import React, { useState } from 'react';
import { Row, Col, Card, Tag, Spin, Alert, Button, Breadcrumb } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import ScalarCard from '../components/charts/ScalarCard';
import DataTable from '../components/charts/DataTable';
import useMetabaseData from '../hooks/useMetabaseData';

// Chart colors matching Metabase (assigned alphabetically by Metabase's default palette)
const SEVERITY_CHART_COLORS = {
  CRITICAL: '#22c55e',  // green  (matches Metabase CRITICAL=green)
  HIGH:     '#7c3aed',  // purple (matches Metabase HIGH=purple)
  LOW:      '#eab308',  // yellow (matches Metabase LOW=yellow)
  MEDIUM:   '#f97316',  // orange/salmon (matches Metabase MEDIUM=pink-orange)
};

// Parse date from ISO string "2025-12-01T00:00:00+06:00" → "2025-12-01"
const parseToDateStr = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
};

// Format date for chart X-axis label "2025-12-01" → "December 1, 2025"
const formatDateLabel = (dateStr) => {
  const d = parseToDateStr(dateStr);
  if (!d) return dateStr;
  try {
    const date = new Date(d + 'T12:00:00'); // Use noon to avoid timezone offset issues
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
};

// Severity color mapping
const SEVERITY_COLORS = {
  CRITICAL: { color: '#ef4444', bg: '#fef2f2', text: 'red' },
  HIGH:     { color: '#f97316', bg: '#fff7ed', text: 'orange' },
  MEDIUM:   { color: '#eab308', bg: '#fefce8', text: 'gold' },
  LOW:      { color: '#22c55e', bg: '#f0fdf4', text: 'green' },
};

// Status color mapping
const STATUS_COLORS = {
  INVESTIGATING: 'blue',
  RESOLVED:      'green',
  PENDING:       'orange',
  DISPUTED:      'purple',
  CLOSED:        'default',
};

// Violation type labels
const TYPE_LABELS = {
  THRESHOLD_BREACH: 'Threshold Breach',
  AVAILABILITY:     'Availability',
  LATENCY:          'Latency',
  PACKET_LOSS:      'Packet Loss',
  JITTER:           'Jitter',
};

const SeverityTag = ({ severity }) => {
  const config = SEVERITY_COLORS[severity] || { text: 'default' };
  return <Tag color={config.text}>{severity}</Tag>;
};

const StatusTag = ({ status }) => {
  const color = STATUS_COLORS[status] || 'default';
  return <Tag color={color}>{status}</Tag>;
};

const ViolationReporting = ({ startDate = null, endDate = null }) => {
  // Drill-down state: null = daily view, 'YYYY-MM-DD' = hourly view for that day
  const [selectedDay, setSelectedDay] = useState(null);

  // Reset hourly drill-down when date range changes
  React.useEffect(() => {
    setSelectedDay(null);
  }, [startDate, endDate]);

  // Date filter params (all cards 82-87 support start_date/end_date)
  const dateFilters = React.useMemo(() => ({
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate   ? { end_date:   endDate   } : {}),
  }), [startDate, endDate]);

  // --- Data Hooks ---
  const { data: pendingData,  loading: pendingLoading  } = useMetabaseData(82, dateFilters);
  const { data: disputedData, loading: disputedLoading } = useMetabaseData(83, dateFilters);
  const { data: resolvedData, loading: resolvedLoading } = useMetabaseData(84, dateFilters);
  const { data: detailData,   loading: detailLoading   } = useMetabaseData(85, dateFilters);
  const { data: trendData,    loading: trendLoading    } = useMetabaseData(86, dateFilters);
  const { data: districtData, loading: districtLoading } = useMetabaseData(87, dateFilters);

  // --- KPI Values ---
  // Cards 82, 83, 84 return scalar: rows = [[value]]
  const pendingCount  = pendingData?.rows?.[0]?.[0]  ?? 0;
  const disputedCount = disputedData?.rows?.[0]?.[0] ?? 0;
  const resolvedCount = resolvedData?.rows?.[0]?.[0] ?? 0;

  // --- Card 85: Violation Detail Table columns ---
  // Columns: ID, ISP, Type, Severity, Division, District, Status, Detected At, Expected, Actual, Deviation %, Affected Subscribers
  const detailColumns = [
    {
      title: 'ID',
      dataIndex: 0,
      key: 'id',
      width: 60,
      fixed: 'left',
      sorter: (a, b) => (a[0] || 0) - (b[0] || 0),
    },
    {
      title: 'ISP',
      dataIndex: 1,
      key: 'isp',
      width: 160,
      fixed: 'left',
      sorter: (a, b) => (a[1] || '').localeCompare(b[1] || ''),
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 2,
      key: 'type',
      width: 140,
      render: (val) => TYPE_LABELS[val] || val,
    },
    {
      title: 'Severity',
      dataIndex: 3,
      key: 'severity',
      width: 100,
      filters: [
        { text: 'CRITICAL', value: 'CRITICAL' },
        { text: 'HIGH',     value: 'HIGH' },
        { text: 'MEDIUM',   value: 'MEDIUM' },
        { text: 'LOW',      value: 'LOW' },
      ],
      onFilter: (value, record) => record[3] === value,
      render: (val) => <SeverityTag severity={val} />,
    },
    {
      title: 'Division',
      dataIndex: 4,
      key: 'division',
      width: 110,
    },
    {
      title: 'District',
      dataIndex: 5,
      key: 'district',
      width: 110,
    },
    {
      title: 'Status',
      dataIndex: 6,
      key: 'status',
      width: 130,
      filters: [
        { text: 'INVESTIGATING', value: 'INVESTIGATING' },
        { text: 'RESOLVED',      value: 'RESOLVED' },
        { text: 'PENDING',       value: 'PENDING' },
        { text: 'DISPUTED',      value: 'DISPUTED' },
      ],
      onFilter: (value, record) => record[6] === value,
      render: (val) => <StatusTag status={val} />,
    },
    {
      title: 'Detected At',
      dataIndex: 7,
      key: 'detectedAt',
      width: 150,
      sorter: (a, b) => new Date(a[7]) - new Date(b[7]),
      render: (val) => {
        if (!val) return '-';
        try {
          const d = new Date(val);
          return d.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', hour12: false });
        } catch {
          return val;
        }
      },
    },
    {
      title: 'Expected (Mbps)',
      dataIndex: 8,
      key: 'expected',
      width: 130,
      align: 'right',
      sorter: (a, b) => (a[8] || 0) - (b[8] || 0),
      render: (val) => (typeof val === 'number' ? val.toFixed(2) : val),
    },
    {
      title: 'Actual (Mbps)',
      dataIndex: 9,
      key: 'actual',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a[9] || 0) - (b[9] || 0),
      render: (val) => (typeof val === 'number' ? val.toFixed(2) : val),
    },
    {
      title: 'Deviation %',
      dataIndex: 10,
      key: 'deviation',
      width: 110,
      align: 'right',
      sorter: (a, b) => (a[10] || 0) - (b[10] || 0),
      render: (val) => {
        const num = typeof val === 'number' ? val : parseFloat(val) || 0;
        const color = num > 20 ? '#ef4444' : num > 10 ? '#f97316' : '#22c55e';
        return (
          <span style={{ color, fontWeight: 600 }}>
            {num.toFixed(1)}%
          </span>
        );
      },
    },
    {
      title: 'Affected Subscribers',
      dataIndex: 11,
      key: 'subscribers',
      width: 150,
      align: 'right',
      sorter: (a, b) => (a[11] || 0) - (b[11] || 0),
      render: (val) => (val ? val.toLocaleString() : '0'),
    },
  ];

  const detailTableData = React.useMemo(() => {
    if (!detailData?.rows) return [];
    return detailData.rows.map((row, i) => ({
      key: `v-${i}`,
      0:  row[0],   // ID
      1:  row[1],   // ISP
      2:  row[2],   // Type
      3:  row[3],   // Severity
      4:  row[4],   // Division
      5:  row[5],   // District
      6:  row[6],   // Status
      7:  row[7],   // Detected At
      8:  row[8],   // Expected
      9:  row[9],   // Actual
      10: row[10],  // Deviation %
      11: row[11],  // Affected Subscribers
    }));
  }, [detailData]);

  // --- Card 86: Daily violation trend (grouped bars, matching Metabase) ---
  // Rows: [Date, Severity, Count] → grouped bar chart per date
  const dailyTrendOption = React.useMemo(() => {
    if (!trendData?.rows?.length) return null;

    // Normalize all dates to YYYY-MM-DD (handles ISO timestamps)
    const rows = trendData.rows.map((r) => [parseToDateStr(r[0]), r[1], r[2]]);

    const dates = [...new Set(rows.map((r) => r[0]))].sort();
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const severities = severityOrder.filter((s) => rows.some((r) => r[1] === s));

    const series = severities.map((sev) => ({
      name: sev,
      type: 'bar',
      // NOT stacked → grouped bars matching Metabase
      data: dates.map((date) => {
        const found = rows.find((r) => r[0] === date && r[1] === sev);
        return found ? found[2] : 0;
      }),
      itemStyle: { color: SEVERITY_CHART_COLORS[sev] },
      emphasis: { focus: 'series' },
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const dateLabel = formatDateLabel(dates[params[0]?.dataIndex]);
          let tip = `<strong>${dateLabel}</strong><br/>`;
          params.forEach((p) => {
            if (p.value > 0) {
              tip += `<span style="color:${SEVERITY_CHART_COLORS[p.seriesName] || p.color}">■</span> ${p.seriesName}: <strong>${p.value}</strong><br/>`;
            }
          });
          const total = params.reduce((sum, p) => sum + (p.value || 0), 0);
          tip += `<span style="color:#666">Total: <strong>${total}</strong></span>`;
          tip += `<br/><span style="color:#3b82f6;font-size:11px">Click to see hourly breakdown</span>`;
          return tip;
        },
      },
      legend: {
        data: severities,
        bottom: 5,
        textStyle: { fontSize: 12 },
      },
      grid: { left: '3%', right: '4%', bottom: '20%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        // Store raw dates for click handler, format labels for display
        data: dates,
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 55,
        axisLabel: {
          rotate: 45,
          fontSize: 11,
          formatter: (val) => formatDateLabel(val), // "December 1, 2025"
        },
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        nameTextStyle: { fontSize: 12 },
        minInterval: 1,
      },
      series,
    };
  }, [trendData]);

  // --- Hourly drill-down: derive from Card 85 (Detected At timestamps) ---
  const hourlyTrendOption = React.useMemo(() => {
    if (!selectedDay || !detailData?.rows?.length) return null;

    // Filter Card 85 rows for the selected day
    const dayRows = detailData.rows.filter((row) => {
      const detectedAt = row[7];
      return detectedAt && parseToDateStr(detectedAt) === selectedDay;
    });

    if (dayRows.length === 0) return null;

    // Build hour buckets (00:00 → 23:00)
    const hourMap = {};
    dayRows.forEach((row) => {
      const severity = row[3];
      try {
        const d = new Date(row[7]);
        const hour = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (!hourMap[hour]) hourMap[hour] = {};
        hourMap[hour][severity] = (hourMap[hour][severity] || 0) + 1;
      } catch { /* skip invalid dates */ }
    });

    const activeHours = Object.keys(hourMap).sort();
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const severities = severityOrder.filter((s) => dayRows.some((r) => r[3] === s));

    const series = severities.map((sev) => ({
      name: sev,
      type: 'bar',
      data: activeHours.map((h) => hourMap[h]?.[sev] || 0),
      itemStyle: { color: SEVERITY_CHART_COLORS[sev] },
      emphasis: { focus: 'series' },
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          let tip = `<strong>${formatDateLabel(selectedDay)} ${params[0]?.axisValue}</strong><br/>`;
          params.forEach((p) => {
            if (p.value > 0) {
              tip += `<span style="color:${SEVERITY_CHART_COLORS[p.seriesName] || p.color}">■</span> ${p.seriesName}: <strong>${p.value}</strong><br/>`;
            }
          });
          return tip;
        },
      },
      legend: { data: severities, bottom: 5, textStyle: { fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '20%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: activeHours,
        name: 'Hour',
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        nameTextStyle: { fontSize: 12 },
        minInterval: 1,
      },
      series,
    };
  }, [selectedDay, detailData]);

  // --- Card 87: Violations by District table ---
  // Columns: Division, District, Total, Critical, High, Medium, Low
  const districtColumns = [
    {
      title: 'Division',
      dataIndex: 0,
      key: 'division',
      width: 110,
      sorter: (a, b) => (a[0] || '').localeCompare(b[0] || ''),
    },
    {
      title: 'District',
      dataIndex: 1,
      key: 'district',
      width: 120,
      sorter: (a, b) => (a[1] || '').localeCompare(b[1] || ''),
    },
    {
      title: 'Total',
      dataIndex: 2,
      key: 'total',
      width: 80,
      align: 'right',
      sorter: (a, b) => (a[2] || 0) - (b[2] || 0),
      defaultSortOrder: 'descend',
      render: (val) => (
        <span style={{ fontWeight: 700, color: val > 10 ? '#ef4444' : '#1f2937' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Critical',
      dataIndex: 3,
      key: 'critical',
      width: 80,
      align: 'right',
      sorter: (a, b) => (a[3] || 0) - (b[3] || 0),
      render: (val) => val > 0 ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: 'High',
      dataIndex: 4,
      key: 'high',
      width: 70,
      align: 'right',
      sorter: (a, b) => (a[4] || 0) - (b[4] || 0),
      render: (val) => val > 0 ? <span style={{ color: '#f97316', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: 'Medium',
      dataIndex: 5,
      key: 'medium',
      width: 80,
      align: 'right',
      sorter: (a, b) => (a[5] || 0) - (b[5] || 0),
      render: (val) => val > 0 ? <span style={{ color: '#eab308', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#999' }}>0</span>,
    },
    {
      title: 'Low',
      dataIndex: 6,
      key: 'low',
      width: 70,
      align: 'right',
      sorter: (a, b) => (a[6] || 0) - (b[6] || 0),
      render: (val) => val > 0 ? <span style={{ color: '#22c55e', fontWeight: 600 }}>{val}</span> : <span style={{ color: '#999' }}>0</span>,
    },
  ];

  const districtTableData = React.useMemo(() => {
    if (!districtData?.rows) return [];
    return districtData.rows.map((row, i) => ({
      key: `d-${i}`,
      0: row[0], // Division
      1: row[1], // District
      2: row[2], // Total
      3: row[3], // Critical
      4: row[4], // High
      5: row[5], // Medium
      6: row[6], // Low
    }));
  }, [districtData]);

  // --- Render ---
  return (
    <div style={{ width: '100%', padding: '24px', background: '#f0f2f5', minHeight: '70vh' }}>

      {/* Page Header */}
      <Card bordered={false} style={{ marginBottom: 24 }} bodyStyle={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WarningOutlined style={{ fontSize: 28, color: '#ef4444' }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
              Violation Reporting
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Detailed SLA violation analysis and reporting
            </p>
          </div>
        </div>
      </Card>

      {/* Row 1: KPI Scalar Cards (82, 83, 84) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <ScalarCard
            title="Pending Violations"
            value={pendingCount}
            icon={<ExclamationCircleOutlined />}
            color="#f97316"
            subtitle="Violations awaiting action"
            loading={pendingLoading}
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            title="Active (Disputed)"
            value={disputedCount}
            icon={<WarningOutlined />}
            color="#8b5cf6"
            subtitle="Violations under dispute"
            loading={disputedLoading}
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            title="Resolved Violations"
            value={resolvedCount}
            icon={<CheckCircleOutlined />}
            color="#22c55e"
            subtitle="Successfully resolved cases"
            loading={resolvedLoading}
          />
        </Col>
      </Row>

      {/* Row 2: Violation Detail Table (Card 85) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ marginRight: 8, color: '#ef4444' }} />
                R3.4 Violation Detail Table
                {detailData?.rows && (
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 12 }}>
                    ({detailData.rows.length} total violations)
                  </span>
                )}
              </span>
            }
            bordered={false}
          >
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
              </div>
            ) : !detailData?.rows?.length ? (
              <Alert message="No violation data available" type="info" showIcon />
            ) : (
              <DataTable
                columns={detailColumns}
                dataSource={detailTableData}
                loading={false}
                pageSize={10}
                scroll={{ x: 1400 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Trend Chart (86) + District Breakdown (87) */}
      <Row gutter={[16, 16]}>
        {/* Card 86: Violation Trend by Severity with drill-down */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  {selectedDay ? (
                    <>
                      <ClockCircleOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                      R3.5 Hourly Breakdown — {formatDateLabel(selectedDay)}
                    </>
                  ) : (
                    'R3.5 Violation Trend by Severity'
                  )}
                </span>
                {selectedDay && (
                  <Button
                    size="small"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setSelectedDay(null)}
                    style={{ marginLeft: 16 }}
                  >
                    Back to Daily
                  </Button>
                )}
              </div>
            }
            bordered={false}
            style={{ height: '100%' }}
            extra={
              !selectedDay && (
                <span style={{ fontSize: 11, color: '#888' }}>
                  Click a bar to drill into hourly data
                </span>
              )
            }
          >
            {trendLoading || (selectedDay && detailLoading) ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Spin size="large" />
              </div>
            ) : selectedDay ? (
              // Hourly view after clicking a day
              hourlyTrendOption ? (
                <ReactECharts
                  option={hourlyTrendOption}
                  style={{ height: '380px', width: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              ) : (
                <Alert
                  message={`No hourly data for ${formatDateLabel(selectedDay)}`}
                  description="No violations were recorded in the detail table for this date."
                  type="info"
                  showIcon
                />
              )
            ) : dailyTrendOption ? (
              // Daily view (default)
              <ReactECharts
                option={dailyTrendOption}
                style={{ height: '380px', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
                onEvents={{
                  click: (params) => {
                    // params.dataIndex = index in the dates array
                    if (params.componentType === 'series') {
                      const rawDates = [...new Set(
                        trendData.rows.map((r) => parseToDateStr(r[0]))
                      )].sort();
                      const clickedDate = rawDates[params.dataIndex];
                      if (clickedDate) setSelectedDay(clickedDate);
                    }
                  },
                }}
              />
            ) : (
              <Alert message="No trend data available" type="info" showIcon />
            )}
          </Card>
        </Col>

        {/* Card 87: Violations by District */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                R3.6 Violations by District
                {districtData?.rows && (
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 12 }}>
                    ({districtData.rows.length} districts)
                  </span>
                )}
              </span>
            }
            bordered={false}
            style={{ height: '100%' }}
          >
            {districtLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Spin size="large" />
              </div>
            ) : !districtData?.rows?.length ? (
              <Alert message="No district data available" type="info" showIcon />
            ) : (
              <DataTable
                columns={districtColumns}
                dataSource={districtTableData}
                loading={false}
                pageSize={10}
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ViolationReporting;
