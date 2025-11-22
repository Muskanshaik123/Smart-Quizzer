// Current step tracker
let currentStep = 1;
const API_BASE_URL = ''; // Empty for same origin, or use your backend URL

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AI Quizzer Registration Loaded');
    initializeApp();
});

function initializeApp() {
    initPasswordToggle();
    initFormSubmission();
    updateProgressBar(1);
}

function initPasswordToggle() {
    const toggleBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('regPassword');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
}

function initFormSubmission() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerUser();
        });
    }
}

function goToStep(step) {
    console.log('Going to step:', step);
    
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(stepElement => {
        stepElement.classList.remove('active');
    });
    
    // Remove active from all progress steps
    document.querySelectorAll('.progress-steps .step').forEach(stepElement => {
        stepElement.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
    const targetProgress = document.querySelector(`.progress-steps .step[data-step="${step}"]`);
    
    if (targetStep) targetStep.classList.add('active');
    if (targetProgress) targetProgress.classList.add('active');
    
    updateProgressBar(step);
    currentStep = step;
    
    if (step === 3) {
        updateReviewInfo();
    }
}

function updateProgressBar(step) {
    const progressBar = document.querySelector('.progress-steps');
    if (progressBar) {
        const width = ((step - 1) / 2) * 100;
        progressBar.style.setProperty('--progress-width', `${width}%`);
    }
}

function validateStep1() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (fullName.length < 2) {
        showNotification('Please enter your full name', 'error');
        shakeElement(document.getElementById('fullName'));
        return false;
    }
    
    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        shakeElement(document.getElementById('regEmail'));
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        shakeElement(document.getElementById('regPassword'));
        return false;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        shakeElement(document.getElementById('confirmPassword'));
        return false;
    }
    
    goToStep(2);
    return true;
}

function validateStep2() {
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    
    if (selectedInterests.length < 2) {
        showNotification('Please select at least 2 interests', 'error');
        return false;
    }
    
    goToStep(3);
    return true;
}

function updateReviewInfo() {
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const selectedInterests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
                                 .map(cb => cb.value)
                                 .join(', ');
    
    document.getElementById('reviewName').textContent = name || '-';
    document.getElementById('reviewEmail').textContent = email || '-';
    document.getElementById('reviewInterests').textContent = selectedInterests || '-';
}

// MAIN REGISTRATION FUNCTION - UPDATED FOR YOUR BACKEND
async function registerUser() {
    const agreeTerms = document.getElementById('agreeTerms');
    
    if (!agreeTerms.checked) {
        showNotification('Please agree to the terms and conditions', 'error');
        shakeElement(agreeTerms.parentElement);
        return;
    }
    
    // Collect form data - MATCHING YOUR BACKEND EXPECTATIONS
    const formData = {
        name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        interests: Array.from(document.querySelectorAll('input[name="interests"]:checked'))
                     .map(cb => cb.value)
    };
    
    // Show loading state
    setLoadingState(true);
    
    try {
        console.log('📤 Sending registration data:', formData);
        
        // Send registration data to your backend
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            credentials: 'include' // Important for sessions
        });
        
        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (response.ok && result.success) {
            showNotification('🎉 ' + result.message, 'success');
            
            // Save user data to localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                name: formData.name,
                email: formData.email,
                interests: formData.interests
            }));
            localStorage.setItem('userEmail', formData.email);
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } else {
            // Handle different error cases
            const errorMessage = result.error || result.message || 'Registration failed. Please try again.';
            showNotification('❌ ' + errorMessage, 'error');
            
            // If user already exists, go back to step 1
            if (errorMessage.includes('already exists')) {
                setTimeout(() => goToStep(1), 2000);
            }
        }
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        showNotification('❌ Network error. Please check your connection and try again.', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Utility functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
    console.log(`Notification (${type}):`, message);
}

function setLoadingState(isLoading) {
    const button = document.getElementById('registerBtn');
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = 'Creating Account... <div class="btn-loader"><div class="spinner"></div></div>';
        } else {
            button.disabled = false;
            button.innerHTML = '<span class="btn-text">Create Account</span><div class="btn-loader"><div class="spinner"></div></div>';
        }
    }
}

function shakeElement(element) {
    if (element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
}
// In login.html and register.html
function saveUserData(user) {
    localStorage.setItem('loginUser', JSON.stringify(user));
    localStorage.setItem('quizUser', JSON.stringify(user));
}


// Add required styles
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .progress-steps {
        --progress-width: 0%;
    }
    
    .progress-steps::after {
        width: var(--progress-width);
    }
    
    .btn-loader {
        display: inline-block;
        margin-left: 8px;
    }
    
    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('💝 Registration system ready! Make sure your backend is running on the same port.');