const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Enhanced Error Handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ✅ Initialize Gemini AI with proper error handling
let genAI;
let geminiModel;
const GEMINI_MODEL = "gemini-2.5-flash";

try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Initialize with stable model
        geminiModel = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });
        
        console.log(`🔐 Gemini AI: ✅ Initialized with ${GEMINI_MODEL}`);
        
        // Test connection
        testGeminiConnection();
        
    } else {
        console.warn('⚠️  GEMINI_API_KEY not found in .env file');
        console.log('💡 Add to your .env file:');
        console.log('   GEMINI_API_KEY=your_actual_gemini_api_key_here');
    }
} catch (error) {
    console.error('❌ Gemini AI initialization failed:', error.message);
}

async function testGeminiConnection() {
    try {
        console.log(`🧪 Testing ${GEMINI_MODEL} connection...`);
        const result = await geminiModel.generateContent("Say 'Hello from Gemini!' in one word");
        const response = await result.response;
        console.log('✅ Gemini connection successful!');
        console.log('📝 Test response:', response.text());
    } catch (error) {
        console.error(`❌ ${GEMINI_MODEL} connection failed:`, error.message);
        await tryAlternativeModels();
    }
}

async function tryAlternativeModels() {
    console.log('🔄 Trying alternative Gemini models...');
    
    const alternativeModels = [
        "gemini-2.0-flash",      // Gemini 2.0 Flash
        "gemini-1.5-flash",      // Gemini 1.5 Flash
        "gemini-1.5-pro",        // Gemini 1.5 Pro
        "gemini-1.0-pro",        // Gemini 1.0 Pro
        "gemini-pro" 
    ];
    
    for (const modelName of alternativeModels) {
        try {
            const testModel = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            });
            const result = await testModel.generateContent("Test connection");
            const response = await result.response;
            
            geminiModel = testModel;
            console.log(`✅ Successfully connected with: ${modelName}`);
            break;
            
        } catch (error) {
            console.log(`❌ Failed with ${modelName}: ${error.message}`);
        }
    }
    
    if (!geminiModel) {
        console.error('❌ All Gemini models failed. Please check:');
        console.log('   1. Your API key is valid');
        console.log('   2. You have access to Gemini models');
        console.log('   3. Your billing is set up in Google AI Studio');
    }
}

// ✅ Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Session Configuration
const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-change-in-production';
app.use(session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: '.' }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, httpOnly: true },
    name: 'quiz.sid'
}));

// ✅ Database Connection
const dbPath = path.join(__dirname, 'quiz_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database:', dbPath);
        initializeDatabase();
    }
});

// ✅ Initialize Database Tables
function initializeDatabase() {
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
            email_verified BOOLEAN DEFAULT 1,
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
            questions TEXT,
            score INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            time_taken INTEGER DEFAULT 0,
            difficulty TEXT DEFAULT 'medium',
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            certificate_generated BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'completed',
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL,
            options TEXT,
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
            topic TEXT NOT NULL,
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
        )`,
        
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,

        `CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_quizzes INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,
            average_score REAL DEFAULT 0,
            total_time_spent INTEGER DEFAULT 0,
            favorite_topics TEXT,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS quiz_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            quiz_id INTEGER,
            current_question INTEGER DEFAULT 0,
            user_answers TEXT,
            time_spent INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT FALSE,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )`
    ];

    let completed = 0;
    
    tables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`❌ Error creating table ${index + 1}:`, err.message);
            } else {
                console.log(`✅ Table ${index + 1} created/verified`);
            }
            
            completed++;
            if (completed === tables.length) {
                createDefaultAdmin();
                console.log('🎯 Database schema synchronized with database.js');
            }
        });
    });
}

function createDefaultAdmin() {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO admin (username, password, email) VALUES (?, ?, ?)`, 
        ['admin', adminPassword, 'admin@quizsystem.com'],
        function(err) {
            if (err) {
                console.error('❌ Error creating admin:', err);
            } else {
                if (this.changes > 0) {
                    console.log('✅ Default admin user created');
                }
            }
        }
    );
}

// ✅ EMAIL SERVICE - IMPROVED
async function sendEmail(to, subject, html, text) {
    console.log('📧 Attempting to send email to:', to);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ Email credentials missing in .env file');
        return { success: false, reason: 'credentials_missing' };
    }

    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            connectionTimeout: 10000,
            socketTimeout: 10000
        });

        await transporter.verify();
        console.log('✅ Email server connected successfully');

        let mailOptions = {
            from: `"AI Quizzer" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
            text: text
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully! Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return { success: false, reason: error.message };
    }
}

// ✅ AUTHENTICATION MIDDLEWARE
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

function requireAdmin(req, res, next) {
    if (req.session.userId && req.session.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
}

// ✅ AUTH STATUS CHECK
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail,
                isAdmin: req.session.isAdmin || false
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// ✅ DUPLICATE ENDPOINT REMOVED - Using the correct forgot password endpoint below (line ~1433)

// ✅ QUIZ ENGINE ROUTES

// Serve quiz engine page
app.get('/quiz-engine.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/quiz-engine.html'));
});

// ✅ GET CURRENT QUIZ DATA
app.get('/api/current-quiz', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get(
        `SELECT q.*, u.name as user_name 
         FROM quizzes q 
         JOIN users u ON q.user_id = u.id 
         WHERE q.user_id = ? 
         ORDER BY q.created_at DESC 
         LIMIT 1`,
        [userId],
        (err, quiz) => {
            if (err) {
                console.error('❌ Error fetching current quiz:', err);
                return res.status(500).json({ error: 'Failed to fetch quiz data' });
            }
            
            if (!quiz) {
                return res.status(404).json({ error: 'No quiz found' });
            }
            
            try {
                const questions = JSON.parse(quiz.questions || '[]');
                res.json({
                    success: true,
                    quiz: {
                        id: quiz.id,
                        title: quiz.title,
                        topic: quiz.topic,
                        questions: questions,
                        difficulty: quiz.difficulty,
                        totalQuestions: quiz.total_questions,
                        timeLimit: quiz.time_taken || 45,
                        created_at: quiz.created_at
                    }
                });
            } catch (parseError) {
                console.error('❌ Error parsing quiz questions:', parseError);
                res.status(500).json({ error: 'Invalid quiz data format' });
            }
        }
    );
});

// ✅ SAVE QUIZ PROGRESS
app.post('/api/save-quiz-progress', requireAuth, (req, res) => {
    const { quizId, currentQuestion, userAnswers, timeSpent, isCompleted } = req.body;
    const userId = req.session.userId;
    
    if (!quizId || currentQuestion === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        const userAnswersStr = JSON.stringify(userAnswers || []);
        
        db.run(
            `INSERT OR REPLACE INTO quiz_progress 
             (user_id, quiz_id, current_question, user_answers, time_spent, is_completed, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [userId, quizId, currentQuestion, userAnswersStr, timeSpent, isCompleted || false],
            function(err) {
                if (err) {
                    console.error('❌ Error saving quiz progress:', err);
                    return res.status(500).json({ error: 'Failed to save quiz progress' });
                }
                
                res.json({
                    success: true,
                    message: 'Quiz progress saved successfully',
                    progressId: this.lastID
                });
            }
        );
    } catch (error) {
        console.error('❌ Error in save quiz progress:', error);
        res.status(500).json({ error: 'Server error while saving progress' });
    }
});

