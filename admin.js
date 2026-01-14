// Backend API Configuration
const API_BASE_URL = 'http://training-center-backend-y3bq.onrender.com/api';

// Data Storage
let users = [];
let classes = [];
let fees = [];

// Get logged user from session
let loggedUser = JSON.parse(sessionStorage.getItem("loggedUser"));

// Session verification flag
let isSessionVerified = false;
let verificationAttempts = 0;
const MAX_VERIFICATION_ATTEMPTS = 3;

// Check authentication on page load
if (!loggedUser || loggedUser.role !== "ADMIN") {
    alert("Access denied! Admin login required.");
    window.location.href = "signin.html";
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Loaded, logged user:', loggedUser);
    
    // Show verification modal on load
    showVerificationModal();
    
    setupEventListeners();
    setupBrowserNavigationProtection();
    
    // Set today's date as default for payment date
    const paymentDateField = document.getElementById('paymentDate');
    if (paymentDateField) {
        paymentDateField.valueAsDate = new Date();
    }
});

// Setup Browser Navigation Protection (Back/Forward buttons)
function setupBrowserNavigationProtection() {
    // Add state to history for detecting navigation
    window.history.pushState({ verified: true }, '', window.location.href);
    
    // Detect browser back/forward navigation
    window.addEventListener('popstate', function(event) {
        console.log('Browser navigation detected');
        
        // Reset verification
        isSessionVerified = false;
        verificationAttempts = 0;
        
        // Show verification modal again
        showVerificationModal();
        
        // Push state back
        window.history.pushState({ verified: true }, '', window.location.href);
    });
    
    // Detect page visibility change (tab switching)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // Check if session needs reverification after being away
            const lastActivity = sessionStorage.getItem('lastActivity');
            const now = Date.now();
            
            // If away for more than 5 minutes, require reverification
            if (lastActivity && (now - parseInt(lastActivity)) > 300000) {
                console.log('Session timeout - reverification required');
                isSessionVerified = false;
                verificationAttempts = 0;
                showVerificationModal();
            }
        } else {
            // Store last activity time
            sessionStorage.setItem('lastActivity', Date.now().toString());
        }
    });
    
    // Track activity on page
    window.addEventListener('beforeunload', function(e) {
        sessionStorage.setItem('lastActivity', Date.now().toString());
    });
}

// Show Verification Modal
function showVerificationModal() {
    const modal = document.getElementById('passwordVerificationModal');
    const emailInput = document.getElementById('verifyEmail');
    const passwordInput = document.getElementById('verifyPassword');
    const errorDiv = document.getElementById('verificationError');
    
    if (!modal) return;
    
    // Set email (readonly)
    if (emailInput && loggedUser) {
        emailInput.value = loggedUser.email;
    }
    
    // Clear password and error
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    
    // Show modal
    modal.classList.add('active');
    
    // Disable main content interaction
    document.body.style.overflow = 'hidden';
}

// Hide Verification Modal
function hideVerificationModal() {
    const modal = document.getElementById('passwordVerificationModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Mark session as verified
    isSessionVerified = true;
    sessionStorage.setItem('lastActivity', Date.now().toString());
    
    // Load all data
    loadAllData();
}

// Handle Password Verification
async function handleVerification(e) {
    e.preventDefault();
    
    const email = document.getElementById('verifyEmail').value;
    const password = document.getElementById('verifyPassword').value;
    const errorDiv = document.getElementById('verificationError');
    const submitBtn = e.target.querySelector('.submit-btn');
    
    if (!password) {
        showVerificationError('Please enter your password');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;
    
    try {
        // Verify password with backend
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
        
        if (!response.ok) {
            throw new Error('Invalid password');
        }
        
        const user = await response.json();
        
        // Verify role matches
        if (user.role.toUpperCase() !== 'ADMIN') {
            throw new Error('Invalid credentials for admin dashboard');
        }
        
        // Update session with fresh data
        loggedUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.toUpperCase()
        };
        sessionStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        
        // Reset attempts
        verificationAttempts = 0;
        
        // Hide modal and load data
        hideVerificationModal();
        
        console.log('Verification successful');
        
    } catch (error) {
        console.error('Verification error:', error);
        verificationAttempts++;
        
        if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            alert('Maximum verification attempts exceeded. Please login again.');
            signOut();
            return;
        }
        
        showVerificationError(`Invalid password. ${MAX_VERIFICATION_ATTEMPTS - verificationAttempts} attempts remaining.`);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Clear password
        document.getElementById('verifyPassword').value = '';
        document.getElementById('verifyPassword').focus();
    }
}

