# Complete Regulatory Dashboard Implementation Guide

Step-by-step guide to add all charts from Metabase Regulatory Dashboard to React.

## 📋 Overview

**Goal:** Implement all charts from Regulatory Dashboard (Dashboard ID: 6) with:
- ✅ Proper filtering (Division, District, ISP)
- ✅ Drill-down navigation
- ✅ Real-time data from Metabase API

**Dashboard Structure:**
- **Tab R2.1:** SLA Monitoring (6 charts)
- **Tab R2.2:** Regional Analysis (6 charts + 2 maps) ✅ **Current**
- **Tab R2.3:** Violation Reporting (6 charts)

---

## 🎯 Implementation Steps

### Step 1: Verify Existing Setup ✅ DONE

- [x] Metabase API integration (`src/api/metabase.js`)
- [x] Custom hooks (`src/hooks/useMetabaseData.js`)
- [x] Data transformation utilities (`src/utils/dataTransform.js`)
- [x] Filter panel (`src/components/filters/FilterPanel.jsx`)
- [x] Basic charts (BarChart, DataTable, ChoroplethMap)

### Step 2: Create Card Configuration ✅ DONE

- [x] Card configuration file (`src/config/cardConfig.js`)
- [x] Maps card IDs to types, filters, and drill-down rules

### Step 3: Add Missing Chart Components

**Priority Order:**
1. Scalar Card (for metrics)
2. Line Chart (for trends)
3. Heatmap (for violation patterns)

#### 3.1 Create Scalar Card Component

```bash
# File: src/components/charts/ScalarCard.jsx
```

**Features:**
- Large number display
- Icon and color based on metric type
- Comparison vs previous period
- Click to drill-down

**Example:**
```jsx
<ScalarCard
  value={94.5}
  title="SLA Compliance Rate"
  unit="%"
  icon="✓"
  color="#10b981"
  trend={+2.5}
  onClick={() => drillDown()}
/>
```

#### 3.2 Create Line Chart Component

```bash
# File: src/components/charts/LineChart.jsx
```

**Features:**
- Multiple series support
- Date range filtering
- Zoom and pan
- Legend toggle

**Example:**
```jsx
<LineChart
  data={trendData}
  series={['Critical', 'High', 'Medium', 'Low']}
  xAxis="Date"
  yAxis="Count"
/>
```

#### 3.3 Create Heatmap Component

```bash
# File: src/components/charts/Heatmap.jsx
```

**Features:**
- 2D grid visualization
- Color intensity scale
- Tooltip on hover
- Click to filter

---

## 📊 Step 4: Implement Tab-Based Navigation

### 4.1 Create Tab Layout

```jsx
// File: src/pages/RegulatoryDashboard.jsx

import { Tabs } from 'antd';

const RegulatoryDashboard = () => {
  return (
    <Tabs defaultActiveKey="r2.1">
      <Tabs.TabPane tab="R2.1 SLA Monitoring" key="r2.1">
        <SLAMonitoringTab />
      </Tabs.TabPane>
      <Tabs.TabPane tab="R2.2 Regional Analysis" key="r2.2">
        <RegionalAnalysisTab />
      </Tabs.TabPane>
      <Tabs.TabPane tab="R2.3 Violation Reporting" key="r2.3">
        <ViolationReportingTab />
      </Tabs.TabPane>
    </Tabs>
  );
};
```

### 4.2 Create Individual Tab Components

```
src/pages/tabs/
├── SLAMonitoringTab.jsx    ← Cards 76-81
├── RegionalAnalysisTab.jsx ← Cards 82-87, 94-95 (current)
└── ViolationReportingTab.jsx ← Cards 88-93
```

---

## 🔧 Step 5: Implement Each Tab

### Tab R2.1: SLA Monitoring

**Layout:**
```
+------------------+------------------+------------------+
|   Card 76        |   Card 77        |   Card 78        |
| Compliance Rate  | Critical Violations | ISPs Below     |
|     94.5%        |       12         |       3          |
+------------------+------------------+------------------+
|                                                         |
|              Card 80: Compliance Trend (Line)          |
|                                                         |
+---------------------------------------------------------+
| Card 79: Compliance by Package (Table)                 |
+---------------------------------------------------------+
| Card 81: ISP Performance Scorecard (Table)             |
+---------------------------------------------------------+
```

**Implementation:**

