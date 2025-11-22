// Reset Password System
console.log('🔐 Reset Password System Started');

const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const resetPasswordForm = document.getElementById('resetPasswordForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const toggleNewPassword = document.getElementById('toggleNewPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Get token and email from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');
const email = urlParams.get('email');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Reset password page initialized');
    
    // Check if we have required parameters
    if (!resetToken || !email) {
        showNotification('❌ Invalid or expired reset link', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        return;
    }
    
    initializeResetPassword();
});

function initializeResetPassword() {
    // Password toggle for new password
    if (toggleNewPassword && newPasswordInput) {
        toggleNewPassword.addEventListener('click', function() {
            const type = newPasswordInput.type === 'password' ? 'text' : 'password';
            newPasswordInput.type = type;
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Password toggle for confirm password
    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Form submission
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePasswordReset();
        });
    }
    
    // Real-time password match validation
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value && this.value !== newPasswordInput.value) {
            this.style.borderColor = '#dc3545';
        } else {
            this.style.borderColor = '';
        }
    });
    
    console.log('✅ Reset password system ready!');
}

async function handlePasswordReset() {
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    // Validation
    if (!newPassword || !confirmPassword) {
        showNotification('❌ Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('❌ Password must be at least 6 characters', 'error');
        shakeElement(newPasswordInput.parentElement);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('❌ Passwords do not match', 'error');
        shakeElement(confirmPasswordInput.parentElement);
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                token: resetToken,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('✅ Password reset successful! Redirecting to login...', 'success');
            
            // Clear form
            resetPasswordForm.reset();
            
            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            showNotification(`❌ ${data.error || 'Failed to reset password'}`, 'error');
            
            // If token is invalid/expired, redirect to login
            if (data.error && data.error.includes('expired')) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
        }
        
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        showNotification('❌ Network error. Please try again later.', 'error');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    if (!resetBtn) return;
    
    const btnText = resetBtn.querySelector('.btn-text');
    const btnLoader = resetBtn.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.textContent = 'Resetting...';
        if (btnLoader) btnLoader.style.display = 'block';
        resetBtn.disabled = true;
    } else {
        btnText.textContent = 'Reset Password';
        if (btnLoader) btnLoader.style.display = 'none';
        resetBtn.disabled = false;
    }
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
    notif.className = 'notification';
    document.body.appendChild(notif);
    return notif;
}

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Add CSS for password hint
const style = document.createElement('style');
style.textContent = `
    .password-hint {
        display: block;
        margin-top: 5px;
        color: #666;
        font-size: 12px;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

console.log('🎯 Reset password system ready!');