// ✅ GET QUIZ PROGRESS
app.get('/api/quiz-progress/:quizId', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const quizId = req.params.quizId;
    
    db.get(
        `SELECT * FROM quiz_progress 
         WHERE user_id = ? AND quiz_id = ?`,
        [userId, quizId],
        (err, progress) => {
            if (err) {
                console.error('❌ Error fetching quiz progress:', err);
                return res.status(500).json({ error: 'Failed to fetch quiz progress' });
            }
            
            if (!progress) {
                return res.json({ success: true, progress: null });
            }
            
            try {
                const userAnswers = progress.user_answers ? JSON.parse(progress.user_answers) : [];
                res.json({
                    success: true,
                    progress: {
                        currentQuestion: progress.current_question,
                        userAnswers: userAnswers,
                        timeSpent: progress.time_spent,
                        isCompleted: progress.is_completed,
                        lastUpdated: progress.last_updated
                    }
                });
            } catch (parseError) {
                console.error('❌ Error parsing progress data:', parseError);
                res.status(500).json({ error: 'Invalid progress data format' });
            }
        }
    );
});

// Simple URL fetch handler with actual content extraction
async function handleURLFetch() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    const preview = document.getElementById('urlPreview');
    
    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    // Validate URL format
    let validUrl;
    try {
        validUrl = new URL(url);
    } catch {
        showNotification('Please enter a valid URL (include http:// or https://)', 'error');
        return;
    }
    
    showEnhancedLoading(true, 'Fetching URL content...', 'Extracting content from the webpage...');
    
    try {
        // Method 1: Try to fetch via CORS proxy (simple approach)
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const targetUrl = encodeURIComponent(url);
        
        console.log('Fetching URL via proxy:', url);
        
        const response = await fetch(proxyUrl + targetUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw HTML received, length:', data.contents.length);
        
        // Extract text content from HTML
        const extractedContent = extractTextFromHTML(data.contents);
        
        if (!extractedContent || extractedContent.length < 50) {
            throw new Error('Not enough content extracted from the webpage');
        }
        
        quizState.content = extractedContent;
        
        if (preview) {
            preview.innerHTML = `
                <div class="preview-content">
                    <h4>🌐 Content Extracted Successfully</h4>
                    <div class="analysis-results">
                        <div class="analysis-item">
                            <span>Source:</span>
                            <span>${validUrl.hostname}</span>
                        </div>
                        <div class="analysis-item">
                            <span>Content Length:</span>
                            <span>${extractedContent.length} characters</span>
                        </div>
                        <div class="analysis-item">
                            <span>Words:</span>
                            <span>${extractedContent.split(/\s+/).length} words</span>
                        </div>
                    </div>
                    <div class="content-preview">
                        <h5>Content Preview:</h5>
                        <p>${extractedContent.substring(0, 300)}${extractedContent.length > 300 ? '...' : ''}</p>
                    </div>
                    <p><strong>Status:</strong> Ready for quiz generation</p>
                </div>
            `;
        }
        
        showEnhancedLoading(false);
        showNotification(`Content extracted successfully! Found ${extractedContent.split(/\s+/).length} words`, 'success');
        updateQuizSummary();
        updateProgressIndicator(2);
        
    } catch (error) {
        console.error('URL fetch error:', error);
        
        // Fallback: Use topic extraction
        showEnhancedLoading(false);
        showNotification('Using topic extraction instead...', 'info');
        
        const extractedContent = extractTopicFromURL(url);
        quizState.content = extractedContent;
        
        if (preview) {
            preview.innerHTML = `
                <div class="preview-content">
                    <h4>🌐 Topic Extracted</h4>
                    <div class="analysis-results">
                        <div class="analysis-item">
                            <span>Source:</span>
                            <span>${validUrl.hostname}</span>
                        </div>
                        <div class="analysis-item">
                            <span>Extracted Topic:</span>
                            <span>${extractedContent}</span>
                        </div>
                        <div class="analysis-item">
                            <span>Note:</span>
                            <span>Using topic extraction</span>
                        </div>
                    </div>
                    <p><strong>Status:</strong> Ready for quiz generation</p>
                </div>
            `;
        }
        
        showNotification(`Topic "${extractedContent}" extracted successfully!`, 'success');
        updateQuizSummary();
        updateProgressIndicator(2);
    }
}

// Helper function to extract text from HTML
function extractTextFromHTML(html) {
    try {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove script and style elements
        const scripts = tempDiv.getElementsByTagName('script');
        const styles = tempDiv.getElementsByTagName('style');
        
        while (scripts[0]) {
            scripts[0].parentNode.removeChild(scripts[0]);
        }
        while (styles[0]) {
            styles[0].parentNode.removeChild(styles[0]);
        }
        
        // Get text content and clean it up
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up the text
        text = text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
            .trim();
        
        return text;
    } catch (error) {
        console.error('Error extracting text from HTML:', error);
        return '';
    }
}

