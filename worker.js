// FORGEX — Cloudflare Worker (static assets + D1 database + R2 file storage)
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = h => Uint8Array.from((h || '').match(/../g) || [], x => parseInt(x, 16));
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const teq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
const seq = async (a, b) => teq(enc.encode(await sha(a)), enc.encode(await sha(b))); // constant-time string compare

async function pbkdf2(pw, salt, iter) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
}
async function checkPw(pw, stored) { // stored = pbkdf2$iter$saltHex$hashHex ; always does the same work (even if no hash is configured)
  const [t, it, s, h] = (stored || 'x$100000$00$00').split('$'); const iter = Math.min(+it || 100000, 100000);
  const got = await pbkdf2(pw, unhex(s), iter); return t === 'pbkdf2' && !!stored && teq(got, unhex(h));
}

const KIND_EXT = { plugin: ['jar', 'zip'], mod: ['jar', 'zip', 'mrpack'], map: ['zip', 'mcworld', 'mctemplate', '7z', 'rar'] };
const MAX_IMG = 5 * 1024 * 1024, SESSION_MS = 7 * 864e5, LOCK_MS = 15 * 6e4, MAX_TRIES = 5;

function sec(h, https) {
  h.set('X-Content-Type-Options', 'nosniff'); h.set('X-Frame-Options', 'DENY'); h.set('Referrer-Policy', 'no-referrer');
  h.set('Cross-Origin-Opener-Policy', 'same-origin'); h.set('Cross-Origin-Resource-Policy', 'same-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (https) h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains'); return h;
}
const json = (d, status = 200, extra) => { const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); if (extra) for (const k in extra) h.append(k, extra[k]); return new Response(JSON.stringify(d), { status, headers: h }); };
const err = (m, s = 400, x) => json({ error: m }, s, x);

const cookieName = https => https ? '__Host-fx_sid' : 'fx_sid';
function getCookie(req, name) { const m = (req.headers.get('Cookie') || '').split(/;\s*/).find(c => c.startsWith(name + '=')); return m ? m.slice(name.length + 1) : ''; }
async function session(req, env, https) {
  const t = getCookie(req, cookieName(https)); if (!t || t.length > 100) return null;
  const s = await env.DB.prepare('SELECT s.sid,s.csrf,s.exp,s.uid,u.email,u.name FROM sessions s LEFT JOIN users u ON u.id=s.uid WHERE s.sid=?').bind(await sha(t)).first();
  if (!s) return null; if (s.exp < Date.now() || (s.uid != null && !s.email)) { await env.DB.prepare('DELETE FROM sessions WHERE sid=?').bind(s.sid).run(); return null; } return s;
}
async function hashPw(pw) { const salt = crypto.getRandomValues(new Uint8Array(16)); return `pbkdf2$100000$${hex(salt)}$${hex(await pbkdf2(pw, salt, 100000))}`; }
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, n);
const httpsUrl = u => { try { return new URL(u).protocol === 'https:' && u.length <= 500 && !/["'<>\s]/.test(u); } catch { return false; } };
const pub = i => ({ id: i.id, kind: i.kind, name: i.name, desc: i.descr, cat: i.cat, link: i.link, img: !!i.img_key, file: !!i.file_key, size: i.file_size, featured: !!i.featured, downloads: i.downloads, created: i.created });

function imgType(b) { if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'; if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp'; return null; }
function fileOk(b, ext) { if (ext === '7z') return b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf; if (ext === 'rar') return b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21; return b[0] === 0x50 && b[1] === 0x4b; }
const CT = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), https = url.protocol === 'https:', p = url.pathname, M = req.method;
    const done = r => { sec(r.headers, https); return r; };
    try {
      if (!p.startsWith('/api/') && !p.startsWith('/dl/') && !p.startsWith('/media/')) return env.ASSETS.fetch(req);
      if (M !== 'GET' && M !== 'HEAD') { // block cross-site state changes
        const o = req.headers.get('Origin'); if (o) { try { if (new URL(o).host !== url.host) return done(err('طلب مرفوض', 403)); } catch { return done(err('طلب مرفوض', 403)); } }
        if (req.headers.get('Sec-Fetch-Site') === 'cross-site') return done(err('طلب مرفوض', 403));
      }
      return done(await route(req, env, ctx, url, https, p, M));
    } catch (e) { console.error('ERR', e && e.message); return done(err('خطأ في السيرفر', 500)); }
  },

  async scheduled(_e, env) { // housekeeping: expired sessions, old attempts, abandoned drafts (and their R2 objects)
    const now = Date.now(); await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE exp<?').bind(now), env.DB.prepare('DELETE FROM attempts WHERE t<?').bind(now - 36e5)]);
    const old = await env.DB.prepare('SELECT id,img_key,file_key FROM items WHERE ready=0 AND created<?').bind(now - 864e5).all();
    for (const r of old.results) { for (const k of [r.img_key, r.file_key]) if (k) await env.FILES.delete(k); await env.DB.prepare('DELETE FROM items WHERE id=?').bind(r.id).run(); }
  }
};

