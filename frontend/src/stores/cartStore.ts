import { create } from 'zustand';

export interface CartItem {
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (menuItemId: string, restaurantId: string) => void;
  updateQuantity: (menuItemId: string, restaurantId: string, quantity: number) => void;
  clearCart: () => void;
  clearRestaurantItems: (restaurantId: string) => void;
  getItemCount: () => number;
  getRestaurantItems: (restaurantId: string) => CartItem[];
  getSubtotal: () => number;
  getRestaurantSubtotal: (restaurantId: string) => number;
}

export const useCartStore = create<CartState>()(
  (set, get) => ({
    items: [],

    addItem: (item, quantity = 1) => {
      set((state) => {
        const existingIndex = state.items.findIndex(
          (i) => i.menuItemId === item.menuItemId && i.restaurantId === item.restaurantId
        );
        if (existingIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + quantity,
          };
          return { items: newItems };
        }
        return { items: [...state.items, { ...item, quantity }] };
      });
    },

    removeItem: (menuItemId, restaurantId) => {
      set((state) => ({
        items: state.items.filter(
          (i) => !(i.menuItemId === menuItemId && i.restaurantId === restaurantId)
        ),
      }));
    },

    updateQuantity: (menuItemId, restaurantId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(menuItemId, restaurantId);
        return;
      }
      set((state) => ({
        items: state.items.map((i) =>
          i.menuItemId === menuItemId && i.restaurantId === restaurantId
            ? { ...i, quantity }
            : i
        ),
      }));
    },

    clearCart: () => set({ items: [] }),

    clearRestaurantItems: (restaurantId) => {
      set((state) => ({
        items: state.items.filter((i) => i.restaurantId !== restaurantId),
      }));
    },

    getItemCount: () => {
      return get().items.reduce((sum, item) => sum + item.quantity, 0);
    },

    getRestaurantItems: (restaurantId) => {
      return get().items.filter((i) => i.restaurantId === restaurantId);
    },

    getSubtotal: () => {
      return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getRestaurantSubtotal: (restaurantId) => {
      return get()
        .items.filter((i) => i.restaurantId === restaurantId)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
    },
  })
);
