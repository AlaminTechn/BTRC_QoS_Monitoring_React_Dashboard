# BTRC QoS Dashboard Structure

## Logical Organization (Documentation)

```
dashboards/
├── regulatory/                        # Dashboard 2: Regulatory Operations
│   ├── RegulatoryDashboard.jsx       # Main regulatory dashboard container
│   └── tabs/
│       ├── SLAMonitoring.jsx         # R2.1: SLA Monitoring Tab
│       ├── RegionalAnalysis.jsx      # R2.2: Regional Analysis Tab ✅
│       └── ViolationReporting.jsx    # R2.3: Violation Reporting Tab
│
└── executive/                         # Dashboard 1: Executive Dashboard
    ├── ExecutiveDashboard.jsx        # Main executive dashboard container
    └── tabs/
        ├── PerformanceScorecard.jsx  # E1: Performance Scorecard
        ├── GeographicIntelligence.jsx# E2: Geographic Intelligence
        └── ComplianceOverview.jsx    # E3: Compliance Overview
```

## Actual File Structure (Implementation)

```
src/
├── pages/                             # All dashboard pages (flat structure)
│   ├── RegulatoryDashboard.jsx       # Dashboard 2: Regulatory Operations
│   ├── SLAMonitoring.jsx             # R2.1: SLA Monitoring Tab
│   ├── RegionalAnalysis.jsx          # R2.2: Regional Analysis Tab ✅
│   ├── ViolationReporting.jsx        # R2.3: Violation Reporting Tab
│   └── LayoutTest.jsx                # Layout testing page
│
├── components/                        # Reusable components (imported as needed)
│   ├── charts/
│   │   ├── ScalarCard.jsx           # KPI metric cards
│   │   ├── BarChart.jsx             # Bar charts for rankings
│   │   ├── LineChart.jsx            # Trend line charts
│   │   ├── DataTable.jsx            # Data tables with sorting
│   │   └── MiniBar.jsx              # Mini progress bars ✅ NEW
│   │
│   ├── maps/
│   │   └── ChoroplethMap.jsx        # Geographic choropleth maps
│   │
│   ├── filters/
│   │   └── FilterPanel.jsx          # Filter dropdowns (Division/District/ISP)
│   │
│   └── layout/
│       ├── Sidebar.jsx              # Left navigation sidebar
│       ├── TopHeader.jsx            # Top header with search
│       ├── SecondHeader.jsx         # Dashboard title header
│       └── FixedLayout.jsx          # Main layout wrapper
│
├── hooks/
│   └── useMetabaseData.js           # Hook for fetching Metabase data
│
├── api/
│   └── metabase.js                  # Metabase API client
│
└── utils/
    └── dataTransform.js             # Data transformation utilities
```

## Import Pattern

Pages import only the components they need:

```javascript
// pages/RegionalAnalysis.jsx
import ChoroplethMap from '../components/maps/ChoroplethMap';
import DataTable from '../components/charts/DataTable';
import MiniBar from '../components/charts/MiniBar';
import FilterPanel from '../components/filters/FilterPanel';
```

## Dashboard 1: Executive Dashboard (ID=5)

### Tabs:
- **E1: Performance Scorecard** - High-level KPI metrics
- **E2: Geographic Intelligence** - Map-based regional insights
- **E3: Compliance Overview** - Compliance status summary

### Filter Inputs:
- Time Range
- Division
- ISP

### Key Components:
- Scalar cards for KPIs
- Geographic heat maps
- Trend charts

## Dashboard 2: Regulatory Operations (ID=6)

### Port: http://localhost:5180/

### Tabs:

#### R2.1: SLA Monitoring
- **Components**: Cards 76-78, 79-81, 97-99
- **Filtering**: None (national view)
- **Features**:
  - 3 KPI status cards (Compliant, At Risk, Violation ISPs)
  - SLA compliance trend table
  - Package compliance by tier
  - ISP performance ranking

#### R2.2: Regional Analysis
- **Components**: Cards 79-81, 87, Maps 94-95
- **Filtering**: Division, District, ISP
- **Features**:
  - Three-level drill-down: National → Division → District → ISP
  - Division violation map (Card 94)
  - District violation map (Card 95)
  - Division performance summary (Card 79)
  - District ranking table (Card 80)
  - **R2.5 ISP Performance by Area** (Card 81):
    - 10 columns with mini bars:
      - Division, District, ISP, License Category
      - PoP Count, Avg Download, Avg Upload, Latency
      - Availability %, Violations
    - Sortable by all columns
    - Color-coded availability indicators

#### R2.3: Violation Reporting
- **Components**: Cards 82-87
- **Filtering**: Division, District, ISP
- **Features**:
  - Violation status KPIs (Pending, Disputed, Resolved)
  - Violation detail table with severity sorting
  - Daily violation trend (stacked bar chart)
  - Violations by district breakdown

### Filter Inputs:
- **Division**: 8 divisions (Dhaka, Chattogram, Rajshahi, etc.)
- **District**: 64 districts (cascading from division)
- **ISP**: 40 ISPs (all types: Nationwide, Zonal, Local)

### Data Sources:
- **Card 76-78**: SLA status cards (R1.1-R1.3)
- **Card 79**: Division Performance Summary (R2.1)
- **Card 80**: District Ranking Table (R2.2)
- **Card 81**: ISP Performance by Area (R2.3) - 10 columns
- **Card 82-87**: Violation Analysis (R3.1-R3.6)
- **Card 94**: Division Performance Map
- **Card 95**: District Performance Map

## Development

### Running the Dashboard:
```bash
cd btrc-react-regional
yarn run dev
# Access at: http://localhost:5180/ (Docker) or http://localhost:5173/ (local)
```

### Key Features:
1. **Drill-Down Navigation**: Click division → districts → ISPs
2. **Mini Bars**: Visual indicators in numeric columns
3. **Color Coding**:
   - Availability: Green (≥95%), Yellow (≥90%), Red (<90%)
   - Violations: Red (>5), Blue (≤5)
4. **Sortable Tables**: Click column headers to sort
5. **Responsive Design**: Works on desktop and tablet

### API Integration:
- Metabase REST API: http://localhost:3000/api
- Card Data: `/api/card/{id}/query`
- Parameters passed via template tags for filtering

## Migration Notes

- Old file locations: `src/pages/*`
- New locations: `src/dashboards/{dashboard-name}/tabs/*`
- Components remain in `src/components/*`
- No breaking changes - old imports still work via symlinks/fallback
