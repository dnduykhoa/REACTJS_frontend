import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { cartApi } from '../api/j2ee/cartApi';
import type { CartResponse } from '../api/j2ee/types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartResponse | null;
  totalItems: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const res = await cartApi.getCart(user.userId);
      setCart(res.data.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: number, quantity: number, variantId?: number) => {
    if (!user) return;
    const res = await cartApi.addItem(user.userId, { productId, quantity, variantId });
    setCart(res.data.data);
  };

  const updateCartItem = async (itemId: number, quantity: number) => {
    if (!user) return;
    const res = await cartApi.updateItem(user.userId, itemId, quantity);
    setCart(res.data.data);
  };

  const removeCartItem = async (itemId: number) => {
    if (!user) return;
    const res = await cartApi.removeItem(user.userId, itemId);
    setCart(res.data.data);
  };

  const clearCart = async () => {
    if (!user) return;
    await cartApi.clearCart(user.userId);
    setCart(null);
  };

  const totalItems = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, totalItems, loading, fetchCart, addToCart, updateCartItem, removeCartItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
