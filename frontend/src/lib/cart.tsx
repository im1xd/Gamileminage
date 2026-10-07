'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

export interface CartItem {
  productId: string;
  /** Set when the product is sold in colours/sizes. */
  variantId: string | null;
  variantLabel: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  maxQty: number;
}

const KEY = 'gm_cart_v1';
/** A cart line is one product in one option (colour/size). */
export const cartKey = (i: { productId: string; variantId: string | null }): string => `${i.productId}|${i.variantId ?? ''}`;
const UUID = /^[0-9a-f-]{36}$/i;
const MAX_LINES = 30;
const MAX_QTY = 20;

type Action =
  | { type: 'load'; items: CartItem[] }
  | { type: 'add'; item: CartItem }
  | { type: 'qty'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'refresh'; items: CartItem[] }
  | { type: 'clear' };

const clampQty = (q: number, max: number) => Math.max(1, Math.min(Math.floor(q) || 1, Math.min(max || MAX_QTY, MAX_QTY)));

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case 'load':
    case 'refresh':
      return action.items;
    case 'add': {
      const key = cartKey(action.item);
      const existing = state.find((i) => cartKey(i) === key);
      if (existing) {
        return state.map((i) => (cartKey(i) === key ? { ...i, ...action.item, quantity: clampQty(i.quantity + action.item.quantity, action.item.maxQty) } : i));
      }
      if (state.length >= MAX_LINES) return state;
      return [...state, { ...action.item, quantity: clampQty(action.item.quantity, action.item.maxQty) }];
    }
    case 'qty':
      return state.map((i) => (cartKey(i) === action.key ? { ...i, quantity: clampQty(action.quantity, i.maxQty) } : i));
    case 'remove':
      return state.filter((i) => cartKey(i) !== action.key);
    case 'clear':
      return [];
  }
}

/** localStorage is user-controlled input: validate every field before trusting it. */
function parse(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const items: CartItem[] = [];
    for (const row of data.slice(0, MAX_LINES)) {
      const r = row as Partial<CartItem>;
      if (
        typeof r.productId === 'string' && UUID.test(r.productId) &&
        (r.variantId == null || (typeof r.variantId === 'string' && UUID.test(r.variantId))) &&
        typeof r.slug === 'string' && typeof r.name === 'string' &&
        Number.isInteger(r.price) && (r.price as number) >= 0 &&
        Number.isInteger(r.quantity) && Number.isInteger(r.maxQty)
      ) {
        items.push({
          productId: r.productId,
          variantId: typeof r.variantId === 'string' ? r.variantId : null,
          variantLabel: typeof r.variantLabel === 'string' ? r.variantLabel.slice(0, 120) : '',
          slug: r.slug.slice(0, 200),
          name: r.name.slice(0, 200),
          price: r.price as number,
          image: typeof r.image === 'string' && r.image.startsWith('gamil-minage/') ? r.image : null,
          quantity: clampQty(r.quantity as number, r.maxQty as number),
          maxQty: Math.max(1, Math.min(r.maxQty as number, MAX_QTY)),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  refresh: (items: CartItem[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    dispatch({ type: 'load', items: parse(window.localStorage.getItem(KEY)) });
    const onStorage = (e: StorageEvent) => e.key === KEY && dispatch({ type: 'load', items: parse(e.newValue) });
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode / quota — the cart still works for this session */
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const act = (action: Action) => {
      const next = reducer(items, action);
      dispatch(action);
      persist(next);
    };
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      add: (item) => act({ type: 'add', item }),
      setQty: (key, quantity) => act({ type: 'qty', key, quantity }),
      remove: (key) => act({ type: 'remove', key }),
      refresh: (next) => act({ type: 'refresh', items: next }),
      clear: () => act({ type: 'clear' }),
    };
  }, [items, persist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
