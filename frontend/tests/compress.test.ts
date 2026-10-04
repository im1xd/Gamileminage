import test from 'node:test';
import assert from 'node:assert/strict';
import { targetSize, MAX_SIDE } from '../src/lib/compress';
import { cld } from '../src/lib/image';
import { discountPercent, formatPrice, dayLabel } from '../src/lib/format';
import { whatsappLink } from '../src/lib/site';

test('targetSize: never upscales, keeps aspect ratio, caps the long edge', () => {
  assert.deepEqual(targetSize(4000, 3000), { width: MAX_SIDE, height: 1050 });
  assert.deepEqual(targetSize(3000, 4000), { width: 1050, height: MAX_SIDE });
  assert.deepEqual(targetSize(800, 600), { width: 800, height: 600 });
  assert.deepEqual(targetSize(0, 100), { width: 0, height: 0 });
  assert.deepEqual(targetSize(10000, 1), { width: MAX_SIDE, height: 1 });
});

test('cld: every delivery URL carries f_auto,q_auto and a bounded width', () => {
  const card = cld('gamil-minage/products/abc', { width: 400, ratio: '4:5' });
  assert.match(card, /\/image\/upload\/f_auto,q_auto,c_fill,g_auto,ar_4:5,w_400\/gamil-minage\/products\/abc$/);
  const contain = cld('gamil-minage/products/abc', { width: 99999, fit: 'contain' });
  assert.match(contain, /f_auto,q_auto,c_limit,w_2400/);
  assert.match(cld('x', { width: 1 }), /w_16/);
});

test('format helpers', () => {
  assert.equal(discountPercent(750, 1000), 25);
  assert.equal(discountPercent(1000, null), 0);
  assert.equal(discountPercent(1000, 900), 0);
  assert.equal(formatPrice(12500), '12,500 دج');
  assert.equal(dayLabel('2026-10-03T00:00:00.000Z'), '3/10');
});

test('whatsapp link is built from a local number', () => {
  assert.equal(whatsappLink('0793811891'), 'https://wa.me/213793811891');
  assert.equal(whatsappLink('+213 793 81 18 91', 'مرحبا'), 'https://wa.me/213793811891?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7');
});
