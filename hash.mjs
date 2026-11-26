// usage: npm run hash -- "your password"   -> prints a PBKDF2 hash to store as the OWNER_PASSWORD_HASH secret
import { pbkdf2Sync, randomBytes } from 'node:crypto';
const pw = process.argv[2], iter = +process.argv[3] || 100000; // Cloudflare Workers allows at most 100000
if (!pw || pw.length < 8) { console.error('usage: npm run hash -- "password (8+ chars)"'); process.exit(1); }
const salt = randomBytes(16);
console.log(`pbkdf2$${iter}$${salt.toString('hex')}$${pbkdf2Sync(pw, salt, iter, 32, 'sha256').toString('hex')}`);
