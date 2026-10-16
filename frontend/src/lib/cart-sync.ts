'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from './client-api';
import { cartKey, useCart } from './cart';
import { toast } from './toast';
import type { CartCheckLine } from './types';

/**
 * Re-validates the cart against the server once when a cart/checkout page opens:
 *  • refreshes prices and maximum quantities, • drops products that are gone or sold out,
 *  • flags lines whose product gained colour/size options since they were added (the buyer must pick one).
 */
export function useCartSync() {
  const cart = useCart();
  const [needsOption, setNeedsOption] = useState<Record<string, { slug: string; prompt: string }>>({});
  const [checking, setChecking] = useState(true);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || cart.items.length === 0) { if (cart.items.length === 0) setChecking(false); return; }
    done.current = true;
    const snapshot = cart.items;
    api<{ lines: CartCheckLine[] }>('/public/cart/check', { method: 'POST', body: { items: snapshot.map((i) => ({ productId: i.productId, variantId: i.variantId })) } })
      .then(({ lines }) => {
        const flagged: Record<string, { slug: string; prompt: string }> = {};
        const next = [];
        const removed: string[] = [];
        for (const item of snapshot) {
          const line = lines.find((l) => cartKey(l) === cartKey(item));
          if (!line) { next.push(item); continue; }
          if (line.status === 'unavailable' || line.status === 'out_of_stock') { removed.push(item.name); continue; }
          if (line.status === 'needs_option') { flagged[cartKey(item)] = { slug: line.slug, prompt: line.prompt || 'الخيار' }; next.push(item); continue; }
          next.push({ ...item, price: line.price, maxQty: Math.max(1, line.maxQty), quantity: Math.min(item.quantity, Math.max(1, line.maxQty)), variantLabel: line.label || item.variantLabel });
        }
        const changed = removed.length > 0 || next.some((n, i) => n.price !== snapshot.find((s) => cartKey(s) === cartKey(n))?.price || n.quantity !== snapshot[i]?.quantity);
        if (changed) cart.refresh(next);
        if (removed.length) toast(`أُزيل من السلة لعدم توفره: ${removed.join('، ')}`, 'bad');
        setNeedsOption(flagged);
      })
      .catch(() => undefined) // offline / backend hiccup: the server re-checks everything when the order is placed
      .finally(() => setChecking(false));
  }, [cart]);

  return { needsOption, checking };
}
