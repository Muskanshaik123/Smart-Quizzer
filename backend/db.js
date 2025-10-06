const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'quizzer.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('✅ Connected to SQLite database');
            }
        });
    }

    // User methods
    async createUser(username, password) {
        return new Promise(async (resolve, reject) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            this.db.run(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, username });
                    }
                }
            );
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, username, created_at FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Quiz progress methods
    async saveQuizProgress(userId, topic, score, totalQuestions, correctAnswers, difficulty) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO quiz_progress 
                (user_id, topic, score, total_questions, correct_answers, difficulty) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, topic, score, totalQuestions, correctAnswers, difficulty],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    async getUserProgress(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT topic, MAX(score) as best_score, 
                        AVG(score) as avg_score, 
                        COUNT(*) as attempts,
                        MAX(completed_at) as last_attempt
                 FROM quiz_progress 
                 WHERE user_id = ? 
                 GROUP BY topic 
                 ORDER BY last_attempt DESC`,
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    async saveQuizSession(userId, topic, difficulty, questions, answers, score) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO quiz_sessions 
                (user_id, topic, difficulty, questions, answers, score) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, topic, difficulty, JSON.stringify(questions), JSON.stringify(answers), score],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    async getQuizHistory(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT topic, difficulty, score, completed_at 
                 FROM quiz_sessions 
                 WHERE user_id = ? 
                 ORDER BY completed_at DESC 
                 LIMIT ?`,
                [userId, limit],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;