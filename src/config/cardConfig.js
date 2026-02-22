/**
 * Regulatory Dashboard Card Configuration
 * Dashboard ID: 6
 * Based on BTRC QoS Monitoring Dashboard V3
 */

export const DASHBOARD_CONFIG = {
  id: 6,
  name: 'Regulatory Dashboard',
  tabs: {
    SLA_MONITORING: {
      id: 'r2.1',
      name: 'R2.1 SLA Monitoring',
      description: 'Real-time SLA compliance tracking',
    },
    REGIONAL_ANALYSIS: {
      id: 'r2.2',
      name: 'R2.2 Regional Analysis',
      description: 'Geographic performance analysis',
    },
    VIOLATION_REPORTING: {
      id: 'r2.3',
      name: 'R2.3 Violation Reporting',
      description: 'Detailed violation reports',
    },
  },
};

/**
 * Card Configuration
 * Each card defines its ID, type, filters, and drill-down behavior
 */
export const CARD_CONFIG = {
  // R2.1 SLA Monitoring Tab
  76: {
    id: 76,
    name: 'Overall SLA Compliance Rate',
    tab: 'SLA_MONITORING',
    type: 'scalar',
    description: 'Percentage of measurements meeting SLA requirements',
    filters: ['division', 'district', 'isp'],
    drillDown: null,
    icon: '✓',
    color: '#10b981',
  },

  77: {
    id: 77,
    name: 'Critical Violations Count',
    tab: 'SLA_MONITORING',
    type: 'scalar',
    description: 'Number of critical severity violations',
    filters: ['division', 'district', 'isp'],
    drillDown: 'violation_details',
    icon: '!',
    color: '#ef4444',
  },

  78: {
    id: 78,
    name: 'ISPs Below Threshold',
    tab: 'SLA_MONITORING',
    type: 'scalar',
    description: 'Number of ISPs not meeting minimum SLA',
    filters: ['division', 'district'],
    drillDown: 'isp_list',
    icon: '⚠',
    color: '#f59e0b',
  },

  79: {
    id: 79,
    name: 'SLA Compliance by Package Tier',
    tab: 'SLA_MONITORING',
    type: 'table',
    description: 'Compliance rates grouped by service package',
    filters: ['division', 'district', 'isp'],
    drillDown: null,
    columns: ['Package Tier', 'Target Download', 'Actual Avg', 'Compliance %'],
  },

  80: {
    id: 80,
    name: 'SLA Compliance Trend',
    tab: 'SLA_MONITORING',
    type: 'line',
    description: 'Historical compliance rate over time',
    filters: ['division', 'district', 'isp', 'date_range'],
    drillDown: null,
    xAxis: 'Date',
    yAxis: 'Compliance %',
  },

  81: {
    id: 81,
    name: 'ISP Performance Scorecard',
    tab: 'SLA_MONITORING',
    type: 'table',
    description: 'Ranking of ISPs by compliance score',
    filters: ['division', 'district'],
    drillDown: 'isp_details',
    columns: ['ISP', 'Compliance %', 'Violations', 'Status'],
  },

  // R2.2 Regional Analysis Tab
  82: {
    id: 82,
    name: 'Division Performance Summary',
    tab: 'REGIONAL_ANALYSIS',
    type: 'table',
    description: 'Performance metrics aggregated by division',
    filters: [],
    drillDown: 'division_details',
    columns: ['Division', 'Avg Download', 'Avg Upload', 'Compliance %', 'Violations'],
  },

  83: {
    id: 83,
    name: 'District Performance Ranking',
    tab: 'REGIONAL_ANALYSIS',
    type: 'bar',
    description: 'Districts ranked by average speed',
    filters: ['division'],
    drillDown: 'district_details',
    xAxis: 'District',
    yAxis: 'Avg Speed (Mbps)',
  },

  84: {
    id: 84,
    name: 'Regional Speed Distribution',
    tab: 'REGIONAL_ANALYSIS',
    type: 'bar',
    description: 'Speed ranges across regions',
    filters: ['division', 'district'],
    drillDown: null,
    xAxis: 'Speed Range',
    yAxis: 'Count',
  },

  85: {
    id: 85,
    name: 'PoP Performance by Location',
    tab: 'REGIONAL_ANALYSIS',
    type: 'table',
    description: 'Individual PoP metrics',
    filters: ['division', 'district', 'isp'],
    drillDown: 'pop_details',
    columns: ['PoP Name', 'Location', 'ISP', 'Avg Speed', 'Status'],
  },

  86: {
    id: 86,
    name: 'Urban vs Rural Performance',
    tab: 'REGIONAL_ANALYSIS',
    type: 'bar',
    description: 'Performance comparison by area type',
    filters: ['division'],
    drillDown: null,
    xAxis: 'Area Type',
    yAxis: 'Avg Speed (Mbps)',
  },

  87: {
    id: 87,
    name: 'Violation Summary by District',
    tab: 'REGIONAL_ANALYSIS',
    type: 'table',
    description: 'Violation counts by severity and location',
    filters: ['division', 'district'],
    drillDown: 'violation_details',
    columns: ['Division', 'District', 'Total', 'Critical', 'High', 'Medium', 'Low'],
  },

  // R2.3 Violation Reporting Tab
  88: {
    id: 88,
    name: 'Recent Violations',
    tab: 'VIOLATION_REPORTING',
    type: 'table',
    description: 'Most recent SLA violations',
    filters: ['division', 'district', 'isp', 'severity'],
    drillDown: 'violation_details',
    columns: ['Time', 'ISP', 'Location', 'Type', 'Severity', 'Duration'],
  },

  89: {
    id: 89,
    name: 'Violation Trend by Severity',
    tab: 'VIOLATION_REPORTING',
    type: 'line',
    description: 'Violation counts over time by severity level',
    filters: ['division', 'district', 'isp'],
    drillDown: null,
    xAxis: 'Date',
    yAxis: 'Count',
    series: ['Critical', 'High', 'Medium', 'Low'],
  },

  90: {
    id: 90,
    name: 'Top Violating ISPs',
    tab: 'VIOLATION_REPORTING',
    type: 'bar',
    description: 'ISPs with highest violation counts',
    filters: ['division', 'district', 'severity'],
    drillDown: 'isp_violations',
    xAxis: 'ISP',
    yAxis: 'Violations',
  },

  91: {
    id: 91,
    name: 'Violation by Time of Day',
    tab: 'VIOLATION_REPORTING',
    type: 'bar',
    description: 'When violations occur most frequently',
    filters: ['division', 'district', 'isp'],
    drillDown: null,
    xAxis: 'Hour',
    yAxis: 'Violations',
  },

  92: {
    id: 92,
    name: 'Violation Resolution Time',
    tab: 'VIOLATION_REPORTING',
    type: 'table',
    description: 'Average time to resolve violations',
    filters: ['division', 'district', 'isp', 'severity'],
    drillDown: null,
    columns: ['Severity', 'Avg Duration', 'Min', 'Max', 'Count'],
  },

  93: {
    id: 93,
    name: 'Violation Heatmap',
    tab: 'VIOLATION_REPORTING',
    type: 'heatmap',
    description: 'Violation intensity by location and time',
    filters: ['division', 'severity'],
    drillDown: 'location_details',
    xAxis: 'Location',
    yAxis: 'Hour',
  },

  // Maps (Regional Analysis)
  94: {
    id: 94,
    name: 'Division Performance Map',
    tab: 'REGIONAL_ANALYSIS',
    type: 'map',
    description: 'Choropleth map of divisions',
    filters: [],
    drillDown: 'division_details',
    mapType: 'choropleth',
    geoJsonKey: 'shapeName',
  },

  95: {
    id: 95,
    name: 'District Performance Map',
    tab: 'REGIONAL_ANALYSIS',
    type: 'map',
    description: 'Choropleth map of districts',
    filters: ['division'],
    drillDown: 'district_details',
    mapType: 'choropleth',
    geoJsonKey: 'shapeName',
  },
};

/**
 * Get cards by tab
 */
export const getCardsByTab = (tabId) => {
  return Object.values(CARD_CONFIG).filter(card => card.tab === tabId);
};

/**
 * Get card configuration
 */
export const getCard = (cardId) => {
  return CARD_CONFIG[cardId] || null;
};

/**
 * Check if card supports filter
 */
export const supportsFilter = (cardId, filterName) => {
  const card = getCard(cardId);
  return card?.filters?.includes(filterName) || false;
};

export default CARD_CONFIG;
