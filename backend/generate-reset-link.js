// Generate a password reset link for testing
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

const email = 'shaikmuskan471@gmail.com'; // Change this to your email

console.log('🔑 Generating password reset link...\n');

// Generate reset token
const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

console.log('Token:', resetToken);
console.log('Expiry:', new Date(resetTokenExpiry).toLocaleString());

// Update user with reset token
db.run(
    'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
    [resetToken, resetTokenExpiry, email],
    function(err) {
        if (err) {
            console.error('❌ Error:', err);
            db.close();
            return;
        }
        
        if (this.changes === 0) {
            console.log('❌ User not found with email:', email);
            db.close();
            return;
        }
        
        // Generate reset link
        const resetLink = `http://localhost:5000/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
        
        console.log('\n✅ Reset token generated successfully!');
        console.log('\n🔗 Reset Link:');
        console.log(resetLink);
        console.log('\n📋 Copy this link and paste it in your browser to reset your password.');
        console.log('⏰ This link will expire in 1 hour.');
        
        // Verify it was saved
        db.get('SELECT reset_token, reset_token_expiry FROM users WHERE email = ?', [email], (err, user) => {
            if (err) {
                console.error('❌ Verification error:', err);
            } else {
                console.log('\n✅ Verified in database:');
                console.log('   Token saved:', user.reset_token ? 'Yes' : 'No');
                console.log('   Expiry:', user.reset_token_expiry ? new Date(user.reset_token_expiry).toLocaleString() : 'None');
            }
            db.close();
        });
    }
);
