import { z } from 'zod';
import { ORDER_STATUSES, PUBLIC_ID_PATTERN } from './constants';
import { normalizeDzPhone } from './phone';

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (value: string) => value.replace(CONTROL, '').trim();

/** Trimmed single-line-friendly text with control characters stripped. */
const text = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} مطلوب`, invalid_type_error: `${label} غير صالح` })
    .transform(clean)
    .pipe(z.string().min(min, min === 1 ? `${label} مطلوب` : `${label} قصير جدًا`).max(max, `${label} طويل جدًا`));

const optionalText = (max: number, label: string) => text(0, max, label).optional().default('');

const id = z.string().uuid('معرّف غير صالح');
const money = (label: string) => z.number({ invalid_type_error: `${label} يجب أن يكون رقمًا` }).int(`${label} يجب أن يكون عددًا صحيحًا`).min(0, `${label} لا يمكن أن يكون سالبًا`).max(100_000_000, `${label} كبير جدًا`);
const publicId = z.string().regex(PUBLIC_ID_PATTERN, 'معرّف الصورة غير صالح');
const httpsUrl = z
  .string()
  .transform(clean)
  .pipe(z.string().max(300).refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), 'الرابط يجب أن يبدأ بـ https://'));

export const loginSchema = z.object({
  username: text(3, 40, 'اسم المستخدم'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').max(200),
    newPassword: z
      .string()
      .min(10, 'كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف')
      .max(128)
      .refine((v) => /[A-Za-z\u0600-\u06FF]/.test(v) && /\d/.test(v), 'يجب أن تحتوي على حروف وأرقام'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, { message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية', path: ['newPassword'] });

export const productSchema = z
  .object({
    name: text(2, 160, 'اسم المنتج'),
    description: optionalText(5000, 'الوصف'),
    price: money('السعر'),
    compareAtPrice: money('السعر قبل التخفيض').nullable().optional().default(null),
    stock: z.number().int('الكمية يجب أن تكون عددًا صحيحًا').min(0, 'الكمية لا يمكن أن تكون سالبة').max(1_000_000),
    trackStock: z.boolean().default(true),
    categoryId: id.nullable().optional().default(null),
    sku: optionalText(60, 'رمز المنتج'),
    brand: optionalText(80, 'العلامة التجارية'),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    images: z
      .array(z.object({ publicId, alt: optionalText(160, 'وصف الصورة') }))
      .max(12, 'الحد الأقصى 12 صورة')
      .default([]),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    message: 'السعر قبل التخفيض يجب أن يكون أكبر من السعر الحالي',
    path: ['compareAtPrice'],
  });

export const categorySchema = z.object({
  name: text(2, 80, 'اسم القسم'),
  parentId: id.nullable().optional().default(null),
  description: optionalText(500, 'الوصف'),
  imagePublicId: publicId.nullable().optional().default(null),
  sortOrder: z.number().int().min(-10_000).max(10_000).default(0),
  isActive: z.boolean().default(true),
});

export const bannerSchema = z.object({
  title: optionalText(100, 'العنوان'),
  subtitle: optionalText(220, 'العنوان الفرعي'),
  buttonText: optionalText(40, 'نص الزر'),
  linkUrl: z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .max(300)
        // "/shop" (internal) or "https://…" only. "//host" and "/\\host" are protocol-relative tricks that would redirect off-site.
        .refine((v) => v === '' || /^\/(?![/\\])/.test(v) || /^https:\/\/[^\s]+$/i.test(v), 'الرابط يجب أن يبدأ بـ / أو https://'),
    )
    .optional()
    .default(''),
  imagePublicId: publicId.nullable().optional().default(null),
  sortOrder: z.number().int().min(-10_000).max(10_000).default(0),
  isActive: z.boolean().default(true),
});

export const SETTING_KEYS = {
  store_name: 80,
  tagline: 160,
  phone: 30,
  whatsapp: 30,
  instagram: 300,
  facebook: 300,
  tiktok: 300,
  address: 200,
  map_url: 300,
  working_hours: 160,
  announcement: 200,
  about_text: 1500,
  seo_description: 300,
} as const;
const URL_SETTINGS = new Set(['instagram', 'facebook', 'tiktok', 'map_url']);

export const settingsSchema = z
  .record(z.string(), z.string())
  .superRefine((value, ctx) => {
    for (const [key, raw] of Object.entries(value)) {
      const max = (SETTING_KEYS as Record<string, number>)[key];
      if (!max) ctx.addIssue({ code: 'custom', message: `إعداد غير معروف: ${key}` });
      else if (clean(raw).length > max) ctx.addIssue({ code: 'custom', message: `القيمة طويلة جدًا: ${key}` });
      else if (URL_SETTINGS.has(key) && !httpsUrl.safeParse(raw).success) ctx.addIssue({ code: 'custom', message: 'الرابط يجب أن يبدأ بـ https://' });
    }
  })
  .transform((value) => Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])));

export const shippingSchema = z.object({
  rates: z
    .array(
      z.object({
        wilayaCode: z.number().int().min(1).max(69),
        price: money('سعر التوصيل').nullable(),
        isActive: z.boolean(),
      }),
    )
    .min(1)
    .max(69),
});

export const orderCreateSchema = z.object({
  customerName: text(3, 80, 'الاسم الكامل'),
  phone: z
    .string({ required_error: 'رقم الهاتف مطلوب' })
    .transform((v, ctx) => {
      const phone = normalizeDzPhone(v);
      if (!phone) ctx.addIssue({ code: 'custom', message: 'رقم هاتف جزائري غير صالح (مثال: 0793811891)' });
      return phone ?? '';
    }),
  wilayaCode: z.number({ required_error: 'الولاية مطلوبة' }).int().min(1, 'الولاية مطلوبة').max(69, 'الولاية غير صالحة'),
  commune: text(2, 80, 'البلدية'),
  address: optionalText(200, 'العنوان'),
  note: optionalText(300, 'الملاحظة'),
  items: z
    .array(z.object({ productId: id, quantity: z.number().int().min(1, 'الكمية غير صالحة').max(20, 'الحد الأقصى 20 قطعة لكل منتج') }))
    .min(1, 'السلة فارغة')
    .max(30, 'عدد المنتجات كبير'),
  // Honeypot: real visitors never see or fill this field; bots usually do.
  website: z.string().max(200).optional(),
});

export const orderTrackSchema = z.object({
  number: text(4, 20, 'رقم الطلب'),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizeDzPhone(v);
    if (!phone) ctx.addIssue({ code: 'custom', message: 'رقم هاتف غير صالح' });
    return phone ?? '';
  }),
});

export const orderUpdateSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    note: optionalText(300, 'الملاحظة'),
    adminNote: text(0, 1000, 'ملاحظة داخلية').optional(),
    shippingFee: money('سعر التوصيل').optional(),
  })
  .refine((v) => v.status !== undefined || v.adminNote !== undefined || v.shippingFee !== undefined, { message: 'لا توجد تغييرات' });

const page = z.coerce.number().int().min(1).max(10_000).default(1);
const limit = (max: number, def: number) => z.coerce.number().int().min(1).max(max).default(def);

export const publicProductsQuery = z.object({
  category: z.string().max(120).optional(),
  q: z.string().max(80).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  featured: z.enum(['1']).optional(),
  onSale: z.enum(['1']).optional(),
  page,
  limit: limit(48, 12),
});

export const adminProductsQuery = z.object({
  q: z.string().max(80).optional(),
  categoryId: id.optional(),
  status: z.enum(['all', 'active', 'hidden', 'out_of_stock']).default('all'),
  page,
  limit: limit(100, 20),
});

export const adminOrdersQuery = z.object({
  q: z.string().max(60).optional(),
  status: z.enum(['all', ...ORDER_STATUSES]).default('all'),
  page,
  limit: limit(100, 20),
});

export const uploadSignSchema = z.object({ folder: z.enum(['products', 'categories', 'banners']) });
export const idParam = id;

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
