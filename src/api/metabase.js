/**
 * Metabase API Client
 * Handles authentication and data fetching from Metabase REST API
 */

import axios from 'axios';

const METABASE_URL = import.meta.env.VITE_METABASE_URL || 'http://localhost:3000';

class MetabaseAPI {
  constructor() {
    this.baseURL = METABASE_URL;
    this.sessionToken = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include session token
    this.client.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers['X-Metabase-Session'] = this.sessionToken;
      }
      return config;
    });
  }

  /**
   * Login to Metabase and get session token
   * @param {string} username - Metabase username/email
   * @param {string} password - Metabase password
   * @returns {Promise<string>} Session token
   */
  async login(username, password) {
    try {
      const response = await this.client.post('/api/session', {
        username,
        password,
      });
      this.sessionToken = response.data.id;
      return this.sessionToken;
    } catch (error) {
      console.error('Metabase login failed:', error);
      throw error;
    }
  }

  /**
   * Get data from a Metabase card/question
   * @param {number} cardId - Card ID (e.g., 94 for division map)
   * @param {object} parameters - Filter parameters
   * @returns {Promise<object>} Card data
   */
  async getCardData(cardId, parameters = {}) {
    try {
      const params = this.formatParameters(parameters);
      const response = await this.client.post(`/api/card/${cardId}/query`, params);
      return this.parseCardData(response.data);
    } catch (error) {
      console.error(`Failed to fetch card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get card metadata (SQL, visualization settings, etc.)
   * @param {number} cardId - Card ID
   * @returns {Promise<object>} Card metadata
   */
  async getCardMetadata(cardId) {
    try {
      const response = await this.client.get(`/api/card/${cardId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch card metadata ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get the currently authenticated user's profile + group memberships
   * @returns {Promise<object>} { id, email, name, groupIds, groups }
   */
  async getCurrentUser() {
    try {
      const response = await this.client.get('/api/user/current');
      const u = response.data;
      // Metabase v0.58 returns group_ids (array of ints) on /api/user/current
      const groupIds = u.group_ids || [];
      return {
        id:       u.id,
        email:    u.email,
        name:     u.common_name || `${u.first_name} ${u.last_name}`.trim(),
        isAdmin:  u.is_superuser,
        groupIds,
        groups:   [], // names not returned by this endpoint; resolved via permissions config
      };
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      throw error;
    }
  }

  /**
   * Get dashboard structure
   * @param {number} dashboardId - Dashboard ID (6 for Regulatory)
   * @returns {Promise<object>} Dashboard structure
   */
  async getDashboard(dashboardId) {
    try {
      const response = await this.client.get(`/api/dashboard/${dashboardId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch dashboard ${dashboardId}:`, error);
      throw error;
    }
  }

  /**
   * Run a custom SQL query
   * @param {number} databaseId - Database ID
   * @param {string} query - SQL query
   * @returns {Promise<object>} Query results
   */
  async runQuery(databaseId, query) {
    try {
      const response = await this.client.post('/api/dataset', {
        database: databaseId,
        type: 'native',
        native: {
          query,
        },
      });
      return this.parseCardData(response.data);
    } catch (error) {
      console.error('Failed to run query:', error);
      throw error;
    }
  }

  /**
   * Format parameters for Metabase API
   * @param {object} params - Filter parameters {division, district, isp, start_date, end_date}
   * @returns {object} Formatted parameters
   */
  formatParameters(params) {
    if (!params || Object.keys(params).length === 0) {
      return {};
    }

    // Date parameter keys require type 'date/single'; text filters use 'category'
    const DATE_PARAMS = new Set(['start_date', 'end_date']);

    const parameters = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        type: DATE_PARAMS.has(key) ? 'date/single' : 'category',
        target: ['variable', ['template-tag', key]],
        value: value,
      }));

    return parameters.length > 0 ? { parameters } : {};
  }

  /**
   * Parse card data response from Metabase
   * @param {object} data - Raw Metabase response
   * @returns {object} Parsed data {columns, rows, metadata}
   */
  parseCardData(data) {
    if (!data || !data.data) {
      return { columns: [], rows: [], metadata: {} };
    }

    const { cols, rows } = data.data;

    return {
      columns: cols.map((col) => ({
        name: col.name,
        displayName: col.display_name,
        type: col.base_type,
        fieldRef: col.field_ref,
      })),
      rows: rows,
      metadata: {
        rowCount: rows.length,
        status: data.status,
      },
    };
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.sessionToken !== null;
  }

  /**
   * Logout and clear session
   */
  logout() {
    this.sessionToken = null;
  }
}

// Export singleton instance
export const metabaseAPI = new MetabaseAPI();

export default metabaseAPI;
