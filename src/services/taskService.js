import api from './api';

export const taskService = {
  // 1. Get all tasks
  getTasks: async () => {
    try {
      const response = await api.get('/tasks');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch tasks';
      throw new Error(msg);
    }
  },

  // 2. Get task by ID
  getTaskById: async (id) => {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch task';
      throw new Error(msg);
    }
  },

  // 3. Create new task
  createTask: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to create task';
      throw new Error(msg);
    }
  },

  // 4. Update an ongoing task
  updateTask: async (id, taskData) => {
    try {
      const response = await api.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update task';
      throw new Error(msg);
    }
  },

  // 5. Mark task as completed (Protocol 5)
  completeTask: async (id) => {
    try {
      const response = await api.patch(`/tasks/${id}/complete`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to complete task';
      throw new Error(msg);
    }
  },

  // 6. Delete an ongoing task
  deleteTask: async (id) => {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to delete task';
      throw new Error(msg);
    }
  },
};

export default taskService;

