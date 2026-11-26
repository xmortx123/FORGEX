(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); }, qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KIND = { plugin: { icon: 'i-plug', none: 'لا توجد إضافات حالياً' }, mod: { icon: 'i-mod', none: 'لا توجد مودات حالياً' }, map: { icon: 'i-map', none: 'لا توجد خرائط حالياً' } };
  var S = { admin: false, user: null, csrf: '', data: { plugin: [], mod: [], map: [] }, q: { plugin: '', mod: '', map: '' }, c: { plugin: '', mod: '', map: '' } };
  var VIEWS = ['home', 'plugins', 'mods', 'maps'], cv = '', busy = false, first = true;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function icon(id) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s; }
  function api(url, o) {
    o = o || {}; var h = { Accept: 'application/json' }; if (o.body) h['Content-Type'] = 'application/json'; if (S.csrf) h['X-CSRF-Token'] = S.csrf;
    return fetch(url, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || 'حدث خطأ'); e.status = r.status; throw e; } return j; }); });
  }
  var tt; function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2800); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ---------- intro (once per session) ---------- */
  var intro = $('intro'), introDone;
  if (sessionStorage.getItem('fx_intro') || reduce) { intro.classList.add('out'); introDone = Promise.resolve(); }
  else { sessionStorage.setItem('fx_intro', '1'); introDone = wait(1500).then(function () { intro.classList.add('out'); }); }

  /* ---------- router: soft fade between pages ---------- */
  function route() {
    var v = (location.hash || '#home').slice(1); if (VIEWS.indexOf(v) < 0) v = 'home'; if (v === cv) return; cv = v;
    qa('.view').forEach(function (e) { e.classList.remove('on', 'leaving'); }); var n = $('v-' + v); void n.offsetWidth; n.classList.add('on');
    qa('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.v === v); }); scrollTo(0, 0); reveal();
  }
  function go() {
    if (reduce || first || busy) { first = false; if (!busy) route(); return; }
    busy = true; var o = $('v-' + cv); if (o) o.classList.add('leaving');
    setTimeout(function () { route(); busy = false; var n = location.hash.slice(1); if (VIEWS.indexOf(n) > -1 && n !== cv) go(); }, 400);
  }
  addEventListener('hashchange', go);

  /* ---------- data + rendering ---------- */
  function load(k) { return api('/api/items?kind=' + k).then(function (a) { S.data[k] = Array.isArray(a) ? a : []; render(k); weekly(); counters(); }).catch(function () { }); }
  function render(k) {
    var box = document.querySelector('[data-l="' + k + '"]'), all = S.data[k], q = S.q[k], c = S.c[k]; box.textContent = '';
    var F = all.filter(function (p) { return (!c || p.cat === c) && (!q || (p.name + ' ' + p.desc + ' ' + p.cat).toLowerCase().indexOf(q) > -1); });
    if (!F.length) { var e = el('div', 'empty'); e.appendChild(icon('i-gear')); e.appendChild(el('h3', '', all.length ? 'لا توجد نتائج' : KIND[k].none)); e.appendChild(el('p', '', all.length ? 'جرّب كلمة بحث أو تصنيف آخر' : 'تابعنا، الجديد قيد التصنيع')); box.appendChild(e); }
    F.forEach(function (p, i) { box.appendChild(row(p, i)); });
    var ch = document.querySelector('[data-c="' + k + '"]'); ch.textContent = ''; var cs = [];
    all.forEach(function (p) { if (p.cat && cs.indexOf(p.cat) < 0) cs.push(p.cat); });
    if (cs.length) [''].concat(cs).forEach(function (x) { var b = el('button', 'chip' + (S.c[k] === x ? ' on' : ''), x || 'الكل'); b.type = 'button'; b.onclick = function () { S.c[k] = S.c[k] === x ? '' : x; render(k); }; ch.appendChild(b); });
  }
  function row(p, i) {
    var e = el('article', 'item plate brk'), im = el('div', 'im'); e.style.setProperty('--i', Math.min(i, 8)); e.appendChild(el('span', 'bar'));
    if (p.img) { var g = el('img'); g.src = '/media/' + p.id; g.alt = ''; g.loading = 'lazy'; im.appendChild(g); } else im.appendChild(icon(KIND[p.kind].icon));
    var b = el('div', 'mid'); if (p.cat) b.appendChild(el('span', 'tag', p.cat)); b.appendChild(el('h3', '', p.name)); b.appendChild(el('p', '', p.desc));
    var s = el('div', 'side mono'); s.appendChild(el('span', '', (p.file ? size(p.size) : 'LINK') + ' · ' + p.downloads + ' DL')); var go2 = el('span', 'go'); go2.appendChild(document.createTextNode('OPEN')); go2.appendChild(icon('i-arrow')); s.appendChild(go2);
    e.appendChild(im); e.appendChild(b); e.appendChild(s); e.tabIndex = 0; e.setAttribute('role', 'button');
    e.onclick = function () { openDrawer(p); }; e.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openDrawer(p); } }; return e;
  }
  function weekly() {
    var w = $('wk'), p = S.data.plugin.filter(function (x) { return x.featured; })[0]; w.textContent = '';
    if (!p) { w.className = 'feat plate brk empty'; w.appendChild(el('b', '', 'إضافة الأسبوع')); w.appendChild(el('p', '', 'ستظهر هنا قريباً')); w.onclick = null; return; }
    w.className = 'feat plate brk';
    if (p.img) { var i = el('img'); i.src = '/media/' + p.id; i.alt = ''; w.appendChild(i); } else { var ph = el('div', 'ph0'); ph.appendChild(icon('i-plug')); w.appendChild(ph); }
    var b = el('div', 'fb'); b.appendChild(el('span', 'tag', 'FEATURED')); b.appendChild(el('h3', '', p.name)); b.appendChild(el('p', '', p.desc));
    var btn = el('span', 'btn pri'); btn.appendChild(el('span', '', 'تفاصيل')); b.appendChild(btn); w.appendChild(b); w.onclick = function () { openDrawer(p); };
  }
  var shown = { plugin: 0, mod: 0, map: 0 };
  function counters() {
    ['plugin', 'mod', 'map'].forEach(function (k) {
      var n = S.data[k].length, a = shown[k], t0 = performance.now(), els = qa('[data-s="' + k + '"]'); shown[k] = n;
      (function f(t) { var p = reduce ? 1 : Math.min(1, (t - t0) / 1100), v = Math.round(a + (n - a) * (1 - Math.pow(1 - p, 3))); els.forEach(function (e) { e.textContent = e.classList.contains('cnt') ? v : pad(v); }); if (p < 1) requestAnimationFrame(f); })(t0);
    });
  }
  qa('[data-q]').forEach(function (i) { i.addEventListener('input', function () { var k = i.dataset.q; S.q[k] = i.value.trim().toLowerCase().slice(0, 60); render(k); }); });

  /* ---------- drawer ---------- */
  var lastFocus;
  function lock(on) { document.body.style.overflow = on ? 'hidden' : ''; }
  function openDrawer(p) {
    lastFocus = document.activeElement; var im = $('di'), box = $('dimg');
    if (p.img) { im.src = '/media/' + p.id; box.hidden = false; } else { im.removeAttribute('src'); box.hidden = true; }
    var c = $('dc'); c.textContent = p.cat; c.hidden = !p.cat; $('dt').textContent = p.name; $('dd').textContent = p.desc;
    var m = $('dm'); m.textContent = ''; if (p.file) m.appendChild(el('span', '', 'SIZE ' + size(p.size))); m.appendChild(el('span', '', 'DOWNLOADS ' + p.downloads));
    var d = $('ddl'); d.hidden = !p.file; if (p.file) d.href = '/dl/' + p.id; else d.removeAttribute('href');
    var l = $('dl2'), ok = /^https:\/\//.test(p.link); l.hidden = !ok; if (ok) l.href = p.link; else l.removeAttribute('href');
    $('drawer').classList.add('open'); $('drawer').setAttribute('aria-hidden', 'false'); lock(true); setTimeout(function () { $('dx').focus(); }, 60);
  }
  function closeDrawer() { var d = $('drawer'); if (!d.classList.contains('open')) return; d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); lock(false); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('dx').onclick = closeDrawer; $('dback').onclick = closeDrawer; $('ddl').addEventListener('click', function () { setTimeout(function () { toast('بدأ التحميل'); }, 120); });

  /* ---------- member + admin login / logout ---------- */
  var mode = 'login', T = function (s) { return window.I18N ? I18N.t(s) : s; };
  function applyAuth() {
    var u = S.user; $('adm').hidden = !S.admin; $('madm').hidden = !S.admin; $('logout').hidden = !u; $('login').hidden = !!u; $('who').hidden = !u;
    $('mlt').textContent = u ? 'تسجيل خروج' : 'تسجيل الدخول'; var mw = $('mwho'); mw.hidden = !u;
    if (u) { $('wn').textContent = u.name; $('wi').textContent = (Array.from(u.name)[0] || '?').toUpperCase(); mw.textContent = u.email; }
  }
  function setMode(m) {
    mode = m; qa('#aform .seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
    var reg = m === 'reg'; $('anw').hidden = !reg; $('ahint').hidden = !reg; $('asl').textContent = reg ? 'إنشاء الحساب' : 'دخول'; $('at').textContent = reg ? 'حساب جديد' : 'تسجيل الدخول';
    $('ap').autocomplete = reg ? 'new-password' : 'current-password'; $('aerr').textContent = '';
  }
  qa('#aform .seg button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.m); }; });
  function openAuth() {
    closeMenu(); var a = $('auth'); $('aform').classList.remove('done'); setMode('login'); a.classList.add('open'); a.setAttribute('aria-hidden', 'false'); lock(true); setTimeout(function () { $('ae').focus(); }, 120);
  }
  function closeAuth() { var a = $('auth'); if (!a.classList.contains('open')) return; a.classList.remove('open'); a.setAttribute('aria-hidden', 'true'); lock(false); }
  $('login').onclick = openAuth; $('ax').onclick = closeAuth; $('aback').onclick = closeAuth;
  $('aeye').onclick = function () { var p = $('ap'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; this.classList.toggle('on', s); };
  function shake(m) { var e = $('aerr'); e.textContent = T(m); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  $('aform').addEventListener('submit', function (ev) {
    ev.preventDefault(); var em = $('ae').value.trim(), pw = $('ap').value, b = $('asub'), reg = mode === 'reg'; $('aerr').textContent = '';
    if (!em || !pw) { shake('اكتب الإيميل وكلمة المرور'); return; } if (reg && pw.length < 8) { shake('كلمة المرور 8 أحرف على الأقل'); return; }
    b.disabled = true; b.classList.add('busy'); $('asl').textContent = 'جارٍ التحقق...';
    api(reg ? '/api/register' : '/api/login', { method: 'POST', body: { email: em, password: pw, name: reg ? $('an').value.trim() : undefined } }).then(function (j) {
      S.admin = !!j.admin; S.user = j.user; S.csrf = j.csrf; $('ap').value = ''; $('an').value = ''; $('aform').classList.add('done'); applyAuth();
      return wait(1100).then(function () { closeAuth(); toast(T(S.admin ? 'تم تسجيل الدخول' : 'أهلاً بك') + (S.admin ? '' : ' ' + S.user.name)); });
    }).catch(function (e) { shake(e.message); }).then(function () { b.disabled = false; b.classList.remove('busy'); $('asl').textContent = reg ? 'إنشاء الحساب' : 'دخول'; });
  });
  function doLogout() {
    var b = $('logout'); b.disabled = true;
    api('/api/logout', { method: 'POST' }).catch(function () { }).then(function () { S.admin = false; S.user = null; S.csrf = ''; applyAuth(); closeMenu(); toast('تم تسجيل الخروج'); b.disabled = false; });
  }
  $('logout').onclick = doLogout;
  $('mlogin').onclick = function () { if (S.user) doLogout(); else openAuth(); };

  /* ---------- mobile menu ---------- */
  var mb = $('mb');
  function closeMenu() { $('menu').classList.remove('open'); $('menu').setAttribute('aria-hidden', 'true'); mb.setAttribute('aria-expanded', 'false'); if (!$('auth').classList.contains('open') && !$('drawer').classList.contains('open')) lock(false); }
  mb.onclick = function () { var o = !$('menu').classList.contains('open'); $('menu').classList.toggle('open', o); $('menu').setAttribute('aria-hidden', String(!o)); mb.setAttribute('aria-expanded', String(o)); lock(o); };
  qa('#mnav a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeAuth(); closeMenu(); } });

  /* ---------- scroll reveal / progress ---------- */
  var io = 'IntersectionObserver' in window && !reduce ? new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { var t = x.target; t.classList.add('in'); io.unobserve(t); setTimeout(function () { t.classList.remove('rv', 'in'); t.style.removeProperty('--d'); }, 1600 + parseInt(t.style.getPropertyValue('--d') || 0, 10)); } }); }, { threshold: .12, rootMargin: '0px 0px -60px 0px' }) : null;
  function reveal() {
    qa('.rv').forEach(function (e) {
      if (!io) { e.classList.add('in'); return; } if (e.classList.contains('in') || e.dataset.o) return; e.dataset.o = '1';
      var sib = qa(':scope > .rv', e.parentNode), k = Math.min(sib.indexOf(e), 5); e.style.setProperty('--d', k * 140 + 'ms'); io.observe(e);
    });
  }
  var sp = $('sp'), tick = false;
  addEventListener('scroll', function () { if (tick) return; tick = true; requestAnimationFrame(function () { var m = document.documentElement.scrollHeight - innerHeight; sp.style.transform = 'scaleX(' + (m > 0 ? scrollY / m : 0) + ')'; tick = false; }); }, { passive: true });

  /* ---------- living background: slow rising embers ---------- */
  (function () {
    var c = $('bg'); if (!c || reduce || !c.getContext) return; var x = c.getContext('2d'), W, H, P = [], dpr = Math.min(devicePixelRatio || 1, 1.5), on = true;
    function mk(init) { return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: (Math.random() * 1.6 + .6) * dpr, v: (Math.random() * .25 + .08) * dpr, s: Math.random() * 6.28, a: Math.random() * .5 + .25, c: Math.random() < .7 ? '168,85,247' : '210,214,222' }; }
    function init() { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; P = []; for (var i = 0, n = innerWidth < 700 ? 26 : 56; i < n; i++) P.push(mk(true)); }
    function frame(t) {
      if (on) { x.clearRect(0, 0, W, H);
        for (var i = 0; i < P.length; i++) { var p = P[i]; p.y -= p.v; p.x += Math.sin(t / 2600 + p.s) * .18 * dpr; if (p.y < -10) P[i] = mk(false); var f = Math.min(1, p.y / (H * .3), (H - p.y) / (H * .15 + 1));
          x.fillStyle = 'rgba(' + p.c + ',' + Math.max(0, p.a * f) + ')'; x.shadowColor = 'rgba(' + p.c + ',.8)'; x.shadowBlur = 6 * dpr; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill(); } }
      requestAnimationFrame(frame);
    }
    init(); requestAnimationFrame(frame); var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(init, 200); });
    document.addEventListener('visibilitychange', function () { on = !document.hidden; });
  })();

  /* ---------- start ---------- */
  var me = api('/api/me').then(function (j) { if (j.user) { S.admin = !!j.admin; S.user = j.user; S.csrf = j.csrf; } }).catch(function () { });
  Promise.all([introDone, me, Promise.all(['plugin', 'mod', 'map'].map(load))]).then(function () { applyAuth(); route(); first = false; });
  applyAuth(); route();
})();
