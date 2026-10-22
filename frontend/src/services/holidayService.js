import api from './api';

/**
 * HolidayService - Company Holidays Management
 * Connected to FastAPI backend and PostgreSQL persistence
 */
export const holidayService = {
  /**
   * Fetch company holidays
   */
  async getHolidays(params = {}) {
    try {
      const response = await api.get('/api/holidays', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch holidays');
    }
  },

  /**
   * Add a new holiday (Admin only)
   */
  async addHoliday(payload) {
    try {
      const response = await api.post('/api/holidays', {
        name: payload.name,
        date: payload.date,
        description: payload.description || 'Company observed holiday.',
        type: payload.type || 'National Holiday',
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not create holiday');
    }
  },

  /**
   * Update holiday (Admin only)
   */
  async updateHoliday(holidayId, payload) {
    try {
      const response = await api.patch(`/api/holidays/${holidayId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not update holiday');
    }
  },

  /**
   * Delete holiday (Admin only)
   */
  async deleteHoliday(holidayId) {
    try {
      const response = await api.delete(`/api/holidays/${holidayId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not delete holiday');
    }
  },
};

export default holidayService;
