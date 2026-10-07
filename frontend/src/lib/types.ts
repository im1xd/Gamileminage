export type Settings = Record<string, string>;

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  imagePublicId: string | null;
  /** Own photo, else the photo of its best-selling product (computed by the backend). */
  coverImage: string | null;
  productCount: number;
  children?: CategoryNode[];
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  /** true when options (colours/sizes) have different prices → show "from". */
  priceFrom: boolean;
  /** true when the buyer must pick a colour/size first. */
  hasOptions: boolean;
  compareAtPrice: number | null;
  isFeatured: boolean;
  inStock: boolean;
  lowStock: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  images: string[];
}

export interface Variant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  /** null → same price as the product. */
  price: number | null;
  imagePublicId: string | null;
  inStock: boolean;
  lowStock: boolean;
  maxQty: number;
}

export interface ProductDetail extends Omit<ProductCardData, 'images' | 'priceFrom' | 'hasOptions'> {
  variants: Variant[];
  description: string;
  brand: string;
  sku: string;
  maxQty: number;
  categoryId: string | null;
  images: { publicId: string; alt: string }[];
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  linkUrl: string;
  imagePublicId: string | null;
}

export interface HomeData {
  settings: Settings;
  banners: Banner[];
  categories: CategoryNode[];
  featured: ProductCardData[];
  newest: ProductCardData[];
  bestsellers: ProductCardData[];
  onSale: ProductCardData[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ShippingRate {
  wilayaCode: number;
  wilayaName: string;
  price: number | null;
  isActive: boolean;
}

export interface OrderResult {
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  shippingPending: boolean;
  total: number;
}