```jsx
// File: src/pages/tabs/SLAMonitoringTab.jsx

import { Row, Col, Card } from 'antd';
import ScalarCard from '../../components/charts/ScalarCard';
import LineChart from '../../components/charts/LineChart';
import DataTable from '../../components/charts/DataTable';
import useMetabaseData from '../../hooks/useMetabaseData';

const SLAMonitoringTab = ({ filters }) => {
  // Fetch data for each card
  const { data: complianceData } = useMetabaseData(76, filters);
  const { data: criticalData } = useMetabaseData(77, filters);
  const { data: ispsBelowData } = useMetabaseData(78, filters);
  const { data: packageData } = useMetabaseData(79, filters);
  const { data: trendData } = useMetabaseData(80, filters);
  const { data: scorecardData } = useMetabaseData(81, filters);

  return (
    <>
      {/* Top Row: Scalars */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ScalarCard
            cardId={76}
            value={complianceData?.rows[0]?.[0]}
            title="SLA Compliance Rate"
            unit="%"
            icon="✓"
            color="#10b981"
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            cardId={77}
            value={criticalData?.rows[0]?.[0]}
            title="Critical Violations"
            icon="!"
            color="#ef4444"
          />
        </Col>
        <Col xs={24} md={8}>
          <ScalarCard
            cardId={78}
            value={ispsBelowData?.rows[0]?.[0]}
            title="ISPs Below Threshold"
            icon="⚠"
            color="#f59e0b"
          />
        </Col>
      </Row>

      {/* Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="SLA Compliance Trend">
            <LineChart
              data={trendData}
              xAxis="Date"
              yAxis="Compliance %"
            />
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Compliance by Package Tier">
            <DataTable
              columns={[
                { title: 'Package', dataIndex: 0 },
                { title: 'Target', dataIndex: 1 },
                { title: 'Actual', dataIndex: 2 },
                { title: 'Compliance %', dataIndex: 3 },
              ]}
              dataSource={packageData?.rows || []}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="ISP Performance Scorecard">
            <DataTable
              columns={[
                { title: 'ISP', dataIndex: 0 },
                { title: 'Compliance %', dataIndex: 1 },
                { title: 'Violations', dataIndex: 2 },
                { title: 'Status', dataIndex: 3 },
              ]}
              dataSource={scorecardData?.rows || []}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default SLAMonitoringTab;
```

---

### Tab R2.2: Regional Analysis ✅ CURRENT

**Status:** Partially implemented with Card 87

**Remaining Cards:**
- Card 82: Division Performance Summary (Table)
- Card 83: District Performance Ranking (Bar)
- Card 84: Regional Speed Distribution (Bar)
- Card 85: PoP Performance by Location (Table)
- Card 86: Urban vs Rural Performance (Bar)

---

### Tab R2.3: Violation Reporting

**Layout:**
```
+----------------------------------------------------------+
| Card 88: Recent Violations (Table)                       |
+----------------------------------------------------------+
| Card 89: Violation Trend by Severity (Line - Multi)     |
+----------------------------------------------------------+
+---------------------------+------------------------------+
| Card 90: Top Violating   | Card 91: Violation by       |
|          ISPs (Bar)      |          Time of Day (Bar)  |
+---------------------------+------------------------------+
| Card 92: Resolution Time | Card 93: Violation Heatmap  |
|          (Table)         |          (Heatmap)           |
+---------------------------+------------------------------+
```

---

## 🔍 Step 6: Implement Drill-Down Navigation

### 6.1 Drill-Down Rules

```javascript
// File: src/utils/drillDownRules.js

export const DRILL_DOWN_RULES = {
  // Click division → Filter to that division
  division_details: (value, currentFilters) => ({
    ...currentFilters,
    division: value,
    district: undefined,
    isp: undefined,
  }),

  // Click district → Filter to that district
  district_details: (value, currentFilters) => ({
    ...currentFilters,
    district: value,
    isp: undefined,
  }),

  // Click ISP → Filter to that ISP
  isp_details: (value, currentFilters) => ({
    ...currentFilters,
    isp: value,
  }),

  // Click violation → Show violation details modal
  violation_details: (value) => {
    // Open modal with violation ID
    return { showModal: true, violationId: value };
  },
};
```

### 6.2 Implement Drill-Down Handler

```jsx
// Add to each chart component

const handleDrillDown = (clickedValue, cardId) => {
  const card = getCard(cardId);
  if (!card.drillDown) return;

  const drillDownRule = DRILL_DOWN_RULES[card.drillDown];
  if (drillDownRule) {
    const newFilters = drillDownRule(clickedValue, filters);
    setFilters(newFilters);
  }
};
```

---

## 🎨 Step 7: Add Styling and Polish

### 7.1 Color Scheme

```javascript
// src/config/theme.js

export const COLORS = {
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Orange
  danger: '#ef4444',     // Red
  info: '#3b82f6',       // Blue
  primary: '#6366f1',    // Indigo

  severity: {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#f59e0b',
    LOW: '#84cc16',
  },
};
```

### 7.2 Loading States

```jsx
{loading ? (
  <div style={{ textAlign: 'center', padding: '100px 0' }}>
    <Spin size="large" />
    <p>Loading data...</p>
  </div>
) : (
  <ChartComponent data={data} />
)}
```

### 7.3 Error Handling

