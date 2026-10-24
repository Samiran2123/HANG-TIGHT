import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function readCartFromStorage(key) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCartToStorage(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`Failed to persist cart for key ${key}:`, e);
  }
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const activeKeyRef = useRef(null);
  const prevUserIdRef = useRef(undefined);

  // Safe one-time legacy cart migration to guest cart
  useEffect(() => {
    try {
      const legacy = localStorage.getItem('aura_cart');
      if (legacy && !localStorage.getItem('aura_cart_guest')) {
        localStorage.setItem('aura_cart_guest', legacy);
      }
      if (legacy) {
        localStorage.removeItem('aura_cart');
      }
    } catch (e) {
      console.warn('Legacy cart migration notice:', e);
    }
  }, []);

  // Account switch, sign-in, and sign-out hydration lifecycle
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id || null;
    const targetKey = currentUserId ? `aura_cart_${currentUserId}` : 'aura_cart_guest';

    if (prevUserIdRef.current !== currentUserId || !isCartReady) {
      // If already initialized, persist current in-memory items to outgoing key before switching
      if (isCartReady && activeKeyRef.current) {
        writeCartToStorage(activeKeyRef.current, items);
      }

      // Hydrate from target key without merging
      const loaded = readCartFromStorage(targetKey);
      setItems(loaded);
      activeKeyRef.current = targetKey;
      prevUserIdRef.current = currentUserId;
      setIsCartReady(true);
    }
  }, [user?.id, authLoading, isCartReady]);

  // Persist items updates to currently active key
  useEffect(() => {
    if (!isCartReady || authLoading || !activeKeyRef.current) return;
    writeCartToStorage(activeKeyRef.current, items);
  }, [items, isCartReady, authLoading]);

  const addToCart = (food, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.food.id === food.id);
      if (existing) {
        return prev.map((item) =>
          item.food.id === food.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: food.id, food, quantity }];
    });
  };

  const removeFromCart = (foodId) => {
    setItems((prev) => prev.filter((item) => item.food.id !== foodId));
  };

  const updateQuantity = (foodId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(foodId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.food.id === foodId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = isCartReady ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const subtotal = Number(
    items
      .reduce((sum, item) => sum + Number(item.food.price) * item.quantity, 0)
      .toFixed(2)
  );

  const tax = Number((subtotal * 0.0825).toFixed(2));
  const deliveryFee = subtotal > 50 || subtotal === 0 ? 0.0 : 4.99;
  const total = Number((subtotal + tax + deliveryFee).toFixed(2));

  const value = {
    items,
    itemCount,
    subtotal,
    tax,
    deliveryFee,
    total,
    isCartOpen,
    isCartReady,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
