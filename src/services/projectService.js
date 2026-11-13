import api from './api';

export const projectService = {
  // 1. Get all projects with optional query params
  getProjects: async (params = {}) => {
    try {
      const response = await api.get('/projects', { params });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch projects';
      throw new Error(msg);
    }
  },

  // 2. Get project by ID or project code
  getProjectById: async (id) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch project details';
      throw new Error(msg);
    }
  },

  // 3. Create a new project
  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to create project';
      throw new Error(msg);
    }
  },

  // 4. Update an existing project
  updateProject: async (id, projectData) => {
    try {
      const response = await api.put(`/projects/${id}`, projectData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update project';
      throw new Error(msg);
    }
  },

  // 5. Delete a project
  deleteProject: async (id) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to delete project';
      throw new Error(msg);
    }
  },
};

export default projectService;

