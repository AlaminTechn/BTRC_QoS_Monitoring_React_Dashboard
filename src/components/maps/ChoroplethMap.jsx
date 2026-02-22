/**
 * Choropleth Map Component - Metabase Style
 * Clean choropleth without background tiles, matching Metabase design
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Component to fit map bounds
 */
const FitBounds = ({ geojson }) => {
  const map = useMap();

  useEffect(() => {
    if (geojson && geojson.features) {
      const geoJsonLayer = L.geoJSON(geojson);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [geojson, map]);

  return null;
};

/**
 * Calculate quantile breaks for better color distribution
 */
const calculateQuantiles = (values, numBins = 5) => {
  if (!values || values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const breaks = [];

  for (let i = 1; i < numBins; i++) {
    const index = Math.floor((sorted.length * i) / numBins);
    breaks.push(sorted[index]);
  }

  return breaks;
};

/**
 * Get color based on value and quantile breaks (5-tier blue gradient like Metabase)
 */
const getColorForValue = (value, breaks) => {
  if (!breaks || breaks.length === 0) return '#93c5fd'; // light blue default

  // 5-tier blue gradient (lightest to darkest)
  const colors = [
    '#dbeafe', // Lightest blue (0-20%)
    '#93c5fd', // Light blue (20-40%)
    '#60a5fa', // Medium blue (40-60%)
    '#3b82f6', // Blue (60-80%)
    '#1d4ed8', // Dark blue (80-100%)
  ];

  if (value <= breaks[0]) return colors[0];
  if (value <= breaks[1]) return colors[1];
  if (value <= breaks[2]) return colors[2];
  if (value <= breaks[3]) return colors[3];
  return colors[4];
};

/**
 * Format range label for legend
 */
const formatRangeLabel = (min, max, isLast = false) => {
  // Handle undefined/null values
  const minVal = typeof min === 'number' ? min : parseFloat(min) || 0;
  const maxVal = typeof max === 'number' ? max : parseFloat(max) || 0;

  if (isLast) {
    return `${minVal.toFixed(2)} +`;
  }
  return `${minVal.toFixed(2)} - ${maxVal.toFixed(2)}`;
};

/**
 * Choropleth Map Component - Metabase Style
 * @param {object} geojson - GeoJSON feature collection with properties.value
 * @param {string} title - Map title
 * @param {function} onRegionClick - Callback when region is clicked (feature) => {}
 * @param {string} height - Map height
 * @param {string} valueLabel - Label for the metric (e.g., "Violations", "Avg Speed")
 */
const ChoroplethMap = ({
  geojson,
  title = 'Regional Analysis',
  onRegionClick,
  height = '500px',
  valueLabel = 'Value',
}) => {
  const [mapKey, setMapKey] = useState(0);
  const [quantileBreaks, setQuantileBreaks] = useState([]);
  const [valueRange, setValueRange] = useState({ min: 0, max: 100 });

  // Calculate quantile breaks when geojson changes
  useEffect(() => {
    if (geojson && geojson.features) {
      const values = geojson.features
        .map(f => f.properties.value)
        .filter(v => v !== null && v !== undefined && !isNaN(v));

      console.log('🗺️ ChoroplethMap received values:', values);

      if (values.length > 0) {
        const breaks = calculateQuantiles(values, 5);
        const min = Math.min(...values);
        const max = Math.max(...values);

        console.log('🗺️ Quantile breaks:', breaks);
        console.log('🗺️ Value range:', { min, max });

        setQuantileBreaks(breaks);
        setValueRange({ min, max });
      } else {
        console.warn('⚠️ No valid values found in GeoJSON features');
        // Set default values to avoid errors
        setQuantileBreaks([0, 0, 0, 0]);
        setValueRange({ min: 0, max: 0 });
      }
    }
  }, [geojson]);

  // Reload map when geojson changes
  useEffect(() => {
    setMapKey((prev) => prev + 1);
  }, [geojson]);

  // Style function for GeoJSON features (Metabase style)
  const style = (feature) => {
    const value = feature.properties.value || 0;
    const fillColor = getColorForValue(value, quantileBreaks);

    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: '#ffffff', // White borders like Metabase
      fillOpacity: 0.85,
    };
  };

  // Highlight feature on hover
  const highlightFeature = (e) => {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#333',
      fillOpacity: 1,
    });
    layer.bringToFront();
  };

  // Reset highlight
  const resetHighlight = (e) => {
    const layer = e.target;
    layer.setStyle(style(layer.feature));
  };

  // Handle click on feature (drill-down)
  const onFeatureClick = (feature, layer) => {
    console.log('🗺️ Map region clicked:', feature.properties);
    if (onRegionClick) {
      onRegionClick(feature);
    }
  };

  // Attach event listeners to each feature
  const onEachFeature = (feature, layer) => {
    const name = feature.properties.shapeName || feature.properties.NAME_1 || feature.properties.name || 'Unknown';
    const value = feature.properties.value !== undefined && feature.properties.value !== null
      ? feature.properties.value
      : 0;
    const rowData = feature.properties.rowData;

    // Format value for display
    const displayValue = typeof value === 'number'
      ? (Number.isInteger(value) ? value.toString() : value.toFixed(2))
      : value;

    // Build tooltip content - show all metrics if rowData available
    let tooltipContent;
    if (rowData && Array.isArray(rowData) && rowData.length >= 8) {
      // District data: [Division, District, Avg Download, Avg Upload, Avg Latency, Availability %, ISP Count, PoP Count]
      tooltipContent = `
        <div style="padding: 10px; font-family: sans-serif; min-width: 200px;">
          <strong style="font-size: 14px; display: block; margin-bottom: 8px;">${name}</strong>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">Division:</td>
              <td style="font-weight: 600; padding: 2px 0;">${rowData[0]}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">Avg Download:</td>
              <td style="font-weight: 600; padding: 2px 0;">${typeof rowData[2] === 'number' ? rowData[2].toFixed(2) : rowData[2]} Mbps</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">Avg Upload:</td>
              <td style="font-weight: 600; padding: 2px 0;">${typeof rowData[3] === 'number' ? rowData[3].toFixed(2) : rowData[3]} Mbps</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">Avg Latency:</td>
              <td style="font-weight: 600; padding: 2px 0;">${typeof rowData[4] === 'number' ? rowData[4].toFixed(2) : rowData[4]} ms</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">Availability:</td>
              <td style="font-weight: 600; padding: 2px 0;">${typeof rowData[5] === 'number' ? rowData[5].toFixed(2) : rowData[5]}%</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 2px 8px 2px 0;">PoP Count:</td>
              <td style="font-weight: 600; padding: 2px 0;">${rowData[7] || 0}</td>
            </tr>
          </table>
        </div>`;
    } else {
      // Simple tooltip for division or when no rowData
      tooltipContent = `
        <div style="padding: 8px; font-family: sans-serif;">
          <strong style="font-size: 14px;">${name}</strong><br/>
          <span style="color: #666;">${valueLabel}: <strong>${displayValue}</strong></span>
        </div>`;
    }

    // Tooltip with proper formatting
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'auto',
      className: 'custom-tooltip',
      opacity: 0.95,
    });

    // Event listeners
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: () => onFeatureClick(feature, layer),
    });
  };

  // Calculate legend items
  const legendItems = React.useMemo(() => {
    if (quantileBreaks.length === 0) return [];

    const items = [];
    const colors = [
      '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'
    ];

    // First bin: min to breaks[0]
    items.push({
      color: colors[0],
      label: formatRangeLabel(valueRange.min, quantileBreaks[0]),
    });

    // Middle bins
    for (let i = 0; i < quantileBreaks.length - 1; i++) {
      items.push({
        color: colors[i + 1],
        label: formatRangeLabel(quantileBreaks[i], quantileBreaks[i + 1]),
      });
    }

    // Last bin: breaks[last] to max
    items.push({
      color: colors[colors.length - 1],
      label: formatRangeLabel(quantileBreaks[quantileBreaks.length - 1], valueRange.max, true),
    });

    return items;
  }, [quantileBreaks, valueRange]);

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center', color: '#999' }}>
          <p>No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden' }}>
      {title && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 16px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {title}
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={[23.8103, 90.4125]} // Center of Bangladesh
        zoom={7}
        style={{
          height: '100%',
          width: '100%',
          background: '#f8f9fa', // Light gray background (no tiles)
        }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={false} // Hide Leaflet attribution
      >
        {/* NO TileLayer - clean choropleth like Metabase */}

        {geojson && (
          <>
            <GeoJSON
              data={geojson}
              style={style}
              onEachFeature={onEachFeature}
            />
            <FitBounds geojson={geojson} />
          </>
        )}
      </MapContainer>

      {/* Legend - Metabase style with value ranges */}
      {legendItems.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '11px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#333' }}>
            {valueLabel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {legendItems.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: 20,
                    height: 15,
                    background: item.color,
                    border: '1px solid #ccc',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#666', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click instruction hint */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
        }}
      >
        Click region to drill-down
      </div>
    </div>
  );
};

export default ChoroplethMap;
