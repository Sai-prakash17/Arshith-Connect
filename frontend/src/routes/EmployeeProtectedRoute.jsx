import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * EmployeeProtectedRoute - Route guard for employee portal
 * Ensures only authenticated employees (or admins) can access /employee routes.
 * Redirects unauthenticated users to /login.
 */
export default function EmployeeProtectedRoute() {
  const role = localStorage.getItem('arshith_role');
  const user = localStorage.getItem('arshith_user');
  const token = localStorage.getItem('arshith_auth_token');

  if (!role || !user || !token || role !== 'employee') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
