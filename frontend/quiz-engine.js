// Quiz Engine State
const quizState = {
    currentQuestion: 0,
    totalQuestions: 0,
    questions: [],
    userAnswers: [],
    startTime: null,
    timeSpent: 0,
    timerInterval: null,
    questionTimerInterval: null,
    flaggedQuestions: new Set(),
    currentDifficulty: 'medium',
    performanceHistory: [],
    quizCompleted: false,
    quizConfig: null,
    showExplanations: false,
    reviewMode: false,
    questionStartTime: null,
    quizId: null,
    certificateData: null
};

// DOM Elements
const questionContainer = document.getElementById('questionContainer');
const timerElement = document.getElementById('timer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const currentDifficultyElement = document.getElementById('currentDifficulty');
const flagBtn = document.getElementById('flagBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const flagModal = document.getElementById('flagModal');
const completionModal = document.getElementById('completionModal');
const difficultyIndicator = document.getElementById('difficultyIndicator');
const quizProgress = document.getElementById('progress');

// Initialize the quiz
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Adaptive Quiz Engine - Initialized');
    
    // Start the quiz
    initializeQuiz();
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    if (flagBtn) flagBtn.addEventListener('click', toggleFlagQuestion);
    if (prevBtn) prevBtn.addEventListener('click', previousQuestion);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (submitBtn) submitBtn.addEventListener('click', submitQuiz);
    
    // Flag modal event listeners
    const closeFlagModal = document.getElementById('closeFlagModal');
    const cancelFlag = document.getElementById('cancelFlag');
    const confirmFlag = document.getElementById('confirmFlag');
    const flagOptions = document.querySelectorAll('.flag-option input');
    
    if (closeFlagModal) closeFlagModal.addEventListener('click', hideFlagModal);
    if (cancelFlag) cancelFlag.addEventListener('click', hideFlagModal);
    if (confirmFlag) confirmFlag.addEventListener('click', confirmFlagQuestion);
    
    // Flag option selection
    flagOptions.forEach(option => {
        option.addEventListener('change', function() {
            const confirmFlagBtn = document.getElementById('confirmFlag');
            const flagComment = document.getElementById('flagComment');
            const otherOption = document.querySelector('input[value="other"]');
            
            if (confirmFlagBtn) {
                confirmFlagBtn.disabled = false;
            }
            
            if (flagComment && otherOption) {
                flagComment.style.display = otherOption.checked ? 'block' : 'none';
            }
        });
    });
    
    // Completion modal event listeners - FIXED
    const reviewQuizBtn = document.getElementById('reviewQuiz');
    const generateCertificateBtn = document.getElementById('generateCertificate');
    const newQuizBtn = document.getElementById('newQuiz');
    const backToDashboardBtn = document.getElementById('backToDashboard');
    
    if (reviewQuizBtn) reviewQuizBtn.addEventListener('click', startReviewMode);
    if (generateCertificateBtn) generateCertificateBtn.addEventListener('click', generateCertificate);
    if (newQuizBtn) newQuizBtn.addEventListener('click', () => {
        window.location.href = 'quiz-generator.html';
    });
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
        // Set flag to trigger dashboard refresh
        localStorage.setItem('quizCompleted', 'true');
        window.location.href = 'dashboard.html';
    });
    
    // Certificate modal event listeners - ADDED
    const downloadCertificateBtn = document.getElementById('downloadCertificate');
    const closeCertificateModal = document.getElementById('closeCertificateModal');
    const backFromCertificateBtn = document.getElementById('backFromCertificate');
    
    if (downloadCertificateBtn) downloadCertificateBtn.addEventListener('click', handleCertificateDownload);
    if (closeCertificateModal) closeCertificateModal.addEventListener('click', hideCertificateModal);
    if (backFromCertificateBtn) backFromCertificateBtn.addEventListener('click', hideCertificateModal);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// Handle keyboard navigation
function handleKeyboardNavigation(e) {
    if (quizState.reviewMode || document.querySelector('.modal.show')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            previousQuestion();
            break;
        case 'ArrowRight':
        case ' ':
            e.preventDefault();
            if (quizState.currentQuestion < quizState.totalQuestions - 1) {
                nextQuestion();
            }
            break;
        case 'Enter':
            e.preventDefault();
            if (quizState.currentQuestion === quizState.totalQuestions - 1) {
                submitQuiz();
            } else {
                nextQuestion();
            }
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFlagQuestion();
            break;
        case '1':
        case '2':
        case '3':
        case '4':
            if (!quizState.reviewMode) {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                selectMCQOption(index);
            }
            break;
    }
}

// Initialize quiz
async function initializeQuiz() {
    showLoading(true);
    
    try {
        // Try localStorage first (from quiz generator), then sessionStorage as fallback
        let quizData = localStorage.getItem('currentQuiz');
        
        if (!quizData) {
            // Fallback to sessionStorage
            quizData = sessionStorage.getItem('generatedQuiz');
        }
        
        if (!quizData) {
            throw new Error('No quiz data found. Please generate a quiz first.');
        }
        
        const parsedData = JSON.parse(quizData);
        console.log('Loaded quiz data:', parsedData);
        
        // Update quiz state with loaded data
        quizState.questions = parsedData.questions || [];
        quizState.quizConfig = parsedData.config || {};
        quizState.totalQuestions = quizState.questions.length;
        
        if (quizState.totalQuestions === 0) {
            throw new Error('No questions available in the quiz.');
        }
        
        // Initialize user answers array
        quizState.userAnswers = new Array(quizState.totalQuestions).fill(null);
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const quizTitle = urlParams.get('title') || parsedData.config?.title || parsedData.title || 'Adaptive Quiz';
        const topic = parsedData.source || parsedData.topic || 'General Knowledge';
        
        // Update UI
        document.getElementById('quizTitle').textContent = quizTitle;
        document.getElementById('quizTopic').textContent = `Topic: ${topic}`;
        
        console.log(`Starting quiz with ${quizState.totalQuestions} questions`);
        
        // Start timer
        startTimer();
        
        // Load first question
        loadQuestion(0);
        
        showNotification(`Quiz started! ${quizState.totalQuestions} questions loaded. Good luck! 🚀`, 'success');
        
    } catch (error) {
        console.error('Failed to initialize quiz:', error);
        showNotification(error.message, 'error');
        
        // Show helpful error message with redirect options
        setTimeout(() => {
            const proceed = confirm('Quiz data not found. Would you like to go back to the quiz generator?');
            if (proceed) {
                window.location.href = 'quiz-generator.html';
            }
        }, 1000);
    } finally {
        showLoading(false);
    }
}