// Enhanced topic extraction from URL
function extractTopicFromURL(url) {
    try {
        const validUrl = new URL(url);
        const hostname = validUrl.hostname;
        const pathname = validUrl.pathname;
        
        // Extract from Wikipedia
        if (hostname.includes('wikipedia.org')) {
            const topic = pathname.split('/wiki/')[1];
            if (topic) {
                return `Wikipedia: ${topic.replace(/_/g, ' ').replace(/%20/g, ' ')}`;
            }
        }
        
        // Extract from common educational sites
        if (hostname.includes('khanacademy.org')) {
            return 'Khan Academy: Educational Content';
        }
        if (hostname.includes('coursera.org')) {
            return 'Coursera: Online Course Content';
        }
        if (hostname.includes('edx.org')) {
            return 'edX: Educational Content';
        }
        
        // Extract from blog platforms
        if (hostname.includes('medium.com') || hostname.includes('towardsdatascience.com')) {
            const segments = pathname.split('/').filter(seg => seg.length > 0);
            if (segments.length > 1) {
                const lastSegment = segments[segments.length - 1];
                return `Article: ${lastSegment.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}`;
            }
        }
        
        // Extract from domain name
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
            const subdomain = domainParts[0];
            if (subdomain !== 'www' && subdomain !== 'en') {
                return `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Content`;
            }
        }
        
        // Extract from path
        const pathSegments = pathname.split('/').filter(seg => seg.length > 2);
        if (pathSegments.length > 0) {
            const mainSegment = pathSegments[pathSegments.length - 1];
            const cleanSegment = mainSegment.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            if (cleanSegment && cleanSegment.length > 3) {
                return cleanSegment;
            }
        }
        
        // Fallback to domain-based topic
        const mainDomain = domainParts[domainParts.length - 2];
        return `${mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)} Website Content`;
        
    } catch (error) {
        console.error('Error extracting topic from URL:', error);
        return 'Web Content';
    }
}
// ✅ HELPER FUNCTIONS FOR URL CONTENT EXTRACTION
function extractContentFromURL(url) {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    
    // Simulate different content based on domain
    if (hostname.includes('wikipedia')) {
        const topic = extractTopicFromWikipedia(url);
        return `Wikipedia article about ${topic}. ${topic} is a fascinating subject that covers various aspects including history, key concepts, and modern applications. This content provides comprehensive information suitable for educational purposes and quiz generation.`;
    } else if (hostname.includes('medium') || hostname.includes('towardsdatascience')) {
        const topic = extractTopicFromBlog(url);
        return `Technical article about ${topic}. This content discusses important concepts, practical applications, and recent developments in the field. It includes detailed explanations and examples that are perfect for creating educational quizzes.`;
    } else {
        const topic = extractTopicFromGenericURL(url);
        return `Web content about ${topic}. This material covers fundamental principles, key terminology, and important concepts related to ${topic}. The content is well-structured and appropriate for generating meaningful quiz questions.`;
    }
}

function extractTopicFromWikipedia(url) {
    const path = new URL(url).pathname;
    const topic = path.split('/wiki/')[1];
    if (topic) {
        return topic.replace(/_/g, ' ').replace(/%20/g, ' ');
    }
    return 'General Knowledge';
}

function extractTopicFromBlog(url) {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(seg => seg.length > 0);
    if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        return lastSegment.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    return 'Technology Concepts';
}

function extractTopicFromGenericURL(url) {
    const hostname = new URL(url).hostname;
    const path = new URL(url).pathname;
    
    const domainParts = hostname.split('.');
    if (domainParts.length > 2) {
        return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ' Topics';
    }
    
    const pathSegments = path.split('/').filter(seg => seg.length > 2);
    if (pathSegments.length > 0) {
        const mainSegment = pathSegments[pathSegments.length - 1];
        return mainSegment.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') || 'Web Content';
    }
    
    return 'Online Content';
}

function extractTopicsFromContent(content) {
    if (!content) return ['General Knowledge'];
    
    const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4);
    
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const topics = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    
    return topics.length > 0 ? topics : ['General Knowledge'];
}

// ✅ GEMINI AI QUIZ GENERATOR - UPDATED WITH FILL-IN-THE-BLANKS SUPPORT
async function generateQuizWithGemini(topic, difficulty, questionTypes = ['MCQ'], questionCount = 5) {
    if (!geminiModel) {
        throw new Error('Gemini AI not configured');
    }

    const typeString = questionTypes.join(', ');
    
    const prompt = `
        Generate ${questionCount} ${difficulty} level questions about "${topic}".
        
        QUESTION TYPES: ${typeString}
        
        REQUIREMENTS:
        - Create exactly ${questionCount} questions
        - Difficulty level: ${difficulty}
        - Question types: ${typeString}
        
        FORMAT REQUIREMENTS BY TYPE:
        
        MULTIPLE CHOICE (MCQ):
        - Each question must have 4 options (A, B, C, D)
        - Include the correct answer and explanation
        
        TRUE/FALSE (TrueFalse):
        - Simple true/false questions
        - Include explanation
        
        FILL IN THE BLANKS (FillBlank):
        - Create sentences with missing words/phrases
        - Use "_____" to indicate blanks
        - Provide the correct answer for the blank
        - Include explanation
        
        SHORT ANSWER (ShortAnswer):
        - Open-ended questions requiring brief answers
        - Provide sample correct answer
        - Include explanation
        
        FORMAT: Return ONLY a valid JSON array in this exact format:
        [
          {
            "id": 1,
            "type": "MCQ",
            "question": "Clear question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option A",
            "explanation": "Detailed explanation of why this is correct",
            "difficulty": "${difficulty}"
          },
          {
            "id": 2,
            "type": "TrueFalse", 
            "question": "This statement is true?",
            "options": ["True", "False"],
            "correctAnswer": "True",
            "explanation": "Explanation here",
            "difficulty": "${difficulty}"
          },
          {
            "id": 3,
            "type": "FillBlank",
            "question": "The capital of France is _____.",
            "correctAnswer": "Paris",
            "explanation": "Paris is the capital city of France",
            "difficulty": "${difficulty}"
          },
          {
            "id": 4,
            "type": "ShortAnswer",
            "question": "Explain the main concept in 2-3 sentences.",
            "correctAnswer": "Sample correct answer here",
            "explanation": "Explanation of what makes a good answer",
            "difficulty": "${difficulty}"
          }
        ]
        
        IMPORTANT: For FillBlank questions, do NOT include options array.
        For MCQ and TrueFalse, include options array.
        For FillBlank and ShortAnswer, only include correctAnswer.
        
        Do not include any other text or markdown formatting.
    `;

    try {
        console.log(`🧠 Gemini: Generating ${questionCount} ${difficulty} questions about: ${topic}`);
        console.log(`📝 Question types: ${typeString}`);
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini response received');
        
        let questions;
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
                console.log(`✅ Parsed ${questions.length} questions from AI response`);
                
                // Validate and normalize questions
                questions = questions.map((q, index) => {
                    const baseQuestion = {
                        id: q.id || index + 1,
                        type: q.type || 'MCQ',
                        question: q.question || `Question ${index + 1} about ${topic}?`,
                        correctAnswer: q.correctAnswer || 'Not provided',
                        explanation: q.explanation || 'Explanation not provided by AI.',
                        difficulty: q.difficulty || difficulty || 'medium'
                    };
                    
                    // Add options only for MCQ and TrueFalse
                    if (q.type === 'MCQ' || q.type === 'TrueFalse') {
                        baseQuestion.options = q.options || ['Option A', 'Option B', 'Option C', 'Option D'];
                    }
                    
                    return baseQuestion;
                });
                
            } else {
                throw new Error('No JSON array found in response');
            }
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.log('Raw response:', text);
            questions = createFallbackQuestions(questionCount, topic, questionTypes);
        }

        return questions;
        
    } catch (error) {
        console.error('❌ Gemini error:', error);
        throw new Error('Failed to generate quiz: ' + error.message);
    }
}

