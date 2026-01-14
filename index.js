// Get DOM elements
const registrationForm = document.getElementById('registrationForm');
const successMessage = document.getElementById('successMessage');
const signinBtn = document.getElementById('signinBtn');

// Form submission handler
// Form submission handler
registrationForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Collect form data
    const formData = {
        name: document.getElementById('name').value,
        year: document.getElementById('year').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        course: document.getElementById('course').value,
        college: document.getElementById('college').value
    };

    // Submit to backend
    fetch('http://training-center-backend-y3bq.onrender.com/api/applications/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Application submitted:', data);
        
        // Show success message
        successMessage.style.display = 'block';
        
        // Reset form
        registrationForm.reset();
        
        // Scroll to success message
        setTimeout(() => {
            successMessage.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    })
    .catch(error => {
        console.error('Error submitting application:', error);
        alert('Error submitting application. Please try again.');
    });
});

// Sign In button handler
signinBtn.addEventListener('click', function(e) {
    console.log('Sign In button clicked');
    window.location.href = 'signin.html';  // Redirect to Sign-In page
});


// Phone number validation
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', function(e) {
    // Remove non-numeric characters
    this.value = this.value.replace(/[^0-9]/g, '');
    
    // Limit to 10 digits
    if (this.value.length > 10) {
        this.value = this.value.slice(0, 10);
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Form validation feedback
const inputs = document.querySelectorAll('input[required], select[required]');
inputs.forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            this.style.borderColor = '#ff4444';
        } else {
            this.style.borderColor = '#4caf50';
        }
    });
    
    input.addEventListener('focus', function() {
        this.style.borderColor = '#00acc1';
    });
});

// Email validation
const emailInput = document.getElementById('email');
emailInput.addEventListener('blur', function() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.value && !emailPattern.test(this.value)) {
        this.style.borderColor = '#ff4444';
        console.log('Invalid email format');
    } else if (this.value) {
        this.style.borderColor = '#4caf50';
    }
});

// Optional: Function to send data to server
function sendDataToServer(data) {
    // Example AJAX call using Fetch API
    /*
    fetch('your-server-endpoint.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
    })
    .catch(error => {
        console.error('Error:', error);
    });
    */
}

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Console welcome message
console.log('%cWelcome to Vision tranZ IT Solutions!', 'color: #00acc1; font-size: 20px; font-weight: bold;');
console.log('%cTransforming Vision into Digital Reality', 'color: #00bcd4; font-size: 14px;');

// Add interactive effect for contact links
document.addEventListener('DOMContentLoaded', function() {
    const contactLinks = document.querySelectorAll('.contact-column a');
    
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Link clicked:', this.textContent);
            // Add your link navigation logic here
        });
    });
});