// Load a specific question
function loadQuestion(questionIndex) {
    if (questionIndex < 0 || questionIndex >= quizState.questions.length) {
        console.error('Invalid question index:', questionIndex);
        return;
    }
    
    // Clear previous question timer
    if (quizState.questionTimerInterval) {
        clearInterval(quizState.questionTimerInterval);
        quizState.questionTimerInterval = null;
    }
    
    const question = quizState.questions[questionIndex];
    quizState.currentQuestion = questionIndex;
    quizState.questionStartTime = Date.now();
    
    console.log(`Loading question ${questionIndex + 1}:`, question);
    
    // Update progress
    updateProgress();
    
    // Update difficulty display
    updateDifficultyDisplay(question.difficulty || 'medium');
    
    // Update flag button
    updateFlagButton();
    
    // Render question based on type
    renderQuestion(question);
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Start question timer (only if not in review mode)
    if (!quizState.reviewMode) {
        startQuestionTimer(question);
    }
}

// Render question based on type
function renderQuestion(question) {
    let questionHTML = '';
    
    // Ensure question has required properties
    if (!question.question) {
        question.question = 'Question content not available.';
    }
    
    if (!question.type) {
        question.type = 'MCQ';
    }
    
    // Add question number and type badge
    const questionNumber = quizState.currentQuestion + 1;
    
    switch (question.type) {
        case 'MCQ':
            questionHTML = renderMCQ(question, questionNumber);
            break;
        case 'TrueFalse':
            questionHTML = renderTrueFalse(question, questionNumber);
            break;
        case 'FillBlank':
            questionHTML = renderFillBlank(question, questionNumber);
            break;
        case 'ShortAnswer':
            questionHTML = renderShortAnswer(question, questionNumber);
            break;
        default:
            questionHTML = renderMCQ(question, questionNumber); // Fallback to MCQ
    }
    
    questionContainer.innerHTML = questionHTML;
    
    // Restore user answer if exists
    const userAnswer = quizState.userAnswers[quizState.currentQuestion];
    if (userAnswer) {
        restoreUserAnswer(question.type, userAnswer);
    }
    
    // Show explanation if in review mode
    if (quizState.reviewMode) {
        showExplanation(question);
    }
    
    // Add animations
    questionContainer.classList.add('fade-in');
    setTimeout(() => questionContainer.classList.remove('fade-in'), 500);
}

// Render Multiple Choice Question
function renderMCQ(question, questionNumber) {
    // Ensure options array exists and has at least 2 options
    const options = question.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    const timeLimit = question.timeLimit || 45;
    
    const optionsHTML = options.map((option, index) => `
        <div class="mcq-option" onclick="selectMCQOption(${index})" data-option="${index}">
            <div class="option-indicator">${String.fromCharCode(65 + index)}</div>
            <div class="option-text">${option}</div>
        </div>
    `).join('');
    
    return `
        <div class="question-card">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">Q${questionNumber}</span>
                    <span class="question-type-badge">MCQ</span>
                    ${!quizState.reviewMode ? `
                    <div class="question-timer">
                        <i class="fas fa-clock"></i>
                        <span id="questionTimer">${timeLimit}s</span>
                    </div>
                    ` : ''}
                </div>
                <div class="question-flag-indicator">
                    ${quizState.flaggedQuestions.has(quizState.currentQuestion) ? 
                        '<i class="fas fa-flag flagged"></i>' : 
                        '<i class="far fa-flag"></i>'
                    }
                </div>
            </div>
            
            <div class="question-content">
                <div class="question-text">${question.question}</div>
                <div class="mcq-options">
                    ${optionsHTML}
                </div>
            </div>
            
            ${quizState.reviewMode ? '<div id="questionExplanation" class="question-explanation" style="display: none;"></div>' : ''}
        </div>
    `;
}

// Render True/False Question
function renderTrueFalse(question, questionNumber) {
    const timeLimit = question.timeLimit || 30;
    
    return `
        <div class="question-card">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">Q${questionNumber}</span>
                    <span class="question-type-badge">True/False</span>
                    ${!quizState.reviewMode ? `
                    <div class="question-timer">
                        <i class="fas fa-clock"></i>
                        <span id="questionTimer">${timeLimit}s</span>
                    </div>
                    ` : ''}
                </div>
                <div class="question-flag-indicator">
                    ${quizState.flaggedQuestions.has(quizState.currentQuestion) ? 
                        '<i class="fas fa-flag flagged"></i>' : 
                        '<i class="far fa-flag"></i>'
                    }
                </div>
            </div>
            
            <div class="question-content">
                <div class="question-text">${question.question}</div>
                <div class="tf-options">
                    <div class="tf-option true" onclick="selectTrueFalseOption(true)">
                        <div class="tf-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="tf-text">True</div>
                    </div>
                    <div class="tf-option false" onclick="selectTrueFalseOption(false)">
                        <div class="tf-icon"><i class="fas fa-times-circle"></i></div>
                        <div class="tf-text">False</div>
                    </div>
                </div>
            </div>
            
            ${quizState.reviewMode ? '<div id="questionExplanation" class="question-explanation" style="display: none;"></div>' : ''}
        </div>
    `;
}

