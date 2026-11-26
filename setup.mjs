// One-command deploy to Cloudflare:  npm run setup -- "YourAdminPassword"
// Creates the D1 database + R2 bucket, applies the schema, deploys the Worker, then stores the password HASH as a secret.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const pw = process.argv[2];
if (!pw || pw.length < 8) { console.error('usage: npm run setup -- "admin password (8+ chars)"'); process.exit(1); }
const sh = (cmd, o = {}) => spawnSync(cmd, { shell: true, encoding: 'utf8', stdio: o.input ? ['pipe', 'inherit', 'inherit'] : o.quiet ? 'pipe' : 'inherit', ...o });
const must = (r, what) => { if (r.status !== 0) { console.error(`\n✗ فشلت الخطوة: ${what}`); process.exit(1); } return r; };
const W = 'npx wrangler';

console.log('1/5 تسجيل الدخول لـ Cloudflare (إذا طلب منك فتح المتصفح وافق)'); must(sh(`${W} whoami`, { quiet: true }).status === 0 ? { status: 0 } : sh(`${W} login`), 'wrangler login');

console.log('\n2/5 قاعدة البيانات D1');
const findDb = () => { const r = sh(`${W} d1 list --json`, { quiet: true }); try { return JSON.parse(r.stdout).find(d => d.name === 'forgex-db'); } catch { return null; } };
let db = findDb(); if (!db) { must(sh(`${W} d1 create forgex-db`), 'create D1'); db = findDb(); }
if (!db) { console.error('✗ تعذّر قراءة معرّف قاعدة البيانات'); process.exit(1); }
const id = db.uuid || db.id; let cfg = readFileSync('wrangler.jsonc', 'utf8');
cfg = cfg.replace(/("database_id":\s*")[^"]*(")/, `$1${id}$2`); writeFileSync('wrangler.jsonc', cfg); console.log('   database_id =', id);

console.log('\n3/5 مخزن الملفات R2 (لازم يكون R2 مفعّل بحسابك من لوحة Cloudflare)');
const r2 = sh(`${W} r2 bucket create forgex-files`, { quiet: true }); if (r2.status !== 0 && !/already exists/i.test(r2.stdout + r2.stderr)) { console.error(r2.stdout, r2.stderr); must({ status: 1 }, 'create R2 bucket (فعّل R2 من Cloudflare Dashboard ثم أعد المحاولة)'); }

console.log('\n4/5 إنشاء الجداول ورفع الموقع');
must(sh(`${W} d1 migrations apply forgex-db --remote`), 'migrations'); must(sh(`${W} deploy`), 'deploy');

console.log('\n5/5 حفظ كلمة مرور الإدارة (مشفّرة) كـ Secret');
const salt = randomBytes(16), hash = `pbkdf2$100000$${salt.toString('hex')}$${pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex')}`;
must(sh(`${W} secret put OWNER_PASSWORD_HASH`, { input: hash }), 'secret put');
console.log('\n✓ تم. افتح رابط الموقع الظاهر أعلاه، ولوحة الإدارة على /admin');