function createFallbackQuestions(count, topic, questionTypes = ['MCQ']) {
    const questions = [];
    
    for (let i = 1; i <= count; i++) {
        const type = questionTypes[i % questionTypes.length] || 'MCQ';
        
        let question;
        
        switch(type) {
            case 'FillBlank':
                question = {
                    id: i,
                    type: "FillBlank",
                    question: `The main concept in ${topic} is _____ which helps understand _____.`,
                    correctAnswer: "fundamental principles, complex topics",
                    explanation: `This fill-in-the-blank question tests your understanding of ${topic} fundamentals.`,
                    difficulty: "medium"
                };
                break;
                
            case 'TrueFalse':
                question = {
                    id: i,
                    type: "TrueFalse",
                    question: `${topic} involves complex mathematical calculations.`,
                    options: ["True", "False"],
                    correctAnswer: "True",
                    explanation: `This statement is generally true for ${topic} as it often requires analytical thinking.`,
                    difficulty: "medium"
                };
                break;
                
            case 'ShortAnswer':
                question = {
                    id: i,
                    type: "ShortAnswer", 
                    question: `Explain the importance of ${topic} in 2-3 sentences.`,
                    correctAnswer: `${topic} is important because it helps us understand complex concepts and apply them in real-world scenarios. It provides a framework for analysis and problem-solving.`,
                    explanation: `A good answer should mention practical applications and conceptual understanding of ${topic}.`,
                    difficulty: "medium"
                };
                break;
                
            case 'MCQ':
            default:
                question = {
                    id: i,
                    type: "MCQ",
                    question: `What is the primary focus when studying ${topic}?`,
                    options: [
                        "Understanding fundamental principles and core concepts",
                        "Memorizing technical terms and definitions", 
                        "Learning historical background and context",
                        "Mastering advanced mathematical formulas"
                    ],
                    correctAnswer: "Understanding fundamental principles and core concepts",
                    explanation: `The primary focus of ${topic} should be understanding core concepts rather than just memorization.`,
                    difficulty: "medium"
                };
        }
        
        questions.push(question);
    }
    return questions;
}

// ✅ QUIZ GENERATOR API ROUTE - UPDATED
app.post('/api/generate-quiz-ai', async (req, res) => {
    try {
        const { prompt, config, content } = req.body;
        
        console.log('📥 Gemini: Received quiz generation request');
        console.log('   Questions:', config?.questionCount);
        console.log('   Difficulty:', config?.difficulty);
        console.log('   Question Types:', config?.questionTypes);
        console.log('   Content:', content?.substring(0, 100) + '...');
        
        if (!geminiModel) {
            return res.status(500).json({ 
                success: false,
                error: 'Gemini AI not available',
                solution: 'Check API key and model configuration'
            });
        }

        const questionTypes = config?.questionTypes || ['MCQ', 'TrueFalse'];
        const questionCount = config?.questionCount || 10;
        const difficulty = config?.difficulty || 'medium';

        // Generate questions using the enhanced function
        const questions = await generateQuizWithGemini(content, difficulty, questionTypes, questionCount);

        res.json({
            success: true,
            questions: questions,
            model: GEMINI_MODEL,
            questionsGenerated: questions.length,
            generatedAt: new Date().toISOString(),
            questionTypes: questionTypes
        });
        
    } catch (error) {
        console.error('🚨 Gemini generation error:', error);
        
        // Fallback with proper question types
        const fallbackQuestions = createFallbackQuestions(
            req.body.config?.questionCount || 10, 
            req.body.content, 
            req.body.config?.questionTypes || ['MCQ', 'TrueFalse']
        );
        
        res.json({
            success: true,
            questions: fallbackQuestions,
            model: GEMINI_MODEL,
            questionsGenerated: fallbackQuestions.length,
            generatedAt: new Date().toISOString(),
            usedFallback: true,
            error: error.message
        });
    }
});

// ✅ TEST GEMINI AI
app.get('/api/test-gemini', async (req, res) => {
    try {
        if (!geminiModel) {
            return res.status(500).json({ 
                success: false,
                error: 'Gemini AI not configured',
                model: GEMINI_MODEL,
                solution: 'Add GEMINI_API_KEY to your .env file'
            });
        }

        const result = await geminiModel.generateContent("Say 'Hello from Gemini!' in one word");
        const response = await result.response;
        const text = response.text();

        res.json({
            success: true,
            message: 'Gemini AI is working!',
            model: GEMINI_MODEL,
            response: text
        });
    } catch (error) {
        console.error('❌ Gemini test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Gemini test failed',
            model: GEMINI_MODEL,
            details: error.message
        });
    }
});

// ✅ USER REGISTRATION
app.post('/api/register', async (req, res) => {
    const { name, email, password, interests } = req.body;

    console.log('📝 Registration attempt for:', email);

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (row) {
            console.log('❌ Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const interestsStr = interests ? (Array.isArray(interests) ? interests.join(', ') : interests) : '';

            db.run(
                `INSERT INTO users (name, email, password, interests, difficulty_level, question_types) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, email, hashedPassword, interestsStr, 'intermediate', 'MCQ,TrueFalse'],
                async function (err) {
                    if (err) {
                        console.error('❌ User creation failed:', err);
                        return res.status(500).json({ error: 'Failed to create account' });
                    }

                    const userId = this.lastID;
                    console.log('✅ User created, ID:', userId);

                    // Send welcome email (non-blocking)
                    sendWelcomeEmail(name, email, interests)
                        .then(emailResult => {
                            if (emailResult.success) {
                                console.log('📧 Welcome email sent successfully to:', email);
                            } else {
                                console.log('📧 Email not sent to', email, 'Reason:', emailResult.reason);
                            }
                        })
                        .catch(emailError => {
                            console.log('📧 Email sending error (non-critical):', emailError.message);
                        });

                    // Create session for the new user (auto-login after registration)
                    req.session.userId = userId;
                    req.session.userName = name;
                    req.session.userEmail = email;
                    req.session.isAdmin = false;
                    
                    console.log('✅ User auto-logged in after registration');

                    res.status(201).json({
                        success: true,
                        message: 'Registration successful! 🎉',
                        userId: userId,
                        user: { id: userId, name, email, interests: interestsStr ? interestsStr.split(', ') : [] },
                        emailSent: true,
                        autoLoggedIn: true
                    });
                }
            );
        } catch (error) {
            console.error('❌ Registration error:', error);
            res.status(500).json({ error: 'Server error during registration' });
        }
    });
});

// ✅ WELCOME EMAIL
async function sendWelcomeEmail(name, email, interests = []) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to AI Quizzer!</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333;">Hello ${name}!</h2>
                <p style="color: #666; line-height: 1.6;">Thank you for joining <strong>AI Quizzer</strong> - your personalized learning platform!</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">📝 Your Account Details:</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    ${interests && interests.length > 0 ? `<p><strong>Interests:</strong> ${Array.isArray(interests) ? interests.join(', ') : interests}</p>` : ''}
                </div>

                <p style="color: #666;">🚀 <strong>Get started now:</strong></p>
                <ul style="color: #666;">
                    <li>Take personalized quizzes</li>
                    <li>Track your learning progress</li>
                    <li>Earn achievements and certificates</li>
                    <li>Join our learning community</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:${PORT}/dashboard.html" 
                       style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Start Learning Now
                    </a>
                </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                <p>Best regards,<br><strong>The AI Quizzer Team</strong></p>
            </div>
        </div>
    `;

    const text = `Welcome to AI Quizzer, ${name}!

Thank you for joining AI Quizzer! Your account has been created successfully.

Your Account Details:
• Name: ${name}
• Email: ${email}
• Interests: ${Array.isArray(interests) ? interests.join(', ') : interests}

Get started now: http://localhost:${PORT}/dashboard.html

Best regards,
The AI Quizzer Team`;

    return await sendEmail(email, '🎉 Welcome to AI Quizzer!', html, text);
}

// ✅ USER LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid password' });
            }

            // Update last login
            db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);

            req.session.userId = user.id;
            req.session.userName = user.name;
            req.session.userEmail = user.email;
            req.session.isAdmin = false;

            console.log('✅ User logged in:', user.email);

            res.json({
                success: true,
                message: 'Login successful!',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    interests: user.interests ? user.interests.split(', ') : []
                }
            });
        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({ error: 'Server error during login' });
        }
    });
});

