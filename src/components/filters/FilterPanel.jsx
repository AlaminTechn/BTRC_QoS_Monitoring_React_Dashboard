/**
 * Filter Panel Component
 * Provides filters for Division, District, and ISP
 */

import React from 'react';
import { Select, Button, Space } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

/**
 * Filter Panel Component
 * @param {object} filters - Current filter values {division, district, isp}
 * @param {function} onFilterChange - Callback when filter changes
 * @param {function} onReset - Callback when reset is clicked
 * @param {Array} divisions - Available divisions
 * @param {Array} districts - Available districts (filtered by division)
 * @param {Array} isps - Available ISPs
 */
const FilterPanel = ({
  filters = {},
  onFilterChange,
  onReset,
  divisions = [],
  districts = [],
  isps = [],
  loading = false,
}) => {
  const handleChange = (filterKey, value) => {
    const newFilters = { ...filters };

    // Update the changed filter
    newFilters[filterKey] = value;

    // Clear dependent filters
    if (filterKey === 'division') {
      newFilters.district = undefined;
      newFilters.isp = undefined;
    } else if (filterKey === 'district') {
      newFilters.isp = undefined;
    }

    onFilterChange(newFilters);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  return (
    <div
      style={{
        background: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}
    >
      <Space size="middle" wrap style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FilterOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold', fontSize: 14 }}>Filters:</span>
        </div>

        <Select
          placeholder="Select Division"
          value={filters.division}
          onChange={(value) => handleChange('division', value)}
          style={{ minWidth: 180 }}
          allowClear
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {divisions.map((division) => (
            <Option key={division} value={division}>
              {division}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Select District"
          value={filters.district}
          onChange={(value) => handleChange('district', value)}
          style={{ minWidth: 180 }}
          allowClear
          disabled={!filters.division || districts.length === 0}
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {districts.map((district) => (
            <Option key={district} value={district}>
              {district}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Select ISP"
          value={filters.isp}
          onChange={(value) => handleChange('isp', value)}
          style={{ minWidth: 200 }}
          allowClear
          disabled={isps.length === 0}
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
        >
          {isps.map((isp) => (
            <Option key={isp} value={isp}>
              {isp}
            </Option>
          ))}
        </Select>

        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
};

export default FilterPanel;
