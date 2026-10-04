export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { handle, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';

export const GET = handle(async (req) => json({ admin: await requireAdmin(req, { allowPasswordChange: true }) }));
