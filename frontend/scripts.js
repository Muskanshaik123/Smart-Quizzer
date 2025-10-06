const API_BASE = '/api';

// Global State
let currentUser = null;
let currentToken = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Smart Quizzer Initialized');
    
    // Check which page we're on
    if (document.getElementById('login-form')) {
        initializeAuthPage();
    } else if (document.getElementById('quizSetupForm')) {
        initializeDashboard();
    }
});

// ==================== AUTH FUNCTIONS ====================
function initializeAuthPage() {
    console.log('🔐 Initializing auth page...');
    
    // Add event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Check for stored auth
    const token = localStorage.getItem('quizzer_token');
    const user = localStorage.getItem('quizzer_user');
    
    if (token && user) {
        window.location.href = 'dashboard.html';
    }
}

function showRegister() {
    console.log('🔄 Switching to register form');
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    showMessage('Create your account to start learning!', 'success');
}

function showLogin() {
    console.log('🔄 Switching to login form');
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    showMessage('Welcome back! Ready to continue learning?', 'success');
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Login attempt');
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok) {
            showMessage('Login successful! Redirecting...', 'success');
            
            // Save user data
            localStorage.setItem('quizzer_token', data.token);
            localStorage.setItem('quizzer_user', JSON.stringify(data.user));
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            showMessage(data.error || 'Login failed!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('📝 Register attempt');
    
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!username || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Register response:', data);
        
        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            
            // Switch to login form
            setTimeout(() => {
                showLogin();
                document.getElementById('registerForm').reset();
            }, 2000);
            
        } else {
            showMessage(data.error || 'Registration failed!', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
function initializeDashboard() {
    console.log('🎯 Initializing dashboard...');
    
    // Check authentication
    const token = localStorage.getItem('quizzer_token');
    const user = localStorage.getItem('quizzer_user');
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentToken = token;
    currentUser = JSON.parse(user);
    
    // Update UI
    document.getElementById('username-display').textContent = currentUser.username;
    
    // Add event listeners
    document.getElementById('quizSetupForm').addEventListener('submit', startQuiz);
    document.getElementById('prev-btn').addEventListener('click', previousQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    document.getElementById('submit-btn').addEventListener('click', submitQuiz);
    
    // Load data
    loadTopics();
    loadProgress();
    
    console.log('✅ Dashboard initialized successfully');
}

async function loadTopics() {
    try {
        console.log('📚 Loading topics...');
        const response = await fetch(`${API_BASE}/quiz/topics`);
        const data = await response.json();
        
        const topicSelect = document.getElementById('topic');
        topicSelect.innerHTML = '<option value="">Select a topic...</option>';
        
        data.topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        });
        
        console.log('✅ Topics loaded:', data.topics);
    } catch (error) {
        console.error('❌ Failed to load topics:', error);
        showMessage('Failed to load topics', 'error');
    }
}

async function loadProgress() {
    try {
        console.log('📊 Loading progress...');
        const response = await fetch(`${API_BASE}/progress/${currentUser.id}`);
        const data = await response.json();
        
        const progressContainer = document.getElementById('progress-container');
        
        if (!data.progress || data.progress.length === 0) {
            progressContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <p>📚 No quiz attempts yet</p>
                    <p>Complete your first quiz to see your progress here!</p>
                </div>
            `;
            return;
        }
        
        let progressHTML = '';
        data.progress.forEach(item => {
            const scoreColor = item.best_score >= 80 ? '#10b981' : 
                             item.best_score >= 60 ? '#f59e0b' : '#ef4444';
            
            progressHTML += `
                <div class="progress-item">
                    <span class="topic">📖 ${item.topic}</span>
                    <span class="progress-score" style="background: ${scoreColor}">
                        ${item.best_score.toFixed(1)}%
                    </span>
                </div>
            `;
        });
        
        progressContainer.innerHTML = progressHTML;
        console.log('✅ Progress loaded');
        
    } catch (error) {
        console.error('❌ Failed to load progress:', error);
        document.getElementById('progress-container').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ef4444;">
                <p>❌ Error loading progress data</p>
            </div>
        `;
    }
}

async function startQuiz(e) {
    e.preventDefault();
    console.log('🚀 Starting quiz...');
    
    const topic = document.getElementById('topic').value;
    const difficulty = document.getElementById('difficulty').value;
    const questionCount = document.getElementById('questionCount').value;
    
    if (!topic) {
        showMessage('Please select a topic', 'error');
        return;
    }
    
    console.log('Quiz settings:', { topic, difficulty, questionCount });
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#quizSetupForm button[type="submit"]');
        submitBtn.textContent = 'Generating Quiz...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/quiz/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                topic, 
                difficulty, 
                numQuestions: parseInt(questionCount) 
            })
        });
        
        const data = await response.json();
        console.log('Quiz data received:', data);
        
        // Reset button
        submitBtn.textContent = 'Generate Quiz';
        submitBtn.disabled = false;
        
        if (data.questions && data.questions.length > 0) {
            currentQuiz = data;
            currentQuestionIndex = 0;
            userAnswers = new Array(data.questions.length).fill(null);
            
            // Show quiz section
            document.getElementById('quiz-section').classList.remove('hidden');
            document.getElementById('results-section').classList.add('hidden');
            document.querySelector('.quiz-setup').classList.add('hidden');
            document.querySelector('.progress-section').classList.add('hidden');
            
            displayQuestion();
            console.log('✅ Quiz started successfully');
            
        } else {
            showMessage('No questions were generated. Please try again.', 'error');
        }
    } catch (error) {
        console.error('❌ Quiz start error:', error);
        showMessage('Failed to start quiz. Please try again.', 'error');
        
        // Reset button
        const submitBtn = document.querySelector('#quizSetupForm button[type="submit"]');
        submitBtn.textContent = 'Generate Quiz';
        submitBtn.disabled = false;
    }
}

