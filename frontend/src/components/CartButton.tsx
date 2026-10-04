'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { CartIcon } from './icons';

export function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="icon-btn" aria-label={`السلة (${count})`}>
      <CartIcon />
      {count > 0 && <span className="badge-dot">{count}</span>}
    </Link>
  );
}
