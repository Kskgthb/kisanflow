import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://kisanflow-tgvk.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const bookingService = {
  getCentres: () => api.get('/centres'),
  getSlots: (centreId, date) => api.get(`/centres/${centreId}/slots/${date}`),
  createBooking: (data) => api.post('/bookings', data),
  getFarmerBookings: (farmerId) => api.get(`/bookings/farmer/${farmerId}`),
};

export default api;