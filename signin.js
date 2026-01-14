// Backend API Configuration
const API_BASE_URL = 'https://training-center-backend-y3bq.onrender.com/api'; // Your Spring Boot backend

// Get DOM elements
const signinForm = document.getElementById('signinForm');
const adminTab = document.getElementById('adminTab');
const teacherTab = document.getElementById('teacherTab');
const studentTab = document.getElementById('studentTab');
const roleText = document.getElementById('roleText');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Current role state
let currentRole = 'STUDENT'; // Store in uppercase to match backend

// Role tab switching
function switchRole(role, activeTab) {
    // Remove active class from all tabs
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    activeTab.classList.add('active');
    
    // Update role
    currentRole = role;
    
    // Update display text (capitalize first letter only)
    const displayRole = role.charAt(0) + role.slice(1).toLowerCase();
    roleText.textContent = displayRole;
    
    console.log(`Switched to ${role} role`);
}

// Event listeners for role tabs
adminTab.addEventListener('click', function() {
    switchRole('ADMIN', this);
});

teacherTab.addEventListener('click', function() {
    switchRole('TEACHER', this);
});

studentTab.addEventListener('click', function() {
    switchRole('STUDENT', this);
});

// Form submission handler with Backend API
signinForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Login attempt:', { email, role: currentRole });
    
    // Validate inputs
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.signin-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;
    
    try {
        // Call backend login API
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Login failed');
        }
        
        const user = await response.json();
        console.log('Login successful, user:', user);
        
        // Verify role matches
        if (user.role.toUpperCase() !== currentRole) {
            throw new Error(`Please select the correct role. You are a ${user.role}, but selected ${currentRole}.`);
        }
        
        // Store user info in sessionStorage
        sessionStorage.setItem('loggedUser', JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.toUpperCase()
        }));
        
        alert(`Welcome, ${user.name}!`);
        
        // Redirect based on role
        switch (user.role.toUpperCase()) {
            case 'ADMIN':
                window.location.href = 'admin.html';
                break;
            case 'TEACHER':
                window.location.href = 'teacher.html';
                break;
            case 'STUDENT':
                window.location.href = 'student.html';
                break;
            default:
                throw new Error('Unknown user role: ' + user.role);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message + '\n\nPlease check:\n1. Email and password are correct\n2. You selected the correct role\n3. Backend server is running on port 8081');
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Clear password field for security
        passwordInput.value = '';
    }
});

// Email validation
emailInput.addEventListener('blur', function() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.value && !emailPattern.test(this.value)) {
        this.style.borderColor = '#ff4444';
    } else if (this.value) {
        this.style.borderColor = '#4caf50';
    }
});

// Input focus effects
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.style.borderColor = '#00acc1';
    });
    
    input.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            this.style.borderColor = '#e0e0e0';
        }
    });
});

// Forgot password link
document.querySelector('.forgot-password').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Please contact your administrator to reset your password.\n\nAdmin Email: admin@visiontranz.com');
});

// Console welcome message
console.log('%cVision tranZ IT Solutions - Sign In', 'color: #00acc1; font-size: 18px; font-weight: bold;');
console.log('%cBackend API:', API_BASE_URL);

// Auto-focus email input on page load
window.addEventListener('load', function() {
    emailInput.focus();
});

// Keyboard shortcuts for role switching (Alt + 1/2/3)
document.addEventListener('keydown', function(e) {
    if (e.altKey) {
        if (e.key === '1') {
            switchRole('ADMIN', adminTab);
        } else if (e.key === '2') {
            switchRole('TEACHER', teacherTab);
        } else if (e.key === '3') {
            switchRole('STUDENT', studentTab);
        }
    }
});