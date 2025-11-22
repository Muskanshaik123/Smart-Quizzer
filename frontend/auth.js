// COMPLETE WORKING LOGIN SYSTEM WITH FORGOT PASSWORD MODAL
console.log('🚀 AI Quizzer Login System Started');

// DOM Elements
const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const demoBtn = document.getElementById('demoBtn');
const notification = document.getElementById('notification');
const forgotPasswordLink = document.querySelector('.forgot-password');

// Demo credentials
const DEMO_CREDENTIALS = {
    email: 'demo@aiquizzer.com',
    password: 'demo123'
};

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Login system initialized');
    initializeLogin();
});

function initializeLogin() {
    // Password toggle functionality
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Demo login button
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            document.getElementById('email').value = DEMO_CREDENTIALS.email;
            document.getElementById('password').value = DEMO_CREDENTIALS.password;
            showNotification('🎮 Demo credentials loaded! Click Sign In.', 'info');
        });
    }

    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPasswordModal();
        });
    }

    // Form submission - MAIN LOGIN FUNCTION
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    // Check for remembered email
    checkRememberedUser();
    
    console.log('✅ Login system ready!');
}

async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    console.log('🔐 Login attempt:', { email: email });

    // Validation
    if (!email || !password) {
        showNotification('❌ Please enter both email and password', 'error');
        shakeElement(loginForm);
        return;
    }

    if (!validateEmail(email)) {
        showNotification('❌ Please enter a valid email address', 'error');
        shakeElement(document.getElementById('email').parentElement);
        return;
    }

    // Show loading state
    setLoadingState(true);

    try {
        // Send login request to backend
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // ✅ Login successful
            console.log('✅ Login successful for:', email);
            showNotification('✅ Login successful! Redirecting...', 'success');
            
            // Save user data to localStorage
            const userData = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                interests: data.user.interests || [],
                loginTime: new Date().toISOString(),
                sessionId: generateSessionId()
            };
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('userToken', data.user.token || generateSessionId());
            
            // Initialize user stats if they don't exist
            initializeUserStats(data.user.id);
            
            // Remember email if checked
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            // Redirect to dashboard after delay
            setTimeout(function() {
                console.log('🔄 Redirecting to dashboard...');
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            // ❌ Login failed
            console.error('❌ Login failed:', data.error);
            showNotification(`❌ Login failed: ${data.error || 'Invalid credentials'}`, 'error');
            shakeElement(loginForm);
        }
        
    } catch (error) {
        console.error('❌ Network error during login:', error);
        showNotification('❌ Network error. Please check your connection.', 'error');
        
        // Fallback: Allow demo login even if backend is down
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            handleDemoLoginFallback(email, rememberMe);
        } else {
            showNotification('❌ Cannot connect to server. Please try again later.', 'error');
        }
    } finally {
        setLoadingState(false);
    }
}

