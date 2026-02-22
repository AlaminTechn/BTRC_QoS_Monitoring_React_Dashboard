/**
 * Auth Context
 * Provides authenticated user info + resolved permissions to the whole app
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import metabaseAPI from '../api/metabase';
import { resolvePermissions, ADMIN_PERMISSIONS } from '../config/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);   // { id, email, name, groupIds, groups }
  const [perms,   setPerms]   = useState(null);   // resolved permission object
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Authenticate with Metabase
      await metabaseAPI.login(email, password);

      // 2. Fetch user profile + group memberships
      const userData = await metabaseAPI.getCurrentUser();
      setUser(userData);

      // 3. Resolve permissions
      const resolved = userData.isAdmin
        ? ADMIN_PERMISSIONS
        : resolvePermissions(userData.groupIds, userData.email);
      setPerms(resolved);

      console.log(`✅ Logged in: ${userData.name} | Group: ${resolved.label} | Tabs: ${resolved.tabs}`);
      return { user: userData, permissions: resolved };
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    metabaseAPI.logout();
    setUser(null);
    setPerms(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, perms, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Hook to consume auth context */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