function displayQuestion() {
    if (!currentQuiz || !currentQuiz.questions[currentQuestionIndex]) {
        console.error('No question data available');
        return;
    }
    
    const question = currentQuiz.questions[currentQuestionIndex];
    console.log('Displaying question:', currentQuestionIndex + 1);
    
    // Update quiz info
    document.getElementById('quiz-title').textContent = 
        `${currentQuiz.topic} Quiz - ${currentQuiz.difficulty.charAt(0).toUpperCase() + currentQuiz.difficulty.slice(1)}`;
    
    // Display question
    document.getElementById('question-display').textContent = 
        `${currentQuestionIndex + 1}. ${question.question}`;
    
    // Display options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('button');
        optionElement.type = 'button';
        optionElement.className = `option ${userAnswers[currentQuestionIndex] === option ? 'selected' : ''}`;
        optionElement.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        optionElement.onclick = () => selectOption(option);
        optionsContainer.appendChild(optionElement);
    });
    
    // Update progress
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = currentQuiz.questions.length;
    
    // FIXED: Button visibility logic
    const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
    
    // Show/hide buttons
    document.getElementById('prev-btn').classList.toggle('hidden', currentQuestionIndex === 0);
    document.getElementById('next-btn').classList.toggle('hidden', isLastQuestion);
    document.getElementById('submit-btn').classList.toggle('hidden', !isLastQuestion);
    
    console.log('✅ Question displayed - Submit button:', !isLastQuestion ? 'hidden' : 'visible');
}

function selectOption(option) {
    console.log('Option selected:', option);
    userAnswers[currentQuestionIndex] = option;
    
    // Update UI
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    event.target.classList.add('selected');
}

function previousQuestion() {
    console.log('⬅️ Previous question');
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

function nextQuestion() {
    console.log('➡️ Next question');
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

async function submitQuiz() {
    console.log('📤 Submitting quiz...');
    
    if (!currentQuiz || !currentUser) {
        showMessage('Error: No quiz data found', 'error');
        return;
    }
    
    // Check if all questions are answered
    const unanswered = userAnswers.filter(answer => answer === null).length;
    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
            return;
        }
    }
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                topic: currentQuiz.topic,
                answers: userAnswers,
                questions: currentQuiz.questions,
                difficulty: currentQuiz.difficulty
            })
        });
        
        const data = await response.json();
        console.log('Submission response:', data);
        
        // Reset button
        submitBtn.textContent = 'Submit Quiz';
        submitBtn.disabled = false;
        
        if (response.ok) {
            showResults(data);
            // Reload progress immediately after successful submission
            setTimeout(() => {
                loadProgress();
            }, 500);
        } else {
            // Calculate results locally if submission fails
            const localResults = calculateLocalResults();
            showResults(localResults);
            showMessage('Results saved locally', 'info');
        }
    } catch (error) {
        console.error('❌ Submission error:', error);
        // Calculate results locally
        const localResults = calculateLocalResults();
        showResults(localResults);
        showMessage('Network error - results saved locally', 'error');
        
        // Reset button
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Submit Quiz';
        submitBtn.disabled = false;
    }
}

