import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { CategoryNode, HomeData, Paged, ProductCardData, ProductDetail, Settings } from './types';

/**
 * Server-side access to the backend. The browser never sees BACKEND_URL or the shared secret.
 * Responses are cached for a short time and dropped instantly when the dashboard changes data
 * (the backend calls /api/revalidate, which clears the "catalog" tag).
 */
const REVALIDATE_SECONDS = 120;

async function get<T>(path: string, tags: string[] = ['catalog']): Promise<T> {
  const base = process.env.BACKEND_URL?.replace(/\/+$/, '');
  const secret = process.env.PROXY_SECRET;
  if (!base || !secret) throw new Error('BACKEND_URL / PROXY_SECRET are not configured');
  const res = await fetch(`${base}/api${path}`, {
    headers: { 'x-proxy-secret': secret, accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS, tags },
  });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Backend responded ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const getHome = cache(() => get<HomeData>('/public/home'));
export const getSettings = cache(() => get<Settings>('/public/settings'));
export const getCategories = cache(() => get<CategoryNode[]>('/public/categories'));
export const getProduct = cache((slug: string) =>
  get<{ product: ProductDetail; related: ProductCardData[] }>(`/public/products/${encodeURIComponent(slug)}`),
);
export const getSitemapData = () => get<{ products: { slug: string; updatedAt: string }[]; categories: { slug: string; updatedAt: string }[] }>('/public/sitemap');

export function getProducts(params: Record<string, string | number | undefined>): Promise<Paged<ProductCardData>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') qs.set(key, String(value));
  return get<Paged<ProductCardData>>(`/public/products?${qs.toString()}`);
}
