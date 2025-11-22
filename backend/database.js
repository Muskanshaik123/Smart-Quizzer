const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, 'quiz_database.sqlite');

// Create and connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Create tables in sequence
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            interests TEXT,
            difficulty_level TEXT DEFAULT 'intermediate',
            question_types TEXT DEFAULT 'MCQ,TrueFalse',
            reset_token TEXT,
            reset_token_expiry DATETIME,
            email_verified BOOLEAN DEFAULT FALSE,
            verification_token TEXT,
            verification_token_expiry DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`,
        
        `CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_content TEXT,
            content_text TEXT,
            chunks TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            topic TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_content TEXT,
            questions JSON,
            score INTEGER,
            total_questions INTEGER,
            time_taken INTEGER,
            difficulty TEXT DEFAULT 'medium',
            completed_at DATETIME,
            certificate_generated BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL,
            options JSON,
            correct_answer TEXT,
            user_answer TEXT,
            is_correct BOOLEAN,
            is_flagged BOOLEAN DEFAULT FALSE,
            flag_reason TEXT,
            difficulty TEXT DEFAULT 'medium',
            response_time INTEGER,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS user_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            topic TEXT NOT NULL,
            total_questions INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            average_response_time INTEGER DEFAULT 0,
            difficulty_level TEXT DEFAULT 'medium',
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, topic)
        )`,
        
        `CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            question_id INTEGER,
            quiz_id INTEGER,
            rating INTEGER,
            comment TEXT,
            is_flagged BOOLEAN DEFAULT FALSE,
            flag_reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (question_id) REFERENCES questions(id),
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            quiz_id INTEGER,
            certificate_id TEXT UNIQUE NOT NULL,
            user_name TEXT NOT NULL,
            quiz_title TEXT NOT NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            percentage REAL NOT NULL,
            issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    let completed = 0;
    
    tables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`Error creating table ${index + 1}:`, err.message);
            } else {
                console.log(`Table ${index + 1} created/verified`);
            }
            
            completed++;
            if (completed === tables.length) {
                createDefaultAdmin();
            }
        });
    });
}

function createDefaultAdmin() {
    const defaultPassword = 'admin123';
    
    bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            closeDatabase();
            return;
        }

        const adminData = {
            username: 'admin',
            password: hashedPassword,
            email: 'admin@quizsystem.com'
        };

        // Check if admin already exists
        db.get('SELECT * FROM admin WHERE username = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking admin user:', err);
                closeDatabase();
                return;
            }

            if (!row) {
                // Create admin user
                db.run(
                    'INSERT INTO admin (username, password, email) VALUES (?, ?, ?)',
                    [adminData.username, adminData.password, adminData.email],
                    function(err) {
                        if (err) {
                            console.error('Error creating default admin:', err);
                        } else {
                            console.log('\n✅ Database setup completed successfully!');
                            console.log('📊 Database file: quiz_database.sqlite');
                            console.log('👤 Default admin credentials:');
                            console.log('   Username: admin');
                            console.log('   Password: admin123');
                            console.log('   Email: admin@quizsystem.com');
                        }
                        closeDatabase();
                    }
                );
            } else {
                console.log('\n✅ Database setup completed successfully!');
                console.log('📊 Database file: quiz_database.sqlite');
                console.log('👤 Admin user already exists');
                closeDatabase();
            }
        });
    });
}

function closeDatabase() {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('\n🚀 You can now run the application with: node server.js');
        }
    });
}