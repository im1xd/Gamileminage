'use client';

import { useParams } from 'next/navigation';
import { ProductForm, type ProductDraft } from '@/components/admin/ProductForm';
import { ErrorBox, PageLoading, useApi } from '@/components/admin/ui';

interface P { name: string; description: string; price: number; compareAtPrice: number | null; stock: number; trackStock: boolean; categoryId: string | null; sku: string; brand: string; isActive: boolean; isFeatured: boolean; images: { publicId: string; alt: string }[] }

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<P>(`/admin/products/${id}`);
  if (loading && !data) return <PageLoading />;
  if (error || !data) return <ErrorBox message={error || 'المنتج غير موجود'} onRetry={reload} />;
  const draft: ProductDraft = {
    name: data.name, description: data.description, price: String(data.price), compareAtPrice: data.compareAtPrice === null ? '' : String(data.compareAtPrice),
    stock: String(data.stock), trackStock: data.trackStock, categoryId: data.categoryId ?? '', sku: data.sku, brand: data.brand,
    isActive: data.isActive, isFeatured: data.isFeatured, images: data.images,
  };
  return <ProductForm id={id} initial={draft} />;
}
