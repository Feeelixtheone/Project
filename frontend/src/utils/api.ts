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

// Stripe Payment APIs
export const createCheckoutSession = (data: {
  reservation_type: string;
  restaurant_id: string;
  amount: number;
  origin_url: string;
  reservation_data?: any;
}) => apiRequest<any>('/api/payments/checkout/create', { method: 'POST', body: data });

export const getCheckoutStatus = (sessionId: string) =>
  apiRequest<any>(`/api/payments/checkout/status/${sessionId}`);

export const createReservationWithPayment = (data: {
  restaurant_id: string;
  date: string;
  time: string;
  guests: number;
  special_requests?: string;
  reservation_type: string;
  ordered_items?: any[];
  origin_url: string;
}) => apiRequest<any>('/api/reservations/with-payment', { method: 'POST', body: data });

export const confirmReservationPayment = (reservationId: string, sessionId: string) =>
  apiRequest<any>(`/api/reservations/${reservationId}/confirm-payment?session_id=${sessionId}`, { method: 'POST' });

export const getMyPaymentTransactions = () =>
  apiRequest<any[]>('/api/payments/my-transactions');

// Restaurant upfront fee
export const getUpfrontFee = (restaurantId: string) =>
  apiRequest<any>(`/api/restaurants/${restaurantId}/upfront-fee`);

// Direct Orders (Cart checkout)
export const createDirectOrder = (data: {
  restaurant_id: string;
  items: Array<{
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
  }>;
  origin_url: string;
}) => apiRequest<any>('/api/orders/create', { method: 'POST', body: data });

export const getMyOrders = () =>
  apiRequest<any[]>('/api/orders/my');


// Company APIs
export const registerCompany = (data: {
  company_name: string;
  cui: string;
  email: string;
  phone: string;
}) => apiRequest<any>('/api/companies/register', { method: 'POST', body: data });

export const getMyCompany = () =>
  apiRequest<any>('/api/companies/me');

export const getMyStores = () =>
  apiRequest<any[]>('/api/stores/my');

export const createStore = (data: any) =>
  apiRequest<any>('/api/stores', { method: 'POST', body: data });

export const addStoreProduct = (storeId: string, data: any) =>
  apiRequest<any>(`/api/stores/${storeId}/products`, { method: 'POST', body: data });

export const deleteStoreProduct = (storeId: string, productId: string) =>
  apiRequest<any>(`/api/stores/${storeId}/products/${productId}`, { method: 'DELETE' });

export const getStoreProducts = (storeId: string) =>
  apiRequest<any[]>(`/api/stores/${storeId}/products`);

export const getStoreOrders = (storeId: string) =>
  apiRequest<any>(`/api/stores/${storeId}/orders`);

// Notification APIs
export const getCompanyNotifications = () =>
  apiRequest<any[]>('/api/notifications/company');

export const markNotificationRead = (notificationId: string) =>
  apiRequest<any>(`/api/notifications/${notificationId}/read`, { method: 'PUT' });

export const markAllNotificationsRead = () =>
  apiRequest<any>('/api/notifications/mark-all-read', { method: 'PUT' });

// Receipt APIs
export const getCompanyReceipts = () =>
  apiRequest<any[]>('/api/receipts/company');

// Admin APIs
export const getAdminStats = () =>
  apiRequest<any>('/api/admin/stats');

export const getAdminNotifications = () =>
  apiRequest<any[]>('/api/admin/notifications');

export const markAdminNotificationRead = (notificationId: string) =>
  apiRequest<any>(`/api/admin/notifications/${notificationId}/read`, { method: 'PUT' });

export const getAdminRestaurants = () =>
  apiRequest<any[]>('/api/admin/restaurants');

export const deleteAdminRestaurant = (restaurantId: string) =>
  apiRequest<any>(`/api/admin/restaurants/${restaurantId}`, { method: 'DELETE' });

export const deleteAdminProduct = (restaurantId: string, productId: string) =>
  apiRequest<any>(`/api/admin/restaurants/${restaurantId}/products/${productId}`, { method: 'DELETE' });

export const getAdminOrders = () =>
  apiRequest<any[]>('/api/admin/orders');

export const getAdminReservations = () =>
  apiRequest<any[]>('/api/admin/reservations');

export const verifyCompany = (companyId: string) =>
  apiRequest<any>(`/api/companies/${companyId}/verify`, { method: 'PUT' });

export const getAdminCompanies = () =>
  apiRequest<any[]>('/api/admin/companies');

export const getAdminUsers = () =>
  apiRequest<any[]>('/api/admin/users');


// Favorites APIs
export const getFavorites = () =>
  apiRequest<any[]>('/api/favorites');

export const toggleFavorite = (restaurantId: string) =>
  apiRequest<any>(`/api/favorites/${restaurantId}`, { method: 'POST' });

export const checkFavorite = (restaurantId: string) =>
  apiRequest<any>(`/api/favorites/check/${restaurantId}`);

// Feedback APIs
export const submitFeedback = (data: {
  order_id?: string;
  reservation_id?: string;
  restaurant_id: string;
  rating: number;
  food_rating?: number;
  service_rating?: number;
  ambiance_rating?: number;
  comment?: string;
  would_recommend?: boolean;
}) => apiRequest<any>('/api/feedback', { method: 'POST', body: data });

export const getPendingFeedback = () =>
  apiRequest<any>('/api/feedback/pending');

export const getRestaurantFeedback = (restaurantId: string) =>
  apiRequest<any[]>(`/api/feedback/restaurant/${restaurantId}`);

// Special Offers APIs
export const createSpecialOffer = (data: any) =>
  apiRequest<any>('/api/offers', { method: 'POST', body: data });

export const getRestaurantOffers = (restaurantId: string) =>
  apiRequest<any[]>(`/api/offers/restaurant/${restaurantId}`);

export const getAllActiveOffers = () =>
  apiRequest<any[]>('/api/offers/active');

// User Notifications
export const getUserNotifications = () =>
  apiRequest<any[]>('/api/user/notifications');

export const markUserNotificationsRead = () =>
  apiRequest<any>('/api/user/notifications/read-all', { method: 'PUT' });

// Restaurant of the Week
export const getRestaurantOfTheWeek = () =>
  apiRequest<any>('/api/restaurant-of-the-week');

export const autoSelectROTW = () =>
  apiRequest<any>('/api/admin/restaurant-of-the-week/auto-select', { method: 'POST' });

export const manualSelectROTW = (restaurantId: string) =>
  apiRequest<any>(`/api/admin/restaurant-of-the-week/manual?restaurant_id=${restaurantId}`, { method: 'POST' });

// Loyalty Points
export const getMyLoyaltyPoints = () =>
  apiRequest<any>('/api/loyalty/my-points');

export const awardLoyaltyPoints = (orderId: string, amount: number, restaurantName: string) =>
  apiRequest<any>(`/api/loyalty/award-points?order_id=${orderId}&amount=${amount}&restaurant_name=${encodeURIComponent(restaurantName)}`, { method: 'POST' });

export const getLoyaltyLeaderboard = () =>
  apiRequest<any[]>('/api/loyalty/leaderboard');

// Push Tokens
export const registerPushToken = (token: string) =>
  apiRequest<any>(`/api/push-tokens/register?token=${encodeURIComponent(token)}`, { method: 'POST' });
