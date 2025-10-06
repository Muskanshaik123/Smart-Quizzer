const express = require('express');
const router = express.Router();
const quizGenerator = require('../quizGenerator');

// Available topics
const topics = [
    'Mathematics', 'Science', 'History', 'Literature', 'Geography',
    'Computer Science', 'Physics', 'Chemistry'
];

// Get available topics
router.get('/topics', (req, res) => {
    res.json({ topics });
});

// Generate quiz questions
router.post('/generate', async (req, res) => {
    try {
        const { topic, difficulty, numQuestions = 5 } = req.body;

        if (!topics.includes(topic)) {
            return res.status(400).json({ error: 'Invalid topic' });
        }

        const questions = await quizGenerator.generateQuestions(topic, difficulty, numQuestions);
        
        res.json({
            topic,
            difficulty,
            questions,
            totalQuestions: questions.length
        });

    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ error: 'Failed to generate quiz questions' });
    }
});

// Submit quiz results
router.post('/submit', (req, res) => {
    try {
        const { userId, topic, score, responses, totalQuestions } = req.body;

        // Update user progress (in real app, save to database)
        const users = require('./auth').users;
        const user = users.find(u => u.id === parseInt(userId));
        
        if (user) {
            if (!user.progress) user.progress = {};
            user.progress[topic] = {
                score: (score / totalQuestions) * 100,
                lastAttempt: new Date(),
                totalQuizzes: (user.progress[topic]?.totalQuizzes || 0) + 1
            };
        }

        res.json({
            message: 'Quiz submitted successfully!',
            finalScore: (score / totalQuestions) * 100,
            performance: getPerformanceFeedback(score / totalQuestions)
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to submit quiz results' });
    }
});

function getPerformanceFeedback(scoreRatio) {
    if (scoreRatio >= 0.8) return 'Excellent! You have mastered this topic!';
    if (scoreRatio >= 0.6) return 'Good job! Keep practicing to improve further.';
    return 'Keep learning! Review the material and try again.';
}

module.exports = router;