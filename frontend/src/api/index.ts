import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (data: any) => api.post('/auth/login', data),
};

export const feedApi = {
  getFeeds: () => api.get('/feeds'),
  createFeed: (formData: FormData) => api.post('/feeds', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  toggleLike: (id: number) => api.post(`/feeds/${id}/like`),
  addComment: (id: number, text: string) => api.post(`/feeds/${id}/comment`, { text }),
};

export const memoryApi = {
  getMemories: () => api.get('/memories'),
  createMemory: (formData: FormData) => api.post('/memories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const goalApi = {
  getGoals: () => api.get('/goals'),
  createGoal: (data: any) => api.post('/goals', data),
  addSubGoal: (id: number, text: string) => api.post(`/goals/${id}/subgoals`, { text }),
  toggleSubGoal: (subGoalId: number) => api.post(`/goals/subgoals/${subGoalId}/toggle`),
};

export const bookApi = {
  getBooks: () => api.get('/books'),
  createBook: (data: any) => api.post('/books', data),
};

export default api;
