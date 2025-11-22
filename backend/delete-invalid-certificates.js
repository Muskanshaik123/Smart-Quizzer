// Script to delete certificates with scores below 70%
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🗑️  Starting invalid certificate deletion...');

// Get all certificates with percentage < 70
db.all(
    `SELECT certificate_id, percentage, quiz_title 
     FROM certificates 
     WHERE percentage < 70`,
    [],
    (err, certificates) => {
        if (err) {
            console.error('❌ Error fetching certificates:', err);
            db.close();
            return;
        }

        console.log(`📊 Found ${certificates.length} invalid certificates (< 70%)`);

        if (certificates.length === 0) {
            console.log('✅ No invalid certificates to delete!');
            db.close();
            return;
        }

        console.log('\n🗑️  Certificates to be deleted:');
        certificates.forEach((cert, index) => {
            console.log(`   ${index + 1}. ${cert.quiz_title} - ${cert.percentage}%`);
        });

        // Delete invalid certificates
        db.run(
            `DELETE FROM certificates WHERE percentage < 70`,
            [],
            function(err) {
                if (err) {
                    console.error('❌ Error deleting certificates:', err);
                } else {
                    console.log(`\n✅ Deleted ${this.changes} invalid certificates`);
                    console.log('🎉 Only valid certificates (70%+) remain in the database');
                }
                db.close();
            }
        );
    }
);
