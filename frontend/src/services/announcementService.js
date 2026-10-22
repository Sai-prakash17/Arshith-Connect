import api from './api';

/**
 * AnnouncementService - Broadcast Notices
 * Connected to FastAPI backend and PostgreSQL persistence
 */
export const announcementService = {
  /**
   * Fetch company announcements
   */
  async getAnnouncements(params = {}) {
    try {
      const response = await api.get('/api/announcements', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch announcements');
    }
  },

  /**
   * Publish new announcement (Admin only)
   */
  async createAnnouncement(payload) {
    try {
      const response = await api.post('/api/announcements', {
        title: payload.title,
        message: payload.message,
        author: payload.author || 'Admin Office',
        priority: payload.priority || 'Normal',
        announcementType: payload.announcementType || payload.announcement_type || 'General',
        recipientType: payload.recipientType || payload.recipient_type || 'All Employees',
        recipients: payload.recipients || payload.recipient_ids || payload.recipientIds || [],
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not create announcement');
    }
  },

  /**
   * Update announcement (Admin only)
   */
  async updateAnnouncement(announcementId, payload) {
    try {
      const response = await api.patch(`/api/announcements/${announcementId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not update announcement');
    }
  },

  /**
   * Delete announcement (Admin only)
   */
  async deleteAnnouncement(announcementId) {
    try {
      const response = await api.delete(`/api/announcements/${announcementId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not delete announcement');
    }
  },
};

export default announcementService;
