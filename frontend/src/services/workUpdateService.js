import api from './api';

/**
 * WorkUpdateService - Daily Standup Logs & Sprint Activity
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const workUpdateService = {
  async getWorkUpdates(params = {}) {
    try {
      const response = await api.get('/api/work-updates', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch work updates');
    }
  },

  async submitWorkUpdate(payload) {
    try {
      const response = await api.post('/api/work-updates', {
        employeeName: payload.employeeName || payload.empName,
        employeeId: payload.employeeId,
        tasksCompleted: payload.tasksCompleted || payload.updateText,
        blockers: payload.blockers || 'None',
        tag: payload.tag || 'Operations',
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to submit work update');
    }
  },
};

export default workUpdateService;
