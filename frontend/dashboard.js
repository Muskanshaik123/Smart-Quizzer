// Dashboard State
const dashboardState = {
    user: {
        name: '',
        email: '',
        joinDate: '',
        preferences: {
            difficulty: 'mixed',
            notifications: true,
            progressTracking: true
        }
    },
    quizzes: [],
    certificates: [],
    progress: {
        totalQuizzes: 0,
        averageScore: 0,
        totalTime: 0,
        certificates: 0,
        level: 1,
        streak: 0
    }
};

// Initialize dashboard
async function initializeDashboard() {
    console.log('🚀 Initializing dashboard...');
    showLoading(true);
    
    try {
        setupEventListeners();
        
        // Check if returning from a completed quiz
        const quizCompleted = localStorage.getItem('quizCompleted');
        if (quizCompleted === 'true') {
            console.log('🎉 New quiz detected! Loading fresh data...');
            localStorage.removeItem('quizCompleted');
            localStorage.removeItem('newQuizData');
        }
        
        // Load all data in sequence to avoid race conditions
        await loadUserData();
        await loadQuizHistory();
        await loadCertificates();
        
        updateAllSections();
        showSection('dashboard');
        
        console.log('✅ Dashboard initialized successfully');
        
        // Show notification if quiz was just completed
        if (quizCompleted === 'true') {
            showNotification('🎉 Quiz completed! Your dashboard has been updated.', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showNotification('Failed to load dashboard data. Using demo data.', 'warning');
        loadDemoData();
    } finally {
        showLoading(false);
    }
}

// Load user data from server
async function loadUserData() {
    try {
        console.log('📡 Fetching user data from /api/user-progress...');
        const response = await fetch('/api/user-progress', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 User data received:', data);
        
        if (data.success && data.progress) {
            dashboardState.user = {
                name: data.progress.name || 'Student',
                email: data.progress.email || '',
                joinDate: data.progress.created_at || new Date().toISOString(),
                preferences: {
                    difficulty: 'mixed',
                    notifications: true,
                    progressTracking: true
                }
            };
        }
        
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        throw error;
    }
}

// Load quiz history from server
async function loadQuizHistory() {
    try {
        console.log('📡 Fetching quiz history from /api/quiz-history...');
        
        // Add cache-busting parameter to force fresh data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/quiz-history?t=${timestamp}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Quiz history received:', data);
        console.log('📊 Total quizzes loaded:', data.quizzes?.length || 0);
        
        if (data.success && data.quizzes) {
            dashboardState.quizzes = data.quizzes.map(quiz => ({
                id: quiz.id,
                title: quiz.title || 'Untitled Quiz',
                topic: quiz.topic || 'General',
                score: quiz.score || 0,
                totalQuestions: quiz.total_questions || 0,
                correctAnswers: quiz.correct_answers || 0,
                timeSpent: quiz.time_taken || 0,
                difficulty: quiz.difficulty || 'medium',
                date: quiz.completed_at || new Date().toISOString(),
                certificateId: quiz.certificate_generated ? `cert-${quiz.id}` : null
            }));
            console.log(`✅ Loaded ${dashboardState.quizzes.length} quizzes from database`);
        }
        
        updateProgressStats();
        
    } catch (error) {
        console.error('❌ Error loading quiz history:', error);
        dashboardState.quizzes = [];
    }
}

// Load certificates from server
async function loadCertificates() {
    try {
        console.log('📡 Fetching certificates from /api/certificates...');
        
        // Add cache-busting parameter to force fresh data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/certificates?t=${timestamp}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Certificates received:', data);
        
        if (data.success && data.certificates) {
            dashboardState.certificates = data.certificates.map(cert => {
                // Get the percentage value
                let percentage = Number(cert.percentage) || Number(cert.score) || 0;
                
                // If percentage is way too high (like 7000), it means old buggy calculation
                // where score was divided by totalQuestions and multiplied by 100
                // In that case, recalculate: percentage = (score / 100) to get back original score
                if (percentage > 100) {
                    console.warn('⚠️ Detected incorrect percentage:', percentage, '- Fixing...');
                    percentage = Math.min(100, Math.round(percentage / cert.total_questions));
                }
                
                // Clamp to 0-100 range
                percentage = Math.max(0, Math.min(100, Math.round(percentage)));
                
                return {
                    id: cert.certificate_id,
                    title: cert.quiz_title,
                    topic: cert.topic,
                    score: percentage, // Use corrected percentage as score
                    totalQuestions: cert.total_questions || 0,
                    percentage: percentage,
                    date: cert.issue_date
                };
            });
            console.log(`✅ Loaded ${dashboardState.certificates.length} certificates from database`);
            console.log('📊 Certificate percentages:', dashboardState.certificates.map(c => c.percentage));
        }
        
        updateProgressStats();
        
    } catch (error) {
        console.error('❌ Error loading certificates:', error);
        dashboardState.certificates = [];
    }
}

// Update progress statistics
function updateProgressStats() {
    const quizzes = dashboardState.quizzes;
    
    // Count only valid certificates (70% or higher)
    const validCertificates = (dashboardState.certificates || []).filter(cert => {
        const pct = Number(cert.percentage) || 0;
        return pct >= 70 && pct <= 100;
    });
    
    console.log(`📊 Valid certificates: ${validCertificates.length} out of ${dashboardState.certificates?.length || 0} total`);
    
    if (quizzes.length === 0) {
        dashboardState.progress = {
            totalQuizzes: 0,
            averageScore: 0,
            totalTime: 0,
            certificates: validCertificates.length,
            level: 1,
            streak: 0
        };
        return;
    }
    
    const totalScore = quizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
    const totalTime = quizzes.reduce((sum, quiz) => sum + (quiz.timeSpent || 0), 0);
    
    dashboardState.progress = {
        totalQuizzes: quizzes.length,
        averageScore: quizzes.length > 0 ? Math.round(totalScore / quizzes.length) : 0,
        totalTime: Math.round(totalTime / 60),
        certificates: validCertificates.length,
        level: Math.min(Math.floor(quizzes.length / 3) + 1, 10),
        streak: calculateStreak(quizzes)
    };
    
    console.log('📊 Progress stats updated:', dashboardState.progress);
}

function calculateStreak(quizzes) {
    if (quizzes.length === 0) return 0;
    
    let streak = 1;
    const sortedQuizzes = [...quizzes].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (let i = 1; i < sortedQuizzes.length; i++) {
        const prevDate = new Date(sortedQuizzes[i-1].date);
        const currDate = new Date(sortedQuizzes[i].date);
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// Update dashboard statistics
function updateDashboardStats() {
    const progress = dashboardState.progress;
    
    // Update main dashboard stats
    const totalQuizzesEl = document.getElementById('totalQuizzes');
    const averageScoreEl = document.getElementById('averageScore');
    const totalTimeEl = document.getElementById('totalTime');
    const certificateCountEl = document.getElementById('certificateCount');
    
    if (totalQuizzesEl) totalQuizzesEl.textContent = progress.totalQuizzes;
    if (averageScoreEl) averageScoreEl.textContent = progress.averageScore + '%';
    if (totalTimeEl) totalTimeEl.textContent = progress.totalTime + 'm';
    if (certificateCountEl) certificateCountEl.textContent = progress.certificates;
    
    updateUserInterface();
}

// Update user interface
function updateUserInterface() {
    const user = dashboardState.user;
    
    let displayName = user.name;
    if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    displayName = displayName || 'Student';
    
    const greetingName = document.getElementById('greetingName');
    const sidebarUserName = document.getElementById('sidebarUserName');
    
    if (greetingName) greetingName.textContent = displayName;
    if (sidebarUserName) sidebarUserName.textContent = displayName;
    
    const userEmail = user.email || 'Add your email';
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail;
}

// Update recent quizzes section
function updateRecentQuizzes() {
    const container = document.getElementById('recentQuizzes');
    if (!container) return;
    
    const quizzes = dashboardState.quizzes.slice(0, 3);
    
    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No quizzes yet</h3>
                <p>Take your first quiz to see your progress here!</p>
                <button class="btn-primary" onclick="window.location.href='quiz-generator.html'">
                    <i class="fas fa-plus-circle"></i> Generate Your First Quiz
                </button>
            </div>`;
        return;
    }
    
    container.innerHTML = quizzes.map(quiz => `
        <div class="quiz-item hover-lift">
            <div class="quiz-info">
                <h4>${escapeHtml(quiz.title)}</h4>
                <div class="quiz-meta">
                    <span class="score ${getScoreClass(quiz.score)}">${quiz.score}%</span>
                    <span class="date">${formatDate(quiz.date)}</span>
                    <span class="questions">${quiz.correctAnswers}/${quiz.totalQuestions} correct</span>
                    <span class="difficulty ${quiz.difficulty}">${quiz.difficulty}</span>
                </div>
            </div>
            <div class="quiz-actions">
                <button class="btn-icon" onclick="viewQuizDetails('${quiz.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${quiz.certificateId ? `
                    <button class="btn-icon" onclick="viewCertificate('${quiz.id}')" title="View Certificate">
                        <i class="fas fa-award"></i>
                    </button>
                ` : ''}
                <button class="btn-icon" onclick="retakeQuiz('${quiz.id}')" title="Retake Quiz">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Update performance chart
function updatePerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    const quizzes = dashboardState.quizzes.slice(-6);
    
    if (quizzes.length === 0) {
        ctx.closest('.chart-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h3>No data yet</h3>
                <p>Complete some quizzes to see your performance chart</p>
            </div>`;
        return;
    }
    
    if (window.performanceChartInstance) {
        window.performanceChartInstance.destroy();
    }
    
    window.performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: quizzes.map((quiz, index) => `Quiz ${index + 1}`),
            datasets: [{
                label: 'Quiz Scores',
                data: quizzes.map(quiz => quiz.score),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Score: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Update quiz history section
function updateQuizHistory() {
    const container = document.getElementById('quizHistoryContent');
    if (!container) {
        console.warn('⚠️ Quiz history container not found');
        return;
    }
    
    console.log('📋 Updating quiz history with', dashboardState.quizzes.length, 'quizzes');
    const quizzes = [...dashboardState.quizzes].reverse();
    
    if (quizzes.length === 0) {
        console.log('ℹ️ No quizzes to display');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No quiz history</h3>
                <p>Your completed quizzes will appear here</p>
                <button class="btn-primary" onclick="window.location.href='quiz-generator.html'">
                    <i class="fas fa-plus-circle"></i> Create Your First Quiz
                </button>
            </div>`;
        return;
    }
    
    console.log('✅ Displaying', quizzes.length, 'quizzes in history');
    console.log('📋 Quiz data:', quizzes.map(q => ({ title: q.title, score: q.score })));
    
    container.innerHTML = `
        <div class="history-header">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="historySearch" placeholder="Search quizzes...">
            </div>
            <div class="filter-buttons">
                <button class="btn-filter active" data-filter="all">All</button>
                <button class="btn-filter" data-filter="excellent">Excellent (80-100%)</button>
                <button class="btn-filter" data-filter="good">Good (70-79%)</button>
                <button class="btn-filter" data-filter="average">Average (60-69%)</button>
                <button class="btn-filter" data-filter="poor">Needs Work (<60%)</button>
            </div>
            <button class="btn-outline" onclick="exportHistory()">
                <i class="fas fa-download"></i> Export History
            </button>
        </div>
        <div class="history-list">
            ${quizzes.map(quiz => `
                <div class="history-item hover-lift" data-quiz-id="${quiz.id}" data-score="${quiz.score}">
                    <div class="quiz-main-info">
                        <h4>${escapeHtml(quiz.title)}</h4>
                        <p class="quiz-topic">${escapeHtml(quiz.topic)}</p>
                        <div class="quiz-stats">
                            <span class="stat">
                                <i class="fas fa-check-circle"></i>
                                ${quiz.correctAnswers}/${quiz.totalQuestions} correct
                            </span>
                            <span class="stat">
                                <i class="fas fa-clock"></i>
                                ${formatTime(quiz.timeSpent)}
                            </span>
                            <span class="stat">
                                <i class="fas fa-star"></i>
                                ${quiz.difficulty} difficulty
                            </span>
                            ${quiz.certificateId && quiz.score >= 70 ? `
                                <span class="stat certified">
                                    <i class="fas fa-award"></i>
                                    Certified
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="quiz-score-section">
                        <div class="score-circle ${getScoreClass(quiz.score)}">
                            <span>${quiz.score}%</span>
                        </div>
                        <div class="quiz-date">${formatDate(quiz.date)}</div>
                        <div class="quiz-actions">
                            <button class="btn-text" onclick="viewQuizDetails('${quiz.id}')">
                                View Details
                            </button>
                            ${quiz.certificateId && quiz.score >= 70 ? `
                                <button class="btn-text" onclick="viewCertificate('${quiz.id}')">
                                    <i class="fas fa-award"></i> Certificate
                                </button>
                            ` : ''}
                            <button class="btn-text" onclick="retakeQuiz('${quiz.id}')">
                                <i class="fas fa-redo"></i> Retake
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    
    setupHistoryFilters();
}

// Update progress section
function updateProgressSection() {
    const container = document.getElementById('progressContent');
    if (!container) return;
    
    const progress = dashboardState.progress;
    const user = dashboardState.user;
    
    let displayName = user.name;
    if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    displayName = displayName || 'Student';
    
    container.innerHTML = `
        <div class="progress-hero">
            <div class="hero-header">
                <h1><i class="fas fa-chart-line"></i> Your Progress</h1>
                <p>Track your learning growth and achievements</p>
            </div>
            
            <div class="stats-grid-main">
                <div class="stat-card-main">
                    <div class="stat-icon-main">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value-main">${progress.totalQuizzes}</div>
                        <div class="stat-label-main">Quizzes Completed</div>
                        <div class="stat-trend-main">
                            <i class="fas fa-chart-line"></i>
                            ${progress.totalQuizzes > 0 ? 'Active' : 'Start learning!'}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card-main">
                    <div class="stat-icon-main ${getScoreClass(progress.averageScore)}">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value-main">${progress.averageScore}%</div>
                        <div class="stat-label-main">Average Score</div>
                        <div class="stat-trend-main">
                            <i class="fas ${progress.averageScore >= 70 ? 'fa-arrow-up success' : 'fa-arrow-down warning'}"></i>
                            ${progress.averageScore >= 70 ? 'Great job!' : 'Keep practicing!'}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card-main">
                    <div class="stat-icon-main">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value-main">${progress.totalTime}m</div>
                        <div class="stat-label-main">Total Time</div>
                        <div class="stat-trend-main">
                            <i class="fas fa-clock"></i>
                            ${progress.totalTime > 0 ? 'Keep learning!' : 'Start timing!'}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card-main">
                    <div class="stat-icon-main">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value-main">Level ${progress.level}</div>
                        <div class="stat-label-main">Current Level</div>
                        <div class="stat-trend-main">
                            <i class="fas fa-trophy"></i>
                            ${progress.level > 1 ? 'Amazing!' : 'Beginner'}
                        </div>
                    </div>
                </div>
            </div>
            
            ${progress.streak > 0 ? `
            <div class="streak-banner">
                <div class="streak-content">
                    <div class="streak-fire">
                        <i class="fas fa-fire"></i>
                    </div>
                    <div class="streak-info">
                        <div class="streak-count">${progress.streak} day streak!</div>
                        <div class="streak-message">Keep going to maintain your streak</div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="progress-content-grid">
            <div class="goals-section">
                <div class="section-card">
                    <div class="section-header">
                        <h2><i class="fas fa-bullseye"></i> Learning Goals</h2>
                    </div>
                    <div class="goals-list">
                        <div class="goal-item ${progress.totalQuizzes >= 1 ? 'completed' : ''}">
                            <div class="goal-check">
                                <i class="fas ${progress.totalQuizzes >= 1 ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="goal-text">
                                <span>Complete your first quiz</span>
                                ${progress.totalQuizzes >= 1 ? '<span class="goal-status completed">Completed!</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="goal-item ${progress.averageScore >= 70 ? 'completed' : ''}">
                            <div class="goal-check">
                                <i class="fas ${progress.averageScore >= 70 ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="goal-text">
                                <span>Achieve 70% average score</span>
                                ${progress.averageScore >= 70 ? '<span class="goal-status completed">Achieved!</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="goal-item ${progress.totalTime >= 30 ? 'completed' : ''}">
                            <div class="goal-check">
                                <i class="fas ${progress.totalTime >= 30 ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="goal-text">
                                <span>Spend 30 minutes learning</span>
                                ${progress.totalTime >= 30 ? '<span class="goal-status completed">Done!</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="goal-item ${progress.totalQuizzes >= 5 ? 'completed' : ''}">
                            <div class="goal-check">
                                <i class="fas ${progress.totalQuizzes >= 5 ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="goal-text">
                                <span>Complete 5 quizzes</span>
                                ${progress.totalQuizzes >= 5 ? 
                                    '<span class="goal-status completed">Completed!</span>' : 
                                    `<span class="goal-progress">${progress.totalQuizzes}/5</span>`
                                }
                            </div>
                        </div>
                        
                        <div class="goal-item ${progress.certificates >= 1 ? 'completed' : ''}">
                            <div class="goal-check">
                                <i class="fas ${progress.certificates >= 1 ? 'fa-check-circle' : 'fa-circle'}"></i>
                            </div>
                            <div class="goal-text">
                                <span>Earn your first certificate</span>
                                ${progress.certificates >= 1 ? 
                                    '<span class="goal-status completed">Earned!</span>' : 
                                    '<span class="goal-hint">Score 70%+ on any quiz</span>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="activity-section">
                <div class="section-card">
                    <div class="section-header">
                        <h2><i class="fas fa-history"></i> Recent Activity</h2>
                    </div>
                    <div class="activity-feed">
                        ${dashboardState.quizzes.slice(0, 4).map(quiz => `
                            <div class="activity-item">
                                <div class="activity-icon ${getScoreClass(quiz.score)}">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                                <div class="activity-content">
                                    <p class="activity-title">Completed "${escapeHtml(quiz.title)}"</p>
                                    <div class="activity-meta">
                                        <span class="activity-date">${formatDate(quiz.date)}</span>
                                        <span class="activity-score">Score: <strong>${quiz.score}%</strong></span>
                                    </div>
                                </div>
                                ${quiz.certificateId ? 
                                    '<div class="activity-badge certified"><i class="fas fa-award"></i></div>' : ''}
                            </div>
                        `).join('') || 
                        '<div class="no-activity"><i class="fas fa-inbox"></i><p>No recent activity</p></div>'
                        }
                    </div>
                </div>
            </div>
        </div>
        
        <div class="progress-actions">
            <button class="btn-action primary" onclick="window.location.href='quiz-generator.html'">
                <i class="fas fa-plus-circle"></i> Create New Quiz
            </button>
            <button class="btn-action secondary" onclick="showSection('certificates')">
                <i class="fas fa-award"></i> View Certificates
            </button>
            <button class="btn-action outline" onclick="refreshDashboardData()">
                <i class="fas fa-sync-alt"></i> Refresh Data
            </button>
        </div>`;
}

// Update certificates section - FIXED VERSION
async function updateCertificatesSection() {
    const container = document.getElementById('certificatesContent');
    if (!container) return;
    
    try {
        // Reload certificates to ensure fresh data
        await loadCertificates();
        
        const certificates = dashboardState.certificates || [];
        console.log('🔍 Processing certificates:', certificates.length);
        
        // Only show certificates with valid percentages between 70 and 100
        const passedCertificates = certificates.filter(cert => {
            const pct = Number(cert.percentage) || 0;
            const isValid = pct >= 70 && pct <= 100;
            if (!isValid) {
                console.log(`⚠️ Filtering out certificate with invalid percentage: ${pct}%`, cert);
            }
            return isValid;
        });
        
        console.log(`✅ Displaying ${passedCertificates.length} valid certificates (70-100%)`);

        
        if (passedCertificates.length === 0) {
            container.innerHTML = `
                <div class="empty-state-modern">
                    <div class="empty-state-content">
                        <div class="empty-icon-large">
                            <div class="icon-circle">
                                <i class="fas fa-certificate"></i>
                            </div>
                            <div class="icon-sparkles">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                            </div>
                        </div>
                        
                        <h2 class="empty-title">Start Your Journey to Excellence</h2>
                        <p class="empty-subtitle">You haven't earned any certificates yet, but you're just one quiz away!</p>
                        
                        <div class="certificate-info-cards">
                            <div class="info-card">
                                <div class="info-icon">
                                    <i class="fas fa-trophy"></i>
                                </div>
                                <h4>Score 70%+</h4>
                                <p>Achieve a passing grade</p>
                            </div>
                            
                            <div class="info-card">
                                <div class="info-icon">
                                    <i class="fas fa-check-double"></i>
                                </div>
                                <h4>Complete Quiz</h4>
                                <p>Answer all questions</p>
                            </div>
                            
                            <div class="info-card">
                                <div class="info-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <h4>Beat the Clock</h4>
                                <p>Finish on time</p>
                            </div>
                        </div>
                        
                        <div class="empty-actions">
                            <button class="btn-start-quiz" onclick="window.location.href='quiz-generator.html'">
                                <i class="fas fa-rocket"></i>
                                <span>Start Your First Quiz</span>
                            </button>
                            <button class="btn-learn-more" onclick="showCertificateInfo()">
                                <i class="fas fa-info-circle"></i>
                                <span>Learn More</span>
                            </button>
                        </div>
                        
                        <div class="motivational-quote">
                            <i class="fas fa-quote-left"></i>
                            <p>"Every expert was once a beginner. Start your learning journey today!"</p>
                        </div>
                    </div>
                </div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="certificates-header">
                <div class="header-content">
                    <h1><i class="fas fa-trophy"></i> My Certificates</h1>
                    <p>Celebrating your learning achievements and outstanding performance</p>
                    <div class="achievement-stats">
                        <span class="stat-item">
                            <strong>${passedCertificates.length}</strong> Displayed
                        </span>
                        <span class="stat-item">
                            <strong>${dashboardState.certificates.length}</strong> Total Attempts
                        </span>
                    </div>
                </div>
            </div>

            <div class="certificates-section">
                <div class="section-title">
                    <h2><i class="fas fa-star"></i> Passed with Excellence</h2>
                    <p>Certificates earned for outstanding performance (70% and above)</p>
                </div>
                
                <div class="certificates-grid">
                    ${passedCertificates.map(cert => {
                        const score = cert.percentage || cert.score;
                        return `
                        <div class="certificate-card ${getScoreClass(score)}">
                            <div class="certificate-header">
                                <div class="certificate-badge">
                                    <i class="fas fa-award"></i>
                                </div>
                                <div class="certificate-title">
                                    <h3>${escapeHtml(cert.title)}</h3>
                                    <span class="certificate-topic">
                                        <i class="fas fa-book"></i>
                                        ${escapeHtml(cert.topic)}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="certificate-body">
                                <div class="score-display ${getScoreClass(score)}">
                                    <span class="score-value">${score}%</span>
                                    <span class="score-label">Final Score</span>
                                </div>
                                
                                <div class="certificate-meta">
                                    <div class="meta-item">
                                        <i class="fas fa-calendar"></i>
                                        <span>Earned on ${formatDate(cert.date)}</span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-question-circle"></i>
                                        <span>${cert.totalQuestions} questions</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="certificate-actions">
                                <button class="btn-view" onclick="viewCertificate('${cert.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn-download" onclick="downloadCertificate('${cert.id}')">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                            
                            <div class="certificate-ribbon ${getScoreClass(score)}">
                                <i class="fas fa-star"></i>
                                Excellence Award
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>

            <div class="performance-summary">
                <div class="summary-card">
                    <h3><i class="fas fa-chart-pie"></i> Performance Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${passedCertificates.length}</div>
                            <div class="summary-label">Certificates Earned</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${certificates.length}</div>
                            <div class="summary-label">Total Attempts</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">
                                ${passedCertificates.length > 0 ? Math.round((passedCertificates.length / certificates.length) * 100) : 0}%
                            </div>
                            <div class="summary-label">Success Rate</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">
                                ${passedCertificates.length > 0 ? Math.max(...passedCertificates.map(c => c.percentage || c.score)) : 0}%
                            </div>
                            <div class="summary-label">Highest Score</div>
                        </div>
                    </div>
                </div>
            </div>`;

    } catch (error) {
        console.error('❌ Error loading certificates section:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Unable to Load Certificates</h3>
                <p>There was an error loading your certificates. Please try again later.</p>
                <button class="btn-retry" onclick="updateCertificatesSection()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>`;
    }
}

// Update profile section - ENHANCED WITH DATABASE INTEGRATION
function updateProfileSection() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    const user = dashboardState.user;
    const progress = dashboardState.progress;
    
    let displayName = user.name;
    if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    
    const displayEmail = user.email || '';
    
    // Calculate level progress
    const currentLevel = progress.level;
    const quizzesForNextLevel = currentLevel * 3;
    const currentLevelQuizzes = progress.totalQuizzes % 3;
    const levelProgress = (currentLevelQuizzes / 3) * 100;
    
    container.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-avatar-section">
                    <div class="profile-avatar">
                        <i class="fas fa-user-circle"></i>
                        <button class="btn-change-avatar" onclick="changeAvatar()" title="Change Avatar">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="profile-info">
                        <h2>${escapeHtml(displayName || 'Student')}</h2>
                        <p class="profile-email">
                            <i class="fas fa-envelope"></i>
                            ${escapeHtml(displayEmail || 'Please add your email address')}
                        </p>
                        <span class="member-since">
                            <i class="fas fa-calendar-alt"></i>
                            Member since ${formatMemberSince(user.joinDate)}
                        </span>
                        <div class="level-badge">
                            <i class="fas fa-trophy"></i>
                            Level ${currentLevel} Learner
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-outline" onclick="editProfile()">
                        <i class="fas fa-edit"></i> Edit Profile
                    </button>
                    <button class="btn-primary" onclick="savePreferences()">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
            
            <div class="profile-stats-section">
                <h3>Your Learning Journey</h3>
                <div class="stats-grid">
                    <div class="stat-card hover-lift">
                        <div class="stat-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${progress.totalQuizzes}</h3>
                            <p>Quizzes Taken</p>
                            <div class="stat-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${Math.min((progress.totalQuizzes / 10) * 100, 100)}%"></div>
                                </div>
                                <span class="progress-text">${Math.min(progress.totalQuizzes, 10)}/10 Goal</span>
                            </div>
                        </div>
                    </div>
                    <div class="stat-card hover-lift">
                        <div class="stat-icon ${getScoreClass(progress.averageScore)}">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${progress.averageScore}%</h3>
                            <p>Average Score</p>
                            <div class="stat-badge ${getScoreClass(progress.averageScore)}">
                                ${progress.averageScore >= 80 ? '🌟 Excellent' : progress.averageScore >= 70 ? '👍 Good' : progress.averageScore >= 60 ? '📈 Average' : '💪 Keep Going'}
                            </div>
                        </div>
                    </div>
                    <div class="stat-card hover-lift">
                        <div class="stat-icon">
                            <i class="fas fa-award"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${progress.certificates}</h3>
                            <p>Certificates Earned</p>
                            <div class="stat-badge certified">
                                <i class="fas fa-medal"></i> ${progress.certificates > 0 ? 'Certified' : 'Start Learning'}
                            </div>
                        </div>
                    </div>
                    <div class="stat-card hover-lift">
                        <div class="stat-icon">
                            <i class="fas fa-fire"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${progress.streak}</h3>
                            <p>Day Streak</p>
                            <div class="stat-badge streak">
                                ${progress.streak > 0 ? '🔥 On Fire!' : '🎯 Start Today'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-preferences-section">
                <div class="preferences-card">
                    <h3>Learning Preferences</h3>
                    <div class="preferences-form">
                        <div class="form-group">
                            <label for="difficultyPreference">
                                <i class="fas fa-sliders-h"></i> Preferred Difficulty Level
                            </label>
                            <select id="difficultyPreference" class="form-select">
                                <option value="mixed" ${user.preferences.difficulty === 'mixed' ? 'selected' : ''}>🎲 Mixed - Variety of challenges</option>
                                <option value="easy" ${user.preferences.difficulty === 'easy' ? 'selected' : ''}>😊 Easy - Beginner friendly</option>
                                <option value="medium" ${user.preferences.difficulty === 'medium' ? 'selected' : ''}>🎯 Medium - Balanced learning</option>
                                <option value="hard" ${user.preferences.difficulty === 'hard' ? 'selected' : ''}>🔥 Hard - Expert level</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="notificationsPreference" ${user.preferences.notifications ? 'checked' : ''}>
                                <i class="fas fa-bell"></i>
                                Receive email notifications about new quizzes and achievements
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="progressTrackingPreference" ${user.preferences.progressTracking ? 'checked' : ''}>
                                <i class="fas fa-chart-bar"></i>
                                Track my learning progress and generate insights
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="darkModePreference" ${user.preferences.darkMode ? 'checked' : ''}>
                                <i class="fas fa-moon"></i>
                                Enable dark mode (coming soon)
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="account-actions-card">
                    <h3>Account Management</h3>
                    <div class="action-buttons">
                        <button class="btn-outline full-width" onclick="changePassword()">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                        <button class="btn-outline full-width" onclick="exportData()">
                            <i class="fas fa-download"></i> Export My Data
                        </button>
                        <button class="btn-outline full-width" onclick="viewActivityLog()">
                            <i class="fas fa-history"></i> View Activity Log
                        </button>
                        <button class="btn-outline full-width text-warning" onclick="showDeleteAccount()">
                            <i class="fas fa-trash-alt"></i> Delete Account
                        </button>
                    </div>
                    
                    <div class="account-info">
                        <h4>Account Information</h4>
                        <div class="info-item">
                            <span class="info-label">Account Status:</span>
                            <span class="info-value active">
                                <i class="fas fa-check-circle"></i> Active
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Learning Time:</span>
                            <span class="info-value">${progress.totalTime} minutes</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Account Created:</span>
                            <span class="info-value">${formatDate(user.joinDate)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

// Utility Functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    try {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        });
    } catch (e) {
        return 'Invalid date';
    }
}

function formatTime(seconds) {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Recently';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return formatDate(dateString);
    } catch (e) {
        return 'Recently';
    }
}

function formatMemberSince(dateString) {
    if (!dateString) return 'Recently';
    try {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long' 
        });
    } catch (e) {
        return 'Recently';
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.getAttribute('href') || item.getAttribute('href') === '#') {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const onclick = this.getAttribute('onclick');
                if (onclick) {
                    const sectionId = onclick.match(/showSection\('([^']+)'\)/)[1];
                    showSection(sectionId);
                }
            });
        }
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }

    // Refresh data button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshDashboardData();
        });
    }
}

function setupHistoryFilters() {
    const searchInput = document.getElementById('historySearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterHistory);
    }
    
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterHistory();
        });
    });
}

function filterHistory() {
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.btn-filter.active')?.dataset.filter || 'all';
    
    document.querySelectorAll('.history-item').forEach(item => {
        const quizTitle = item.querySelector('h4').textContent.toLowerCase();
        const quizTopic = item.querySelector('.quiz-topic').textContent.toLowerCase();
        const quizScore = parseInt(item.dataset.score);
        
        const matchesSearch = quizTitle.includes(searchTerm) || quizTopic.includes(searchTerm);
        let matchesFilter = true;
        
        switch (activeFilter) {
            case 'excellent': matchesFilter = quizScore >= 80; break;
            case 'good': matchesFilter = quizScore >= 70 && quizScore < 80; break;
            case 'average': matchesFilter = quizScore >= 60 && quizScore < 70; break;
            case 'poor': matchesFilter = quizScore < 60; break;
        }
        
        item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update section-specific data
    if (sectionId === 'certificates') {
        updateCertificatesSection();
    } else if (sectionId === 'progress') {
        updateProgressSection();
    } else if (sectionId === 'profile') {
        updateProfileSection();
    }
    
    // Add active class to clicked nav item
    const clickedNav = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (clickedNav) {
        clickedNav.classList.add('active');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'login.html';
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Show certificate information modal
function showCertificateInfo() {
    const modal = document.createElement('div');
    modal.className = 'certificate-info-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content-certificate">
            <button class="modal-close" onclick="this.closest('.certificate-info-modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="modal-header-certificate">
                <div class="modal-icon">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h2>About Certificates</h2>
                <p>Earn recognition for your learning achievements</p>
            </div>
            
            <div class="modal-body-certificate">
                <div class="info-section">
                    <h3><i class="fas fa-star"></i> What are Certificates?</h3>
                    <p>Certificates are official recognition of your quiz performance. They showcase your knowledge and dedication to learning.</p>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-trophy"></i> How to Earn Certificates</h3>
                    <div class="requirements-grid">
                        <div class="requirement-item">
                            <div class="req-icon">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="req-content">
                                <h4>Score 70% or Higher</h4>
                                <p>Achieve a passing grade on your quiz</p>
                            </div>
                        </div>
                        
                        <div class="requirement-item">
                            <div class="req-icon">
                                <i class="fas fa-check-double"></i>
                            </div>
                            <div class="req-content">
                                <h4>Complete All Questions</h4>
                                <p>Answer every question in the quiz</p>
                            </div>
                        </div>
                        
                        <div class="requirement-item">
                            <div class="req-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="req-content">
                                <h4>Finish on Time</h4>
                                <p>Complete within the time limit</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-download"></i> What You Can Do</h3>
                    <ul class="benefits-list">
                        <li><i class="fas fa-check"></i> Download certificates as PDF</li>
                        <li><i class="fas fa-check"></i> Share on social media</li>
                        <li><i class="fas fa-check"></i> Add to your portfolio</li>
                        <li><i class="fas fa-check"></i> Track your progress</li>
                    </ul>
                </div>
                
                <div class="cta-section">
                    <button class="btn-primary-modal" onclick="window.location.href='quiz-generator.html'">
                        <i class="fas fa-rocket"></i>
                        Start Your First Quiz
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => {
        modal.querySelector('.modal-content-certificate').style.transform = 'scale(1)';
        modal.querySelector('.modal-content-certificate').style.opacity = '1';
    }, 10);
}

// Additional Functions
function exportHistory() {
    const quizzes = dashboardState.quizzes;
    if (quizzes.length === 0) {
        showNotification('No quiz history to export', 'warning');
        return;
    }
    
    const csvContent = [
        ['Title', 'Topic', 'Score', 'Correct Answers', 'Total Questions', 'Time Spent', 'Date', 'Difficulty'],
        ...quizzes.map(quiz => [
            `"${quiz.title}"`,
            `"${quiz.topic}"`,
            quiz.score + '%',
            quiz.correctAnswers,
            quiz.totalQuestions,
            formatTime(quiz.timeSpent),
            formatDate(quiz.date),
            quiz.difficulty
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Quiz history exported successfully!', 'success');
}

function retakeQuiz(quizId) {
    showNotification('Redirecting to quiz generator...', 'info');
    setTimeout(() => {
        window.location.href = 'quiz-generator.html';
    }, 1000);
}

function viewQuizDetails(quizId) {
    showNotification(`Viewing details for quiz ${quizId}`, 'info');
    // You can implement a modal or redirect to quiz details page
}

function viewCertificate(certificateId) {
    if (!certificateId) {
        showNotification('Certificate not found', 'warning');
        return;
    }
    // Trigger bloopers party
    triggerBloopersParty();
    
    // Open certificate after a short delay
    setTimeout(() => {
        const url = `/api/certificate/${encodeURIComponent(certificateId)}`;
        window.open(url, '_blank');
    }, 1500);
}

function downloadCertificate(certificateId) {
    if (!certificateId) {
        showNotification('Certificate not found', 'warning');
        return;
    }
    // Trigger bloopers party
    triggerBloopersParty();
    
    // Download certificate after a short delay
    setTimeout(() => {
        const url = `/api/certificate/${encodeURIComponent(certificateId)}/download`;
        window.open(url, '_blank');
    }, 1500);
}

function shareCertificate(certificateId) {
    showNotification('Sharing certificate...', 'info');
    // Implement social sharing functionality
}

function changeAvatar() {
    showNotification('Avatar change feature coming soon!', 'info');
}

function editProfile() {
    const user = dashboardState.user;
    
    let displayName = user.name;
    if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }
    
    // Create modal for editing profile
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content profile-edit-modal">
            <div class="modal-header">
                <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
                <button class="btn-close" onclick="closeEditProfileModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="editProfileForm" onsubmit="saveProfileChanges(event)">
                    <div class="form-group">
                        <label for="editName">
                            <i class="fas fa-user"></i> Full Name
                        </label>
                        <input 
                            type="text" 
                            id="editName" 
                            class="form-input" 
                            value="${escapeHtml(displayName || '')}"
                            placeholder="Enter your full name"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editEmail">
                            <i class="fas fa-envelope"></i> Email Address
                        </label>
                        <input 
                            type="email" 
                            id="editEmail" 
                            class="form-input" 
                            value="${escapeHtml(user.email || '')}"
                            placeholder="Enter your email address"
                            required
                        >
                    </div>
                    
                    <div class="form-info">
                        <i class="fas fa-info-circle"></i>
                        <span>Your profile information will be updated across the dashboard.</span>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-outline" onclick="closeEditProfileModal()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate modal in
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Focus on name input
    setTimeout(() => document.getElementById('editName')?.focus(), 100);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEditProfileModal();
        }
    });
    
    // Close modal with ESC key
    const handleEscape = function(e) {
        if (e.key === 'Escape') {
            closeEditProfileModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeEditProfileModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function saveProfileChanges(event) {
    event.preventDefault();
    
    const name = document.getElementById('editName')?.value.trim();
    const email = document.getElementById('editEmail')?.value.trim();
    
    if (!name || !email) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        // Update local state immediately for better UX
        dashboardState.user.name = name;
        dashboardState.user.email = email;
        
        // Try to update on server
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Profile updated successfully!', 'success');
                updateAllSections();
                closeEditProfileModal();
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } else {
            throw new Error('Server error');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Profile updated locally. Changes will sync when server is available.', 'info');
        updateAllSections();
        closeEditProfileModal();
    } finally {
        showLoading(false);
    }
}

function savePreferences() {
    const difficulty = document.getElementById('difficultyPreference')?.value || 'mixed';
    const notifications = document.getElementById('notificationsPreference')?.checked || false;
    const progressTracking = document.getElementById('progressTrackingPreference')?.checked || false;
    
    dashboardState.user.preferences = {
        difficulty,
        notifications,
        progressTracking
    };
    
    showNotification('Preferences saved successfully!', 'success');
}

function changePassword() {
    showNotification('Redirecting to password change...', 'info');
    window.location.href = 'change-password.html';
}

function exportData() {
    showNotification('Preparing data export...', 'info');
    // Implement data export functionality
}

function showDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        showNotification('Account deletion feature coming soon!', 'warning');
    }
}

// Refresh dashboard data
async function refreshDashboardData() {
    console.log('🔄 Refreshing dashboard data...');
    
    // Add loading class to refresh button
    const refreshBtn = document.querySelector('.btn-refresh');
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
    }
    
    showLoading(true);
    
    try {
        // Reload all data from server
        await loadUserData();
        await loadQuizHistory();
        await loadCertificates();
        
        // Update all sections with new data
        updateAllSections();
        
        console.log('✅ Dashboard refreshed successfully');
        showNotification('Dashboard updated with latest data!', 'success');
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        showNotification('Failed to refresh data. Please try again.', 'error');
    } finally {
        showLoading(false);
        
        // Remove loading class from refresh button
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
}

// Demo data fallback
function loadDemoData() {
    console.log('📝 Loading demo data...');
    
    // Demo user data
    dashboardState.user = {
        name: 'SHAIK MUSKAN',
        email: 'shaikmuskan471@gmail.com',
        joinDate: '2024-01-15',
        preferences: {
            difficulty: 'mixed',
            notifications: true,
            progressTracking: true
        }
    };
    
    // Demo quizzes
    dashboardState.quizzes = [
        {
            id: '1',
            title: 'JavaScript Basics',
            topic: 'Programming',
            score: 85,
            totalQuestions: 10,
            correctAnswers: 8,
            timeSpent: 120,
            difficulty: 'medium',
            date: new Date().toISOString(),
            certificateId: 'cert-1'
        },
        {
            id: '2',
            title: 'Web Development',
            topic: 'Web',
            score: 72,
            totalQuestions: 8,
            correctAnswers: 6,
            timeSpent: 180,
            difficulty: 'hard',
            date: new Date(Date.now() - 86400000).toISOString(),
            certificateId: null
        },
        {
            id: '3',
            title: 'HTML & CSS',
            topic: 'Web',
            score: 90,
            totalQuestions: 12,
            correctAnswers: 11,
            timeSpent: 150,
            difficulty: 'easy',
            date: new Date(Date.now() - 172800000).toISOString(),
            certificateId: 'cert-3'
        }
    ];
    
    // Demo certificates (only for scores >= 70%)
    dashboardState.certificates = [
        {
            id: 'cert-1',
            title: 'JavaScript Basics',
            topic: 'Programming',
            score: 85,
            totalQuestions: 10,
            percentage: 85,
            date: new Date().toISOString()
        },
        {
            id: 'cert-3',
            title: 'HTML & CSS',
            topic: 'Web',
            score: 90,
            totalQuestions: 12,
            percentage: 90,
            date: new Date(Date.now() - 172800000).toISOString()
        }
    ];
    
    updateProgressStats();
    updateAllSections();
}

// Update all sections
function updateAllSections() {
    updateDashboardStats();
    updateRecentQuizzes();
    updatePerformanceChart();
    updateQuizHistory();
    updateProgressSection();
    updateCertificatesSection();
    updateProfileSection();
}

// Initialize when DOM is loaded
// --- Celebration / Party Helpers ---
function triggerBloopersParty() {
    // Add dance animation to all certificate cards
    document.querySelectorAll('.certificate-card').forEach(card => {
        card.classList.add('party-active');
        setTimeout(() => card.classList.remove('party-active'), 1500);
    });
    
    // Create confetti
    createConfetti();
    
    // Create celebration emojis
    createCelebrationEmojis();
    
    // Create balloons
    createBalloons();
    
    // Create fireworks
    createFireworks();
    
    // Show party overlay
    showPartyOverlay();
    
    // Show party message
    showPartyMessage();
    
    // Play celebration sound (optional)
    playCelebrationSound();
}

function createConfetti() {
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-20px';
        confetti.style.background = getRandomColor();
        document.body.appendChild(confetti);
        
        // Animate confetti
        const animation = confetti.animate([
            { 
                transform: `translateY(0) rotate(0deg)`,
                opacity: 1
            },
            { 
                transform: `translateY(${window.innerHeight}px) rotate(${360 + Math.random() * 360}deg)`,
                opacity: 0
            }
        ], {
            duration: 2000 + Math.random() * 1000,
            easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
        });
        
        animation.onfinish = () => confetti.remove();
    }
}

function createCelebrationEmojis() {
    const emojis = ['🎉', '🎊', '🥳', '🎈', '🏆', '⭐', '💫', '✨', '👏', '🎯'];
    
    for (let i = 0; i < 20; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'celebration-emoji';
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.left = Math.random() * 100 + 'vw';
        emoji.style.top = window.innerHeight + 'px';
        emoji.style.fontSize = (20 + Math.random() * 30) + 'px';
        document.body.appendChild(emoji);
        
        setTimeout(() => emoji.remove(), 2000);
    }
}

function createBalloons() {
    for (let i = 0; i < 15; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.style.left = Math.random() * 100 + 'vw';
        balloon.style.background = getRandomColor();
        document.body.appendChild(balloon);
        
        setTimeout(() => balloon.remove(), 4000);
    }
}

function createFireworks() {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight / 2;
            
            for (let j = 0; j < 30; j++) {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = x + 'px';
                firework.style.top = y + 'px';
                firework.style.background = getRandomColor();
                firework.style.setProperty('--x', '0px');
                firework.style.setProperty('--y', '0px');
                firework.style.setProperty('--x-end', (Math.random() - 0.5) * 200 + 'px');
                firework.style.setProperty('--y-end', (Math.random() - 0.5) * 200 + 'px');
                document.body.appendChild(firework);
                
                setTimeout(() => firework.remove(), 1000);
            }
        }, i * 200);
    }
}

function showPartyOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'party-overlay';
    document.body.appendChild(overlay);
    
    // Show overlay
    setTimeout(() => overlay.style.opacity = '1', 100);
    
    // Remove overlay after animation
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 1000);
    }, 2000);
}

