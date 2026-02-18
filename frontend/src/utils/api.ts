import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await AsyncStorage.getItem('session_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Eroare necunoscută' }));
    throw new Error(error.detail || 'Eroare de rețea');
  }

  return response.json();
}

// Restaurant APIs
export const getRestaurants = (sortBy: string = 'sponsored', search?: string) => {
  const params = new URLSearchParams({ sort_by: sortBy });
  if (search) params.append('search', search);
  return apiRequest<any[]>(`/api/restaurants?${params}`);
};

export const getNewRestaurants = () => 
  apiRequest<any[]>('/api/restaurants/new');

export const getRestaurant = (id: string) => 
  apiRequest<any>(`/api/restaurants/${id}`);

export const toggleLike = (restaurantId: string) => 
  apiRequest<{ liked: boolean }>(`/api/restaurants/${restaurantId}/like`, { method: 'POST' });

export const checkLiked = (restaurantId: string) => 
  apiRequest<{ liked: boolean }>(`/api/restaurants/${restaurantId}/liked`);

// Review APIs
export const getReviews = (restaurantId: string) => 
  apiRequest<any[]>(`/api/restaurants/${restaurantId}/reviews`);

export const createReview = (data: { restaurant_id: string; rating: number; comment: string }) => 
  apiRequest<any>('/api/reviews', { method: 'POST', body: data });

// Reservation APIs
export const getReservations = () => 
  apiRequest<any[]>('/api/reservations');

export const createReservation = (data: any) => 
  apiRequest<any>('/api/reservations', { method: 'POST', body: data });

export const cancelReservation = (id: string) => 
  apiRequest<any>(`/api/reservations/${id}/cancel`, { method: 'PUT' });

// Payment APIs
export const getPaymentMethods = () => 
  apiRequest<any[]>('/api/payment-methods');

export const addPaymentMethod = (data: any) => 
  apiRequest<any>('/api/payment-methods', { method: 'POST', body: data });

export const deletePaymentMethod = (id: string) => 
  apiRequest<any>(`/api/payment-methods/${id}`, { method: 'DELETE' });

// User APIs
export const updateUser = (data: any) => 
  apiRequest<any>('/api/users/me', { method: 'PUT', body: data });

// Seed data
export const seedData = () => 
  apiRequest<any>('/api/seed', { method: 'POST' });