// Show Verification Error
function showVerificationError(message) {
    const errorDiv = document.getElementById('verificationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Cancel Verification
function cancelVerification() {
    if (confirm('Are you sure you want to cancel? You will be signed out.')) {
        signOut();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            if (!isSessionVerified) {
                showVerificationModal();
                return;
            }
            const section = this.dataset.section;
            switchSection(section);
        });
    });
    
    // Add buttons
    const addUserBtn = document.getElementById('addUserBtn');
    const addClassBtn = document.getElementById('addClassBtn');
    const signoutBtn = document.getElementById('signoutBtn');
    
    if (addUserBtn) addUserBtn.addEventListener('click', () => {
        if (!isSessionVerified) {
            showVerificationModal();
            return;
        }
        openUserModal();
    });
    
    if (addClassBtn) addClassBtn.addEventListener('click', () => {
        if (!isSessionVerified) {
            showVerificationModal();
            return;
        }
        openClassModal();
    });
    
    if (signoutBtn) signoutBtn.addEventListener('click', signOut);
    
    // Form submissions
    const userForm = document.getElementById('userForm');
    const classForm = document.getElementById('classForm');
    const feeForm = document.getElementById('feeForm');
    
    if (userForm) userForm.addEventListener('submit', saveUser);
    if (classForm) classForm.addEventListener('submit', saveClass);
    if (feeForm) feeForm.addEventListener('submit', recordPayment);
    
    // Verification form
    const verificationForm = document.getElementById('verificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    // Phone input validation
    const phoneInput = document.getElementById('userPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }
}

// Load all data
async function loadAllData() {
    console.log('Loading all data...');
    
    try {
        // Load classes first (needed for user batch dropdown)
        await loadClassesFromDB();
        
        // Then load users
        await loadUsersFromDB();
        
        // Load fees
        await loadFeesFromDB();
        
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load Users from Backend
function loadUsersFromDB() {
    return new Promise((resolve, reject) => {
        console.log('Loading users from database...');
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/users`, {
            method: "GET",
            headers: headers
        })
        .then(res => {
            console.log('Users API response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('Users loaded:', data);
            users = Array.isArray(data) ? data : [];
            renderUsersTable();
            resolve(users);
        })
        .catch(err => {
            console.error("Error loading users:", err);
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="7" style="color: red;">
                            Failed to load users: ${err.message}<br>
                            <button onclick="loadUsersFromDB()" style="margin-top: 10px; padding: 8px 16px; background: #00acc1; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Retry
                            </button>
                        </td>
                    </tr>
                `;
            }
            reject(err);
        });
    });
}

// Load Classes from Backend
function loadClassesFromDB() {
    return new Promise((resolve, reject) => {
        console.log('Loading classes from database...');
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/classes`, {
            method: "GET",
            headers: headers
        })
        .then(res => {
            console.log('Classes API response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('Classes loaded:', data);
            classes = Array.isArray(data) ? data : [];
            renderClassesTable();
            resolve(classes);
        })
        .catch(err => {
            console.error("Error loading classes:", err);
            const tbody = document.getElementById('classesTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="6" style="color: red;">
                            Failed to load classes: ${err.message}<br>
                            <button onclick="loadClassesFromDB()" style="margin-top: 10px; padding: 8px 16px; background: #00acc1; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Retry
                            </button>
                        </td>
                    </tr>
                `;
            }
            reject(err);
        });
    });
}

// Load Fees from Backend
function loadFeesFromDB() {
    return new Promise((resolve, reject) => {
        console.log('Loading fees from database...');
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/fees`, {
            method: "GET",
            headers: headers
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('Fees loaded:', data);
            fees = Array.isArray(data) ? data : [];
            renderFeesTable();
            resolve(fees);
        })
        .catch(err => {
            console.error("Error loading fees:", err);
            const tbody = document.getElementById('feesTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="8">Failed to load fees: ${err.message}</td>
                    </tr>
                `;
            }
            reject(err);
        });
    });
}