// Render Fill in the Blank Question
function renderFillBlank(question, questionNumber) {
    const timeLimit = question.timeLimit || 60;
    
    return `
        <div class="question-card">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">Q${questionNumber}</span>
                    <span class="question-type-badge">Fill in Blank</span>
                    ${!quizState.reviewMode ? `
                    <div class="question-timer">
                        <i class="fas fa-clock"></i>
                        <span id="questionTimer">${timeLimit}s</span>
                    </div>
                    ` : ''}
                </div>
                <div class="question-flag-indicator">
                    ${quizState.flaggedQuestions.has(quizState.currentQuestion) ? 
                        '<i class="fas fa-flag flagged"></i>' : 
                        '<i class="far fa-flag"></i>'
                    }
                </div>
            </div>
            
            <div class="question-content">
                <div class="question-text">${question.question}</div>
                <div class="fill-blank-container">
                    <input type="text" class="fill-input" placeholder="Type your answer here..." 
                           oninput="updateFillBlankAnswer(this.value)" ${quizState.reviewMode ? 'readonly' : ''}>
                </div>
            </div>
            
            ${quizState.reviewMode ? '<div id="questionExplanation" class="question-explanation" style="display: none;"></div>' : ''}
        </div>
    `;
}

// Render Short Answer Question
function renderShortAnswer(question, questionNumber) {
    const timeLimit = question.timeLimit || 90;
    
    return `
        <div class="question-card">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-number">Q${questionNumber}</span>
                    <span class="question-type-badge">Short Answer</span>
                    ${!quizState.reviewMode ? `
                    <div class="question-timer">
                        <i class="fas fa-clock"></i>
                        <span id="questionTimer">${timeLimit}s</span>
                    </div>
                    ` : ''}
                </div>
                <div class="question-flag-indicator">
                    ${quizState.flaggedQuestions.has(quizState.currentQuestion) ? 
                        '<i class="fas fa-flag flagged"></i>' : 
                        '<i class="far fa-flag"></i>'
                    }
                </div>
            </div>
            
            <div class="question-content">
                <div class="question-text">${question.question}</div>
                <div class="fill-blank-container">
                    <textarea class="fill-input" placeholder="Type your answer here..." rows="4"
                              oninput="updateFillBlankAnswer(this.value)" ${quizState.reviewMode ? 'readonly' : ''}></textarea>
                </div>
            </div>
            
            ${quizState.reviewMode ? '<div id="questionExplanation" class="question-explanation" style="display: none;"></div>' : ''}
        </div>
    `;
}

// Show explanation for current question
function showExplanation(question) {
    const explanationElement = document.getElementById('questionExplanation');
    if (!explanationElement) return;
    
    const userAnswer = quizState.userAnswers[quizState.currentQuestion];
    const correctAnswer = question.correctAnswer;
    const isCorrect = userAnswer === correctAnswer;
    
    let explanationHTML = `
        <div class="explanation-header">
            <h4><i class="fas fa-lightbulb"></i> Explanation</h4>
            <div class="answer-status ${isCorrect ? 'correct' : 'incorrect'}">
                ${isCorrect ? 
                    '<i class="fas fa-check-circle"></i> Correct!' : 
                    '<i class="fas fa-times-circle"></i> Incorrect'
                }
            </div>
        </div>
        <div class="answer-comparison">
            <div class="answer-row">
                <span class="answer-label">Your Answer:</span>
                <span class="user-answer ${isCorrect ? 'correct' : 'incorrect'}">${userAnswer || 'Not answered'}</span>
            </div>
            ${!isCorrect ? `
            <div class="answer-row">
                <span class="answer-label">Correct Answer:</span>
                <span class="correct-answer">${correctAnswer}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    if (question.explanation) {
        explanationHTML += `
            <div class="explanation-content">
                <p>${question.explanation}</p>
            </div>
        `;
    }
    
    explanationElement.innerHTML = explanationHTML;
    explanationElement.style.display = 'block';
}

// Question selection handlers
function selectMCQOption(optionIndex) {
    if (quizState.reviewMode) return;
    
    const currentQ = quizState.questions[quizState.currentQuestion];
    const options = document.querySelectorAll('.mcq-option');
    
    // Remove all previous states
    options.forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'none'; // Disable further clicks
    });
    
    if (options[optionIndex]) {
        const selectedAnswer = currentQ.options[optionIndex];
        const correctAnswer = currentQ.correctAnswer;
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Mark selected option
        options[optionIndex].classList.add('selected');
        options[optionIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // Always show the correct answer
        options.forEach((opt, idx) => {
            if (currentQ.options[idx] === correctAnswer) {
                opt.classList.add('correct');
            }
        });
        
        // Show explanation immediately
        showImmediateExplanation(currentQ, isCorrect);
        
        // Save answer
        saveAnswer(selectedAnswer);
    }
}

function selectTrueFalseOption(answer) {
    if (quizState.reviewMode) return;
    
    const currentQ = quizState.questions[quizState.currentQuestion];
    const trueOption = document.querySelector('.tf-option.true');
    const falseOption = document.querySelector('.tf-option.false');
    
    if (trueOption && falseOption) {
        const selectedAnswer = answer ? 'True' : 'False';
        const correctAnswer = currentQ.correctAnswer;
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Disable further clicks
        trueOption.style.pointerEvents = 'none';
        falseOption.style.pointerEvents = 'none';
        
        // Remove previous states
        trueOption.classList.remove('selected', 'correct', 'incorrect');
        falseOption.classList.remove('selected', 'correct', 'incorrect');
        
        // Mark selected option
        if (answer) {
            trueOption.classList.add('selected');
            trueOption.classList.add(isCorrect ? 'correct' : 'incorrect');
        } else {
            falseOption.classList.add('selected');
            falseOption.classList.add(isCorrect ? 'correct' : 'incorrect');
        }
        
        // Always show correct answer
        if (correctAnswer === 'True') {
            trueOption.classList.add('correct');
        } else {
            falseOption.classList.add('correct');
        }
        
        // Show explanation
        showImmediateExplanation(currentQ, isCorrect);
        
        saveAnswer(selectedAnswer);
    }
}

function updateFillBlankAnswer(value) {
    if (quizState.reviewMode) return;
    saveAnswer(value);
}

