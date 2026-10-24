const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/**
 * Universal API client that automatically includes Bearer token from localStorage or session
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('aura_auth_token');
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }

  return data;
}

export const api = {
  // Foods
  getFoods: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/foods${query ? `?${query}` : ''}`);
  },
  getFoodById: (id) => apiRequest(`/foods/${id}`),
  getCategories: () => apiRequest('/foods/categories'),

  // Orders
  createOrder: (orderData) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  getMyOrders: () => apiRequest('/orders/my-orders'),
  getOrderById: (id) => apiRequest(`/orders/${id}`),
  trackOrder: (identifier) => apiRequest(`/orders/track/${identifier}`),

  // Auth / Profile
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (profileData) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  }),

  // Admin
  getAdminMetrics: () => apiRequest('/admin/metrics'),
  getAdminOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/orders${query ? `?${query}` : ''}`);
  },
  updateOrderStatus: (orderId, status, paymentStatus) => apiRequest(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, payment_status: paymentStatus })
  }),
  createFood: (foodData) => apiRequest('/admin/foods', {
    method: 'POST',
    body: JSON.stringify(foodData)
  }),
  updateFood: (id, foodData) => apiRequest(`/admin/foods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(foodData)
  }),
  toggleFoodAvailability: (id, isAvailable) => apiRequest(`/admin/foods/${id}/toggle-availability`, {
    method: 'PATCH',
    body: JSON.stringify({ is_available: isAvailable })
  }),
  deleteFood: (id) => apiRequest(`/admin/foods/${id}`, {
    method: 'DELETE'
  }),
  getAdminCustomers: () => apiRequest('/admin/customers'),
  createCategory: (categoryData) => apiRequest('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData)
  }),
  updateCategory: (id, categoryData) => apiRequest(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData)
  }),
  deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, {
    method: 'DELETE'
  }),
  syncGoogleSheets: () => apiRequest('/admin/sync-sheets', {
    method: 'POST'
  }),

  // Health
  checkHealth: () => apiRequest('/health')
};
