/**
 * Bar Chart Component using ECharts
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * Bar Chart Component
 * @param {Array} categories - X-axis categories (e.g., division names)
 * @param {Array} values - Y-axis values (e.g., speeds)
 * @param {string} title - Chart title
 * @param {string} yAxisLabel - Y-axis label
 * @param {string} seriesName - Series name for tooltip
 * @param {function} onBarClick - Callback when bar is clicked
 */
const BarChart = ({
  categories = [],
  values = [],
  title = 'Performance Ranking',
  yAxisLabel = 'Value',
  seriesName = 'Performance',
  onBarClick,
  height = 400,
  color = '#0ea5e9',
}) => {
  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        const param = params[0];
        const value = typeof param.value === 'number' ? param.value.toFixed(2) : param.value || 'N/A';
        return `<strong>${param.name}</strong><br/>${seriesName}: ${value}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: 0,
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
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: values,
        itemStyle: {
          color: color,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: '#0284c7',
          },
        },
        label: {
          show: false,
          position: 'top',
          fontSize: 10,
          formatter: (params) => params.value.toFixed(1),
        },
      },
    ],
  };

  // Handle click event
  const onEvents = onBarClick
    ? {
        click: (params) => {
          if (params.componentType === 'series') {
            onBarClick({
              name: params.name,
              value: params.value,
              index: params.dataIndex,
            });
          }
        },
      }
    : {};

  if (!categories || categories.length === 0) {
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
      onEvents={onEvents}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default BarChart;
