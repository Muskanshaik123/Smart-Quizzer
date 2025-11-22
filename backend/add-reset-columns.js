// Add reset token columns to users table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding password reset columns to users table...');

db.serialize(() => {
    // Check if columns already exist
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('❌ Error checking table:', err);
            return;
        }
        
        const hasResetToken = columns.some(col => col.name === 'reset_token');
        const hasResetExpiry = columns.some(col => col.name === 'reset_token_expiry');
        
        if (!hasResetToken) {
            db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, (err) => {
                if (err) {
                    console.error('❌ Error adding reset_token column:', err);
                } else {
                    console.log('✅ Added reset_token column');
                }
            });
        } else {
            console.log('ℹ️  reset_token column already exists');
        }
        
        if (!hasResetExpiry) {
            db.run(`ALTER TABLE users ADD COLUMN reset_token_expiry INTEGER`, (err) => {
                if (err) {
                    console.error('❌ Error adding reset_token_expiry column:', err);
                } else {
                    console.log('✅ Added reset_token_expiry column');
                }
            });
        } else {
            console.log('ℹ️  reset_token_expiry column already exists');
        }
        
        // Verify the changes
        setTimeout(() => {
            db.all("PRAGMA table_info(users)", (err, updatedColumns) => {
                if (err) {
                    console.error('❌ Error verifying changes:', err);
                    return;
                }
                
                console.log('\n📋 Updated users table structure:');
                updatedColumns.forEach(col => {
                    console.log(`  - ${col.name} (${col.type})`);
                });
                
                db.close(() => {
                    console.log('\n✅ Database updated successfully!');
                });
            });
        }, 500);
    });
});
