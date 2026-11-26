(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var TABS = { plugin: { t: 'الإضافات', add: 'إضافة إضافة جديدة', ext: '.jar,.zip', hint: 'ملف التحميل (jar / zip)' }, mod: { t: 'المودات', add: 'إضافة مود جديد', ext: '.jar,.zip,.mrpack', hint: 'ملف المود (jar / zip / mrpack)' },
    map: { t: 'الماب', add: 'إضافة ماب جديد', ext: '.zip,.mcworld,.mctemplate,.7z,.rar', hint: 'ملف الماب (zip / mcworld / 7z / rar)' } };
  var S = { csrf: '', tab: 'plugin', busy: false }; var T = function (x) { return window.I18N ? I18N.t(x) : x; };
  TABS.users = { t: 'الأعضاء', members: true };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function api(u, o) { o = o || {}; var h = { Accept: 'application/json' }; if (o.body) h['Content-Type'] = 'application/json'; if (S.csrf) h['X-CSRF-Token'] = S.csrf;
    return fetch(u, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined, credentials: 'same-origin' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'خطأ'); return j; }); }); }
  var tt; function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2800); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  function boot() {
    api('/api/me').then(function (j) { if (j.admin) { S.csrf = j.csrf; $('login').hidden = true; $('app').hidden = false; start(); } else { $('app').hidden = true; $('login').hidden = false; } }).catch(function () { $('login').hidden = false; });
  }
  $('lf').addEventListener('submit', function (e) {
    e.preventDefault(); var er = $('lerr'), b = $('lsub'); er.textContent = ''; if (!$('le').value.trim() || !$('lp').value) { er.textContent = 'اكتب الإيميل وكلمة المرور'; return; }
    b.disabled = true; b.classList.add('busy'); $('lsl').textContent = 'جارٍ التحقق...';
    api('/api/login', { method: 'POST', body: { email: $('le').value.trim(), password: $('lp').value } }).then(function () { $('lp').value = ''; boot(); })
      .catch(function (x) { er.textContent = T(x.message); er.classList.remove('shake'); void er.offsetWidth; er.classList.add('shake'); }).then(function () { b.disabled = false; b.classList.remove('busy'); $('lsl').textContent = 'دخول'; });
  });
  $('lo').onclick = function () { api('/api/logout', { method: 'POST' }).catch(function () { }).then(function () { S.csrf = ''; location.href = '/'; }); };

  function start() {
    var t = $('tabs'); t.textContent = '';
    Object.keys(TABS).forEach(function (k) { var b = el('button', k === S.tab ? 'on' : '', TABS[k].t); b.type = 'button'; b.onclick = function () { if (S.busy) return; S.tab = k; start(); }; t.appendChild(b); });
    var C = TABS[S.tab], mem = !!C.members; $('addp').hidden = mem; $('members').hidden = !mem; $('items').hidden = mem;
    if (mem) { members(); return; } $('addt').textContent = C.add; $('flab').textContent = C.hint; $('ff').accept = C.ext; $('aerr').textContent = ''; list();
  }
  function fdate(t) { return t ? new Date(t).toLocaleString(window.I18N && I18N.lang === 'en' ? 'en-GB' : 'ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
  function members() {
    var box = $('mlist'); box.textContent = '';
    api('/api/admin/users').then(function (a) {
      $('mcount').textContent = String(a.length); if (!a.length) box.appendChild(el('p', 'sub', 'لا يوجد أعضاء بعد.'));
      a.forEach(function (u, i) {
        var r = el('div', 'it plate'); r.style.animationDelay = Math.min(i, 8) * 60 + 'ms'; r.appendChild(el('div', 'ph0', (Array.from(u.name || u.email)[0] || '?').toUpperCase()));
        var b = el('b', '', u.name || u.email.split('@')[0]); var s = el('small', 'mono', u.email); s.dir = 'ltr'; b.appendChild(s); var d = el('small', 'mono'); d.dir = 'ltr'; d.textContent = 'JOINED ' + fdate(u.created) + ' · LAST ' + fdate(u.last_login); b.appendChild(d); r.appendChild(b);
        var x = el('button', 'btn sm red'); x.type = 'button'; x.appendChild(el('span', '', 'حذف')); x.onclick = function () { if (confirm(T('حذف العضو') + ' ' + u.email + T('؟'))) api('/api/admin/users/' + u.id, { method: 'DELETE' }).then(members).catch(function (e) { toast(T(e.message)); }); }; r.appendChild(x); box.appendChild(r);
      });
    });
  }
  function list() {
    var box = $('items'); box.textContent = '';
    api('/api/items?kind=' + S.tab).then(function (a) {
      if (!a.length) box.appendChild(el('p', 'sub', 'لا يوجد شيء بعد.'));
      a.forEach(function (p, i) {
        var r = el('div', 'it plate'); r.style.animationDelay = Math.min(i, 8) * 60 + 'ms';
        if (p.img) { var im = el('img'); im.src = '/media/' + p.id; im.alt = ''; r.appendChild(im); } else r.appendChild(el('div', 'ph0', '—'));
        var b = el('b', '', p.name); b.appendChild(el('small', 'mono', (p.file ? size(p.size) : 'LINK') + ' · ' + p.downloads + ' DL')); r.appendChild(b);
        if (S.tab === 'plugin') { var f = el('button', 'btn sm' + (p.featured ? ' on' : '')); f.type = 'button'; f.appendChild(el('span', '', p.featured ? 'إضافة الأسبوع ✓' : 'إضافة الأسبوع')); f.onclick = function () { api('/api/admin/items/' + p.id + '/feature', { method: 'POST' }).then(list).catch(function (x) { toast(T(x.message)); }); }; r.appendChild(f); }
        var d = el('button', 'btn sm red'); d.type = 'button'; d.appendChild(el('span', '', 'حذف')); d.onclick = function () { if (confirm(T('حذف') + ' "' + p.name + '" ' + T('نهائياً؟'))) api('/api/admin/items/' + p.id, { method: 'DELETE' }).then(list).catch(function (x) { toast(T(x.message)); }); }; r.appendChild(d); box.appendChild(r);
      });
    });
  }

  // raw streaming upload with progress (file goes straight to R2 through the Worker)
  function put(url, file, name, onp) {
    return new Promise(function (ok, no) {
      var x = new XMLHttpRequest(); x.open('PUT', url); x.setRequestHeader('X-CSRF-Token', S.csrf); if (name) x.setRequestHeader('X-File-Name', encodeURIComponent(name));
      x.upload.onprogress = function (e) { if (e.lengthComputable && onp) onp(e.loaded, e.total); };
      x.onload = function () { var j = {}; try { j = JSON.parse(x.responseText); } catch (z) { } x.status === 200 ? ok() : no(new Error(j.error || 'فشل الرفع')); };
      x.onerror = function () { no(new Error('انقطع الاتصال')); }; x.send(file);
    });
  }
  $('af').addEventListener('submit', function (e) {
    e.preventDefault(); if (S.busy) return; var er = $('aerr'); er.textContent = '';
    var n = $('fn').value.trim(), d = $('fd').value.trim(), l = $('fl').value.trim(), img = $('fi').files[0], f = $('ff').files[0];
    if (!n || !d) { er.textContent = 'اكتب الاسم والشرح'; return; } if (!f && !l) { er.textContent = 'ارفع ملف أو اكتب رابط تحميل'; return; }
    if (l && !/^https:\/\/\S+$/.test(l)) { er.textContent = 'الرابط لازم يبدأ بـ https://'; return; }
    S.busy = true; var b = $('asub'); b.disabled = true; b.classList.add('busy'); $('upw').hidden = false; var bar = $('upb'), tx = $('upt'); bar.style.width = '0'; var id = 0;
    function prog(lbl) { return function (a, t) { bar.style.width = (a / t * 100) + '%'; tx.textContent = lbl + ' ' + size(a) + ' / ' + size(t); }; }
    api('/api/admin/items', { method: 'POST', body: { kind: S.tab, name: n, desc: d, cat: $('fc').value.trim(), link: l } })
      .then(function (j) { id = j.id; return img ? put('/api/admin/items/' + id + '/image', img, '', prog('IMAGE')) : 0; })
      .then(function () { return f ? put('/api/admin/items/' + id + '/file', f, f.name, prog('FILE')) : 0; })
      .then(function () { return api('/api/admin/items/' + id + '/finalize', { method: 'POST' }); })
      .then(function () { $('af').reset(); toast('تمت الإضافة'); list(); })
      .catch(function (x) { er.textContent = T(x.message); if (id) api('/api/admin/items/' + id, { method: 'DELETE' }).catch(function () { }); })
      .then(function () { S.busy = false; b.disabled = false; b.classList.remove('busy'); $('upw').hidden = true; tx.textContent = ''; });
  });
  document.addEventListener('langchange', function () { if (!$('app').hidden) start(); });
  boot();
})();
