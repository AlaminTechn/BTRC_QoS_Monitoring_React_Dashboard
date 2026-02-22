/**
 * Custom React hook for fetching data from Metabase
 */

import { useState, useEffect } from 'react';
import metabaseAPI from '../api/metabase';

/**
 * Hook to fetch card data from Metabase
 * @param {number} cardId - Metabase card ID
 * @param {object} filters - Filter parameters {division, district, isp}
 * @param {boolean} autoFetch - Auto-fetch on mount and filter change
 * @returns {object} {data, loading, error, refetch}
 */
export const useMetabaseData = (cardId, filters = {}, autoFetch = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!cardId) {
      setError(new Error('Card ID is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await metabaseAPI.getCardData(cardId, filters);
      setData(result);
    } catch (err) {
      setError(err);
      console.error(`Error fetching card ${cardId}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [cardId, JSON.stringify(filters), autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

/**
 * Hook for authentication state
 * @returns {object} {isAuthenticated, login, logout, loading, error}
 */
export const useMetabaseAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      await metabaseAPI.login(username, password);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err);
      setIsAuthenticated(false);
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    metabaseAPI.logout();
    setIsAuthenticated(false);
  };

  // Check if already authenticated
  useEffect(() => {
    setIsAuthenticated(metabaseAPI.isAuthenticated());
  }, []);

  return {
    isAuthenticated,
    login,
    logout,
    loading,
    error,
  };
};

export default useMetabaseData;
