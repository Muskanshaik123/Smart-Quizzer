const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Database = require('./db');
const quizGenerator = require('./quizGenerator');

const app = express();
const PORT = process.env.PORT || 5000;
const db = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('📝 Register attempt:', username);

        const user = await db.createUser(username, password);
        
        const token = jwt.sign(
            { userId: user.id }, 
            process.env.JWT_SECRET || 'fallback-secret', 
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Registration successful!',
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('🔐 Login attempt:', username);

        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { userId: user.id }, 
            process.env.JWT_SECRET || 'fallback-secret', 
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Quiz routes
app.get('/api/quiz/topics', (req, res) => {
    const topics = [
        'Mathematics', 'Science', 'History', 'Literature', 'Geography',
        'Computer Science', 'Physics', 'Chemistry', 'Biology'
    ];
    res.json({ topics });
});

app.post('/api/quiz/generate', async (req, res) => {
    try {
        const { topic, difficulty, numQuestions = 5 } = req.body;
        
        console.log(`🎯 Quiz request received: ${topic} - ${difficulty}`);
        
        const questions = quizGenerator.generateQuestions(topic, difficulty, numQuestions);
        
        console.log(`✅ Sending ${questions.length} questions to client`);
        
        res.json({
            topic,
            difficulty,
            questions,
            totalQuestions: questions.length
        });

    } catch (error) {
        console.error('❌ Quiz generation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate questions' 
        });
    }
});

app.post('/api/quiz/submit', async (req, res) => {
    try {
        const { userId, topic, answers, questions, difficulty } = req.body;

        console.log('📥 Quiz submission received:', { 
            userId, 
            topic, 
            difficulty, 
            questionsCount: questions?.length,
            answersCount: answers?.length 
        });

        if (!userId || !topic || !answers || !questions) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let correctAnswers = 0;
        questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = (correctAnswers / questions.length) * 100;
        console.log(`📊 Score calculated: ${correctAnswers}/${questions.length} = ${score.toFixed(1)}%`);

        await db.saveQuizProgress(userId, topic, score, questions.length, correctAnswers, difficulty);

        res.json({
            message: 'Quiz submitted successfully!',
            score: Math.round(score),
            correctAnswers,
            totalQuestions: questions.length,
            performance: getPerformanceFeedback(score)
        });

    } catch (error) {
        console.error('❌ Quiz submission error:', error);
        res.status(500).json({ error: 'Failed to submit quiz results' });
    }
});

app.get('/api/progress/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        console.log('📈 Fetching progress for user:', userId);
        const progress = await db.getUserProgress(userId);
        res.json({ progress });
    } catch (error) {
        console.error('Progress fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Helper function
function getPerformanceFeedback(score) {
    if (score >= 80) return 'Excellent! You have mastered this topic! 🌟';
    if (score >= 60) return 'Good job! Keep practicing! 💪';
    return 'Keep learning! Review the material! 📚';
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 AUTOMATIC Question Generator Active`);
});

process.on('SIGINT', () => {
    db.close();
    process.exit();
});