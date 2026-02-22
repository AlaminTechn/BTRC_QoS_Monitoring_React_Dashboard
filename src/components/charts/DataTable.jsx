/**
 * Data Table Component using Ant Design
 */

import React from 'react';
import { Table } from 'antd';

/**
 * Data Table Component
 * @param {Array} columns - Column definitions [{title, dataIndex, key}]
 * @param {Array} dataSource - Table data
 * @param {function} onRowClick - Callback when row is clicked
 * @param {boolean} loading - Loading state
 * @param {number} pageSize - Rows per page
 */
const DataTable = ({
  columns = [],
  dataSource = [],
  onRowClick,
  loading = false,
  pageSize = 10,
  title,
  showPagination = true,
}) => {
  // Handle row click
  const rowClickHandler = onRowClick
    ? {
        onRow: (record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' },
        }),
      }
    : {};

  return (
    <div>
      {title && (
        <div
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          {title}
        </div>
      )}
      <Table
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={
          showPagination
            ? {
                pageSize,
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} items`,
              }
            : false
        }
        {...rowClickHandler}
        size="middle"
        bordered
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default DataTable;
