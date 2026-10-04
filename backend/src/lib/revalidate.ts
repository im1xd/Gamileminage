import { env } from './env';

/** Tells the storefront to drop its cached catalogue so dashboard changes show up immediately. */
export async function revalidateStorefront(tags: string[] = ['catalog']): Promise<void> {
  try {
    await fetch(`${env.frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': env.revalidateSecret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
  } catch (error) {
    // The cache also expires on its own (see frontend/src/lib/api.ts), so this is never fatal.
    console.error('[revalidate] storefront not notified:', error);
  }
}
