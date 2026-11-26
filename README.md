# FORGEX — يعمل على Cloudflare (Workers + D1 + R2)

## النشر (أمر واحد)
```bash
npm install
npm run setup -- "كلمة_مرور_الإدارة"      # مثال: mortada_2020
```
السكربت يسجّل دخولك لـ Cloudflare، وينشئ قاعدة البيانات D1 ومخزن الملفات R2، ويرفع الموقع، ويحفظ كلمة المرور **مشفّرة** كـ Secret.
- لازم تفعّل **R2** من لوحة Cloudflare مرة وحدة (Storage & databases → R2).
- بعد النشر: الموقع على `https://forgex.<حسابك>.workers.dev` ولوحة الإدارة على `/admin`.
- حسابك الوحيد: الإيميل `king2014mortada@gmail.com` (مكتوب في `wrangler.jsonc` → OWNER_EMAIL) وكلمة المرور اللي أعطيتها للسكربت.

## خطوات يدوية (بديل)
```bash
npx wrangler login
npx wrangler d1 create forgex-db          # انسخ database_id إلى wrangler.jsonc
npx wrangler r2 bucket create forgex-files
npx wrangler d1 migrations apply forgex-db --remote
npx wrangler deploy
npm run hash -- "كلمة_المرور"             # انسخ الناتج
npx wrangler secret put OWNER_PASSWORD_HASH   # الصقه
```

## التجربة محلياً
```bash
npm run db:local      # يطبّق كل الـ migrations (يشمل جدول الأعضاء)
npm run dev        # http://127.0.0.1:8787  (الدخول: كلمة مرور mortada_2020 من ملف .dev.vars)
```

## تغيير كلمة المرور
`npm run hash -- "الجديدة"` ثم `npx wrangler secret put OWNER_PASSWORD_HASH`.

## ملاحظات Cloudflare
- أقصى حجم لملف يُرفع عبر الموقع 95MB (حد Cloudflare للطلب الواحد 100MB على Free/Pro). للملفات الأكبر استخدم "رابط تحميل خارجي".
- لو ظهر خطأ 1102 (CPU) عند تسجيل الدخول على الخطة المجانية: `npm run hash -- "كلمة المرور" 50000` ثم حدّث الـ Secret.
- **الأعضاء:** أي زائر يقدر يسجّل حساب عضو من زر "دخول". الحسابات تنحفظ بقاعدة D1، وكلمات المرور مشفّرة (ما أحد يقدر يشوفها حتى أنت). التصفح والتحميل يشتغلون بدون حساب.
- **تشوف الأعضاء وين؟** لوحة الإدارة `/admin` ← تبويب "الأعضاء"، أو من Cloudflare Dashboard ← Storage & databases ← D1 ← forgex-db ← جدول `users`.
- **اللغة:** زر EN / عربي (يتذكر اختيار الزائر). النصوص الجديدة تتترجم من `public/i18n.js` (قاموس عربي ← إنجليزي).
- لوحة الإدارة للمالك فقط؛ حسابات الأعضاء ما تقدر تفتحها حتى لو حاولت.
