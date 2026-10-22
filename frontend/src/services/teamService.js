import api from './api';

/**
 * TeamService - Department Teams and Member Rosters
 * Connected to FastAPI backend with PostgreSQL persistence
 */
export const teamService = {
  async getTeams() {
    try {
      const response = await api.get('/api/teams');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Could not fetch teams');
    }
  },

  async createTeam({ teamName, department = 'Operations', description = '', leader = null, members = [] }) {
    try {
      const response = await api.post('/api/teams', {
        teamName,
        department,
        description,
        leader,
        members,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to create team');
    }
  },

  async deleteTeam(teamId) {
    try {
      const response = await api.delete(`/api/teams/${teamId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to delete team');
    }
  },
};

export default teamService;
