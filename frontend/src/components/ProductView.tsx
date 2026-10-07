'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { ProductDetail, Variant } from '@/lib/types';
import { discountPercent, formatNumber } from '@/lib/format';
import { findVariant, firstChoice, settleSize } from '@/lib/variants';
import { AddToCartButton, BuyNowButton, type Buyable } from './AddToCart';
import { Gallery, type GalleryImage } from './Gallery';

const label = (v: Pick<Variant, 'color' | 'size'>) => [v.color && `اللون: ${v.color}`, v.size && `الحجم: ${v.size}`].filter(Boolean).join(' — ');
const uniq = <T,>(list: T[]) => [...new Set(list)];

/**
 * Product page body: gallery + price + colour/size pickers + buy buttons.
 * Picking an option updates the price, stock message, maximum quantity and the photo.
 */
export function ProductView({ product, children }: { product: ProductDetail; children: ReactNode }) {
  const variants = product.variants;
  const first = firstChoice(variants);
  const [color, setColor] = useState(first?.color ?? '');
  const [size, setSize] = useState(first?.size ?? '');
  const [qty, setQty] = useState(1);
  const [index, setIndex] = useState(0);

  // Photos of the product, plus any option photo that isn't already among them.
  const gallery = useMemo<GalleryImage[]>(() => {
    const own = product.images;
    const extra = variants.map((v) => v.imagePublicId).filter((id): id is string => !!id && !own.some((i) => i.publicId === id));
    return [...own, ...uniq(extra).map((publicId) => ({ publicId, alt: '' }))];
  }, [product.images, variants]);

  const colors = useMemo(() => uniq(variants.map((v) => v.color)).filter(Boolean), [variants]);
  const sizes = useMemo(() => uniq(variants.map((v) => v.size)).filter(Boolean), [variants]);
  const hexOf = (c: string) => variants.find((v) => v.color === c && v.colorHex)?.colorHex ?? '';
  const find = (c: string, s: string) => findVariant(variants, c, s);
  const selected = variants.length ? find(color, size) : null;

  function showPhotoOf(v: Variant | null) {
    if (!v?.imagePublicId) return;
    const i = gallery.findIndex((g) => g.publicId === v.imagePublicId);
    if (i >= 0) setIndex(i);
  }
  function pick(nextColor: string, nextSize: string) {
    const s = settleSize(variants, nextColor, nextSize);
    setColor(nextColor); setSize(s); setQty(1);
    showPhotoOf(find(nextColor, s));
  }

  const unitPrice = selected?.price ?? product.price;
  const compareAt = selected && selected.price !== null ? null : product.compareAtPrice;
  const off = discountPercent(unitPrice, compareAt);
  const inStock = variants.length ? !!selected?.inStock : product.inStock;
  const lowStock = variants.length ? !!selected?.lowStock : product.lowStock;
  const maxQty = Math.max(1, Math.min(variants.length ? selected?.maxQty ?? 1 : product.maxQty, 20));
  const stock = !inStock ? { cls: 'out', text: variants.length && !selected ? 'هذا الخيار غير متوفر' : 'نفدت الكمية' } : lowStock ? { cls: 'low', text: 'كمية محدودة — سارع بالطلب' } : { cls: '', text: 'متوفر' };

  const buyable: Buyable = {
    id: product.id, variantId: selected?.id ?? null, variantLabel: selected ? label(selected) : '',
    slug: product.slug, name: product.name, price: unitPrice,
    image: selected?.imagePublicId ?? product.images[0]?.publicId ?? null, maxQty, inStock,
  };
  const colorAvailable = (c: string) => variants.some((v) => v.color === c && v.inStock);
  const sizeAvailable = (s: string) => !!find(color, s)?.inStock;

  return (
    <div className="pdp">
      <Gallery images={gallery} name={product.name} index={index} onIndex={setIndex} />
      <div className="pdp-info">
        {product.brand && <span className="muted">{product.brand}</span>}
        <h1>{product.name}</h1>
        <div className="pdp-price">
          <span className="price"><span className="num">{formatNumber(unitPrice)}</span> دج</span>
          {compareAt && compareAt > unitPrice && (
            <>
              <span className="price-old"><span className="num">{formatNumber(compareAt)}</span> دج</span>
              <span className="save-chip">وفّر {off}%</span>
            </>
          )}
        </div>
        <span className={`stock-note ${stock.cls}`}>{stock.text}</span>

        {colors.length > 0 && (
          <fieldset className="opt-group">
            <legend>اللون: <b>{color}</b></legend>
            <div className="opt-list">
              {colors.map((c) => {
                const hex = hexOf(c);
                const ok = colorAvailable(c);
                return hex ? (
                  <button key={c} type="button" className={`swatch ${ok ? '' : 'off'}`} aria-pressed={c === color} aria-label={`${c}${ok ? '' : ' (غير متوفر)'}`} title={c} style={{ ['--sw' as string]: hex }} onClick={() => pick(c, size)} />
                ) : (
                  <button key={c} type="button" className={`chip ${ok ? '' : 'off'}`} aria-pressed={c === color} onClick={() => pick(c, size)}>{c}</button>
                );
              })}
            </div>
          </fieldset>
        )}
        {sizes.length > 0 && (
          <fieldset className="opt-group">
            <legend>الحجم: <b>{size}</b></legend>
            <div className="opt-list">
              {sizes.map((s) => (
                <button key={s} type="button" className={`chip ${sizeAvailable(s) ? '' : 'off'}`} aria-pressed={s === size} disabled={!find(color, s)} onClick={() => pick(color, s)}>{s}</button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="buy-box">
          {inStock && (
            <div className="row">
              <span style={{ fontWeight: 600 }}>الكمية</span>
              <div className="qty" role="group" aria-label="الكمية">
                <button type="button" aria-label="أنقص" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                <output aria-live="polite">{Math.min(qty, maxQty)}</output>
                <button type="button" aria-label="زِد" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>+</button>
              </div>
            </div>
          )}
          <BuyNowButton product={buyable} quantity={Math.min(qty, maxQty)} />
          <AddToCartButton product={buyable} quantity={Math.min(qty, maxQty)} />
        </div>
        <div className="sticky-buy no-print">
          <b className="price"><span className="num">{formatNumber(unitPrice * Math.min(qty, maxQty))}</span> دج</b>
          <div className="grow"><BuyNowButton product={buyable} quantity={Math.min(qty, maxQty)} /></div>
        </div>
        {children}
      </div>
    </div>
  );
}
