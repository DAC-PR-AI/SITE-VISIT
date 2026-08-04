const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (!process.env[key]) process.env[key] = val;
  }
});

const k = process.env.GOOGLE_PRIVATE_KEY;
if (!k) {
  console.log('MISSING: GOOGLE_PRIVATE_KEY is not set in .env');
  console.log('\n>>> Add this to your .env file:');
  console.log('GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----\\n"');
  process.exit(1);
}

// Strip outer quotes if present, convert \n to real newlines
const cleaned = k.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
console.log('Key preview (first 40 chars):', JSON.stringify(cleaned.slice(0, 40)));
console.log('Key preview (last 30 chars):', JSON.stringify(cleaned.slice(-30)));
console.log('Contains real newlines:', cleaned.includes('\n'));
console.log('Starts with BEGIN header:', cleaned.startsWith('-----BEGIN'));

try {
  const crypto = require('crypto');
  const s = crypto.createSign('RSA-SHA256');
  s.update('test');
  s.sign(cleaned);
  console.log('\n✅ KEY IS VALID — it will work in Vercel!');
} catch(e) {
  console.log('\n❌ KEY ERROR:', e.message);
}