function showPartyMessage() {
    const messages = [
        "Congratulations! 🎉",
        "You're Amazing! ⭐",
        "Certificate Unlocked! 🏆",
        "Achievement Get! 🎯",
        "Well Done! 👏"
    ];
    
    const message = document.createElement('div');
    message.className = 'party-message';
    message.textContent = messages[Math.floor(Math.random() * messages.length)];
    document.body.appendChild(message);
    
    setTimeout(() => message.remove(), 2000);
}

function playCelebrationSound() {
    // Create a simple celebration sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio not supported');
    }
}

function getRandomColor() {
    const colors = [
        '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9ff3', '#54a0ff',
        '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Add click handler to certificate cards for party effect
document.addEventListener('DOMContentLoaded', function() {
    // This will be called after certificates are loaded
    setTimeout(() => {
        document.querySelectorAll('.certificate-card').forEach(card => {
            card.addEventListener('click', function() {
                triggerBloopersParty();
            });
        });
    }, 1000);
});

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Auto-refresh when page becomes visible (user returns to tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('👀 Page visible - refreshing dashboard data...');
        refreshDashboardData();
    }
});

// Refresh data when user navigates back to dashboard
window.addEventListener('focus', function() {
    console.log('🔄 Window focused - checking for updates...');
    refreshDashboardData();
});

