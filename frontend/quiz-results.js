// Quiz Results Page JavaScript

// Get results from localStorage
const quizResults = JSON.parse(localStorage.getItem('quizResults') || '{}');
const quizData = JSON.parse(localStorage.getItem('currentQuizData') || '{}');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!quizResults.score) {
        // No results found, redirect to quiz generator
        window.location.href = 'quiz-generator.html';
        return;
    }
    
    displayResults();
    renderCharts();
});

// Display results
function displayResults() {
    const { score, correctAnswers, totalQuestions, timeTaken, averageDifficulty } = quizResults;
    
    // Update score circle
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreValue = document.getElementById('scoreValue');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    
    scoreValue.textContent = `${score}%`;
    
    // Set color based on score
    if (score >= 80) {
        scoreCircle.className = 'score-circle excellent';
        resultTitle.textContent = '🎉 Excellent!';
        resultMessage.textContent = 'Outstanding performance!';
    } else if (score >= 70) {
        scoreCircle.className = 'score-circle good';
        resultTitle.textContent = '👍 Good Job!';
        resultMessage.textContent = 'Well done! Keep it up!';
    } else if (score >= 60) {
        scoreCircle.className = 'score-circle average';
        resultTitle.textContent = '📈 Keep Going!';
        resultMessage.textContent = 'You\'re making progress!';
    } else {
        scoreCircle.className = 'score-circle poor';
        resultTitle.textContent = '💪 Keep Practicing!';
        resultMessage.textContent = 'Practice makes perfect!';
    }
    
    // Update quick stats
    document.getElementById('correctCount').textContent = `${correctAnswers}/${totalQuestions}`;
    document.getElementById('timeSpent').textContent = formatTime(timeTaken);
    document.getElementById('difficulty').textContent = averageDifficulty.charAt(0).toUpperCase() + averageDifficulty.slice(1);
    
    // Show certificate section if score >= 70
    if (score >= 70) {
        document.getElementById('certificateSection').style.display = 'block';
        document.getElementById('certificateBtn').style.display = 'flex';
    }
    
    // Generate suggestions
    generateSuggestions();
}

// Format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

// Generate suggestions
function generateSuggestions() {
    const { score, correctAnswers, totalQuestions, timeTaken } = quizResults;
    const suggestions = [];
    
    if (score < 70) {
        suggestions.push('Review the quiz explanations to understand your mistakes');
        suggestions.push('Practice more quizzes on this topic to improve');
        suggestions.push('Focus on understanding the concepts rather than memorizing');
    } else if (score < 80) {
        suggestions.push('Great job! Review the questions you got wrong');
        suggestions.push('Try harder difficulty levels to challenge yourself');
    } else {
        suggestions.push('Excellent work! You\'ve mastered this topic');
        suggestions.push('Challenge yourself with harder topics');
        suggestions.push('Help others by sharing your knowledge');
    }
    
    if (timeTaken / totalQuestions > 60) {
        suggestions.push('Try to improve your response time for better efficiency');
    }
    
    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = suggestions.map(s => 
        `<li><i class="fas fa-arrow-right"></i> ${s}</li>`
    ).join('');
}

// Render charts
function renderCharts() {
    const questions = quizData.questions || [];
    
    // Calculate question type stats
    const questionTypes = { MCQ: 0, TrueFalse: 0, FillBlank: 0 };
    const questionTypesCorrect = { MCQ: 0, TrueFalse: 0, FillBlank: 0 };
    
    questions.forEach((q, index) => {
        const type = q.type || 'MCQ';
        questionTypes[type] = (questionTypes[type] || 0) + 1;
        
        if (q.userAnswer === q.correctAnswer) {
            questionTypesCorrect[type] = (questionTypesCorrect[type] || 0) + 1;
        }
    });
    
    // Calculate difficulty stats
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    questions.forEach(q => {
        const difficulty = q.difficulty || 'medium';
        difficultyBreakdown[difficulty] = (difficultyBreakdown[difficulty] || 0) + 1;
    });
    
    // Render question type chart
    const qtCanvas = document.getElementById('questionTypeChart');
    if (qtCanvas) {
        new Chart(qtCanvas, {
            type: 'bar',
            data: {
                labels: Object.keys(questionTypes).filter(k => questionTypes[k] > 0),
                datasets: [{
                    label: 'Total Questions',
                    data: Object.keys(questionTypes).filter(k => questionTypes[k] > 0).map(k => questionTypes[k]),
                    backgroundColor: '#667eea',
                }, {
                    label: 'Correct Answers',
                    data: Object.keys(questionTypes).filter(k => questionTypes[k] > 0).map(k => questionTypesCorrect[k] || 0),
                    backgroundColor: '#10b981',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Render difficulty chart
    const diffCanvas = document.getElementById('difficultyChart');
    if (diffCanvas) {
        new Chart(diffCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Easy', 'Medium', 'Hard'],
                datasets: [{
                    data: [
                        difficultyBreakdown.easy || 0,
                        difficultyBreakdown.medium || 0,
                        difficultyBreakdown.hard || 0
                    ],
                    backgroundColor: ['#4ade80', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Download certificate
function downloadCertificate() {
    const certificateId = quizResults.certificateId || quizResults.quizId;
    if (certificateId) {
        window.open(`/api/certificate/${certificateId}/download`, '_blank');
    } else {
        alert('Certificate is being generated. Please try again in a moment.');
    }
}
