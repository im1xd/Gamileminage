# Gamil Minage — متجر أواني منزلية (وادي سوف)

متجر إلكتروني كامل مع لوحة تحكم. **الواجهة والخادم مشروعان منفصلان** داخل مستودع واحد:

```
┌──────────────┐  /api/*   ┌────────────────────┐  x-proxy-secret  ┌──────────────┐   SQL    ┌──────┐
│  المتصفح      │ ───────▶ │ frontend (Next.js) │ ───────────────▶ │ backend      │ ──────▶ │ Neon │
│  (زبون/مدير)  │ ◀─────── │ المتجر + لوحة التحكم │ ◀─────────────── │ (Next.js API)│         └──────┘
└──────────────┘  كوكي     └────────────────────┘   خاص، لا يُفتح   │  + Cloudinary│ ──▶ Cloudinary
                                                    مباشرة          └──────────────┘
```

| المجلد | المسؤولية |
|---|---|
| `frontend/` | صفحات المتجر + لوحة التحكم (`/admin`). **لا يصل لقاعدة البيانات إطلاقًا.** يمرّر طلبات المتصفح إلى الخادم عبر بوابة `/api/*`. |
| `backend/`  | كل المنطق: قاعدة البيانات (Neon)، المصادقة، الطلبات، توقيع رفع الصور (Cloudinary). **خاص:** يرد فقط على الواجهة (سر مشترك). |
| `scripts/audit.mjs` | فحص أمني/جودة آلي (يعمل في CI). |

## التشغيل محليًا
```bash
cp backend/.env.example backend/.env.local     # املأ القيم
cp frontend/.env.example frontend/.env.local
cd backend  && npm install && npm run db:migrate && npm run dev     # :4000
cd frontend && npm install && npm run dev                           # :3000
```
المتغيرات `PROXY_SECRET` و`REVALIDATE_SECRET` يجب أن تكون **متطابقة** في المشروعين. ولّد سرًا قويًا:
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## النشر على Vercel (مشروعان من نفس المستودع)
1. **backend**: Import المستودع ← *Root Directory* = `backend`.
   المتغيرات: `DATABASE_URL` (رابط Neon **pooled**)، `JWT_SECRET`، `PROXY_SECRET`، `REVALIDATE_SECRET`، `FRONTEND_URL`، `CLOUDINARY_CLOUD_NAME`، `CLOUDINARY_API_KEY`، `CLOUDINARY_API_SECRET`.
2. **frontend**: Import نفس المستودع ← *Root Directory* = `frontend`.
   المتغيرات: `BACKEND_URL`، `PROXY_SECRET`، `REVALIDATE_SECRET`، `NEXT_PUBLIC_SITE_URL`، `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. بعد ربط دومين مخصص أضفه إلى `FRONTEND_URL` / `ALLOWED_ORIGINS` في الـbackend.

## قاعدة البيانات
`backend/db/schema.sql` (الجداول) و`backend/db/seed.sql` (أقسام ابتدائية) — تُطبَّق بـ `npm run db:migrate` وهي آمنة عند التكرار.
إنشاء/استعادة مدير: `cd backend && DATABASE_URL=… npm run admin:create`.

## الأمان (ما نُفِّذ فعلًا)
- **الخادم خاص**: أي طلب بلا `x-proxy-secret` صحيح يحصل على 404. الواجهة وحدها تعرف السر.
- **المصادقة**: كلمات المرور بـ scrypt (ذاكرة-صلبة)، جلسة JWT في كوكي `HttpOnly + Secure + SameSite=Lax`، يُعاد فحص المدير من قاعدة البيانات في كل طلب (تعطيل الحساب أو تغيير كلمة المرور يُنهي كل الجلسات فورًا).
- **منع التخمين**: حد محاولات لكل IP ولكل مستخدم (15 دقيقة)، ووقت استجابة متساوٍ حتى لو المستخدم غير موجود.
- **CSRF**: فحص `Origin` لكل عملية تعديل + `SameSite`.
- **حقن SQL**: كل الاستعلامات بمعاملات (`$1…`)، وفحص آلي في `audit.mjs` يفشل إن وُجد دمج نصوص مجهول.
- **التحقق من المدخلات**: Zod على كل نقطة؛ الأسعار والشحن تُحسب من قاعدة البيانات لا من المتصفح؛ الحقول الزائدة تُهمل.
- **الطلبات العامة**: حد لكل IP ولكل هاتف، حقل فخ (honeypot)، قفل صفوف المنتجات لمنع بيع ما نفد (transaction).
- **الصور**: لا يُقبل إلا مجلد `gamil-minage/` من حسابك؛ الرفع موقَّع من الخادم؛ الضغط في المتصفح قبل الرفع.
- **ترويسات**: CSP صارمة، HSTS، `X-Frame-Options: DENY`، `nosniff`، `Referrer-Policy`، `Permissions-Policy`.
- **JSON-LD** يُهرَّب فيه `<` فلا يمكن لنص المنتج كسر الصفحة (XSS).
- **منع الفهرسة** للوحة التحكم، و`noopener` لكل رابط خارجي.

## الدروس من المشروع السابق — أين تُفرض
| الدرس | التطبيق |
|---|---|
| `dynamic = 'force-dynamic'` في كل API route | موجود في كل ملف، و`audit.mjs` يفشل إن غاب. |
| قيم NULL في أعمدة boolean | كل عمود boolean هو `NOT NULL DEFAULT …` في `schema.sql`، والفحص الآلي يتحقق. |
| أخطاء `GROUP BY` | استعلامات القوائم بلا تجميع (صور عبر sub-select)، وكل `GROUP BY` يحتوي فقط أعمدة مجمَّعة أو دوال تجميع، وجُرِّبت على Neon. |
| تحسين الصور `f_auto,q_auto` | `frontend/src/lib/image.ts` هو الموضع الوحيد لبناء الروابط، والفحص يمنع بناءها يدويًا. |
| ضغط الصور عند الرفع | `frontend/src/lib/upload.ts`: تصغير إلى 1400px ← WebP ← خفض الجودة حتى ≈350KB، ثم سقف 1600px من Cloudinary. |

## الفحص والاختبار
```bash
node scripts/audit.mjs                         # فحص أمني/جودة (جذر المستودع)
cd backend  && npm run typecheck && npm test
cd frontend && npm run typecheck && npm test
```

## الهوية البصرية
اللوغو والأيقونات في `frontend/public/brand/` (نسخة داكنة للخلفيات الفاتحة، ونسخة فاتحة للوحة التحكم، وأيقونة التطبيق وصورة المشاركة `og.png`).
الألوان من اللوغو: كحلي `#08224a` وذهبي `#c09840` (متغيرات `--cobalt-deep` و`--gold` في `frontend/src/app/globals.css`).
