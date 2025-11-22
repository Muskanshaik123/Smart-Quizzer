// Script to fix incorrect certificate percentages in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Starting certificate data fix...');

// Get all certificates with potentially incorrect percentages
db.all(
    `SELECT c.*, q.score as quiz_score, q.total_questions 
     FROM certificates c
     JOIN quizzes q ON c.quiz_id = q.id
     WHERE c.percentage > 100 OR c.percentage != q.score`,
    [],
    (err, certificates) => {
        if (err) {
            console.error('❌ Error fetching certificates:', err);
            db.close();
            return;
        }

        console.log(`📊 Found ${certificates.length} certificates to check`);

        if (certificates.length === 0) {
            console.log('✅ All certificates are correct!');
            db.close();
            return;
        }

        let fixed = 0;
        let errors = 0;

        certificates.forEach((cert, index) => {
            // The correct percentage should be the quiz score (which is already a percentage)
            const correctPercentage = cert.quiz_score;
            
            console.log(`\n📝 Certificate ${index + 1}/${certificates.length}:`);
            console.log(`   ID: ${cert.certificate_id}`);
            console.log(`   Current percentage: ${cert.percentage}%`);
            console.log(`   Correct percentage: ${correctPercentage}%`);

            if (cert.percentage !== correctPercentage) {
                db.run(
                    `UPDATE certificates 
                     SET percentage = ?, score = ?
                     WHERE certificate_id = ?`,
                    [correctPercentage, correctPercentage, cert.certificate_id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error(`   ❌ Error updating: ${updateErr.message}`);
                            errors++;
                        } else {
                            console.log(`   ✅ Fixed: ${cert.percentage}% → ${correctPercentage}%`);
                            fixed++;
                        }

                        // Close database after last update
                        if (index === certificates.length - 1) {
                            setTimeout(() => {
                                console.log(`\n🎉 Fix complete!`);
                                console.log(`   ✅ Fixed: ${fixed}`);
                                console.log(`   ❌ Errors: ${errors}`);
                                db.close();
                            }, 100);
                        }
                    }
                );
            } else {
                console.log(`   ✓ Already correct`);
                
                if (index === certificates.length - 1) {
                    setTimeout(() => {
                        console.log(`\n🎉 Fix complete!`);
                        console.log(`   ✅ Fixed: ${fixed}`);
                        console.log(`   ❌ Errors: ${errors}`);
                        db.close();
                    }, 100);
                }
            }
        });
    }
);