// ✅ FORGOT PASSWORD - Send reset link
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ 
                success: true, 
                message: 'If an account exists, a reset link has been sent' 
            });
        }

        try {
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

            // Store token in database
            db.run(
                'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
                [resetToken, resetTokenExpiry, user.id],
                async (err) => {
                    if (err) {
                        console.error('❌ Error storing reset token:', err);
                        return res.status(500).json({ error: 'Failed to generate reset link' });
                    }

                    // Create reset link
                    const resetLink = `http://localhost:5000/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

                    console.log('🔑 Password reset link generated for:', email);
                    console.log('🔗 Reset link:', resetLink);

                    // Send email (if email service is configured)
                    try {
                        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                            const transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: process.env.EMAIL_USER,
                                    pass: process.env.EMAIL_PASS
                                }
                            });

                            await transporter.sendMail({
                                from: process.env.EMAIL_USER,
                                to: email,
                                subject: 'Password Reset - AI Quizzer',
                                html: `
                                    <h2>Password Reset Request</h2>
                                    <p>You requested to reset your password. Click the link below to reset it:</p>
                                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                                    <p>This link will expire in 1 hour.</p>
                                    <p>If you didn't request this, please ignore this email.</p>
                                `
                            });
                            console.log('✅ Reset email sent to:', email);
                        } else {
                            console.log('⚠️  Email not configured. Reset link:', resetLink);
                        }
                    } catch (emailError) {
                        console.error('❌ Email sending failed:', emailError);
                        // Continue anyway - link is still valid
                    }

                    res.json({ 
                        success: true, 
                        message: 'Password reset link sent to your email',
                        resetLink: resetLink // For development/testing
                    });
                }
            );
        } catch (error) {
            console.error('❌ Error in forgot password:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
});

// ✅ RESET PASSWORD - Set new password
app.post('/api/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    db.get(
        'SELECT * FROM users WHERE email = ? AND reset_token = ?',
        [email, token],
        async (err, user) => {
            if (err) {
                console.error('❌ Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired reset link' });
            }

            // Check if token is expired
            if (user.reset_token_expiry < Date.now()) {
                return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
            }

            try {
                // Hash new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                // Update password and clear reset token
                db.run(
                    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
                    [hashedPassword, user.id],
                    (err) => {
                        if (err) {
                            console.error('❌ Error updating password:', err);
                            return res.status(500).json({ error: 'Failed to reset password' });
                        }

                        console.log('✅ Password reset successful for:', email);
                        res.json({ 
                            success: true, 
                            message: 'Password reset successful! You can now login with your new password.' 
                        });
                    }
                );
            } catch (error) {
                console.error('❌ Error hashing password:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
});

// ✅ ADMIN LOGIN
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM admin WHERE username = ?', [username], async (err, admin) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!admin) {
            return res.status(400).json({ error: 'Admin not found' });
        }

        try {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid password' });
            }

            req.session.userId = admin.id;
            req.session.userName = admin.username;
            req.session.isAdmin = true;

            res.json({
                success: true,
                message: 'Admin login successful!',
                user: {
                    id: admin.id,
                    name: admin.username,
                    isAdmin: true
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Server error during admin login' });
        }
    });
});

// ✅ SAVE QUIZ RESULTS
app.post('/api/save-quiz', requireAuth, (req, res) => {
    const { 
        title, 
        topic, 
        questions, 
        difficulty, 
        score, 
        totalQuestions, 
        correctAnswers, 
        timeTaken,
        sourceType = 'ai_generated',
        sourceContent = ''
    } = req.body;
    
    if (!title || !topic || !questions) {
        return res.status(400).json({ error: 'Missing required quiz data' });
    }

    const userId = req.session.userId;

    db.run(
        `INSERT INTO quizzes (
            user_id, title, topic, source_type, source_content, questions, 
            score, total_questions, correct_answers, time_taken, difficulty, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            userId, title, topic, sourceType, sourceContent, JSON.stringify(questions),
            score, totalQuestions, correctAnswers, timeTaken, difficulty
        ],
        function(err) {
            if (err) {
                console.error('❌ Failed to save quiz:', err);
                return res.status(500).json({ error: 'Failed to save quiz results' });
            }

            const quizId = this.lastID;
            
            // Save individual questions
            saveIndividualQuestions(quizId, questions);
            
            // Update user performance
            updateUserPerformance(userId, topic, correctAnswers, totalQuestions, timeTaken);
            
            // Generate certificate if score is high enough
            // Note: 'score' is already a percentage (0-100), not a count
            const percentage = score; // score is already the percentage
            if (percentage >= 70) {
                generateCertificate(userId, quizId, title, topic, score, totalQuestions, percentage)
                    .then(certificate => {
                        console.log('✅ Certificate generated:', certificate.certificate_id);
                        db.run('UPDATE quizzes SET certificate_generated = TRUE WHERE id = ?', [quizId]);
                    })
                    .catch(certErr => {
                        console.error('❌ Certificate generation failed:', certErr);
                    });
            }

            // Update user progress
            updateUserProgress(userId);

            res.json({
                success: true,
                message: 'Quiz results saved successfully',
                quizId: quizId,
                certificateEligible: percentage >= 70,
                percentage: percentage
            });
        }
    );
});

