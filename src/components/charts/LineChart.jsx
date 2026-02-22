/**
 * Line Chart Component using ECharts
 * Supports single or multiple series
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * LineChart Component
 * @param {Array} data - Data in format {x: date, y1: value1, y2: value2, ...}
 * @param {Array} series - Series names ['Series 1', 'Series 2']
 * @param {string} xAxisLabel - X-axis label
 * @param {string} yAxisLabel - Y-axis label
 * @param {string} title - Chart title
 * @param {number} height - Chart height in pixels
 * @param {Array} colors - Custom colors for series
 * @param {boolean} smooth - Smooth curves
 * @param {boolean} area - Show area under line
 */
const LineChart = ({
  data = [],
  series = ['Value'],
  xAxisLabel = 'Date',
  yAxisLabel = 'Value',
  title = '',
  height = 400,
  colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
  smooth = true,
  area = false,
  legend = true,
}) => {
  // Transform data for ECharts
  const transformData = () => {
    if (!data || data.length === 0) {
      return { xAxisData: [], seriesData: [] };
    }

    // Extract x-axis values (dates/categories)
    const xAxisData = data.map(item => item.x || item[0]);

    // Extract series data
    const seriesData = series.map((seriesName, index) => {
      const values = data.map(item => {
        // Support both object and array format
        if (typeof item === 'object' && !Array.isArray(item)) {
          return item[`y${index + 1}`] || item.y || 0;
        }
        return item[index + 1] || 0;
      });

      return {
        name: seriesName,
        type: 'line',
        smooth: smooth,
        data: values,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          color: colors[index % colors.length],
        },
        areaStyle: area ? {
          opacity: 0.3,
          color: colors[index % colors.length],
        } : null,
      };
    });

    return { xAxisData, seriesData };
  };

  const { xAxisData, seriesData } = transformData();

  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    } : null,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params) => {
        let tooltip = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach(param => {
          const value = typeof param.value === 'number'
            ? param.value.toFixed(2)
            : param.value || 'N/A';
          tooltip += `${param.marker} ${param.seriesName}: ${value}<br/>`;
        });
        return tooltip;
      },
    },
    legend: legend ? {
      data: series,
      bottom: 10,
      type: 'scroll',
    } : null,
    grid: {
      left: '3%',
      right: '4%',
      bottom: legend ? '15%' : '3%',
      top: title ? '15%' : '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      name: xAxisLabel,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        fontSize: 12,
        fontWeight: 'bold',
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
      },
    ],
    series: seriesData,
  };

  if (!data || data.length === 0) {
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
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default LineChart;
