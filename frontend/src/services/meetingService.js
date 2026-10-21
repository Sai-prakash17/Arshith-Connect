import api from './api';

/**
 * MeetingService - Video & Team Meetings
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const meetingService = {
  /**
   * Fetch meetings with optional search and status filter
   */
  async getMeetings(params = {}) {
    try {
      const response = await api.get('/api/meetings', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch meetings');
    }
  },

  /**
   * Schedule new meeting
   */
  async createMeeting(payload) {
    try {
      const response = await api.post('/api/meetings', {
        title: payload.title,
        date: payload.date || new Date().toISOString().split('T')[0],
        time: payload.time || '10:00 AM - 11:00 AM',
        startTime: payload.startTime || payload.start_time,
        endTime: payload.endTime || payload.end_time,
        duration: payload.duration || '30 mins',
        organizer: payload.organizer || payload.host,
        organizerId: payload.organizerId || payload.organizer_id,
        platform: payload.platform || 'Google Meet',
        link: payload.link || payload.room || 'https://meet.google.com/new',
        attendees: payload.attendees,
        description: payload.description || 'General discussion.',
        recipientType: payload.recipientType || payload.recipient_type || 'All Employees',
        recipients: payload.recipients || payload.recipientIds || payload.recipient_ids || [],
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not schedule meeting');
    }
  },

  /**
   * Update existing meeting
   */
  async updateMeeting(meetingId, payload) {
    try {
      const response = await api.patch(`/api/meetings/${meetingId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not update meeting');
    }
  },

  /**
   * Cancel and delete meeting
   */
  async deleteMeeting(meetingId) {
    try {
      const response = await api.delete(`/api/meetings/${meetingId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not cancel meeting');
    }
  },
};

export default meetingService;
