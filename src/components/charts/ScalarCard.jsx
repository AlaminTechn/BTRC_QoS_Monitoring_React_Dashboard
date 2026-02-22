/**
 * Scalar Card Component
 * Displays a single metric value with icon, trend, and click action
 */

import React from 'react';
import { Card, Statistic, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

/**
 * ScalarCard Component
 * @param {number|string} value - Main value to display
 * @param {string} title - Card title
 * @param {string} unit - Unit of measurement (%, Mbps, etc.)
 * @param {string} icon - Icon to display (emoji or icon component)
 * @param {string} color - Color for the card accent
 * @param {number} trend - Trend percentage (positive = up, negative = down)
 * @param {function} onClick - Click handler for drill-down
 * @param {boolean} loading - Loading state
 * @param {string} subtitle - Optional subtitle/description
 */
const ScalarCard = ({
  value,
  title,
  unit = '',
  icon = '',
  color = '#3b82f6',
  trend = null,
  onClick,
  loading = false,
  subtitle = '',
  precision = 1,
}) => {
  // Format value
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val : val.toFixed(precision);
    }
    return val;
  };

  // Determine if card is clickable
  const isClickable = Boolean(onClick);

  // Card styles
  const cardStyle = {
    borderLeft: `4px solid ${color}`,
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    height: '100%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const handleClick = () => {
    if (isClickable) {
      onClick(value);
    }
  };

  // Add hover effect via onMouseEnter/Leave
  const [isHovered, setIsHovered] = React.useState(false);

  const hoverStyle = isClickable && isHovered ? {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateY(-2px)',
  } : {};

  return (
    <Card
      style={{ ...cardStyle, ...hoverStyle }}
      hoverable={false}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Icon */}
          {icon && (
            <div
              style={{
                fontSize: 32,
                marginBottom: 8,
                color: color,
              }}
            >
              {icon}
            </div>
          )}

          {/* Main Metric */}
          <Statistic
            title={title}
            value={formatValue(value)}
            suffix={unit}
            valueStyle={{
              color: color,
              fontSize: 36,
              fontWeight: 'bold',
            }}
          />

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#666',
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Trend Indicator */}
          {trend !== null && (
            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                color: trend >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              {trend >= 0 ? (
                <ArrowUpOutlined />
              ) : (
                <ArrowDownOutlined />
              )}
              <span style={{ marginLeft: 4 }}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span style={{ marginLeft: 4, color: '#999' }}>
                vs last period
              </span>
            </div>
          )}

          {/* Click hint */}
          {isClickable && (
            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: '#999',
                textAlign: 'right',
              }}
            >
              Click for details →
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ScalarCard;
