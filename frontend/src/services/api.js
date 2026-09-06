import axios from 'axios';

// Live production API endpoint
const API_BASE_URL = 'https://kisanflow-tgvk.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Prevent aggressive browser / CDN caching on GET requests
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
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
  getBookingById: (id) => api.get(`/bookings/${id}`),
  updateBookingStatus: async (id, status) => {
    try {
      return await api.patch(`/bookings/${id}/status`, { status });
    } catch (err) {
      // Fallback to POST in case PATCH is blocked in some proxy environments
      return await api.post(`/bookings/${id}/status`, { status });
    }
  },
};

export const paymentService = {
  getFarmerPayments: (farmerId) => api.get(`/payments/farmer/${farmerId}`),
};

export const adminService = {
  getStats: (centreId) => api.get('/admin/stats', { params: { centreId } }),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  updateStage: async (id, data) => {
    try {
      return await api.patch(`/admin/bookings/${id}/stage`, data);
    } catch (err) {
      return await api.post(`/admin/bookings/${id}/stage`, data);
    }
  },
  getFarmers: (params) => api.get('/admin/farmers', { params }),
  getProcurements: (params) => api.get('/admin/procurements', { params }),
  updateCropMsp: (id, msp) => api.patch(`/admin/crops/${id}/msp`, { msp }),
  updateCentreCapacity: (id, capacity) => api.patch(`/admin/centres/${id}/capacity`, { capacity }),
};

export default api;