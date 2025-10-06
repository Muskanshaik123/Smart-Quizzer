const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// In-memory database (replace with real DB in production)
const users = [];
let userIdCounter = 1;

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: userIdCounter++,
            username,
            password: hashedPassword,
            progress: {},
            createdAt: new Date()
        };

        users.push(user);

        // Generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'quizzer-secret', { expiresIn: '24h' });

        res.json({
            message: 'Registration successful!',
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = users.find(user => user.username === username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'quizzer-secret', { expiresIn: '24h' });

        res.json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get user progress
router.get('/progress/:userId', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.userId));
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ progress: user.progress });
});

module.exports = router;