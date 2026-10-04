'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatNumber } from '@/lib/format';
import { Img } from '@/components/Img';
import { BoxIcon, TrashIcon } from '@/components/icons';

export default function CartPage() {
  const cart = useCart();
  return (
    <div className="container">
      <div className="page-title"><h1>سلة التسوق</h1></div>
      {cart.items.length === 0 ? (
        <div className="empty" style={{ marginBlockEnd: '3rem' }}>
          <h3>سلتك فارغة</h3>
          <p style={{ marginBlockEnd: '1rem' }}>أضف بعض المنتجات وستظهر هنا.</p>
          <Link href="/shop" className="btn">تصفّح المنتجات</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="panel">
            {cart.items.map((item) => (
              <div className="cart-line" key={item.productId}>
                <Link href={`/product/${encodeURIComponent(item.slug)}`}>
                  {item.image ? <Img id={item.image} alt={item.name} width={84} ratio="1:1" /> : <div className="noimg"><BoxIcon /></div>}
                </Link>
                <div>
                  <h3><Link href={`/product/${encodeURIComponent(item.slug)}`}>{item.name}</Link></h3>
                  <div className="qty" role="group" aria-label="الكمية" style={{ height: 38 }}>
                    <button type="button" aria-label="أنقص" onClick={() => cart.setQty(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                    <output>{item.quantity}</output>
                    <button type="button" aria-label="زِد" onClick={() => cart.setQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.maxQty}>+</button>
                  </div>
                  <div><button type="button" className="link-btn" onClick={() => cart.remove(item.productId)}><TrashIcon width={14} height={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> حذف</button></div>
                </div>
                <b className="price"><span className="num">{formatNumber(item.price * item.quantity)}</span> دج</b>
              </div>
            ))}
          </div>
          <aside className="panel" style={{ position: 'sticky', insetBlockStart: 130 }}>
            <h2>ملخص الطلب</h2>
            <div className="summary-row"><span>المجموع</span><b><span className="num">{formatNumber(cart.subtotal)}</span> دج</b></div>
            <div className="summary-row muted"><span>التوصيل</span><span>يُحسب حسب ولايتك</span></div>
            <Link href="/checkout" className="btn btn-block" style={{ marginBlockStart: '1rem' }}>إتمام الطلب</Link>
            <p className="muted center" style={{ fontSize: '.85rem', marginBlockStart: '.8rem' }}>الدفع عند الاستلام</p>
          </aside>
        </div>
      )}
    </div>
  );
}