// Render Users Table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">No users found. Create your first user above.</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const className = user.classInfo ? user.classInfo.name : 'Not Assigned';
        const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        const formattedRole = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) : 'Unknown';
        
        return `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${className}</td>
                <td><span class="status-badge active">${formattedRole}</span></td>
                <td>${created}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="openUserModal(${user.id})">Edit</button>
                        <button class="action-btn delete" onclick="deleteUser(${user.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Classes Table
function renderClassesTable() {
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) return;
    
    if (classes.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No classes found. Create your first class above.</td></tr>';
        return;
    }
    
    tbody.innerHTML = classes.map(cls => {
        const teacher = users.find(u => u.id === cls.teacherId);
        const teacherName = teacher ? teacher.name : cls.teacherName || 'Not Assigned';
        const startDate = cls.startDate ? new Date(cls.startDate).toLocaleDateString() : 'N/A';
        
        return `
            <tr>
                <td>${cls.name}</td>
                <td>${teacherName}</td>
                <td>${startDate}</td>
                <td>${cls.schedule}</td>
                <td><span class="status-badge ${cls.status.toLowerCase()}">${cls.status}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="openClassModal(${cls.id})">Edit</button>
                        <button class="action-btn delete" onclick="deleteClass(${cls.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Fees Table
function renderFeesTable() {
    const tbody = document.getElementById('feesTableBody');
    if (!tbody) return;
    
    if (fees.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No fee records yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = fees.map(fee => {
        const studentName = fee.student ? fee.student.name : 'Unknown';
        const className = fee.class ? fee.class.name : 'Unknown';
        const statusClass = fee.status.toLowerCase();
        const dueDate = fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'Not set';
        
        return `
            <tr>
                <td>${studentName}</td>
                <td>${className}</td>
                <td>₹${fee.totalAmount}</td>
                <td>₹${fee.paidAmount}</td>
                <td>₹${fee.dueAmount}</td>
                <td>${dueDate}</td>
                <td><span class="status-badge ${statusClass}">${fee.status}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="openPaymentModal(${fee.id})">Record Payment</button>
                        <button class="action-btn delete" onclick="deleteFee(${fee.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Section Switching
function switchSection(section) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-section="${section}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const activeSection = document.getElementById(`${section}-section`);
    if (activeSection) activeSection.classList.add('active');
}

// USER MANAGEMENT
function openUserModal(userId = null) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    if (!modal || !form) return;
    
    form.reset();
    
    // Populate batch dropdown with current classes
    const batchSelect = document.getElementById('userBatch');
    if (batchSelect) {
        batchSelect.innerHTML = '<option value="">Not Assigned</option>';
        
        // Add all available classes to dropdown
        console.log('Populating batch dropdown with classes:', classes);
        classes.forEach(cls => {
            batchSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
    }
    
    // Update password note visibility
    const passwordNote = document.getElementById('passwordNote');
    const passwordInput = document.getElementById('userPassword');
    
    if (userId) {
        // EDIT MODE
        console.log('Loading user for edit:', userId);
        
        if (passwordNote) passwordNote.style.display = 'inline';
        if (passwordInput) passwordInput.required = false;
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: "GET",
            headers: headers
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('Failed to fetch user details');
            }
            return res.json();
        })
        .then(user => {
            console.log('User data loaded for edit:', user);
            
            document.getElementById('userModalTitle').textContent = 'Edit User';
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userPhone').value = user.phone || '';
            
            // Set role
            const roleValue = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
            document.getElementById('userRole').value = roleValue;
            
            // Set batch/class
            console.log('User classId:', user.classId);
            if (user.classId && batchSelect) {
                batchSelect.value = user.classId;
                console.log('Set batch dropdown to:', user.classId);
            } else if (batchSelect) {
                batchSelect.value = '';
            }
            
            // Clear password field for edit
            document.getElementById('userPassword').value = '';
            
            modal.classList.add('active');
        })
        .catch(err => {
            console.error("Error loading user for edit:", err);
            alert("Failed to load user details: " + err.message);
        });
        
    } else {
        // ADD NEW USER MODE
        document.getElementById('userModalTitle').textContent = 'Add User';
        if (passwordNote) passwordNote.style.display = 'none';
        if (passwordInput) passwordInput.required = true;
        modal.classList.add('active');
    }
}

function saveUser(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;
    const role = document.getElementById('userRole').value.toUpperCase();
    const batch = document.getElementById('userBatch').value;
    const password = document.getElementById('userPassword').value;

    if (!name || !email || !role) {
        alert("Please fill all required fields");
        return;
    }

    if (!userId && !password) {
        alert("Password is required for new users");
        return;
    }

    const headers = {
        "Content-Type": "application/json"
    };
    
    if (loggedUser && loggedUser.token) {
        headers["Authorization"] = `Bearer ${loggedUser.token}`;
    }

    if (userId) {
        // UPDATE EXISTING USER
        const requestBody = {
            name: name,
            email: email,
            role: role,
            phone: phone,
            batch: batch || null
        };
        
        if (password && password.trim() !== '') {
            requestBody.password = password;
        }
        
        console.log('Updating user:', requestBody);
        
        fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(requestBody)
        })
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(text || "Failed to update user");
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('User updated:', data);
            alert("User updated successfully!");
            closeModal('userModal');
            loadUsersFromDB();
        })
        .catch(err => {
            console.error("Error updating user:", err);
            alert("Error updating user: " + err.message);
        });
        
    } else {
        // CREATE NEW USER
        let apiUrl = "";
        if (role === "TEACHER") {
            apiUrl = `${API_BASE_URL}/admin/create-teacher`;
        } else if (role === "STUDENT") {
            apiUrl = `${API_BASE_URL}/admin/create-student`;
        } else if (role === "ADMIN") {
            apiUrl = `${API_BASE_URL}/admin/create-admin`;
        } else {
            alert("Invalid role selected");
            return;
        }

        const requestBody = {
            name: name,
            email: email,
            password: password,
            phone: phone,
            batch: batch || null
        };

        console.log('Creating user:', requestBody);

        fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody)
        })
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(text || "Failed to create user");
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('User created:', data);
            alert("User created successfully!");
            closeModal('userModal');
            loadUsersFromDB();
        })
        .catch(err => {
            console.error("Error saving user:", err);
            alert("Error creating user: " + err.message);
        });
    }
}

function deleteUser(userId) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    if (confirm('Are you sure you want to delete this user?')) {
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: "DELETE",
            headers: headers
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete user");
            return res.json();
        })
        .then(() => {
            alert("User deleted successfully!");
            loadUsersFromDB();
        })
        .catch(err => {
            console.error("Error deleting user:", err);
            alert("Failed to delete user: " + err.message);
        });
    }
}

// CLASS MANAGEMENT
function openClassModal(classId = null) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    const modal = document.getElementById('classModal');
    const form = document.getElementById('classForm');
    if (!modal || !form) return;
    
    form.reset();
    
    // Populate teacher dropdown
    const teacherSelect = document.getElementById('classTeacher');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Select Teacher</option>';
        const teachers = users.filter(u => u.role && u.role.toUpperCase() === 'TEACHER');
        teachers.forEach(teacher => {
            teacherSelect.innerHTML += `<option value="${teacher.id}">${teacher.name}</option>`;
        });
    }
    
    if (classId) {
        const cls = classes.find(c => c.id === classId);
        if (cls) {
            document.getElementById('classModalTitle').textContent = 'Edit Class';
            document.getElementById('classId').value = cls.id;
            document.getElementById('className').value = cls.name;
            if (teacherSelect) teacherSelect.value = cls.teacherId || '';
            document.getElementById('classStartDate').value = cls.startDate;
            document.getElementById('classSchedule').value = cls.schedule;
            document.getElementById('classStatus').value = cls.status;
            document.getElementById('classFee').value = cls.fee;
        }
    } else {
        document.getElementById('classModalTitle').textContent = 'Add Class';
    }
    
    modal.classList.add('active');
}

function saveClass(e) {
    e.preventDefault();
    
    const classId = document.getElementById('classId').value;
    const teacherId = document.getElementById('classTeacher').value;
    
    const classData = {
        name: document.getElementById('className').value,
        teacherId: teacherId || null,
        startDate: document.getElementById('classStartDate').value,
        schedule: document.getElementById('classSchedule').value,
        status: document.getElementById('classStatus').value,
        fee: parseFloat(document.getElementById('classFee').value)
    };
    
    const apiUrl = classId 
        ? `${API_BASE_URL}/admin/classes/${classId}` 
        : `${API_BASE_URL}/admin/classes`;
    const method = classId ? "PUT" : "POST";
    
    const headers = {
        "Content-Type": "application/json"
    };
    
    if (loggedUser && loggedUser.token) {
        headers["Authorization"] = `Bearer ${loggedUser.token}`;
    }
    
    fetch(apiUrl, {
        method: method,
        headers: headers,
        body: JSON.stringify(classData)
    })
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throw new Error(text || "Failed to save class");
            });
        }
        return res.json();
    })
    .then(() => {
        alert("Class saved successfully!");
        closeModal('classModal');
        loadClassesFromDB();
    })
    .catch(err => {
        console.error("Error saving class:", err);
        alert("Error: " + err.message);
    });
}

function deleteClass(classId) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    if (confirm('Are you sure you want to delete this class?')) {
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/classes/${classId}`, {
            method: "DELETE",
            headers: headers
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete class");
            return res.json();
        })
        .then(() => {
            alert("Class deleted successfully!");
            loadClassesFromDB();
        })
        .catch(err => {
            console.error("Error deleting class:", err);
            alert("Failed to delete class: " + err.message);
        });
    }
}

// FEE MANAGEMENT
function openPaymentModal(feeId) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return;
    
    const modal = document.getElementById('feeModal');
    document.getElementById('feeId').value = fee.id;
    document.getElementById('feeStudentName').textContent = fee.student ? fee.student.name : 'Unknown';
    document.getElementById('feeClassName').textContent = fee.class ? fee.class.name : 'Unknown';
    document.getElementById('feeTotalAmount').textContent = fee.totalAmount;
    document.getElementById('feePaidAmount').textContent = fee.paidAmount;
    document.getElementById('feeRemainingAmount').textContent = fee.dueAmount;
    
    modal.classList.add('active');
}

