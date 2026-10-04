import { FINAL_STATUSES, type OrderStatus } from './constants';

/** delivered orders can only be returned; cancelled / returned are terminal. */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
  confirmed: ['new', 'shipped', 'delivered', 'cancelled', 'returned'],
  shipped: ['confirmed', 'delivered', 'cancelled', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export const isFinalStatus = (status: OrderStatus): boolean => FINAL_STATUSES.includes(status);