// ✅ SAVE INDIVIDUAL QUESTIONS
function saveIndividualQuestions(quizId, questions) {
    questions.forEach((question, index) => {
        db.run(
            `INSERT INTO questions (
                quiz_id, question_text, question_type, options, correct_answer, 
                user_answer, is_correct, difficulty, response_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                quizId,
                question.question,
                question.type || 'MCQ',
                JSON.stringify(question.options || []),
                question.correctAnswer,
                question.userAnswer,
                question.isCorrect,
                question.difficulty || 'medium',
                question.responseTime || 0
            ],
            function(err) {
                if (err) {
                    console.error('❌ Failed to save question:', err);
                }
            }
        );
    });
}

// ✅ UPDATE USER PERFORMANCE
function updateUserPerformance(userId, topic, correctAnswers, totalQuestions, timeTaken) {
    const averageResponseTime = timeTaken / totalQuestions;
    
    db.run(
        `INSERT OR REPLACE INTO user_performance 
         (user_id, topic, total_questions, correct_answers, average_response_time, last_activity) 
         VALUES (?, ?, COALESCE((SELECT total_questions FROM user_performance WHERE user_id = ? AND topic = ?), 0) + ?, 
                 COALESCE((SELECT correct_answers FROM user_performance WHERE user_id = ? AND topic = ?), 0) + ?, 
                 ?, datetime('now'))`,
        [userId, topic, userId, topic, totalQuestions, userId, topic, correctAnswers, averageResponseTime],
        function(err) {
            if (err) {
                console.error('❌ Error updating user performance:', err);
            }
        }
    );
}

// ✅ GENERATE CERTIFICATE
async function generateCertificate(userId, quizId, title, topic, score, totalQuestions, percentage) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                reject(err);
                return;
            }

            const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            db.run(
                `INSERT INTO certificates 
                 (user_id, quiz_id, certificate_id, user_name, quiz_title, topic, score, total_questions, percentage) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, quizId, certificateId, user.name, title, topic, score, totalQuestions, percentage],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            certificate_id: certificateId,
                            user_name: user.name,
                            quiz_title: title,
                            topic: topic,
                            score: score,
                            total_questions: totalQuestions,
                            percentage: percentage,
                            issued_at: new Date().toISOString()
                        });
                    }
                }
            );
        });
    });
}

