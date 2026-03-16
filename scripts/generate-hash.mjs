// Run with: node scripts/generate-hash.mjs
// This generates a bcrypt hash AND verifies it works

import bcrypt from 'bcryptjs';

// ── SET YOUR PASSWORD HERE ──────────────────────────
const PASSWORD  = 'ppl-pass@25';       // change this to whatever you want
const USERNAME  = 'aditya-prabhakar';     // must match ADMIN_USERNAME in .env.local
// ───────────────────────────────────────────────────

const hash = await bcrypt.hash(PASSWORD, 10);
const ok   = await bcrypt.compare(PASSWORD, hash);

console.log('\n✅ Copy these into your .env.local:\n');
console.log(`ADMIN_USERNAME="${USERNAME}"`);
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log(`\n🔍 Verify works: ${ok}`);   // must be true
console.log(`\n🔑 Login with:`);
console.log(`   Username : ${USERNAME}`);
console.log(`   Password : ${PASSWORD}`);