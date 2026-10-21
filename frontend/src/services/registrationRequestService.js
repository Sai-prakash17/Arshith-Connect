import api from './api';

/**
 * RegistrationRequestService - Staff Onboarding Applications & Admin Approvals
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const registrationRequestService = {
  /**
   * Fetch employee registration requests (Admin only)
   * Optional params: { status: 'PENDING' | 'PROCESSED' | 'ALL' }
   */
  async getRegistrationRequests(params = {}) {
    try {
      const response = await api.get('/api/admin/employee-registrations', { params });
      return response.data;
    } catch (error) {
      try {
        const fallback = await api.get('/api/registration-requests', { params });
        return fallback.data;
      } catch {
        throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch registration requests');
      }
    }
  },

  /**
   * Approve pending employee registration (Activates user & employee account)
   */
  async approveRequest(requestId) {
    try {
      const response = await api.patch(`/api/admin/employee-registrations/${requestId}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to approve registration request');
    }
  },

  /**
   * Reject pending employee registration
   */
  async rejectRequest(requestId, reason = '') {
    try {
      const response = await api.patch(`/api/admin/employee-registrations/${requestId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to reject registration request');
    }
  },

  /**
   * Backward-compatible general update
   */
  async updateStatus(requestId, status, reason = '') {
    if (status === 'Approved') {
      return this.approveRequest(requestId);
    } else if (status === 'Rejected') {
      return this.rejectRequest(requestId, reason);
    }
    const response = await api.patch(`/api/registration-requests/${requestId}`, { status, reason });
    return response.data;
  },
};

export default registrationRequestService;
