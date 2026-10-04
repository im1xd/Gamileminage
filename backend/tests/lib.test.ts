import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDzPhone } from '../src/lib/phone';
import { slugify, decodeParam } from '../src/lib/slug';
import { hashPassword, verifyPassword } from '../src/lib/password';
import { camelize } from '../src/lib/camel';

test('phone: accepts local, +213, 00213 and Arabic digits', () => {
  assert.equal(normalizeDzPhone('0793811891'), '0793811891');
  assert.equal(normalizeDzPhone('07 93 81 18 91'), '0793811891');
  assert.equal(normalizeDzPhone('+213793811891'), '0793811891');
  assert.equal(normalizeDzPhone('00213793811891'), '0793811891');
  assert.equal(normalizeDzPhone('٠٧٩٣٨١١٨٩١'), '0793811891');
  assert.equal(normalizeDzPhone('0661-23-45-67'), '0661234567');
});

test('phone: rejects invalid numbers and injection attempts', () => {
  for (const bad of ['', '123', '0893811891', '079381189', '07938118911', "0793811891'; DROP TABLE orders;--", '<script>alert(1)</script>', 'abcdefghij']) {
    assert.equal(normalizeDzPhone(bad), null, bad);
  }
});

test('slug: keeps Arabic, strips unsafe characters', () => {
  assert.equal(slugify('طنجرة ضغط 5 لتر'), 'طنجرة-ضغط-5-لتر');
  assert.equal(slugify('  Pot / Pan <b>x</b> '), 'pot-pan-b-x-b');
  assert.equal(slugify('كَأْسٌ'), 'كأس');
  assert.match(slugify('!!!'), /^item-[a-z0-9]{6}$/);
  assert.ok(slugify('a'.repeat(500)).length <= 80);
  assert.equal(decodeParam('%D8%B7%D9%86%D8%AC%D8%B1%D8%A9'), 'طنجرة');
  assert.equal(decodeParam('%E0%A4%A'), '%E0%A4%A');
});

test('password: scrypt hash verifies, wrong/malformed fail', async () => {
  const hash = await hashPassword('Correct-Horse-9');
  assert.ok(hash.startsWith('scrypt$'));
  assert.equal(await verifyPassword('Correct-Horse-9', hash), true);
  assert.equal(await verifyPassword('correct-horse-9', hash), false);
  assert.equal(await verifyPassword('', hash), false);
  assert.equal(await verifyPassword('x', 'not-a-hash'), false);
  assert.equal(await verifyPassword('x', 'scrypt$1$2$3$4'), false);
  assert.notEqual(hash, await hashPassword('Correct-Horse-9'), 'salt must be random');
});

test('camelize: nested rows, arrays, dates untouched', () => {
  const d = new Date();
  const out = camelize<any>({ order_number: 'GM-1', created_at: d, items: [{ unit_price: 5, line_total: 10 }] });
  assert.equal(out.orderNumber, 'GM-1');
  assert.equal(out.createdAt, d);
  assert.equal(out.items[0].unitPrice, 5);
});
