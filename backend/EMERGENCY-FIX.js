// EMERGENCY FIX - Complete certificate cleanup and correction
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🚨 EMERGENCY FIX STARTING...\n');

// Step 1: Delete ALL invalid certificates (< 70%)
console.log('STEP 1: Deleting invalid certificates...');
db.run(`DELETE FROM certificates WHERE percentage < 70`, function(err) {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    console.log(`✅ Deleted ${this.changes} invalid certificates\n`);
    
    // Step 2: Fix certificate percentages
    console.log('STEP 2: Fixing certificate percentages...');
    db.all(`
        SELECT c.certificate_id, c.percentage, q.score as correct_percentage
        FROM certificates c
        JOIN quizzes q ON c.quiz_id = q.id
        WHERE c.percentage != q.score
    `, [], (err, certs) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }
        
        console.log(`Found ${certs.length} certificates to fix`);
        
        let fixed = 0;
        certs.forEach((cert, index) => {
            db.run(`
                UPDATE certificates 
                SET percentage = ?, score = ?
                WHERE certificate_id = ?
            `, [cert.correct_percentage, cert.correct_percentage, cert.certificate_id], function(err) {
                if (!err) fixed++;
                
                if (index === certs.length - 1) {
                    console.log(`✅ Fixed ${fixed} certificates\n`);
                    
                    // Step 3: Show final count
                    db.get(`SELECT COUNT(*) as count FROM certificates`, [], (err, result) => {
                        console.log('STEP 3: Final certificate count');
                        console.log(`✅ Total valid certificates: ${result.count}\n`);
                        
                        // Step 4: List all valid certificates
                        db.all(`
                            SELECT c.certificate_id, c.percentage, q.title
                            FROM certificates c
                            JOIN quizzes q ON c.quiz_id = q.id
                            ORDER BY c.percentage DESC
                        `, [], (err, validCerts) => {
                            console.log('STEP 4: Valid certificates list:');
                            validCerts.forEach((cert, i) => {
                                console.log(`  ${i+1}. ${cert.title} - ${cert.percentage}%`);
                            });
                            
                            console.log('\n🎉 EMERGENCY FIX COMPLETE!');
                            console.log(`✅ ${validCerts.length} valid certificates remain`);
                            db.close();
                        });
                    });
                }
            });
        });
        
        if (certs.length === 0) {
            db.get(`SELECT COUNT(*) as count FROM certificates`, [], (err, result) => {
                console.log('✅ All certificates already correct');
                console.log(`✅ Total valid certificates: ${result.count}\n`);
                db.close();
            });
        }
    });
});
