const crypto = require('crypto');

// Generate a random 64-character hex string
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('🔐 Your JWT Secret:');
console.log(jwtSecret);
console.log('\n📋 Copy this into your .env file as JWT_SECRET=');