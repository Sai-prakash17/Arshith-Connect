import api from './api';

/**
 * LeaveService - Leave Applications and Approvals
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const leaveService = {
  /**
   * Get all leave requests (Admin sees all; employee sees own)
   */
  async getLeaves() {
    try {
      const response = await api.get('/api/leaves');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch leave requests');
    }
  },

  /**
   * Get authenticated employee's leaves
   */
  async getMyLeaves() {
    try {
      const response = await api.get('/api/leaves/me');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch personal leaves');
    }
  },

  /**
   * Get authenticated employee's live leave balances
   */
  async getLeaveBalances() {
    try {
      const response = await api.get('/api/leaves/balances');
      return response.data;
    } catch (error) {
      console.warn('Could not fetch dynamic leave balances:', error);
      return null;
    }
  },

  /**
   * Submit new leave application
   */
  async applyLeave(leavePayload) {
    try {
      const response = await api.post('/api/leaves', {
        employeeId: leavePayload.employeeId,
        employeeName: leavePayload.employeeName,
        leaveType: leavePayload.leaveType,
        durationType: leavePayload.durationType || 'Full-Day Leave',
        startDate: leavePayload.startDate,
        endDate: leavePayload.endDate,
        leaveDate: leavePayload.leaveDate,
        startTime: leavePayload.startTime,
        endTime: leavePayload.endTime,
        hoursCount: leavePayload.hoursCount,
        daysCount: leavePayload.daysCount,
        reason: leavePayload.reason,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Leave application failed');
    }
  },

  /**
   * Approve or decline a leave request (Admin only)
   */
  async updateLeaveStatus(leaveId, status, rejectionRemarks = null) {
    try {
      const response = await api.patch(`/api/leaves/${leaveId}`, {
        status,
        rejectionRemarks,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to update leave status');
    }
  },
};

export default leaveService;
