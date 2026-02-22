/**
 * Mini Bar Component
 * Displays a small inline progress bar similar to Metabase's mini bar feature
 */

import React from 'react';

/**
 * Mini Bar Component
 * @param {number} value - The current value
 * @param {number} max - Maximum value for scaling (optional, defaults to auto-scale)
 * @param {string} color - Bar color (defaults to #509ee3)
 * @param {number} width - Bar container width in pixels (defaults to 60)
 * @param {number} height - Bar height in pixels (defaults to 16)
 * @param {boolean} showValue - Whether to show the numeric value (defaults to true)
 * @param {function} formatValue - Function to format the displayed value
 */
const MiniBar = ({
  value,
  max,
  color = '#509ee3',
  width = 60,
  height = 16,
  showValue = true,
  formatValue = (val) => val,
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const percentage = max ? (numericValue / max) * 100 : 100;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {showValue && (
        <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '13px' }}>
          {formatValue(numericValue)}
        </span>
      )}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: '#f0f0f0',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${clampedPercentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

export default MiniBar;
