// Test password reset flow
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testing Password Reset Flow\n');

// Get a test user
db.get('SELECT id, name, email FROM users LIMIT 1', (err, user) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    if (!user) {
        console.log('❌ No users found in database');
        db.close();
        return;
    }
    
    console.log('✅ Test user found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    
    console.log('\n📝 To test password reset:');
    console.log('1. Go to http://localhost:5000/login.html');
    console.log('2. Click "Forgot password?"');
    console.log(`3. Enter email: ${user.email}`);
    console.log('4. Click "Send Reset Link"');
    console.log('5. You will be automatically redirected to the reset password page');
    console.log('6. Enter your new password (at least 6 characters)');
    console.log('7. Click "Reset Password"');
    console.log('8. Login with your new password!');
    
    console.log('\n💡 The reset link will be shown in the browser console for development.');
    
    db.close();
});
