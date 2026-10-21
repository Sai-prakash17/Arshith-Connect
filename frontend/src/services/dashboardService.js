import api from './api';

/**
 * DashboardService - Operational metrics, attendances, and scheduled activities
 * Connected to FastAPI backend with real PostgreSQL data queries
 */
export const dashboardService = {
  /**
   * Fetch live Admin Dashboard metrics (Attendance counters, meetings, notices)
   */
  async getAdminDashboard() {
    try {
      const response = await api.get('/api/admin/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch admin dashboard');
    }
  },

  /**
   * Fetch live Employee Dashboard metrics (Personal clock, calendar, alerts)
   */
  async getEmployeeDashboard() {
    try {
      const response = await api.get('/api/employee/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch employee dashboard');
    }
  },
};

export default dashboardService;