async function route(req, env, ctx, url, https, p, M) {
  const owner = (env.OWNER_EMAIL || '').toLowerCase(), MAX_FILE = (+env.MAX_FILE_MB || 95) * 1048576;
  let m;

  // ---------- public
  if (p === '/api/items' && M === 'GET') {
    const k = url.searchParams.get('kind'); if (!KIND_EXT[k]) return err('نوع غير معروف');
    const r = await env.DB.prepare('SELECT * FROM items WHERE kind=? AND ready=1 ORDER BY created DESC LIMIT 500').bind(k).all(); return json(r.results.map(pub), 200, { 'Cache-Control': 'no-cache' });
  }
  if (p === '/api/stats' && M === 'GET') { const o = { plugin: 0, mod: 0, map: 0 }; (await env.DB.prepare('SELECT kind,COUNT(*) c FROM items WHERE ready=1 GROUP BY kind').all()).results.forEach(x => o[x.kind] = x.c); return json(o); }
  if ((m = p.match(/^\/media\/(\d{1,12})$/)) && (M === 'GET' || M === 'HEAD')) {
    const i = await env.DB.prepare('SELECT img_key FROM items WHERE id=? AND ready=1').bind(+m[1]).first(); if (!i || !i.img_key) return new Response('Not found', { status: 404 });
    const o = await env.FILES.get(i.img_key); if (!o) return new Response('Not found', { status: 404 });
    return new Response(o.body, { headers: { 'Content-Type': CT[i.img_key.split('.').pop()] || 'application/octet-stream', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'public, max-age=3600' } });
  }
  if ((m = p.match(/^\/dl\/(\d{1,12})$/)) && M === 'GET') {
    const i = await env.DB.prepare('SELECT id,file_key,file_name FROM items WHERE id=? AND ready=1').bind(+m[1]).first(); if (!i || !i.file_key) return new Response('Not found', { status: 404 });
    const o = await env.FILES.get(i.file_key); if (!o) return new Response('Not found', { status: 404 });
    ctx.waitUntil(env.DB.prepare('UPDATE items SET downloads=downloads+1 WHERE id=?').bind(i.id).run());
    const n = i.file_name || 'download', ascii = n.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return new Response(o.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(o.size), 'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(n)}`, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'private, no-store' } });
  }

  // ---------- session
  const S = await session(req, env, https);
  const cookieSet = (tok, https) => `${cookieName(https)}=${tok}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${https ? '; Secure' : ''}`;
  const startSession = async (uid, now) => { const tok = rnd(32), csrf = rnd(24); await env.DB.prepare('INSERT INTO sessions(sid,csrf,exp,uid) VALUES(?,?,?,?)').bind(await sha(tok), csrf, now + SESSION_MS, uid).run(); return { tok, csrf }; };
  const who = (admin, email, name) => ({ admin, user: { email, name: admin ? 'Owner' : (name || email.split('@')[0]) } });
  const readJson = async () => { const raw = await req.text(); if (raw.length > 2000) return 413; try { return JSON.parse(raw); } catch { return 400; } };

  if (p === '/api/me' && M === 'GET') return json(S ? { ...who(S.uid == null, S.uid == null ? owner : S.email, S.name), csrf: S.csrf } : { admin: false, user: null });

  if (p === '/api/login' && M === 'POST') {
    const ip = req.headers.get('CF-Connecting-IP') || 'local', now = Date.now();
    const a = await env.DB.prepare('SELECT n,t FROM attempts WHERE ip=?').bind(ip).first();
    if (a && a.n >= MAX_TRIES && now - a.t < LOCK_MS) return err('محاولات كثيرة. حاول بعد ' + Math.ceil((LOCK_MS - (now - a.t)) / 6e4) + ' دقيقة', 429);
    const b = await readJson(); if (b === 413) return err('طلب كبير', 413); if (b === 400 || !b) return err('طلب غير صالح');
    const email = clean(b.email, 120).toLowerCase(), pw = String(b.password ?? '').slice(0, 128);
    const isOwner = await seq(email, owner); let user = null;
    if (isOwner && !env.OWNER_PASSWORD_HASH) { console.error('OWNER_PASSWORD_HASH secret is not set'); return err('لم يتم إعداد كلمة مرور الإدارة بعد (راجع README)', 500); }
    if (!isOwner) user = await env.DB.prepare('SELECT id,email,name,pass FROM users WHERE email=?').bind(email).first();
    const ok = (await checkPw(pw, isOwner ? env.OWNER_PASSWORD_HASH : user && user.pass)) && (isOwner || !!user); // same work for every case
    if (!ok) {
      const n = a && now - a.t < LOCK_MS ? a.n + 1 : 1; await env.DB.prepare('INSERT INTO attempts(ip,n,t) VALUES(?,?,?) ON CONFLICT(ip) DO UPDATE SET n=?,t=?').bind(ip, n, now, n, now).run();
      return err(n >= MAX_TRIES ? 'تم قفل المحاولات 15 دقيقة' : 'الإيميل أو كلمة المرور غير صحيحة', 401);
    }
    await env.DB.prepare('DELETE FROM attempts WHERE ip=?').bind(ip).run();
    if (S) await env.DB.prepare('DELETE FROM sessions WHERE sid=?').bind(S.sid).run();
    if (user) await env.DB.prepare('UPDATE users SET last_login=? WHERE id=?').bind(now, user.id).run();
    const ss = await startSession(isOwner ? null : user.id, now);
    return json({ ...who(isOwner, isOwner ? owner : user.email, user && user.name), csrf: ss.csrf }, 200, { 'Set-Cookie': cookieSet(ss.tok, https) });
  }

  if (p === '/api/register' && M === 'POST') {
    const ip = req.headers.get('CF-Connecting-IP') || 'local', key = 'r:' + ip, now = Date.now();
    const a = await env.DB.prepare('SELECT n,t FROM attempts WHERE ip=?').bind(key).first(), inWin = a && now - a.t < 36e5;
    if (inWin && a.n >= 5) return err('محاولات تسجيل كثيرة، حاول لاحقاً', 429);
    await env.DB.prepare('INSERT INTO attempts(ip,n,t) VALUES(?,?,?) ON CONFLICT(ip) DO UPDATE SET n=?,t=?').bind(key, inWin ? a.n + 1 : 1, inWin ? a.t : now, inWin ? a.n + 1 : 1, inWin ? a.t : now).run();
    const b = await readJson(); if (b === 413) return err('طلب كبير', 413); if (b === 400 || !b) return err('طلب غير صالح');
    const email = clean(b.email, 120).toLowerCase(), name = clean(b.name, 40), pw = String(b.password ?? '');
    if (!EMAIL.test(email) || pw.length < 8 || pw.length > 128) return err('اكتب إيميل صحيح وكلمة مرور 8 أحرف أو أكثر');
    if (email === owner || await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first()) return err('هذا الإيميل مستخدم', 409);
    let id; try { id = (await env.DB.prepare('INSERT INTO users(email,name,pass,created,last_login) VALUES(?,?,?,?,?)').bind(email, name, await hashPw(pw), now, now).run()).meta.last_row_id; } catch { return err('هذا الإيميل مستخدم', 409); }
    if (S) await env.DB.prepare('DELETE FROM sessions WHERE sid=?').bind(S.sid).run();
    const ss = await startSession(id, now); return json({ ...who(false, email, name), csrf: ss.csrf }, 200, { 'Set-Cookie': cookieSet(ss.tok, https) });
  }
  if (p === '/api/logout' && M === 'POST') {
    if (S) await env.DB.prepare('DELETE FROM sessions WHERE sid=?').bind(S.sid).run();
    return json({ ok: 1 }, 200, { 'Set-Cookie': `${cookieName(https)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${https ? '; Secure' : ''}` });
  }

  // ---------- admin (owner only)
  if (p.startsWith('/api/admin/')) {
    if (!S) return err('سجّل دخول الإدارة أولاً', 401); if (S.uid != null) return err('غير مصرّح', 403);
    const t = req.headers.get('X-CSRF-Token') || ''; if (M !== 'GET' && !(t.length === S.csrf.length && teq(enc.encode(t), enc.encode(S.csrf)))) return err('انتهت الجلسة، حدّث الصفحة', 403);

    if (p === '/api/admin/users' && M === 'GET') return json((await env.DB.prepare('SELECT id,email,name,created,last_login FROM users ORDER BY created DESC LIMIT 500').all()).results);
    if ((m = p.match(/^\/api\/admin\/users\/(\d{1,12})$/)) && M === 'DELETE') { await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE uid=?').bind(+m[1]), env.DB.prepare('DELETE FROM users WHERE id=?').bind(+m[1])]); return json({ ok: 1 }); }
    if (p === '/api/admin/items' && M === 'POST') {
      const raw = await req.text(); if (raw.length > 20000) return err('طلب كبير', 413); let b; try { b = JSON.parse(raw); } catch { return err('طلب غير صالح'); }
      if (!KIND_EXT[b.kind]) return err('نوع غير معروف');
      const name = clean(b.name, 120), desc = clean(b.desc, 4000), cat = clean(b.cat, 40), link = clean(b.link, 500);
      if (!name || !desc) return err('اكتب الاسم والشرح'); if (link && !httpsUrl(link)) return err('الرابط لازم يبدأ بـ https://');
      const r = await env.DB.prepare('INSERT INTO items(kind,name,descr,cat,link,created) VALUES(?,?,?,?,?,?)').bind(b.kind, name, desc, cat, link, Date.now()).run();
      return json({ id: r.meta.last_row_id });
    }
    if ((m = p.match(/^\/api\/admin\/items\/(\d{1,12})\/(file|image|finalize|feature)$/))) {
      const id = +m[1], row = await env.DB.prepare('SELECT * FROM items WHERE id=?').bind(id).first(); if (!row) return err('غير موجود', 404);
      if (m[2] === 'file' && M === 'PUT') {
        const len = +req.headers.get('Content-Length'); if (!len || !req.body) return err('الحجم غير معروف', 411); if (len > MAX_FILE) return err(`الملف أكبر من ${Math.round(MAX_FILE / 1048576)}MB`, 413);
        let fn = ''; try { fn = decodeURIComponent(req.headers.get('X-File-Name') || ''); } catch { }
        const ext = (fn.split('.').pop() || '').toLowerCase(); if (!KIND_EXT[row.kind].includes(ext)) return err('نوع الملف غير مسموح لهذا القسم: ' + KIND_EXT[row.kind].join(' / '));
        const key = `f/${id}-${rnd(8)}.${ext}`; await env.FILES.put(key, req.body);
        const h = await env.FILES.get(key, { range: { offset: 0, length: 12 } }), head = h ? new Uint8Array(await h.arrayBuffer()) : new Uint8Array(12);
        if (!fileOk(head, ext)) { await env.FILES.delete(key); return err('محتوى الملف لا يطابق نوعه'); }
        if (row.file_key) await env.FILES.delete(row.file_key);
        const dn = (clean(row.name, 60).replace(/[^\p{L}\p{N}._ -]/gu, '').trim() || 'file') + '.' + ext;
        await env.DB.prepare('UPDATE items SET file_key=?,file_name=?,file_size=? WHERE id=?').bind(key, dn, len, id).run(); return json({ ok: 1 });
      }
      if (m[2] === 'image' && M === 'PUT') {
        const len = +req.headers.get('Content-Length'); if (!len || len > MAX_IMG) return err('الصورة لازم تكون أقل من 5MB');
        const buf = new Uint8Array(await req.arrayBuffer()); if (buf.length > MAX_IMG) return err('الصورة لازم تكون أقل من 5MB');
        const ty = imgType(buf); if (!ty) return err('الصورة لازم PNG / JPG / WEBP'); const key = `i/${id}-${rnd(8)}.${ty}`;
        await env.FILES.put(key, buf, { httpMetadata: { contentType: CT[ty] } }); if (row.img_key) await env.FILES.delete(row.img_key);
        await env.DB.prepare('UPDATE items SET img_key=? WHERE id=?').bind(key, id).run(); return json({ ok: 1 });
      }
      if (m[2] === 'finalize' && M === 'POST') { if (!row.file_key && !row.link) return err('ارفع ملف أو اكتب رابط تحميل'); await env.DB.prepare('UPDATE items SET ready=1 WHERE id=?').bind(id).run(); return json({ id }); }
      if (m[2] === 'feature' && M === 'POST') {
        if (row.kind !== 'plugin' || !row.ready) return err('متاح للإضافات فقط');
        await env.DB.batch([env.DB.prepare('UPDATE items SET featured=0 WHERE featured=1 AND id<>?').bind(id), env.DB.prepare('UPDATE items SET featured=1-featured WHERE id=?').bind(id)]); return json({ ok: 1 });
      }
    }
    if ((m = p.match(/^\/api\/admin\/items\/(\d{1,12})$/)) && M === 'DELETE') {
      const row = await env.DB.prepare('SELECT img_key,file_key FROM items WHERE id=?').bind(+m[1]).first(); if (!row) return err('غير موجود', 404);
      for (const k of [row.img_key, row.file_key]) if (k) await env.FILES.delete(k); await env.DB.prepare('DELETE FROM items WHERE id=?').bind(+m[1]).run(); return json({ ok: 1 });
    }
  }
  return err('غير موجود', 404);
}