function recordPayment(e) {
    e.preventDefault();
    
    const feeId = document.getElementById('feeId').value;
    const paymentData = {
        amount: parseFloat(document.getElementById('paymentAmount').value),
        date: document.getElementById('paymentDate').value,
        method: document.getElementById('paymentMethod').value
    };
    
    const headers = {
        "Content-Type": "application/json"
    };
    
    if (loggedUser && loggedUser.token) {
        headers["Authorization"] = `Bearer ${loggedUser.token}`;
    }
    
    fetch(`${API_BASE_URL}/admin/fees/${feeId}/payment`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(paymentData)
    })
    .then(res => {
        if (!res.ok) {
            return res.text().then(text => {
                throw new Error(text || "Failed to record payment");
            });
        }
        return res.json();
    })
    .then(() => {
        alert("Payment recorded successfully!");
        closeModal('feeModal');
        loadFeesFromDB();
    })
    .catch(err => {
        console.error("Error recording payment:", err);
        alert("Error: " + err.message);
    });
}

function deleteFee(feeId) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    if (confirm('Are you sure you want to delete this fee record?')) {
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (loggedUser && loggedUser.token) {
            headers["Authorization"] = `Bearer ${loggedUser.token}`;
        }
        
        fetch(`${API_BASE_URL}/admin/fees/${feeId}`, {
            method: "DELETE",
            headers: headers
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete fee");
            return res.json();
        })
        .then(() => {
            alert("Fee deleted successfully!");
            loadFeesFromDB();
        })
        .catch(err => {
            console.error("Error deleting fee:", err);
            alert("Failed to delete fee: " + err.message);
        });
    }
}

// Utility Functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function signOut() {
    sessionStorage.removeItem('loggedUser');
    sessionStorage.removeItem('lastActivity');
    window.location.href = 'signin.html';
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal') && e.target.id !== 'passwordVerificationModal') {
        e.target.classList.remove('active');
    }
});

console.log('%cAdmin Dashboard Loaded', 'color: #00acc1; font-size: 16px; font-weight: bold;');
console.log('Logged in as:', loggedUser);
console.log('Backend URL:', API_BASE_URL);