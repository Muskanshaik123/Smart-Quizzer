// DOM Elements
const adminLoginForm = document.getElementById('adminLoginForm');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');
const toggleAdminPassword = document.getElementById('toggleAdminPassword');
const rememberAdmin = document.getElementById('rememberAdmin');
const forgotAdminPassword = document.getElementById('forgotAdminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const closeModal = document.getElementById('closeModal');
const closeForgotModal = document.getElementById('closeForgotModal');
const notification = document.getElementById('notification');

// Initialize the admin login
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Admin Login - Initialized');
    
    // Check if already logged in as admin
    if (checkAdminAuthStatus()) {
        return; // Stop execution if redirecting
    }
    
    // Load saved admin credentials if "Remember me" was checked
    loadSavedAdminCredentials();
    
    // Add security animations
    addSecurityAnimations();
});

// Check admin authentication status
function checkAdminAuthStatus() {
    const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const adminUser = sessionStorage.getItem('adminUser');
    
    if (isAdminLoggedIn === 'true' && adminUser) {
        console.log('✅ Admin session found, redirecting to dashboard...');
        // Use replace to prevent going back to login page
        window.location.replace('admin-dashboard.html');
        return true;
    }
    
    console.log('❌ No active admin session');
    return false;
}

// Toggle password visibility
toggleAdminPassword.addEventListener('click', function() {
    const type = adminPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    adminPassword.setAttribute('type', type);
    
    const eyeIcon = this.querySelector('i');
    eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

// Show forgot password modal
forgotAdminPassword.addEventListener('click', function(e) {
    e.preventDefault();
    showModal(forgotPasswordModal);
});

// Close modals
closeModal.addEventListener('click', function() {
    hideModal(forgotPasswordModal);
});

closeForgotModal.addEventListener('click', function() {
    hideModal(forgotPasswordModal);
});

// Close modal when clicking outside
forgotPasswordModal.addEventListener('click', function(e) {
    if (e.target === forgotPasswordModal) {
        hideModal(forgotPasswordModal);
    }
});

// Admin login form submission
adminLoginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    handleAdminLogin();
});

// Handle admin login
async function handleAdminLogin() {
    const username = adminUsername.value.trim();
    const password = adminPassword.value;

    // Validate inputs
    if (!validateAdminInputs(username, password)) {
        return;
    }

    // Show loading state
    setLoadingState(adminLoginBtn, true);

    try {
        // Attempt server-side admin login
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            // Server-side login succeeded
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminUser', data.user?.name || username);
            sessionStorage.setItem('adminLoginTime', new Date().toISOString());

            if (rememberAdmin.checked) saveAdminCredentials(username); else clearSavedAdminCredentials();

            showNotification('✅ Login successful! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 800);
            return;
        }

        // If server responded but login failed, allow local fallback for default credentials
        if (!response.ok) {
            console.warn('Server login returned non-OK status:', response.status);
        }

        const localFallback = checkAdminCredentials(username, password);
        if (localFallback) {
            // Use client-side fallback (keeps previous behavior when server is unavailable)
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminUser', username);
            sessionStorage.setItem('adminLoginTime', new Date().toISOString());
            if (rememberAdmin.checked) saveAdminCredentials(username);
            showNotification('✅ Admin login (fallback) successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'admin-dashboard.html', 800);
        } else {
            showNotification(data.error || '❌ Invalid admin credentials', 'error');
            shakeElement(adminLoginForm);
            logFailedAttempt(username);
        }

    } catch (error) {
        console.error('Admin login network error:', error);

        // Network error - allow local fallback if default credentials used
        if (checkAdminCredentials(username, password)) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminUser', username);
            sessionStorage.setItem('adminLoginTime', new Date().toISOString());
            if (rememberAdmin.checked) saveAdminCredentials(username);
            showNotification('✅ Admin login (offline fallback) successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'admin-dashboard.html', 800);
        } else {
            showNotification('❌ Network error. Please try again later.', 'error');
        }
    } finally {
        setLoadingState(adminLoginBtn, false);
    }
}

// Simple credential check
function checkAdminCredentials(username, password) {
    const validCredentials = [
        { username: 'admin', password: 'admin123' },
        { username: 'superadmin', password: 'super123' },
        { username: 'administrator', password: 'admin2024' },
        { username: 'test', password: 'test123' }
    ];
    
    return validCredentials.some(cred => 
        cred.username === username && cred.password === password
    );
}

// Validate admin inputs
function validateAdminInputs(username, password) {
    if (!username) {
        showNotification('Please enter admin username', 'error');
        shakeElement(adminUsername);
        return false;
    }
    
    if (!password) {
        showNotification('Please enter admin password', 'error');
        shakeElement(adminPassword);
        return false;
    }
    
    return true;
}

// Log failed login attempt
function logFailedAttempt(username) {
    console.warn(`Failed login attempt for username: ${username}`);
}

// Use default credentials
function useDefaultCredentials() {
    adminUsername.value = 'admin';
    adminPassword.value = 'admin123';
    rememberAdmin.checked = true;
    
    showNotification('Default admin credentials loaded', 'info');
    adminLoginForm.classList.add('pulse');
    setTimeout(() => adminLoginForm.classList.remove('pulse'), 2000);
}

// Save admin credentials to localStorage
function saveAdminCredentials(username) {
    const credentials = {
        username: username,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('adminCredentials', JSON.stringify(credentials));
    } catch (error) {
        console.warn('Could not save credentials');
    }
}

// Load saved admin credentials
function loadSavedAdminCredentials() {
    try {
        const saved = localStorage.getItem('adminCredentials');
        if (saved) {
            const credentials = JSON.parse(saved);
            adminUsername.value = credentials.username;
            rememberAdmin.checked = true;
        }
    } catch (error) {
        // Ignore errors
    }
}

// Clear saved admin credentials
function clearSavedAdminCredentials() {
    try {
        localStorage.removeItem('adminCredentials');
    } catch (error) {
        // Ignore errors
    }
}

// Add security animations
function addSecurityAnimations() {
    const securityNotice = document.querySelector('.security-notice');
    if (securityNotice) {
        securityNotice.style.animation = 'pulse 3s ease-in-out infinite';
    }
}

// Utility Functions
function showModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function setLoadingState(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.opacity = '0';
        btnLoader.style.display = 'block';
        button.disabled = true;
    } else {
        btnText.style.opacity = '1';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

// Add CSS animations
if (!document.querySelector('#admin-animations')) {
    const style = document.createElement('style');
    style.id = 'admin-animations';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        .shake { animation: shake 0.5s ease-in-out; }
        .pulse { animation: pulse 2s ease-in-out; }
    `;
    document.head.appendChild(style);
}

// Quick test function
window.demoAdminLogin = function() {
    console.log('🚀 Demo login triggered');
    useDefaultCredentials();
    setTimeout(() => handleAdminLogin(), 500);
};

console.log('🔐 Admin Login system ready!');