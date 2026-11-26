(function () {
  'use strict';
  // Arabic (source text in the HTML) -> English. Switching back restores the original Arabic.
  var D = {
    'الرئيسية': 'Home', 'إضافات': 'Plugins', 'الإضافات': 'Plugins', 'مودات': 'Mods', 'المودات': 'Mods', 'ماب': 'Maps', 'الماب': 'Maps', 'الأعضاء': 'Members',
    'الإدارة': 'Admin', 'دخول': 'Sign in', 'خروج': 'Sign out', 'تسجيل الدخول': 'Sign in', 'تسجيل خروج': 'Sign out', 'حساب جديد': 'Create account', 'إنشاء الحساب': 'Create account',
    'القائمة': 'Menu', 'إحصائيات': 'Statistics', 'إغلاق': 'Close', 'بحث': 'Search', 'إظهار كلمة المرور': 'Show password',
    'ورشة هندسية لتجميع الإضافات والمودات والخرائط لسيرفرات ماينكرافت. حمّل مباشرة وشغّل بدون تعقيد.': 'An engineering workshop for plugins, mods and maps for Minecraft servers. Download directly and run with no hassle.',
    'تصفّح الإضافات': 'Browse plugins', 'الأقسام': 'Sections', 'إضافات جاهزة للتشغيل على سيرفرك.': 'Ready-to-run plugins for your server.',
    'مودات تضيف محتوى وميزات جديدة للعبة.': 'Mods that add new content and features to the game.', 'خرائط مصنوعة بدقة وجاهزة للعب.': 'Precisely crafted maps, ready to play.',
    'إضافة الأسبوع': 'Plugin of the week', 'ستظهر هنا قريباً': 'Coming soon', 'تفاصيل': 'Details', 'كيف تبدأ': 'How to start',
    'اختر': 'Choose', 'تصفّح القسم وابحث عمّا تحتاجه.': 'Browse a section and find what you need.', 'حمّل': 'Download', 'تحميل مباشر بضغطة واحدة.': 'Direct download with one click.',
    'شغّل': 'Deploy', 'ضعه بسيرفرك وابدأ التجربة.': 'Drop it on your server and start playing.',
    'جاهز تبدأ التصنيع؟': 'Ready to start building?', 'ابدأ باستكشاف الأقسام أو انضم لمجتمعنا.': 'Start exploring the sections or join our community.', 'ابدأ الآن': 'Get started',
    'مودات تضيف محتوى وميزات جديدة.': 'Mods that add new content and features.', 'خرائط جاهزة للتحميل واللعب.': 'Maps ready to download and play.',
    'ابحث عن إضافة...': 'Search plugins...', 'ابحث عن مود...': 'Search mods...', 'ابحث عن ماب...': 'Search maps...',
    'تحميل': 'Download', 'رابط خارجي': 'External link', 'الكل': 'All',
    'لا توجد إضافات حالياً': 'No plugins yet', 'لا توجد مودات حالياً': 'No mods yet', 'لا توجد خرائط حالياً': 'No maps yet', 'لا توجد نتائج': 'No results',
    'تابعنا، الجديد قيد التصنيع': 'Stay tuned, new items are being built', 'جرّب كلمة بحث أو تصنيف آخر': 'Try another keyword or category',
    'ادخل بحسابك أو أنشئ حساب عضو جديد.': 'Sign in, or create a new member account.', 'الاسم (اختياري)': 'Name (optional)', 'الإيميل': 'Email', 'كلمة المرور': 'Password',
    '8 أحرف على الأقل': 'At least 8 characters', 'جارٍ التحقق...': 'Verifying...', 'تم التحقق': 'Verified',
    'بدأ التحميل': 'Download started', 'تم تسجيل الدخول': 'Signed in', 'تم تسجيل الخروج': 'Signed out', 'أهلاً بك': 'Welcome',
    'اكتب الإيميل وكلمة المرور': 'Enter your email and password', 'كلمة المرور 8 أحرف على الأقل': 'Password must be at least 8 characters',
    /* admin */
    'FORGEX — لوحة الإدارة': 'FORGEX — Admin Panel', 'لوحة إدارة FORGEX': 'FORGEX Admin Panel', 'لوحة الإدارة': 'Admin Panel', 'دخول مالك الموقع فقط.': 'Site owner access only.',
    'العودة للموقع': 'Back to site', 'الموقع': 'Site', 'الاسم': 'Name', 'التصنيف (اختياري)': 'Category (optional)', 'الشرح': 'Description',
    'صورة الغلاف (PNG / JPG / WEBP — حتى 5MB)': 'Cover image (PNG / JPG / WEBP — up to 5MB)', 'ملف التحميل': 'Download file', 'أو رابط تحميل خارجي (https://)': 'Or an external download link (https://)', 'إضافة': 'Add',
    'إضافة إضافة جديدة': 'Add a new plugin', 'إضافة مود جديد': 'Add a new mod', 'إضافة ماب جديد': 'Add a new map',
    'ملف التحميل (jar / zip)': 'Download file (jar / zip)', 'ملف المود (jar / zip / mrpack)': 'Mod file (jar / zip / mrpack)', 'ملف الماب (zip / mcworld / 7z / rar)': 'Map file (zip / mcworld / 7z / rar)',
    'إضافة الأسبوع ✓': 'Plugin of the week ✓', 'حذف': 'Delete', 'حذف العضو': 'Delete member', 'نهائياً؟': 'permanently?', '؟': '?', 'تمت الإضافة': 'Added',
    'لا يوجد شيء بعد.': 'Nothing here yet.', 'لا يوجد أعضاء بعد.': 'No members yet.', 'أعضاء الموقع المسجّلون (محفوظون في قاعدة D1 على Cloudflare)': 'Registered site members (stored in the Cloudflare D1 database)',
    'ارفع ملف أو اكتب رابط تحميل': 'Upload a file or enter a download link', 'اكتب الاسم والشرح': 'Enter a name and description', 'الرابط لازم يبدأ بـ https://': 'The link must start with https://',
    /* server messages */
    'الإيميل أو كلمة المرور غير صحيحة': 'Incorrect email or password', 'هذا الإيميل مستخدم': 'This email is already in use', 'اكتب إيميل صحيح وكلمة مرور 8 أحرف أو أكثر': 'Enter a valid email and a password of 8+ characters',
    'تم قفل المحاولات 15 دقيقة': 'Too many attempts. Locked for 15 minutes', 'محاولات تسجيل كثيرة، حاول لاحقاً': 'Too many sign-up attempts, try again later',
    'انتهت الجلسة، حدّث الصفحة': 'Session expired, please refresh the page', 'سجّل دخول الإدارة أولاً': 'Sign in as admin first', 'غير مصرّح': 'Not authorized', 'غير موجود': 'Not found',
    'طلب غير صالح': 'Invalid request', 'طلب كبير': 'Request too large', 'طلب مرفوض': 'Request rejected', 'خطأ في السيرفر': 'Server error', 'حدث خطأ': 'Something went wrong', 'خطأ': 'Error',
    'نوع غير معروف': 'Unknown type', 'متاح للإضافات فقط': 'Plugins only', 'فشل الرفع': 'Upload failed', 'انقطع الاتصال': 'Connection lost', 'الحجم غير معروف': 'Unknown file size',
    'الصورة لازم PNG / JPG / WEBP': 'Image must be PNG / JPG / WEBP', 'الصورة لازم تكون أقل من 5MB': 'Image must be under 5MB', 'محتوى الملف لا يطابق نوعه': 'File content does not match its type',
    'لم يتم إعداد كلمة مرور الإدارة بعد (راجع README)': 'Admin password is not configured yet (see README)'
  };
  var P = [
    [/^محاولات كثيرة\. حاول بعد (\d+) دقيقة$/, function (m) { return 'Too many attempts. Try again in ' + m[1] + ' min'; }],
    [/^الملف أكبر من (\d+)MB$/, function (m) { return 'File is larger than ' + m[1] + 'MB'; }],
    [/^نوع الملف غير مسموح لهذا القسم: (.*)$/, function (m) { return 'File type not allowed for this section: ' + m[1]; }]
  ];
  var AR = /[\u0600-\u06FF]/, ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var lang = 'ar'; try { lang = localStorage.getItem('fx_lang') === 'en' ? 'en' : 'ar'; } catch (e) { }
  var de = document.documentElement;
  function setDir() { de.setAttribute('lang', lang); de.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl'); }
  setDir();

  function tr(s) {
    if (lang !== 'en' || typeof s !== 'string') return s; var k = s.trim(); if (!k) return s;
    if (Object.prototype.hasOwnProperty.call(D, k)) return s.replace(k, function () { return D[k]; });
    for (var i = 0; i < P.length; i++) { var m = k.match(P[i][0]); if (m) return P[i][1](m); }
    return s;
  }
  function skip(n) { var e = n.nodeType === 1 ? n : n.parentNode; return !e || (e.closest && e.closest('[data-no-i18n],script,style,textarea')); }
  function txt(n) {
    if (skip(n)) return; var cur = n.nodeValue;
    if (n.__last !== undefined && cur !== n.__last) n.__ar = undefined; // changed by the app: treat as new source text
    var ar = n.__ar; if (ar === undefined) { if (!AR.test(cur)) { n.__last = undefined; return; } ar = n.__ar = cur; }
    var out = lang === 'en' ? tr(ar) : ar; n.__last = out; if (out !== cur) n.nodeValue = out;
  }
  function attrs(e) {
    if (skip(e)) return;
    ATTRS.forEach(function (a) {
      if (!e.hasAttribute(a)) return; var v = e.getAttribute(a), o = e.getAttribute('data-ar-' + a), last = e.__lastAttr && e.__lastAttr[a];
      if (o === null || (last !== undefined && v !== last)) { if (!AR.test(v)) return; o = v; e.setAttribute('data-ar-' + a, v); }
      var out = lang === 'en' ? tr(o) : o; (e.__lastAttr = e.__lastAttr || {})[a] = out; if (out !== v) e.setAttribute(a, out);
    });
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { txt(root); return; } if (root.nodeType !== 1) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = []; while ((n = w.nextNode())) list.push(n); list.forEach(txt);
    attrs(root); Array.prototype.forEach.call(root.querySelectorAll('[placeholder],[aria-label],[title],[alt]'), attrs);
  }
  function titleTr() { var t = document.querySelector('title'); if (!t) return; if (t.__ar === undefined) t.__ar = t.textContent; t.textContent = lang === 'en' ? tr(t.__ar) : t.__ar; }
  function labels() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang-toggle]'), function (b) {
      var ll = b.querySelector('.ll'), lt = b.querySelector('.lt'); if (ll) ll.textContent = lang === 'en' ? 'ع' : 'EN'; if (lt) lt.textContent = lang === 'en' ? 'عربي' : 'English';
      b.setAttribute('aria-label', lang === 'en' ? 'التبديل إلى العربية' : 'Switch to English');
    });
  }
  function apply() { setDir(); walk(document.body); titleTr(); labels(); }
  function set(l) {
    l = l === 'en' ? 'en' : 'ar'; if (l === lang) return; lang = l; try { localStorage.setItem('fx_lang', l); } catch (e) { }
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; de.classList.add('lswap');
    setTimeout(function () { apply(); document.dispatchEvent(new Event('langchange')); setTimeout(function () { de.classList.remove('lswap'); }, 30); }, reduce ? 0 : 260);
  }
  window.I18N = { t: tr, set: set, apply: apply, get lang() { return lang; } };

  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-lang-toggle]'); if (b) set(lang === 'en' ? 'ar' : 'en'); });
    apply();
    new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { walk(n); }); }); }).observe(document.body, { childList: true, subtree: true });
  });
})();
