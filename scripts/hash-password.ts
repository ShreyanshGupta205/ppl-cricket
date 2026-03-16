import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'adipass@25';
  const hash = await bcrypt.hash(password, 10);
  console.log('Paste this into .env.local:');
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
}

generateHash();