export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { clientIp, handle, hashIp, json, readJson } from '@/lib/http';
import { orderCreateSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rate-limit';
import { createOrder } from '@/lib/data/orders';

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`order:ip:${ip}`, 10, 3600);
  const input = await readJson(req, orderCreateSchema, 20_000);
  // Honeypot: bots fill the hidden field. Pretend it worked, store nothing.
  if (input.website) return json({ orderNumber: 'GM-0000', subtotal: 0, shippingFee: 0, shippingPending: false, total: 0 }, 201);
  await rateLimit(`order:phone:${input.phone}`, 6, 3600);
  return json(await createOrder(input, hashIp(ip)), 201);
});
