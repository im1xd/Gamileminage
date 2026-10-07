import test from 'node:test';
import assert from 'node:assert/strict';
import { findVariant, firstChoice, settleSize } from '../src/lib/variants';

const v = (color: string, size: string, inStock = true) => ({ color, size, inStock });
const moka = [v('أخضر', '6 أكواب'), v('أخضر', '3 أكواب'), v('بنفسجي', '3 أكواب'), v('رمادي', '3 أكواب', false), v('برتقالي', '6 أكواب', false)];

test('firstChoice prefers an option that is in stock', () => {
  assert.deepEqual(firstChoice([v('a', '', false), v('b', '')]), v('b', ''));
  assert.deepEqual(firstChoice([v('a', '', false)]), v('a', '', false));
  assert.equal(firstChoice([]), null);
});

test('findVariant matches colour AND size exactly', () => {
  assert.equal(findVariant(moka, 'أخضر', '3 أكواب')?.size, '3 أكواب');
  assert.equal(findVariant(moka, 'بنفسجي', '6 أكواب'), null);
});

test('settleSize keeps the size when the new colour has it, else moves to an available one', () => {
  assert.equal(settleSize(moka, 'بنفسجي', '3 أكواب'), '3 أكواب');
  assert.equal(settleSize(moka, 'بنفسجي', '6 أكواب'), '3 أكواب', 'purple only exists in 3 cups');
  assert.equal(settleSize(moka, 'برتقالي', '3 أكواب'), '6 أكواب', 'falls back to the only (out of stock) size');
  assert.equal(settleSize([v('أحمر', ''), v('أزرق', '')], 'أزرق', ''), '', 'colour-only products');
  assert.equal(settleSize([v('', 'S'), v('', 'M')], '', 'M'), 'M', 'size-only products');
});