// Listen for storage events (when quiz is completed in another tab)
window.addEventListener('storage', function(e) {
    if (e.key === 'quizCompleted' || e.key === 'newQuizData') {
        console.log('📢 Quiz completion detected - refreshing...');
        refreshDashboardData();
        // Clear the flag
        localStorage.removeItem('quizCompleted');
        localStorage.removeItem('newQuizData');
    }
});

// Add periodic refresh every 30 seconds when page is active
let refreshInterval;
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Start periodic refresh
        refreshInterval = setInterval(() => {
            console.log('⏰ Periodic refresh...');
            refreshDashboardData();
        }, 30000); // 30 seconds
    } else {
        // Stop periodic refresh when page is hidden
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    }
});

// Debug function to check dashboard state
window.debugDashboard = function() {
    console.log('🔍 Dashboard Debug Info:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Total Quizzes:', dashboardState.quizzes.length);
    console.log('🏆 Total Certificates:', dashboardState.certificates.length);
    console.log('👤 User:', dashboardState.user);
    console.log('📈 Progress:', dashboardState.progress);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Quiz List:');
    dashboardState.quizzes.forEach((quiz, index) => {
        console.log(`  ${index + 1}. ${quiz.title} - ${quiz.score}% (${quiz.correctAnswers}/${quiz.totalQuestions})`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏅 Certificate List:');
    dashboardState.certificates.forEach((cert, index) => {
        console.log(`  ${index + 1}. ${cert.title} - ${cert.percentage}%`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return dashboardState;
};

console.log('🚀 Dashboard JavaScript loaded successfully!');
console.log('📦 Dashboard Version: 2.0.0 - Updated Quiz History & Certificates');
console.log('💡 Tip: Run debugDashboard() in console to see dashboard state');
console.log('🔄 If you see old design, press Ctrl+Shift+R to hard refresh');