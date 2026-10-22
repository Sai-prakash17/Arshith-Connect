import api from './api';

/**
 * EmployeeService - Directory & Profile
 * Direct HTTP REST API integration with FastAPI and PostgreSQL
 */
export const employeeService = {
  /**
   * Fetch registered employees from PostgreSQL
   */
  async getEmployees(params = {}) {
    try {
      const response = await api.get('/api/employees', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch employees');
    }
  },

  /**
   * Add new employee record (Admin only)
   */
  async addEmployee(employeeData) {
    try {
      const response = await api.post('/api/employees', employeeData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to add employee');
    }
  },

  /**
   * Update employee record
   */
  async updateEmployee(employeeId, data) {
    try {
      const response = await api.patch(`/api/employees/${employeeId}`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to update employee');
    }
  },

  /**
   * Delete an employee (Admin only)
   */
  async deleteEmployee(employeeId) {
    try {
      const response = await api.delete(`/api/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to delete employee');
    }
  },

  /**
   * Fetch employee profile by ID or current employee profile
   */
  async getProfile(employeeId) {
    try {
      if (!employeeId || employeeId === 'me') {
        const response = await api.get('/api/employees/me');
        return response.data;
      }
      const response = await api.get(`/api/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch profile');
    }
  },

  /**
   * Update current employee profile
   */
  async updateMyProfile(data) {
    try {
      const response = await api.patch('/api/employees/me', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not update profile');
    }
  },
};

/**
 * Backwards compatibility helper for components
 */
export const getStoredEmployees = async () => {
  try {
    return await employeeService.getEmployees();
  } catch {
    return [];
  }
};

export const saveStoredEmployee = async (employee) => {
  try {
    return await employeeService.addEmployee(employee);
  } catch (err) {
    console.error('Failed to save employee to backend', err);
    throw err;
  }
};

export default employeeService;