```jsx
{error && (
  <Alert
    message="Error Loading Data"
    description={error.message}
    type="error"
    showIcon
    closable
  />
)}
```

---

## ✅ Step 8: Testing Checklist

### Functionality Tests

- [ ] All cards load data correctly
- [ ] Filters update all cards
- [ ] Drill-down navigation works
- [ ] Browser back button works
- [ ] Reset button clears all filters
- [ ] Loading states display
- [ ] Error messages show
- [ ] Tooltips appear on hover

### Data Tests

- [ ] Card 76: Compliance rate displays correctly
- [ ] Card 77: Critical violations count accurate
- [ ] Card 78: ISPs below threshold correct
- [ ] Card 79: Package compliance table populated
- [ ] Card 80: Trend chart shows historical data
- [ ] Card 81: ISP scorecard rankings correct
- [ ] Card 82: Division summary accurate
- [ ] Card 83: District ranking correct
- [ ] Card 84: Speed distribution displayed
- [ ] Card 85: PoP performance listed
- [ ] Card 86: Urban/rural comparison shown
- [ ] Card 87: Violation summary correct ✅
- [ ] Card 88: Recent violations listed
- [ ] Card 89: Violation trend displayed
- [ ] Card 90: Top violating ISPs ranked
- [ ] Card 91: Time-of-day pattern shown
- [ ] Card 92: Resolution times calculated
- [ ] Card 93: Heatmap visualized
- [ ] Card 94: Division map displays ✅
- [ ] Card 95: District map displays ✅

### Filter Tests

- [ ] Division filter updates all cards
- [ ] District filter cascades correctly
- [ ] ISP filter applies properly
- [ ] Date range filter works
- [ ] Severity filter filters violations
- [ ] Multiple filters work together
- [ ] Reset clears all filters

### Drill-Down Tests

- [ ] Click division → Shows districts
- [ ] Click district → Shows ISPs
- [ ] Click ISP → Shows details
- [ ] Click violation → Shows modal
- [ ] Breadcrumb navigation works
- [ ] URL updates on drill-down

---

## 📦 Step 9: Package and Deploy

### 9.1 Update docker-compose.yml

Already configured ✅

### 9.2 Build Production

```bash
cd btrc-react-regional
yarn build
```

### 9.3 Deploy

```bash
docker compose up -d --build react-regional
```

---

## 🚀 Quick Start Commands

```bash
# 1. Navigate to React project
cd btrc-react-regional

# 2. Install dependencies (if needed)
yarn install --ignore-engines

# 3. Start development server
yarn dev

# OR use Docker
cd ..
docker compose up -d react-regional

# 4. Access dashboard
# http://localhost:5180
```

---

## 📝 Implementation Order

**Week 1:** Complete R2.2 Regional Analysis
- [x] Card 87: Violation Summary ✅
- [ ] Card 82: Division Performance Summary
- [ ] Card 83: District Performance Ranking
- [ ] Card 84: Regional Speed Distribution
- [ ] Card 85: PoP Performance
- [ ] Card 86: Urban vs Rural

**Week 2:** Implement R2.1 SLA Monitoring
- [ ] Create ScalarCard component
- [ ] Cards 76-78: Scalar metrics
- [ ] Card 80: Trend line chart
- [ ] Cards 79, 81: Tables

**Week 3:** Implement R2.3 Violation Reporting
- [ ] Create LineChart component (multi-series)
- [ ] Create Heatmap component
- [ ] Cards 88-93: All violation reports

**Week 4:** Polish and Testing
- [ ] Add drill-down to all charts
- [ ] Implement breadcrumb navigation
- [ ] Add export functionality
- [ ] Complete testing
- [ ] Documentation

---

## 💡 Tips

1. **Start Simple:** Implement one card at a time
2. **Test Incrementally:** Test each card before moving to next
3. **Reuse Components:** Use existing BarChart, DataTable, etc.
4. **Handle Edge Cases:** Empty data, loading, errors
5. **Check Data Format:** Log API responses to understand structure
6. **Use TypeScript:** Consider adding TypeScript for type safety

---

## 🆘 Troubleshooting

### Card Not Loading

```javascript
// Debug: Log API response
console.log('Card 87 data:', violationData);
```

### Wrong Data Format

```javascript
// Check column structure
console.log('Columns:', data.columns);
console.log('First row:', data.rows[0]);
```

### Filter Not Working

```javascript
// Verify filter is passed to API
console.log('Filters sent to API:', filters);
```

---

## 📚 Resources

- **Metabase API Docs:** https://www.metabase.com/docs/latest/api-documentation
- **ECharts Docs:** https://echarts.apache.org/en/index.html
- **Ant Design:** https://ant.design/components/overview
- **React Leaflet:** https://react-leaflet.js.org/

---

**Ready to start? Begin with Step 3.1: Create ScalarCard Component!**