// ✅ UPDATE USER PROGRESS
function updateUserProgress(userId) {
    db.get(
        `SELECT 
            COUNT(*) as total_quizzes,
            AVG(score) as average_score,
            SUM(time_taken) as total_time_spent,
            SUM(correct_answers) as total_correct,
            SUM(total_questions) as total_questions,
            GROUP_CONCAT(DISTINCT topic) as topics
         FROM quizzes 
         WHERE user_id = ?`,
        [userId],
        (err, result) => {
            if (err) {
                console.error('❌ Error calculating user progress:', err);
                return;
            }

            db.get(
                `SELECT topic, COUNT(*) as count 
                 FROM quizzes 
                 WHERE user_id = ? 
                 GROUP BY topic 
                 ORDER BY count DESC 
                 LIMIT 1`,
                [userId],
                (err, favoriteTopic) => {
                    const favoriteTopics = favoriteTopic ? favoriteTopic.topic : 'General';

                    db.run(
                        `INSERT OR REPLACE INTO user_progress 
                         (user_id, total_quizzes, average_score, total_time_spent, favorite_topics, last_activity) 
                         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                        [userId, result.total_quizzes || 0, result.average_score || 0, 
                         result.total_time_spent || 0, favoriteTopics]
                    );
                }
            );
        }
    );
}

// ✅ GET USER QUIZ HISTORY
app.get('/api/quiz-history', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.all(
        `SELECT id, title, topic, difficulty, score, total_questions, correct_answers, 
                time_taken, completed_at, certificate_generated, questions
         FROM quizzes 
         WHERE user_id = ? 
         ORDER BY completed_at DESC 
         LIMIT 50`,
        [userId],
        (err, quizzes) => {
            if (err) {
                console.error('❌ Failed to fetch quiz history:', err);
                return res.status(500).json({ error: 'Failed to fetch quiz history' });
            }

            console.log(`📊 Fetched ${quizzes.length} quizzes for user ${userId}`);

            const parsedQuizzes = quizzes.map(quiz => ({
                ...quiz,
                questions: quiz.questions ? JSON.parse(quiz.questions) : []
            }));

            res.json({
                success: true,
                quizzes: parsedQuizzes,
                total: parsedQuizzes.length
            });
        }
    );
});

// ✅ GET USER CERTIFICATES
app.get('/api/certificates', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.all(
        `SELECT c.*, q.title as quiz_title, q.topic, q.completed_at, q.score as quiz_score
         FROM certificates c
         JOIN quizzes q ON c.quiz_id = q.id
         WHERE c.user_id = ? AND c.percentage >= 70 AND c.percentage <= 100
         ORDER BY c.issue_date DESC`,
        [userId],
        (err, certificates) => {
            if (err) {
                console.error('❌ Failed to fetch certificates:', err);
                return res.status(500).json({ error: 'Failed to fetch certificates' });
            }

            console.log(`📊 Fetched ${certificates.length} valid certificates (70-100%) for user ${userId}`);

            res.json({
                success: true,
                certificates: certificates,
                total: certificates.length
            });
        }
    );
});

// ✅ VIEW A CERTIFICATE (HTML) - allow owner or admin
app.get('/api/certificate/:certificateId', (req, res) => {
    const certificateId = req.params.certificateId;

    db.get('SELECT * FROM certificates WHERE certificate_id = ?', [certificateId], (err, cert) => {
        if (err) {
            console.error('❌ Error fetching certificate:', err);
            return res.status(500).send('Server error');
        }

        if (!cert) return res.status(404).send('Certificate not found');

        // Allow if owner or admin
        const sessionUserId = req.session?.userId;
        const isAdmin = req.session?.isAdmin;

        if (!isAdmin && sessionUserId !== cert.user_id) {
            return res.status(403).send('Forbidden');
        }

        // Render a simple certificate HTML
        const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Certificate ${cert.certificate_id}</title>
<style>
body{font-family: Arial, sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f3f4f6}
.card{width:800px;border:10px solid #667eea;padding:40px;background:#fff;text-align:center;border-radius:8px}
.title{font-size:28px;font-weight:700;color:#333}
.subtitle{color:#666;margin-top:8px}
.name{font-size:36px;margin-top:24px;color:#111}
.meta{margin-top:20px;color:#444}
.footer{margin-top:30px;color:#777}
.download{margin-top:20px}
</style>
</head><body>
<div class="card">
  <div class="title">Certificate of Achievement</div>
  <div class="subtitle">This certificate is awarded to</div>
  <div class="name">${cert.user_name}</div>
  <div class="meta">For outstanding performance on: <strong>${cert.quiz_title}</strong></div>
  <div class="meta">Topic: ${cert.topic} • Score: ${cert.score}/${cert.total_questions} (${Math.round(cert.percentage)}%)</div>
  <div class="footer">Issued on ${new Date(cert.issue_date).toLocaleDateString()}</div>
  <div class="download"><a href="/api/certificate/${certificateId}/download" target="_blank">Download Certificate</a></div>
</div>
</body></html>`;

        res.send(html);
    });
});

// ✅ DOWNLOAD CERTIFICATE (HTML file) - allow owner or admin
app.get('/api/certificate/:certificateId/download', (req, res) => {
    const certificateId = req.params.certificateId;

    db.get('SELECT * FROM certificates WHERE certificate_id = ?', [certificateId], (err, cert) => {
        if (err) {
            console.error('❌ Error fetching certificate:', err);
            return res.status(500).send('Server error');
        }
        if (!cert) return res.status(404).send('Certificate not found');

        const sessionUserId = req.session?.userId;
        const isAdmin = req.session?.isAdmin;
        if (!isAdmin && sessionUserId !== cert.user_id) return res.status(403).send('Forbidden');

        const filename = `certificate-${cert.certificate_id}.html`;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate</title>
<style>body{font-family: Arial, sans-serif; padding:40px} .cert{border:6px solid #667eea;padding:30px;border-radius:8px;text-align:center}</style>
</head><body><div class="cert"><h1>Certificate of Achievement</h1><h2>${cert.user_name}</h2><p>For: <strong>${cert.quiz_title}</strong></p><p>Score: ${cert.score}/${cert.total_questions} (${Math.round(cert.percentage)}%)</p><p>Issued: ${new Date(cert.issue_date).toLocaleDateString()}</p></div></body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);
    });
});

// ✅ GET USER PROGRESS
app.get('/api/user-progress', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get(
        `SELECT up.*, u.name, u.email
         FROM user_progress up
         JOIN users u ON up.user_id = u.id
         WHERE up.user_id = ?`,
        [userId],
        (err, progress) => {
            if (err) {
                console.error('❌ Failed to fetch user progress:', err);
                return res.status(500).json({ error: 'Failed to fetch user progress' });
            }

            if (!progress) {
                progress = {
                    total_quizzes: 0,
                    average_score: 0,
                    total_time_spent: 0,
                    favorite_topics: 'General',
                    name: req.session.userName,
                    email: req.session.userEmail
                };
            }

            res.json({
                success: true,
                progress: progress
            });
        }
    );
});

// ✅ ADMIN DASHBOARD ROUTES
app.get('/api/admin/users', requireAdmin, (req, res) => {
    db.all(
        `SELECT u.id, u.name, u.email, u.interests, u.created_at, u.last_login,
                COUNT(q.id) as total_quizzes,
                COALESCE(AVG(q.score), 0) as average_score,
                up.total_time_spent
         FROM users u
         LEFT JOIN quizzes q ON u.id = q.user_id
         LEFT JOIN user_progress up ON u.id = up.user_id
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
        (err, users) => {
            if (err) {
                console.error('❌ Failed to fetch users:', err);
                return res.status(500).json({ error: 'Failed to fetch users' });
            }

            res.json({
                success: true,
                users: users,
                total: users.length
            });
        }
    );
});

app.get('/api/admin/quizzes', requireAdmin, (req, res) => {
    db.all(
        `SELECT q.*, u.name as user_name, u.email
         FROM quizzes q
         JOIN users u ON q.user_id = u.id
         ORDER BY q.completed_at DESC
         LIMIT 100`,
        (err, quizzes) => {
            if (err) {
                console.error('❌ Failed to fetch quizzes:', err);
                return res.status(500).json({ error: 'Failed to fetch quizzes' });
            }

            const parsedQuizzes = quizzes.map(quiz => ({
                ...quiz,
                questions: JSON.parse(quiz.questions || '[]')
            }));
            res.json({
                success: true,
                quizzes: parsedQuizzes,
                total: parsedQuizzes.length
            });
        }
    );
});

// ✅ ADMIN: Get all certificates (admin view)
app.get('/api/admin/certificates', requireAdmin, (req, res) => {
    db.all(
        `SELECT c.*, q.title as quiz_title, q.topic, u.name as user_name, u.email as user_email
         FROM certificates c
         JOIN quizzes q ON c.quiz_id = q.id
         JOIN users u ON c.user_id = u.id
         ORDER BY c.issue_date DESC
         LIMIT 500`,
        [],
        (err, certificates) => {
            if (err) {
                console.error('❌ Failed to fetch certificates (admin):', err);
                return res.status(500).json({ error: 'Failed to fetch certificates' });
            }

            res.json({
                success: true,
                certificates: certificates,
                total: certificates.length
            });
        }
    );
});

// ✅ ADMIN: Delete user by ID
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    db.serialize(() => {
        db.run('DELETE FROM quizzes WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Error deleting quizzes for user:', err);
        });
        db.run('DELETE FROM certificates WHERE user_id = ?', [userId], function(err) {
            if (err) console.error('❌ Error deleting certificates for user:', err);
        });
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
                console.error('❌ Error deleting user:', err);
                return res.status(500).json({ success: false, error: 'Failed to delete user' });
            }

            res.json({ success: true, message: 'User deleted' });
        });
    });
});

// ✅ ADMIN: Delete quiz by ID
app.delete('/api/admin/quizzes/:id', requireAdmin, (req, res) => {
    const quizId = req.params.id;
    db.serialize(() => {
        db.run('DELETE FROM questions WHERE quiz_id = ?', [quizId], function(err) {
            if (err) console.error('❌ Error deleting questions for quiz:', err);
        });
        db.run('DELETE FROM certificates WHERE quiz_id = ?', [quizId], function(err) {
            if (err) console.error('❌ Error deleting certificates for quiz:', err);
        });
        db.run('DELETE FROM quizzes WHERE id = ?', [quizId], function(err) {
            if (err) {
                console.error('❌ Error deleting quiz:', err);
                return res.status(500).json({ success: false, error: 'Failed to delete quiz' });
            }
            res.json({ success: true, message: 'Quiz deleted' });
        });
    });
});
        

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const statsQueries = {
        totalUsers: `SELECT COUNT(*) as count FROM users`,
        totalQuizzes: `SELECT COUNT(*) as count FROM quizzes`,
        totalCertificates: `SELECT COUNT(*) as count FROM certificates`,
        averageScore: `SELECT AVG(score) as average FROM quizzes WHERE score > 0`,
        activeUsers: `SELECT COUNT(DISTINCT user_id) as count FROM quizzes WHERE completed_at > datetime('now', '-7 days')`,
        popularTopics: `SELECT topic, COUNT(*) as count FROM quizzes GROUP BY topic ORDER BY count DESC LIMIT 5`
    };

    const results = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(statsQueries).length;

    Object.keys(statsQueries).forEach(key => {
        if (key === 'popularTopics') {
            db.all(statsQueries[key], [], (err, rows) => {
                if (err) {
                    console.error(`❌ Error fetching ${key}:`, err);
                    results[key] = [];
                } else {
                    results[key] = rows || [];
                }

                completedQueries++;
                if (completedQueries === totalQueries) {
                    res.json({
                        success: true,
                        stats: {
                            totalUsers: results.totalUsers || 0,
                            totalQuizzes: results.totalQuizzes || 0,
                            totalCertificates: results.totalCertificates || 0,
                            averageScore: Math.round(results.averageScore || 0),
                            activeUsers: results.activeUsers || 0,
                            popularTopics: results.popularTopics || []
                        }
                    });
                }
            });
        } else {
            db.get(statsQueries[key], [], (err, row) => {
                if (err) {
                    console.error(`❌ Error fetching ${key}:`, err);
                    results[key] = null;
                } else {
                    // For aggregate queries, return the numeric value
                    if (row) {
                        if (row.count !== undefined) results[key] = row.count;
                        else if (row.average !== undefined) results[key] = row.average;
                        else results[key] = row.count || row.average || null;
                    } else {
                        results[key] = null;
                    }
                }

                completedQueries++;
                if (completedQueries === totalQueries) {
                    res.json({
                        success: true,
                        stats: {
                            totalUsers: results.totalUsers || 0,
                            totalQuizzes: results.totalQuizzes || 0,
                            totalCertificates: results.totalCertificates || 0,
                            averageScore: Math.round(results.averageScore || 0),
                            activeUsers: results.activeUsers || 0,
                            popularTopics: results.popularTopics || []
                        }
                    });
                }
            });
        }
    });
});

// ✅ ADMIN: Leaderboard - top 5 users by average quiz score
app.get('/api/admin/leaderboard', requireAdmin, (req, res) => {
    const sql = `
        SELECT u.id, u.name, u.email,
               COALESCE(AVG(q.score), 0) as avgScore,
               COUNT(q.id) as quizzesTaken
        FROM users u
        LEFT JOIN quizzes q ON q.user_id = u.id
        GROUP BY u.id
        HAVING COUNT(q.id) > 0
        ORDER BY avgScore DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Failed to fetch leaderboard:', err);
            return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
        }
        console.log(`📊 Leaderboard: ${rows.length} users`);
        res.json({ success: true, users: rows });
    });
});

