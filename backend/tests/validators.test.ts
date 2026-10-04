import test from 'node:test';
import assert from 'node:assert/strict';
import { orderCreateSchema, productSchema, settingsSchema, categorySchema, bannerSchema, changePasswordSchema, adminProductsQuery, publicProductsQuery } from '../src/lib/validators';
import { PUBLIC_ID_PATTERN } from '../src/lib/constants';
import { canTransition } from '../src/lib/order-status';

const UUID = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const validOrder = { customerName: 'محمد أمين', phone: '07 93 81 18 91', wilayaCode: 39, commune: 'الوادي', items: [{ productId: UUID, quantity: 2 }] };

test('order: valid payload is normalised', () => {
  const r = orderCreateSchema.safeParse(validOrder);
  assert.ok(r.success);
  assert.equal(r.data.phone, '0793811891');
  assert.equal(r.data.address, '');
});

test('order: rejects bad phone, qty abuse, empty cart, bad wilaya, fake ids', () => {
  const bad = (patch: object) => orderCreateSchema.safeParse({ ...validOrder, ...patch }).success;
  assert.equal(bad({ phone: '12345' }), false);
  assert.equal(bad({ items: [] }), false);
  assert.equal(bad({ items: [{ productId: UUID, quantity: 0 }] }), false);
  assert.equal(bad({ items: [{ productId: UUID, quantity: 21 }] }), false);
  assert.equal(bad({ items: [{ productId: UUID, quantity: 1.5 }] }), false);
  assert.equal(bad({ items: [{ productId: "1' OR '1'='1", quantity: 1 }] }), false);
  assert.equal(bad({ wilayaCode: 70 }), false);
  assert.equal(bad({ wilayaCode: 0 }), false);
  assert.equal(bad({ wilayaCode: '39' }), false);
  assert.equal(bad({ customerName: 'a' }), false);
  assert.equal(bad({ note: 'x'.repeat(301) }), false);
});

test('order: client-supplied price fields are ignored (stripped), never trusted', () => {
  const r = orderCreateSchema.safeParse({ ...validOrder, total: 1, shippingFee: 0, items: [{ productId: UUID, quantity: 1, price: 1 }] });
  assert.ok(r.success);
  assert.equal('total' in r.data, false);
  assert.equal('price' in r.data.items[0], false);
});

test('order: control characters are stripped from text', () => {
  const r = orderCreateSchema.safeParse({ ...validOrder, customerName: 'علي\u0000\u0007 حسن' });
  assert.ok(r.success);
  assert.equal(r.data.customerName, 'علي حسن');
});

test('product: compare-at price must exceed price; images must live in our folder', () => {
  const base = { name: 'طنجرة', price: 1000, stock: 3, images: [] };
  assert.ok(productSchema.safeParse(base).success);
  assert.equal(productSchema.safeParse({ ...base, compareAtPrice: 900 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, compareAtPrice: 1000 }).success, false);
  assert.ok(productSchema.safeParse({ ...base, compareAtPrice: 1500 }).success);
  assert.equal(productSchema.safeParse({ ...base, price: -1 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, stock: -1 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, price: 10.5 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, images: [{ publicId: 'https://evil.example/x.png' }] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, images: [{ publicId: 'other-account/products/x' }] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, images: [{ publicId: 'gamil-minage/../secret' }] }).success, false);
  assert.ok(productSchema.safeParse({ ...base, images: [{ publicId: 'gamil-minage/products/abc_123' }] }).success);
  assert.equal(productSchema.safeParse({ ...base, images: Array(13).fill({ publicId: 'gamil-minage/products/a' }) }).success, false);
});

test('public id pattern', () => {
  assert.ok(PUBLIC_ID_PATTERN.test('gamil-minage/products/k3j2h1'));
  for (const bad of ['', 'gamil-minage/', 'gamil-minage/a b', 'gamil-minage/<script>', 'x/gamil-minage/a', 'gamil-minage/..%2f']) assert.equal(PUBLIC_ID_PATTERN.test(bad), false, bad);
});

test('settings: unknown keys, http urls and oversize values are rejected', () => {
  assert.ok(settingsSchema.safeParse({ store_name: 'Gamil', instagram: 'https://instagram.com/x' }).success);
  assert.equal(settingsSchema.safeParse({ is_admin: 'true' }).success, false);
  assert.equal(settingsSchema.safeParse({ instagram: 'http://insecure.example' }).success, false);
  assert.equal(settingsSchema.safeParse({ instagram: 'javascript:alert(1)' }).success, false);
  assert.equal(settingsSchema.safeParse({ store_name: 'x'.repeat(81) }).success, false);
  assert.ok(settingsSchema.safeParse({ instagram: '' }).success);
});

test('category / banner: link and parent validation', () => {
  assert.ok(categorySchema.safeParse({ name: 'أواني' }).success);
  assert.equal(categorySchema.safeParse({ name: 'أواني', parentId: 'nope' }).success, false);
  assert.ok(bannerSchema.safeParse({ title: 'عرض', linkUrl: '/shop' }).success);
  assert.ok(bannerSchema.safeParse({ title: 'عرض', linkUrl: 'https://x.dz' }).success);
  assert.equal(bannerSchema.safeParse({ title: 'عرض', linkUrl: 'javascript:alert(1)' }).success, false);
  assert.equal(bannerSchema.safeParse({ title: 'عرض', linkUrl: '//evil.example' }).success, false);
});

test('password policy', () => {
  const ok = changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'Souf-2026-ok' });
  assert.ok(ok.success);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short1' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'onlyletterslong' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'same-pass-1', newPassword: 'same-pass-1' }).success, false);
});

test('query parsing: coercion, bounds and enums', () => {
  const q = publicProductsQuery.parse({ page: '2', limit: '24', sort: 'price_asc' });
  assert.equal(q.page, 2);
  assert.equal(q.limit, 24);
  assert.equal(publicProductsQuery.safeParse({ limit: '9999' }).success, false);
  assert.equal(publicProductsQuery.safeParse({ page: '0' }).success, false);
  assert.equal(publicProductsQuery.safeParse({ sort: 'price; DROP TABLE products' }).success, false);
  assert.equal(adminProductsQuery.safeParse({ categoryId: "x' OR 1=1" }).success, false);
  assert.equal(adminProductsQuery.parse({}).status, 'all');
});

test('order status machine', () => {
  assert.ok(canTransition('new', 'confirmed'));
  assert.ok(canTransition('shipped', 'delivered'));
  assert.ok(canTransition('delivered', 'returned'));
  assert.equal(canTransition('delivered', 'new'), false);
  assert.equal(canTransition('delivered', 'cancelled'), false);
  assert.equal(canTransition('cancelled', 'new'), false);
  assert.equal(canTransition('returned', 'delivered'), false);
  assert.ok(canTransition('cancelled', 'cancelled'));
});
