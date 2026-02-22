/**
 * Data transformation utilities
 * Convert Metabase data format to ECharts/Leaflet format
 */

/**
 * Transform Metabase data to ECharts bar chart format
 * @param {Array} rows - Metabase rows [[name, value], ...]
 * @param {Array} columns - Column definitions
 * @returns {object} {categories: [], values: []}
 */
export const transformToBarChart = (rows, columns) => {
  if (!rows || rows.length === 0) {
    return { categories: [], values: [] };
  }

  return {
    categories: rows.map((row) => row[0]),
    values: rows.map((row) => row[1]),
  };
};

/**
 * Transform Metabase data to ECharts line chart format
 * @param {Array} rows - Metabase rows [[date, value], ...]
 * @returns {object} {dates: [], values: []}
 */
export const transformToLineChart = (rows) => {
  if (!rows || rows.length === 0) {
    return { dates: [], values: [] };
  }

  return {
    dates: rows.map((row) => row[0]),
    values: rows.map((row) => row[1]),
  };
};

/**
 * Transform Metabase data to table format
 * @param {Array} rows - Metabase rows
 * @param {Array} columns - Column definitions
 * @returns {Array} Table data with keys
 */
export const transformToTable = (rows, columns) => {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row, index) => {
    const record = { key: index };
    columns.forEach((col, colIndex) => {
      record[col.name] = row[colIndex];
    });
    return record;
  });
};

/**
 * Transform Metabase data to Leaflet GeoJSON format
 * @param {Array} rows - Metabase rows [[name, value], ...]
 * @param {object} geoJson - GeoJSON feature collection
 * @param {string} nameKey - Property key for matching (e.g., 'shapeName' or 'shapeISO')
 * @returns {object} GeoJSON with properties
 */
export const transformToGeoJSON = (rows, geoJson, nameKey = 'shapeName', nameColumn = 0, valueColumn = 1) => {
  if (!rows || rows.length === 0 || !geoJson) {
    console.warn('⚠️ transformToGeoJSON: Missing data', { rows: rows?.length, geoJson: !!geoJson });
    return geoJson;
  }

  // Create a map of name -> row data (store entire row for tooltip)
  const dataMap = {};
  rows.forEach((row) => {
    const name = row[nameColumn];
    dataMap[name] = {
      value: row[valueColumn], // Primary value for coloring
      rowData: row, // Store entire row for detailed tooltip
    };
  });

  console.log('🗺️ Data map created:', Object.fromEntries(
    Object.entries(dataMap).slice(0, 3).map(([k, v]) => [k, v.value])
  ));

  // Clone GeoJSON and add data to properties
  const enhancedGeoJSON = JSON.parse(JSON.stringify(geoJson));

  let matchedCount = 0;
  let unmatchedFeatures = [];
  const unmatchedDataNames = [];

  enhancedGeoJSON.features.forEach((feature) => {
    const name = feature.properties[nameKey];
    if (name && dataMap[name] !== undefined) {
      feature.properties.value = dataMap[name].value;
      feature.properties.rowData = dataMap[name].rowData; // Add full row data
      matchedCount++;
      console.log(`✅ Matched: ${name} = ${dataMap[name].value}`);
    } else {
      feature.properties.value = 0;
      feature.properties.rowData = null;
      unmatchedFeatures.push(name);
      console.warn(`❌ Unmatched: ${name} (nameKey: ${nameKey})`);
    }
  });

  // Check for data names that didn't match any GeoJSON features
  Object.keys(dataMap).forEach(name => {
    const found = enhancedGeoJSON.features.some(f => f.properties[nameKey] === name);
    if (!found) {
      unmatchedDataNames.push(name);
    }
  });

  console.log(`🗺️ Matched ${matchedCount}/${enhancedGeoJSON.features.length} features`);
  if (unmatchedFeatures.length > 0) {
    console.warn('❌ GeoJSON features without data:', unmatchedFeatures.slice(0, 10));
  }
  if (unmatchedDataNames.length > 0) {
    console.warn('❌ Data names without GeoJSON features:', unmatchedDataNames);
  }

  return enhancedGeoJSON;
};

/**
 * GeoJSON name mappings (from MEMORY.md)
 * Maps database names to GeoJSON names
 */
export const DIVISION_NAME_MAPPING = {
  Chattagram: 'Chittagong',
  Rajshahi: 'Rajshani',
};

export const DISTRICT_NAME_MAPPING = {
  Bogura: 'Bogra',
  Brahmanbaria: 'Brahamanbaria',
  Chapainawabganj: 'Nawabganj',
  Chattogram: 'Chittagong',
  Coxsbazar: "Cox's Bazar",
  Jashore: 'Jessore',
  Jhalakathi: 'Jhalokati',
  Moulvibazar: 'Maulvibazar',
  Netrokona: 'Netrakona',
  // Add missing mappings for unmatched districts
  Rajbari: 'Rajbari',
  Sirajganj: 'Sirajganj',
  Sunamganj: 'Sunamganj',
};

/**
 * Apply name mapping to data rows
 * @param {Array} rows - Metabase rows
 * @param {object} mapping - Name mapping object
 * @param {number} nameColumn - Column index containing the name to map (default: 0)
 * @returns {Array} Mapped rows
 */
export const applyNameMapping = (rows, mapping, nameColumn = 0) => {
  if (!rows || rows.length === 0) return rows;

  return rows.map((row) => {
    const name = row[nameColumn];
    const mappedName = mapping[name] || name;

    // Replace the name at the specified column
    const newRow = [...row];
    newRow[nameColumn] = mappedName;
    return newRow;
  });
};

/**
 * Get color for value based on thresholds
 * @param {number} value - Numeric value
 * @param {object} thresholds - {low: 30, medium: 60, high: 100}
 * @returns {string} Color code
 */
export const getColorForValue = (value, thresholds = { low: 30, medium: 60 }) => {
  if (value < thresholds.low) {
    return '#ef4444'; // Red
  } else if (value < thresholds.medium) {
    return '#f59e0b'; // Orange
  } else {
    return '#10b981'; // Green
  }
};

/**
 * Format percentage
 * @param {number} value - Numeric value
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`;
};

/**
 * Format speed (Mbps)
 * @param {number} value - Speed in Mbps
 * @returns {string} Formatted speed
 */
export const formatSpeed = (value) => {
  return `${value.toFixed(2)} Mbps`;
};
