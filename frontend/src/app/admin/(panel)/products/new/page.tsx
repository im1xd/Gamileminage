'use client';

import { EMPTY_PRODUCT, ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return <ProductForm initial={EMPTY_PRODUCT} />;
}