function handleDemoLoginFallback(email, rememberMe) {
    console.log('🔄 Using demo login fallback');
    showNotification('✅ Demo login successful! Redirecting...', 'success');
    
    const userData = {
        id: 'demo-user',
        email: email,
        name: 'Demo User',
        interests: ['Mathematics', 'Science', 'Technology'],
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId(),
        isDemo: true
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('userToken', generateSessionId());
    initializeUserStats('demo-user');
    
    if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
    }
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

function initializeUserStats(userId) {
    const userStatsKey = `userStats_${userId}`;
    const existingStats = localStorage.getItem(userStatsKey);
    
    if (!existingStats) {
        const defaultStats = {
            totalQuizzes: 0,
            averageScore: 0,
            totalTime: '0h 0m',
            streak: 0,
            certificates: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            quizzesTaken: [],
            performance: [],
            achievements: []
        };
        localStorage.setItem(userStatsKey, JSON.stringify(defaultStats));
        console.log('📊 Initialized new user stats for:', userId);
    }
}

function showForgotPasswordModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="forgotPasswordModal" class="modal-overlay show">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> Reset Your Password</h3>
                    <button class="modal-close" id="closeForgotModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Enter your email address and we'll send you a link to reset your password.</p>
                    <div class="form-group">
                        <label for="resetEmail"><i class="fas fa-envelope"></i> Email Address</label>
                        <input type="email" id="resetEmail" placeholder="Enter your registered email">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelReset">Cancel</button>
                        <button type="button" class="btn btn-primary" id="sendResetLink">
                            <span class="btn-text">Send Reset Link</span>
                            <div class="btn-loader" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    const modal = document.getElementById('forgotPasswordModal');
    const closeBtn = document.getElementById('closeForgotModal');
    const cancelBtn = document.getElementById('cancelReset');
    const sendBtn = document.getElementById('sendResetLink');
    const resetEmail = document.getElementById('resetEmail');
    
    // Focus on email input
    setTimeout(() => resetEmail.focus(), 300);
    
    // Close modal functions
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Send reset link
    sendBtn.addEventListener('click', async () => {
        const email = resetEmail.value.trim();
        
        if (!email) {
            showNotification('❌ Please enter your email address', 'error');
            resetEmail.focus();
            return;
        }
        
        if (!validateEmail(email)) {
            showNotification('❌ Please enter a valid email address', 'error');
            resetEmail.focus();
            return;
        }
        
        await sendPasswordResetEmail(email, sendBtn);
    });
    
    // Enter key support in modal
    resetEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

async function sendPasswordResetEmail(email, sendBtn) {
    const btnText = sendBtn.querySelector('.btn-text');
    const btnLoader = sendBtn.querySelector('.btn-loader');
    
    // Show loading state
    btnText.textContent = 'Sending...';
    btnLoader.style.display = 'block';
    sendBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('✅ Password reset link sent! Check your email.', 'success');
            
            // For development: Show reset link in console
            if (data.resetLink) {
                console.log('🔗 Reset link:', data.resetLink);
                
                // For development: Auto-redirect to reset page
                setTimeout(() => {
                    const url = new URL(data.resetLink);
                    window.location.href = `reset-password.html${url.search}`;
                }, 2000);
            } else {
                // Close modal after success
                setTimeout(() => {
                    const modal = document.getElementById('forgotPasswordModal');
                    if (modal) {
                        modal.classList.remove('show');
                        setTimeout(() => modal.remove(), 300);
                    }
                }, 2000);
            }
        } else {
            showNotification(`❌ ${data.error || 'Failed to send reset link'}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error sending reset email:', error);
        showNotification('❌ Network error. Please try again later.', 'error');
    } finally {
        // Reset button state
        btnText.textContent = 'Send Reset Link';
        btnLoader.style.display = 'none';
        sendBtn.disabled = false;
    }
}

function checkRememberedUser() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        const rememberMeCheckbox = document.getElementById('rememberMe');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

// Utility functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    let notificationElement = document.getElementById('notification');
    
    if (!notificationElement) {
        notificationElement = createNotificationElement();
    }
    
    notificationElement.textContent = message;
    notificationElement.className = `notification ${type} show`;
    
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

function createNotificationElement() {
    const notif = document.createElement('div');
    notif.id = 'notification';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notif);
    return notif;
}

function setLoadingState(isLoading) {
    if (!loginBtn) return;
    
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.opacity = '0.5';
        if (btnLoader) btnLoader.style.display = 'block';
        loginBtn.disabled = true;
    } else {
        btnText.style.opacity = '1';
        if (btnLoader) btnLoader.style.display = 'none';
        loginBtn.disabled = false;
    }
}

function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Add CSS for modal and animations
const style = document.createElement('style');
style.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .modal-overlay.show {
        opacity: 1;
        visibility: visible;
    }
    
    .modal-content {
        background: white;
        padding: 0;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        transform: translateY(-20px);
        transition: transform 0.3s ease;
    }
    
    .modal-overlay.show .modal-content {
        transform: translateY(0);
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-radius: 12px 12px 0 0;
    }
    
    .modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: white;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
    }
    
    .modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .modal-body p {
        margin-bottom: 20px;
        color: #666;
        line-height: 1.5;
        text-align: center;
    }
    
    .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    }
    
    .btn-secondary {
        background: #6c757d;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
    }
    
    .btn-secondary:hover {
        background: #5a6268;
    }
    
    #sendResetLink {
        position: relative;
        overflow: hidden;
    }
    
    .btn-loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.error { background: #dc3545; }
    .notification.success { background: #28a745; }
    .notification.info { background: #17a2b8; }
    .notification.warning { background: #ffc107; color: #000; }
    
    /* Responsive design */
    @media (max-width: 480px) {
        .modal-content {
            width: 95%;
            margin: 20px;
        }
        
        .form-actions {
            flex-direction: column;
        }
        
        .btn-secondary, #sendResetLink {
            width: 100%;
        }
    }
`;

// Only add styles once
if (!document.getElementById('modal-styles')) {
    style.id = 'modal-styles';
    document.head.appendChild(style);
}

console.log('🎯 Login system with forgot password modal ready!');