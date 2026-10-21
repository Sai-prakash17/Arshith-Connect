import api from './api';

/**
 * AssignmentService - Task Delegation & Sprint Milestones
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const assignmentService = {
  async getAssignments() {
    try {
      const response = await api.get('/api/assignments');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch work assignments');
    }
  },

  async createAssignment(taskData) {
    try {
      const response = await api.post('/api/assignments', {
        title: taskData.title,
        description: taskData.description || '',
        assignee: taskData.assignee || taskData.assignedTo || '',
        assignedTo: taskData.assignedTo || taskData.assignee || '',
        assignmentType: taskData.assignmentType || taskData.assignment_type || 'Individual',
        targetId: taskData.targetId || taskData.target_id || null,
        deadline: taskData.deadline,
        priority: taskData.priority || 'Low',
        progress: taskData.progress || 0,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to create work assignment');
    }
  },

  async updateProgress(taskId, progress, status = null) {
    try {
      const response = await api.patch(`/api/assignments/${taskId}`, {
        progress,
        status,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to update task progress');
    }
  },
};

export default assignmentService;
