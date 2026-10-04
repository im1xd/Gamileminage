export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { clientIp, handle, json, readJson } from '@/lib/http';
import { orderTrackSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rate-limit';
import { trackOrder } from '@/lib/data/orders';

export const POST = handle(async (req) => {
  await rateLimit(`track:ip:${clientIp(req)}`, 20, 3600);
  const { number, phone } = await readJson(req, orderTrackSchema, 2000);
  return json(await trackOrder(number, phone));
});