// ✅ GET FLAGGED QUESTIONS (Admin)
app.get('/api/admin/flagged-questions', requireAdmin, (req, res) => {
    // For now, return empty array since we don't have flagged questions table
    // You can add this table later if needed
    const flaggedQuestions = [];
    
    console.log('📋 Flagged questions requested');
    res.json({ 
        success: true, 
        flaggedQuestions: flaggedQuestions,
        total: flaggedQuestions.length 
    });
});

// ✅ TEST EMAIL
app.get('/api/test-email', async (req, res) => {
    const testEmail = req.query.email || process.env.EMAIL_USER;
    
    if (!testEmail) {
        return res.status(400).json({ 
            error: 'Provide email: /api/test-email?email=your@email.com' 
        });
    }
    
    try {
        console.log('🧪 Testing email service...');
        const result = await sendWelcomeEmail('Test User', testEmail, ['Mathematics', 'Science']);
        
        if (result.success) {
            res.json({
                success: true,
                message: '✅ Test email sent successfully!',
                email: testEmail,
                messageId: result.messageId
            });
        } else {
            res.json({
                success: false,
                error: 'Email failed to send',
                reason: result.reason,
                solution: 'Check your .env file and Gmail App Password setup'
            });
        }
        
    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test email failed',
            details: error.message
        });
    }
});

// ✅ DUPLICATE ENDPOINT REMOVED - Using the correct reset password endpoint above

// ✅ VALIDATE RESET TOKEN
app.get('/api/validate-reset-token/:token', (req, res) => {
    const { token } = req.params;

    db.get(
        `SELECT pt.*, u.name 
         FROM password_reset_tokens pt 
         JOIN users u ON pt.user_id = u.id 
         WHERE pt.token = ? AND pt.used = 0 AND pt.expires_at > datetime('now')`,
        [token],
        (err, tokenRecord) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!tokenRecord) {
                return res.status(400).json({ 
                    valid: false, 
                    error: 'Invalid or expired reset token' 
                });
            }

            res.json({ 
                valid: true, 
                user: { name: tokenRecord.name } 
            });
        }
    );
});

// ✅ Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ API status
app.get('/api', (req, res) => {
    res.json({
        message: '🚀 Adaptive Quiz Generator API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
            email: process.env.EMAIL_USER ? '✅' : '❌',
            gemini: process.env.GEMINI_API_KEY ? '✅' : '❌',
            database: '✅',
            forgot_password: '✅'
        },
        model: GEMINI_MODEL
    });
});

// ✅ Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        server: `Port ${PORT}`,
        database: 'Connected',
        gemini: geminiModel ? 'Connected' : 'Not configured',
        model: GEMINI_MODEL,
        timestamp: new Date().toISOString()
    });
});

// ✅ LOGOUT
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// ✅ Catch-all route for frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`\n🎯 Server running on http://localhost:${PORT}`);
    console.log(`📚 Adaptive Quiz Generator Ready!`);
    console.log(`🤖 AI Model: ${GEMINI_MODEL}`);
    console.log(`🔐 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Connected' : '❌ Missing API Key'}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   POST /api/register             - User registration`);
    console.log(`   POST /api/login                - User login`);
    console.log(`   POST /api/generate-quiz-ai     - Generate quiz with AI`);
    console.log(`   POST /api/save-quiz            - Save quiz results`);
    console.log(`   GET  /api/quiz-history         - Get user quiz history`);
    console.log(`   GET  /api/certificates         - Get user certificates`);
    console.log(`   GET  /api/admin/users          - Admin: Get all users`);
    console.log(`   GET  /api/admin/quizzes        - Admin: Get all quizzes`);
    console.log(`   GET  /api/test-gemini          - Test Gemini AI`);
    console.log(`   POST /api/save-quiz-progress   - Save quiz progress`);
    console.log(`   GET  /api/quiz-progress/:id    - Get quiz progress`);
    console.log(`   POST /api/fetch-url-content    - Fetch URL content`);
});

module.exports = app;