// Show immediate explanation after answer selection
function showImmediateExplanation(question, isCorrect) {
    const explanationDiv = document.createElement('div');
    explanationDiv.className = `immediate-feedback ${isCorrect ? 'correct-feedback' : 'incorrect-feedback'}`;
    explanationDiv.innerHTML = `
        <div class="feedback-header">
            <div class="feedback-icon">
                <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
            </div>
            <div class="feedback-title">
                ${isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </div>
        </div>
        <div class="feedback-body">
            <div class="correct-answer-box">
                <strong>Correct Answer:</strong> ${question.correctAnswer}
            </div>
            ${question.explanation ? `
                <div class="explanation-box">
                    <strong><i class="fas fa-lightbulb"></i> Explanation:</strong>
                    <p>${question.explanation}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Insert after question content
    const questionCard = document.querySelector('.question-card');
    if (questionCard) {
        questionCard.appendChild(explanationDiv);
        
        // Animate in
        setTimeout(() => explanationDiv.classList.add('show'), 10);
    }
}

// Restore user's previous answer
function restoreUserAnswer(type, answer) {
    if (!answer) return;
    
    try {
        switch (type) {
            case 'MCQ':
                const options = quizState.questions[quizState.currentQuestion].options || [];
                const optionIndex = options.indexOf(answer);
                if (optionIndex !== -1) {
                    const optionElements = document.querySelectorAll('.mcq-option');
                    if (optionElements[optionIndex]) {
                        optionElements[optionIndex].classList.add('selected');
                    }
                }
                break;
            case 'TrueFalse':
                const trueOption = document.querySelector('.tf-option.true');
                const falseOption = document.querySelector('.tf-option.false');
                if (answer === 'True' && trueOption) {
                    trueOption.classList.add('selected');
                } else if (answer === 'False' && falseOption) {
                    falseOption.classList.add('selected');
                }
                break;
            case 'FillBlank':
            case 'ShortAnswer':
                const input = document.querySelector('.fill-input');
                if (input) input.value = answer;
                break;
        }
    } catch (error) {
        console.error('Error restoring answer:', error);
    }
}

// Save user's answer
function saveAnswer(answer) {
    quizState.userAnswers[quizState.currentQuestion] = answer;
    updateNavigationButtons();
}

// Update navigation buttons
function updateNavigationButtons() {
    const hasAnswer = quizState.userAnswers[quizState.currentQuestion] !== null;
    const isFirstQuestion = quizState.currentQuestion === 0;
    const isLastQuestion = quizState.currentQuestion === quizState.totalQuestions - 1;
    
    if (prevBtn) {
        prevBtn.disabled = isFirstQuestion;
        prevBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Previous';
    }
    
    if (quizState.reviewMode) {
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.display = 'flex';
            nextBtn.innerHTML = isLastQuestion ? 
                'Finish Review <i class="fas fa-flag-checkered"></i>' : 
                'Next Question <i class="fas fa-arrow-right"></i>';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (flagBtn) flagBtn.style.display = 'none';
    } else {
        if (isLastQuestion) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) {
                submitBtn.style.display = 'flex';
                submitBtn.disabled = !hasAnswer;
                submitBtn.innerHTML = hasAnswer ? 
                    '<i class="fas fa-paper-plane"></i> Submit Quiz' : 
                    'Select Answer to Submit';
            }
        } else {
            if (nextBtn) {
                nextBtn.style.display = 'flex';
                nextBtn.disabled = !hasAnswer;
                nextBtn.innerHTML = hasAnswer ? 
                    'Next Question <i class="fas fa-arrow-right"></i>' : 
                    'Select Answer to Continue';
            }
            if (submitBtn) submitBtn.style.display = 'none';
        }
        if (flagBtn) flagBtn.style.display = 'flex';
    }
}

// Update progress
function updateProgress() {
    const progress = ((quizState.currentQuestion + 1) / quizState.totalQuestions) * 100;
    if (progressFill) progressFill.style.width = `${progress}%`;
    
    if (progressText) {
        if (quizState.reviewMode) {
            progressText.textContent = `Reviewing ${quizState.currentQuestion + 1} of ${quizState.totalQuestions}`;
        } else {
            progressText.textContent = `Question ${quizState.currentQuestion + 1} of ${quizState.totalQuestions}`;
        }
    }
    
    // Update progress in header
    if (quizProgress) {
        quizProgress.textContent = `${quizState.currentQuestion + 1}/${quizState.totalQuestions}`;
    }
}

// Update difficulty display
function updateDifficultyDisplay(difficulty) {
    if (currentDifficultyElement) {
        currentDifficultyElement.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        currentDifficultyElement.className = `difficulty-${difficulty}`;
        quizState.currentDifficulty = difficulty;
    }
}

// Update flag button
function updateFlagButton() {
    if (flagBtn) {
        const isFlagged = quizState.flaggedQuestions.has(quizState.currentQuestion);
        flagBtn.innerHTML = isFlagged ? 
            '<i class="fas fa-flag"></i> Unflag Question' : 
            '<i class="far fa-flag"></i> Flag Question';
        flagBtn.classList.toggle('btn-warning', isFlagged);
        flagBtn.classList.toggle('btn-secondary', !isFlagged);
    }
}

// Toggle flag question
function toggleFlagQuestion() {
    if (quizState.flaggedQuestions.has(quizState.currentQuestion)) {
        quizState.flaggedQuestions.delete(quizState.currentQuestion);
        updateFlagButton();
        showNotification('Question unflagged', 'info');
    } else {
        showFlagModal();
    }
}

function showFlagModal() {
    if (!flagModal) return;
    
    // Reset form
    const flagOptions = flagModal.querySelectorAll('input[type="radio"]');
    flagOptions.forEach(option => option.checked = false);
    
    const flagComment = document.getElementById('flagComment');
    if (flagComment) {
        flagComment.style.display = 'none';
        flagComment.querySelector('textarea').value = '';
    }
    
    const confirmFlagBtn = document.getElementById('confirmFlag');
    if (confirmFlagBtn) {
        confirmFlagBtn.disabled = true;
    }
    
    flagModal.classList.add('show');
}

function hideFlagModal() {
    if (flagModal) {
        flagModal.classList.remove('show');
    }
}

function confirmFlagQuestion() {
    const selectedReason = document.querySelector('input[name="flagReason"]:checked');
    if (!selectedReason) return;
    
    quizState.flaggedQuestions.add(quizState.currentQuestion);
    updateFlagButton();
    hideFlagModal();
    
    // Update flag indicator in question
    const flagIndicator = document.querySelector('.question-flag-indicator');
    if (flagIndicator) {
        flagIndicator.innerHTML = '<i class="fas fa-flag flagged"></i>';
    }
    
    showNotification('Question flagged successfully', 'success');
}

