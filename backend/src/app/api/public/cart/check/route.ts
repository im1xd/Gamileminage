export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { clientIp, handle, json, readJson } from '@/lib/http';
import { cartCheckSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rate-limit';
import { checkCart } from '@/lib/data/orders';

export const POST = handle(async (req) => {
  await rateLimit(`cart:ip:${clientIp(req)}`, 240, 3600);
  const { items } = await readJson(req, cartCheckSchema, 8000);
  return json(await checkCart(items));
});
