'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { toast } from '@/lib/toast';
import { CartIcon } from './icons';

export interface Buyable {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  maxQty: number;
  inStock: boolean;
}

export function AddToCartButton({ product, quantity = 1, compact = false, label }: { product: Buyable; quantity?: number; compact?: boolean; label?: string }) {
  const cart = useCart();
  if (!product.inStock) {
    return <button className={`btn btn-ghost btn-block ${compact ? 'btn-sm' : ''}`} disabled>نفدت الكمية</button>;
  }
  return (
    <button
      type="button"
      className={`btn btn-block ${compact ? 'btn-soft btn-sm card-add' : ''}`}
      onClick={() => {
        cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, quantity, maxQty: product.maxQty });
        toast('تمت الإضافة إلى السلة ✓');
      }}
    >
      <CartIcon width={18} height={18} /> {label ?? 'أضف إلى السلة'}
    </button>
  );
}

export function BuyNowButton({ product, quantity }: { product: Buyable; quantity: number }) {
  const cart = useCart();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-brass btn-block"
      disabled={!product.inStock}
      onClick={() => {
        cart.add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, quantity, maxQty: product.maxQty });
        router.push('/checkout');
      }}
    >
      اطلب الآن — الدفع عند الاستلام
    </button>
  );
}
