const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz_database.sqlite');

db.all(`
    SELECT c.percentage, q.title, q.score
    FROM certificates c
    JOIN quizzes q ON c.quiz_id = q.id
    ORDER BY c.percentage DESC
`, [], (err, rows) => {
    console.log('\n📊 CURRENT CERTIFICATES:\n');
    rows.forEach((r, i) => {
        console.log(`${i+1}. ${r.title} - ${r.percentage}% (Quiz Score: ${r.score}%)`);
    });
    console.log(`\n✅ Total: ${rows.length} certificates\n`);
    db.close();
});
