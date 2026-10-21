import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * AdminProtectedRoute - Guards administrator routes
 * Verifies active session with admin role in localStorage.
 * Redirects unauthenticated users to /admin/login.
 */
export default function AdminProtectedRoute() {
  const role = localStorage.getItem('arshith_role');
  const user = localStorage.getItem('arshith_user');
  const token = localStorage.getItem('arshith_auth_token');

  if (!role || !user || !token || role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