// Start main timer
function startTimer() {
    quizState.startTime = Date.now();
    quizState.timerInterval = setInterval(updateTimer, 1000);
}

// Update timer display
function updateTimer() {
    const elapsed = Math.floor((Date.now() - quizState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    
    if (timerElement) {
        timerElement.textContent = `${minutes}:${seconds}`;
    }
    
    quizState.timeSpent = elapsed;
}

// Start question-specific timer
function startQuestionTimer(question) {
    let timeLeft = question.timeLimit || 45;
    
    const questionTimerElement = document.getElementById('questionTimer');
    if (questionTimerElement) {
        questionTimerElement.textContent = `${timeLeft}s`;
        questionTimerElement.style.color = '';
        questionTimerElement.classList.remove('pulse');
    }
    
    quizState.questionTimerInterval = setInterval(() => {
        const questionTimerElement = document.getElementById('questionTimer');
        if (questionTimerElement && !quizState.reviewMode) {
            questionTimerElement.textContent = `${timeLeft}s`;
            
            // Color coding for time
            if (timeLeft <= 10) {
                questionTimerElement.style.color = 'var(--error)';
                questionTimerElement.classList.add('pulse');
            } else if (timeLeft <= 30) {
                questionTimerElement.style.color = 'var(--warning)';
            }
            
            if (timeLeft <= 0) {
                clearInterval(quizState.questionTimerInterval);
                quizState.questionTimerInterval = null;
                autoProceed();
                return;
            }
            
            timeLeft--;
        } else {
            clearInterval(quizState.questionTimerInterval);
            quizState.questionTimerInterval = null;
        }
    }, 1000);
}

// Auto-proceed when time's up
function autoProceed() {
    if (quizState.currentQuestion < quizState.totalQuestions - 1) {
        showNotification('Time\'s up! Moving to next question.', 'warning');
        nextQuestion();
    } else {
        showNotification('Time\'s up! Submitting quiz.', 'warning');
        submitQuiz();
    }
}

// Navigation functions
function nextQuestion() {
    if (quizState.reviewMode && quizState.currentQuestion === quizState.totalQuestions - 1) {
        // Finish review - FIXED
        finishReview();
        return;
    }
    
    if (quizState.currentQuestion < quizState.totalQuestions - 1) {
        // Evaluate current question before proceeding (only in quiz mode)
        if (!quizState.reviewMode) {
            evaluateCurrentQuestion();
        }
        loadQuestion(quizState.currentQuestion + 1);
    }
}

function previousQuestion() {
    if (quizState.currentQuestion > 0) {
        loadQuestion(quizState.currentQuestion - 1);
    }
}

// Finish review mode - NEW FUNCTION
function finishReview() {
    quizState.reviewMode = false;
    hideCompletionModal();
    showNotification('Review completed!', 'success');
    
    // Redirect to dashboard or show completion modal again
    setTimeout(() => {
        showCompletionModal(calculateResults());
    }, 1000);
}

// Evaluate current question and adapt difficulty
function evaluateCurrentQuestion() {
    const currentQ = quizState.questions[quizState.currentQuestion];
    const userAnswer = quizState.userAnswers[quizState.currentQuestion];
    
    if (!userAnswer || !currentQ.correctAnswer) return;
    
    const isCorrect = userAnswer === currentQ.correctAnswer;
    
    // Record performance
    quizState.performanceHistory.push({
        questionId: currentQ.id,
        difficulty: currentQ.difficulty || 'medium',
        isCorrect: isCorrect,
        timeSpent: Math.floor((Date.now() - quizState.questionStartTime) / 1000),
        timestamp: Date.now()
    });
    
    // Adapt difficulty for next question (if adaptive mode is enabled)
    if (quizState.quizConfig?.enableAdaptive !== false) {
        adaptDifficulty(isCorrect, currentQ.difficulty || 'medium');
    }
}

// Adaptive difficulty algorithm
function adaptDifficulty(isCorrect, currentDifficulty) {
    let newDifficulty = currentDifficulty;
    
    // Simple adaptive algorithm
    if (isCorrect) {
        if (currentDifficulty === 'easy') newDifficulty = 'medium';
        else if (currentDifficulty === 'medium') newDifficulty = 'hard';
        // hard stays hard
    } else {
        if (currentDifficulty === 'hard') newDifficulty = 'medium';
        else if (currentDifficulty === 'medium') newDifficulty = 'easy';
        // easy stays easy
    }
    
    // Update next question's difficulty
    if (quizState.currentQuestion < quizState.totalQuestions - 1) {
        quizState.questions[quizState.currentQuestion + 1].difficulty = newDifficulty;
    }
    
    // Show difficulty adjustment indicator
    if (newDifficulty !== currentDifficulty) {
        showDifficultyIndicator(newDifficulty);
    }
}

// Show difficulty adjustment
function showDifficultyIndicator(newDifficulty) {
    if (difficultyIndicator) {
        const indicator = difficultyIndicator.querySelector('.indicator-content');
        indicator.innerHTML = `
            <i class="fas fa-chart-line"></i>
            <span>Adapting to ${newDifficulty} difficulty...</span>
        `;
        
        difficultyIndicator.classList.add('show');
        
        setTimeout(() => {
            difficultyIndicator.classList.remove('show');
        }, 2000);
    }
}

// Submit quiz
async function submitQuiz() {
    // Stop timers
    clearInterval(quizState.timerInterval);
    if (quizState.questionTimerInterval) {
        clearInterval(quizState.questionTimerInterval);
        quizState.questionTimerInterval = null;
    }
    
    // Evaluate last question
    evaluateCurrentQuestion();
    
    // Calculate results
    const results = calculateResults();
    
    // Save quiz results to database and dashboard
    await saveQuizResults(results);
    
    // Store results and quiz data in localStorage for results page
    localStorage.setItem('quizResults', JSON.stringify(results));
    localStorage.setItem('currentQuizData', JSON.stringify({
        questions: quizState.questions.map((q, i) => ({
            ...q,
            userAnswer: quizState.userAnswers[i]
        }))
    }));
    
    // Redirect to results page
    window.location.href = 'quiz-results.html';
    
    quizState.quizCompleted = true;
}

// Calculate quiz results
function calculateResults() {
    let correctAnswers = 0;
    
    quizState.questions.forEach((question, index) => {
        const userAnswer = quizState.userAnswers[index];
        const isCorrect = userAnswer && question.correctAnswer && userAnswer === question.correctAnswer;
        
        if (isCorrect) {
            correctAnswers++;
        }
    });
    
    // Simple percentage calculation: (correct / total) * 100
    const totalQuestions = quizState.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    // Calculate average difficulty
    const difficulties = quizState.questions.map(q => q.difficulty || 'medium');
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };
    difficulties.forEach(d => difficultyCount[d]++);
    
    let avgDifficulty = 'medium';
    if (difficultyCount.hard > difficultyCount.easy && difficultyCount.hard > difficultyCount.medium) {
        avgDifficulty = 'hard';
    } else if (difficultyCount.easy > difficultyCount.medium) {
        avgDifficulty = 'easy';
    }
    
    return {
        score: percentage,
        correctAnswers: correctAnswers,
        totalQuestions: quizState.totalQuestions,
        timeTaken: quizState.timeSpent,
        averageDifficulty: avgDifficulty,
        performanceHistory: quizState.performanceHistory
    };
}

// Save quiz results to database and dashboard
async function saveQuizResults(results) {
    try {
        const quizData = {
            title: document.getElementById('quizTitle').textContent,
            topic: document.getElementById('quizTopic').textContent.replace('Topic: ', ''),
            questions: quizState.questions.map((q, index) => ({
                ...q,
                userAnswer: quizState.userAnswers[index],
                isCorrect: quizState.userAnswers[index] === q.correctAnswer
            })),
            difficulty: results.averageDifficulty,
            score: results.score,
            totalQuestions: results.totalQuestions,
            correctAnswers: results.correctAnswers,
            timeTaken: results.timeTaken,
            completedAt: new Date().toISOString()
        };

        // Save to localStorage as backup
        const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes')) || [];
        savedQuizzes.push(quizData);
        localStorage.setItem('savedQuizzes', JSON.stringify(savedQuizzes));
        
        // Store quiz ID for certificate generation
        quizState.quizId = 'quiz-' + Date.now();
        
        // Save to database via API
        try {
            console.log('📡 Saving quiz results to database...');
            const response = await fetch('/api/save-quiz', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: quizData.title,
                    topic: quizData.topic,
                    difficulty: quizData.difficulty,
                    score: quizData.score,
                    totalQuestions: quizData.totalQuestions,
                    correctAnswers: quizData.correctAnswers,
                    timeTaken: quizData.timeTaken,
                    questions: quizData.questions,
                    sourceType: 'ai_generated',
                    sourceContent: ''
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Quiz saved to database:', data);
                
                if (data.success) {
                    quizState.quizId = data.quizId || quizState.quizId;
                    
                    // Store certificate data if eligible
                    if (data.certificateEligible) {
                        quizState.certificateData = {
                            quizId: data.quizId,
                            percentage: data.percentage,
                            eligible: true
                        };
                        console.log('🏆 Certificate eligible! Score:', data.percentage + '%');
                    }
                    
                    showNotification('Quiz saved successfully!', 'success');
                }
            } else {
                console.warn('⚠️ Failed to save to database, using localStorage backup');
                showNotification('Quiz saved locally', 'warning');
            }
        } catch (apiError) {
            console.error('⚠️ API error, quiz saved locally:', apiError);
            showNotification('Quiz saved locally. Will sync when online.', 'warning');
        }
        
        // Update dashboard with quiz results (localStorage backup)
        await updateDashboard(quizData);
        
        // Set flag to trigger dashboard refresh
        localStorage.setItem('quizCompleted', 'true');
        localStorage.setItem('newQuizData', JSON.stringify(quizData));
        
        console.log('✅ Quiz results saved successfully:', quizData);
        return { success: true, quizId: quizState.quizId };
        
    } catch (error) {
        console.error('❌ Error saving quiz results:', error);
        showNotification('Failed to save quiz results', 'error');
        return { success: false, error: error.message };
    }
}

// Update dashboard with quiz results
async function updateDashboard(quizData) {
    try {
        // Get current dashboard data
        let dashboardData = JSON.parse(localStorage.getItem('dashboardData')) || {
            totalQuizzes: 0,
            averageScore: 0,
            totalQuestions: 0,
            totalTime: 0,
            recentQuizzes: [],
            performanceTrend: []
        };
        
        // Update dashboard stats
        dashboardData.totalQuizzes += 1;
        dashboardData.totalQuestions += quizData.totalQuestions;
        dashboardData.totalTime += quizData.timeTaken;
        
        // Calculate new average score
        const totalScore = dashboardData.averageScore * (dashboardData.totalQuizzes - 1) + quizData.score;
        dashboardData.averageScore = Math.round(totalScore / dashboardData.totalQuizzes);
        
        // Add to recent quizzes
        dashboardData.recentQuizzes.unshift({
            title: quizData.title,
            score: quizData.score,
            date: new Date().toISOString(),
            topic: quizData.topic,
            totalQuestions: quizData.totalQuestions,
            correctAnswers: quizData.correctAnswers,
            timeTaken: quizData.timeTaken
        });
        
        // Keep only last 5 recent quizzes
        dashboardData.recentQuizzes = dashboardData.recentQuizzes.slice(0, 5);
        
        // Update performance trend
        dashboardData.performanceTrend.push({
            date: new Date().toISOString(),
            score: quizData.score,
            quizTitle: quizData.title
        });
        
        // Keep only last 10 performance entries
        dashboardData.performanceTrend = dashboardData.performanceTrend.slice(-10);
        
        // Save updated dashboard data
        localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
        
        console.log('✅ Dashboard updated successfully:', dashboardData);
        
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
    }
}

// Show completion modal
function showCompletionModal(results) {
    if (!completionModal) return;
    
    // Calculate analytics
    const analytics = calculateAnalytics(results);
    
    // Create enhanced completion modal content
    const modalContent = `
        <div class="completion-content">
            <div class="completion-header">
                <div class="score-circle ${results.score >= 80 ? 'excellent' : results.score >= 70 ? 'good' : results.score >= 60 ? 'average' : 'poor'}">
                    <div class="score-value">${results.score}%</div>
                    <div class="score-label">Final Score</div>
                </div>
                <h2>${results.score >= 80 ? '🎉 Excellent!' : results.score >= 70 ? '👍 Good Job!' : results.score >= 60 ? '📈 Keep Going!' : '💪 Keep Practicing!'}</h2>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <i class="fas fa-check-circle"></i>
                    <div class="stat-value">${results.correctAnswers}/${results.totalQuestions}</div>
                    <div class="stat-label">Correct Answers</div>
                </div>
                <div class="stat-box">
                    <i class="fas fa-clock"></i>
                    <div class="stat-value">${formatTime(results.timeTaken)}</div>
                    <div class="stat-label">Time Taken</div>
                </div>
                <div class="stat-box">
                    <i class="fas fa-star"></i>
                    <div class="stat-value">${results.averageDifficulty}</div>
                    <div class="stat-label">Difficulty</div>
                </div>
            </div>
            
            <div class="analytics-section">
                <h3><i class="fas fa-chart-bar"></i> Performance Analytics</h3>
                
                <!-- Question Type Breakdown -->
                <div class="chart-container">
                    <h4>Question Types Performance</h4>
                    <canvas id="questionTypeChart"></canvas>
                </div>
                
                <!-- Difficulty Distribution -->
                <div class="chart-container">
                    <h4>Difficulty Distribution</h4>
                    <canvas id="difficultyChart"></canvas>
                </div>
                
                <!-- Performance Suggestions -->
                <div class="suggestions-box">
                    <h4><i class="fas fa-lightbulb"></i> Suggestions for Improvement</h4>
                    <ul class="suggestions-list">
                        ${analytics.suggestions.map(s => `<li><i class="fas fa-arrow-right"></i> ${s}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="action-buttons">
                ${results.score >= 70 ? `
                    <button class="btn-primary" onclick="generateCertificate()">
                        <i class="fas fa-award"></i> Get Certificate
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="startReviewMode()">
                    <i class="fas fa-eye"></i> Review Answers
                </button>
                <button class="btn-outline" onclick="window.location.href='quiz-generator.html'">
                    <i class="fas fa-plus"></i> New Quiz
                </button>
                <button class="btn-outline" onclick="window.location.href='dashboard.html'">
                    <i class="fas fa-home"></i> Dashboard
                </button>
            </div>
        </div>
    `;
    
    completionModal.innerHTML = modalContent;
    completionModal.classList.add('show');
    
    // Render charts after modal is shown
    setTimeout(() => {
        renderQuestionTypeChart(analytics.questionTypes);
        renderDifficultyChart(analytics.difficultyBreakdown);
    }, 100);
}

// Calculate detailed analytics
function calculateAnalytics(results) {
    const questionTypes = { MCQ: 0, TrueFalse: 0, FillBlank: 0 };
    const questionTypesCorrect = { MCQ: 0, TrueFalse: 0, FillBlank: 0 };
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    const difficultyCorrect = { easy: 0, medium: 0, hard: 0 };
    
    quizState.questions.forEach((q, index) => {
        const type = q.type || 'MCQ';
        const difficulty = q.difficulty || 'medium';
        const isCorrect = quizState.userAnswers[index] === q.correctAnswer;
        
        questionTypes[type] = (questionTypes[type] || 0) + 1;
        difficultyBreakdown[difficulty] = (difficultyBreakdown[difficulty] || 0) + 1;
        
        if (isCorrect) {
            questionTypesCorrect[type] = (questionTypesCorrect[type] || 0) + 1;
            difficultyCorrect[difficulty] = (difficultyCorrect[difficulty] || 0) + 1;
        }
    });
    
    // Generate suggestions
    const suggestions = [];
    
    if (results.score < 70) {
        suggestions.push('Review the explanations for incorrect answers');
        suggestions.push('Practice more quizzes on this topic');
    }
    
    if (difficultyCorrect.hard / (difficultyBreakdown.hard || 1) < 0.5) {
        suggestions.push('Focus on understanding harder concepts');
    }
    
    if (results.timeTaken / results.totalQuestions > 60) {
        suggestions.push('Try to improve your response time');
    }
    
    if (questionTypesCorrect.MCQ / (questionTypes.MCQ || 1) < 0.6) {
        suggestions.push('Practice more multiple choice questions');
    }
    
    if (suggestions.length === 0) {
        suggestions.push('Great job! Keep up the excellent work!');
        suggestions.push('Try harder difficulty levels to challenge yourself');
    }
    
    return {
        questionTypes,
        questionTypesCorrect,
        difficultyBreakdown,
        difficultyCorrect,
        suggestions
    };
}

// Render question type chart
function renderQuestionTypeChart(data) {
    const canvas = document.getElementById('questionTypeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Questions',
                data: Object.values(data),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Render difficulty chart
function renderDifficultyChart(data) {
    const canvas = document.getElementById('difficultyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Easy', 'Medium', 'Hard'],
            datasets: [{
                data: [data.easy || 0, data.medium || 0, data.hard || 0],
                backgroundColor: ['#4ade80', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Hide completion modal
function hideCompletionModal() {
    if (completionModal) {
        completionModal.classList.remove('show');
    }
}

// Start review mode - FIXED
function startReviewMode() {
    quizState.reviewMode = true;
    hideCompletionModal();
    
    // Update UI for review mode
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle) {
        quizTitle.textContent += ' - Review';
    }
    
    // Load first question with explanations
    loadQuestion(0);
    
    showNotification('Review mode activated. You can now see explanations for each question.', 'info');
}

// Generate certificate - FIXED
async function generateCertificate() {
    try {
        const results = calculateResults();
        
        if (results.score >= 70) {
            showNotification('Generating certificate...', 'info');
            
            // Get user name from localStorage or prompt
            let userName = localStorage.getItem('userName') || 'Quiz Participant';
            
            // If no user name stored, prompt for it
            if (!localStorage.getItem('userName')) {
                userName = prompt('Please enter your name for the certificate:') || 'Quiz Participant';
                if (userName && userName !== 'Quiz Participant') {
                    localStorage.setItem('userName', userName);
                }
            }
            
            const quizTitle = document.getElementById('quizTitle').textContent.replace(' - Review', '');
            const topic = document.getElementById('quizTopic').textContent.replace('Topic: ', '');
            
            // Generate certificate data
            const certificateData = {
                user_name: userName,
                quiz_title: quizTitle,
                topic: topic,
                score: results.correctAnswers,
                total_questions: results.totalQuestions,
                percentage: results.score,
                issue_date: new Date().toISOString(),
                certificate_id: generateCertificateId(),
                time_taken: formatTime(results.timeTaken),
                difficulty: results.averageDifficulty
            };
            
            // Store certificate data
            quizState.certificateData = certificateData;
            
            // Show certificate modal
            showCertificateModal(certificateData);
            
            showNotification('Certificate generated successfully! 🎓', 'success');
            
        } else {
            showNotification('Score too low for certificate. Minimum 70% required.', 'warning');
        }
    } catch (error) {
        console.error('Error generating certificate:', error);
        showNotification('Failed to generate certificate', 'error');
    }
}

// Show certificate modal - FIXED
function showCertificateModal(certificate) {
    const certificateModal = document.getElementById('certificateModal');
    const certificateContent = document.getElementById('certificateContent');
    
    if (!certificateModal || !certificateContent) return;
    
    certificateContent.innerHTML = `
        <div class="certificate-preview">
            <div class="certificate-header">
                <h2>🎓 Certificate of Achievement</h2>
                <p>This certifies that</p>
                <h3>${certificate.user_name}</h3>
                <p>has successfully completed the quiz</p>
                <h4>"${certificate.quiz_title}"</h4>
            </div>
            <div class="score-display">
                <div class="score-percentage">${certificate.percentage}%</div>
                <div class="score-details">${certificate.score}/${certificate.total_questions} Correct</div>
            </div>
            <div class="certificate-details">
                <div class="detail-row">
                    <span>Topic:</span>
                    <span>${certificate.topic}</span>
                </div>
                <div class="detail-row">
                    <span>Date Issued:</span>
                    <span>${new Date(certificate.issue_date).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                    <span>Time Taken:</span>
                    <span>${certificate.time_taken}</span>
                </div>
                <div class="detail-row">
                    <span>Certificate ID:</span>
                    <span class="certificate-id">${certificate.certificate_id}</span>
                </div>
            </div>
            <div class="certificate-footer">
                <p>Congratulations on your achievement! 🎉</p>
            </div>
        </div>
    `;
    
    certificateModal.classList.add('show');
}

// Handle certificate download - FIXED
async function handleCertificateDownload() {
    if (!quizState.certificateData) {
        showNotification('No certificate data available', 'error');
        return;
    }
    
    await downloadCertificate(quizState.certificateData);
}

// Download certificate function - FIXED
async function downloadCertificate(certificateData) {
    try {
        showNotification('Preparing certificate download...', 'info');
        
        // Create certificate HTML content
        const certificateHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificate - ${certificateData.quiz_title}</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                    .certificate { border: 5px solid gold; padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: #333; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                    h1 { color: #2c3e50; margin-bottom: 20px; }
                    h2 { color: #3498db; margin: 20px 0; }
                    h3 { color: #2c3e50; margin: 15px 0; }
                    h4 { color: #7f8c8d; margin: 10px 0; }
                    .score { font-size: 3em; color: #27ae60; font-weight: bold; margin: 20px 0; }
                    .details { text-align: left; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 10px; }
                    .detail-item { margin: 10px 0; padding: 8px; border-bottom: 1px solid #eee; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid gold; color: #7f8c8d; }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <h1>🎓 Certificate of Achievement</h1>
                    <p>This certifies that</p>
                    <h2>${certificateData.user_name}</h2>
                    <p>has successfully completed the quiz</p>
                    <h3>"${certificateData.quiz_title}"</h3>
                    <div class="score">${certificateData.percentage}%</div>
                    <div class="details">
                        <div class="detail-item"><strong>Score:</strong> ${certificateData.score}/${certificateData.total_questions} Correct Answers</div>
                        <div class="detail-item"><strong>Topic:</strong> ${certificateData.topic}</div>
                        <div class="detail-item"><strong>Date Issued:</strong> ${new Date(certificateData.issue_date).toLocaleDateString()}</div>
                        <div class="detail-item"><strong>Time Taken:</strong> ${certificateData.time_taken}</div>
                        <div class="detail-item"><strong>Certificate ID:</strong> ${certificateData.certificate_id}</div>
                        <div class="detail-item"><strong>Difficulty:</strong> ${certificateData.difficulty}</div>
                    </div>
                    <div class="footer">
                        <p>Congratulations on your outstanding achievement! 🎉</p>
                        <p>This certificate recognizes your dedication and knowledge in ${certificateData.topic}.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Create blob and download
        const blob = new Blob([certificateHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `certificate-${certificateData.certificate_id}.html`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Certificate download started!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Failed to download certificate', 'error');
    }
}

// Hide certificate modal - FIXED
function hideCertificateModal() {
    const certificateModal = document.getElementById('certificateModal');
    if (certificateModal) {
        certificateModal.classList.remove('show');
        // Show completion modal again when certificate modal is closed
        showCompletionModal(calculateResults());
    }
}

// Utility functions
function generateCertificateId() {
    return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
}

// Global functions for HTML onclick
window.selectMCQOption = selectMCQOption;
window.selectTrueFalseOption = selectTrueFalseOption;
window.updateFillBlankAnswer = updateFillBlankAnswer;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.handleCertificateDownload = handleCertificateDownload;
window.hideCertificateModal = hideCertificateModal;

console.log('🚀 Quiz Engine ready! Questions will load from localStorage or sessionStorage.');