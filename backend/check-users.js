const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz_database.sqlite');

console.log('\n📊 DATABASE STATS:\n');

db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    console.log('👥 Total Users:', row.count);
});

db.get('SELECT COUNT(*) as count FROM quizzes', [], (err, row) => {
    console.log('📝 Total Quizzes:', row.count);
});

db.get('SELECT COUNT(*) as count FROM certificates', [], (err, row) => {
    console.log('🏅 Total Certificates:', row.count);
});

db.all('SELECT id, name, email FROM users', [], (err, rows) => {
    console.log('\n👥 USERS IN DATABASE:\n');
    rows.forEach(u => {
        console.log(`  ${u.id}. ${u.name} - ${u.email}`);
    });
    
    db.all('SELECT u.name, COUNT(q.id) as quiz_count FROM users u LEFT JOIN quizzes q ON u.id = q.user_id GROUP BY u.id', [], (err, stats) => {
        console.log('\n📊 QUIZ COUNT PER USER:\n');
        stats.forEach(s => {
            console.log(`  ${s.name}: ${s.quiz_count} quizzes`);
        });
        db.close();
    });
});
