import api from './api';

/**
 * OfficeTimingService - Corporate Working Hours and Special Schedules
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const officeTimingService = {
  async getOfficeTimings() {
    try {
      const response = await api.get('/api/office-timings');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch office timings');
    }
  },

  async saveOfficeTimings(data) {
    try {
      const response = await api.post('/api/office-timings', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to save office timings');
    }
  },

  async deleteSpecialTiming(timingId) {
    try {
      const response = await api.delete(`/api/office-timings/${timingId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to delete special timing');
    }
  },
};

export default officeTimingService;
