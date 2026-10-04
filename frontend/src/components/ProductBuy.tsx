'use client';

import { useState } from 'react';
import { AddToCartButton, BuyNowButton, type Buyable } from './AddToCart';
import { formatNumber } from '@/lib/format';

export function ProductBuy({ product }: { product: Buyable }) {
  const [qty, setQty] = useState(1);
  const max = Math.max(1, Math.min(product.maxQty, 20));
  return (
    <>
      <div className="buy-box">
        {product.inStock && (
          <div className="row">
            <span style={{ fontWeight: 600 }}>الكمية</span>
            <div className="qty" role="group" aria-label="الكمية">
              <button type="button" aria-label="أنقص" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <output aria-live="polite">{qty}</output>
              <button type="button" aria-label="زِد" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>+</button>
            </div>
          </div>
        )}
        <BuyNowButton product={product} quantity={qty} />
        <AddToCartButton product={product} quantity={qty} />
      </div>
      <div className="sticky-buy no-print">
        <div style={{ lineHeight: 1.3 }}>
          <b className="price"><span className="num">{formatNumber(product.price * qty)}</span> دج</b>
        </div>
        <div className="grow"><BuyNowButton product={product} quantity={qty} /></div>
      </div>
    </>
  );
}
