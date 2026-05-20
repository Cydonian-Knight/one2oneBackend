// scripts/generate-admin-hash.js
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
    console.error('Uso: node scripts/generate-admin-hash.js <password>');
    process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nCopia esto en tu .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);