function calculateLocalResults() {
    let correctAnswers = 0;
    currentQuiz.questions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    const score = (correctAnswers / currentQuiz.questions.length) * 100;
    
    return {
        score: Math.round(score),
        correctAnswers: correctAnswers,
        totalQuestions: currentQuiz.questions.length,
        performance: getPerformanceFeedback(score)
    };
}

function showResults(data) {
    console.log('Showing results:', data);
    
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = `
        <div class="score-display">${data.score}%</div>
        <div class="performance-feedback">${data.performance}</div>
        <p>You got <strong>${data.correctAnswers}</strong> out of <strong>${data.totalQuestions}</strong> questions correct!</p>
        <p><strong>Topic:</strong> ${currentQuiz.topic}</p>
        <p><strong>Difficulty:</strong> ${currentQuiz.difficulty}</p>
        
        <div style="margin-top: 30px; text-align: left; background: #f7fafc; padding: 20px; border-radius: 10px;">
            <h3 style="margin-bottom: 15px;">📋 Question Review:</h3>
            ${currentQuiz.questions.map((question, index) => {
                const isCorrect = userAnswers[index] === question.correctAnswer;
                return `
                    <div style="margin: 10px 0; padding: 10px; border-left: 4px solid ${isCorrect ? '#10b981' : '#ef4444'};">
                        <strong>Q${index + 1}:</strong> ${question.question}<br>
                        <span style="color: ${isCorrect ? '#10b981' : '#ef4444'}">
                            Your answer: ${userAnswers[index] || 'Not answered'} 
                            ${isCorrect ? '✅' : '❌'}
                        </span>
                        ${!isCorrect ? `<br><span style="color: #10b981">Correct: ${question.correctAnswer} ✅</span>` : ''}
                        <br><em style="color: #666;">${question.explanation}</em>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    console.log('✅ Results displayed');
}

function getPerformanceFeedback(score) {
    if (score >= 90) return 'Outstanding! You are an expert! 🏆';
    if (score >= 80) return 'Excellent! You have mastered this topic! 🌟';
    if (score >= 70) return 'Very good! Solid understanding! 👍';
    if (score >= 60) return 'Good job! Keep practicing! 💪';
    if (score >= 50) return 'Not bad! Review and try again! 📚';
    return 'Keep learning! Focus on the basics! 🎯';
}

function resetQuiz() {
    console.log('🔄 Resetting quiz');
    document.getElementById('results-section').classList.add('hidden');
    document.querySelector('.quiz-setup').classList.remove('hidden');
    document.querySelector('.progress-section').classList.remove('hidden');
    document.getElementById('quizSetupForm').reset();
    
    // Reload progress to show updated scores
    loadProgress();
}

function logout() {
    console.log('👋 Logging out');
    localStorage.removeItem('quizzer_token');
    localStorage.removeItem('quizzer_user');
    window.location.href = 'index.html';
}

// ==================== UTILITY FUNCTIONS ====================
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Debug helper
window.debugState = function() {
    console.log('=== DEBUG STATE ===');
    console.log('Current User:', currentUser);
    console.log('Current Quiz:', currentQuiz);
    console.log('Current Question Index:', currentQuestionIndex);
    console.log('User Answers:', userAnswers);
    console.log('Total Questions:', currentQuiz ? currentQuiz.questions.length : 0);
    console.log('Is Last Question:', currentQuestionIndex === (currentQuiz ? currentQuiz.questions.length - 1 : false));
    console.log('==================');
};

// Export for global access
window.showRegister = showRegister;
window.showLogin = showLogin;
window.logout = logout;
window.resetQuiz = resetQuiz;

console.log('✅ All frontend functions loaded successfully!');