// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://training-center-backend-y3bq.onrender.com/api';

// ==================== GLOBAL DATA STORAGE ====================
let teacherClasses = [];
let students = [];
let schedules = [];
let tests = [];
let testResults = [];
let fees = [];
let applications = [];
let currentTeacher = null;
let questionCounter = 0;

// Session verification
let isSessionVerified = false;
let verificationAttempts = 0;
const MAX_VERIFICATION_ATTEMPTS = 3;

// ==================== INITIALIZATION ====================

// Get current teacher from session storage
function getCurrentTeacher() {
    const loggedUser = JSON.parse(sessionStorage.getItem("loggedUser"));
    if (loggedUser && loggedUser.role === "TEACHER") {
        return loggedUser;
    }
    return null;
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    currentTeacher = getCurrentTeacher();
    
    if (!currentTeacher) {
        alert("Please login as teacher first!");
        window.location.href = 'signin.html';
        return;
    }
    
    // Show verification modal on load
    showVerificationModal();
    
    // Setup event listeners and browser navigation protection
    setupEventListeners();
    setupBrowserNavigationProtection();
});

// ==================== BROWSER NAVIGATION PROTECTION ====================

function setupBrowserNavigationProtection() {
    // Add state to history
    window.history.pushState({ verified: true }, '', window.location.href);
    
    // Detect browser back/forward navigation
    window.addEventListener('popstate', function(event) {
        console.log('Browser navigation detected - ACCESS DENIED');
        
        // Reset verification
        isSessionVerified = false;
        verificationAttempts = 0;
        
        // Show verification modal
        showVerificationModal();
        
        // Push state back
        window.history.pushState({ verified: true }, '', window.location.href);
    });
    
    // Detect page visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
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
            sessionStorage.setItem('lastActivity', Date.now().toString());
        }
    });
    
    window.addEventListener('beforeunload', function(e) {
        sessionStorage.setItem('lastActivity', Date.now().toString());
    });
}

// ==================== VERIFICATION MODAL ====================

function showVerificationModal() {
    const modal = document.getElementById('passwordVerificationModal');
    const emailInput = document.getElementById('verifyEmail');
    const passwordInput = document.getElementById('verifyPassword');
    const errorDiv = document.getElementById('verificationError');
    
    if (!modal) return;
    
    if (emailInput && currentTeacher) {
        emailInput.value = currentTeacher.email;
    }
    
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideVerificationModal() {
    const modal = document.getElementById('passwordVerificationModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    isSessionVerified = true;
    sessionStorage.setItem('lastActivity', Date.now().toString());
    
    // Display teacher name
    const teacherNameEl = document.getElementById('teacherName');
    if (teacherNameEl) {
        teacherNameEl.textContent = `Logged in as: ${currentTeacher.name}`;
    }
    
    // Load all data
    loadTeacherData();
}

async function handleVerification(e) {
    e.preventDefault();
    
    const email = document.getElementById('verifyEmail').value;
    const password = document.getElementById('verifyPassword').value;
    const submitBtn = e.target.querySelector('.submit-btn');
    
    if (!password) {
        showVerificationError('Please enter your password');
        return;
    }
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;
    
    try {
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
        
        if (user.role.toUpperCase() !== 'TEACHER') {
            throw new Error('Invalid credentials for teacher dashboard');
        }
        
        currentTeacher = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.toUpperCase()
        };
        sessionStorage.setItem('loggedUser', JSON.stringify(currentTeacher));
        
        verificationAttempts = 0;
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
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        document.getElementById('verifyPassword').value = '';
        document.getElementById('verifyPassword').focus();
    }
}

function showVerificationError(message) {
    const errorDiv = document.getElementById('verificationError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function cancelVerification() {
    if (confirm('Are you sure you want to cancel? You will be signed out.')) {
        signOut();
    }
}

// ==================== EVENT LISTENERS SETUP ====================

function setupEventListeners() {
    // Verification form
    const verificationForm = document.getElementById('verificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    // Navigation tabs - require verification
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            if (!isSessionVerified) {
                showVerificationModal();
                return;
            }
            switchSection(this.dataset.section);
        });
    });
    
    // Sign Out Button
    const signoutBtn = document.getElementById('signoutBtn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', signOut);
    }
    
    // Add Class Button
    const addClassBtn = document.getElementById('addClassBtn');
    if (addClassBtn) {
        addClassBtn.addEventListener('click', () => {
            if (!isSessionVerified) {
                showVerificationModal();
                return;
            }
            openClassModal();
        });
    }
    
    // Create Test Button
    const createTestBtn = document.getElementById('createTestBtn');
    if (createTestBtn) {
        createTestBtn.addEventListener('click', () => {
            if (!isSessionVerified) {
                showVerificationModal();
                return;
            }
            openTestModal();
        });
    }
    
    // Add Fee Button
    const addFeeBtn = document.getElementById('addFeeBtn');
    if (addFeeBtn) {
        addFeeBtn.addEventListener('click', () => {
            if (!isSessionVerified) {
                showVerificationModal();
                return;
            }
            openFeeModal();
        });
    }
    
    // Batch filter for students
    const batchFilter = document.getElementById('batchFilter');
    if (batchFilter) {
        batchFilter.addEventListener('change', filterStudentsByBatch);
    }
    
    // Form submissions
    const classForm = document.getElementById('classForm');
    if (classForm) {
        classForm.addEventListener('submit', saveClass);
    }
    
    const testForm = document.getElementById('testForm');
    if (testForm) {
        testForm.addEventListener('submit', saveTest);
    }
    
    const feeForm = document.getElementById('feeForm');
    if (feeForm) {
        feeForm.addEventListener('submit', saveFee);
    }
    
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', recordPayment);
    }
    
    // Add question buttons
    const addMCQBtn = document.getElementById('addMCQBtn');
    if (addMCQBtn) {
        addMCQBtn.addEventListener('click', () => addQuestion('MCQ'));
    }
    
    const addProgrammingBtn = document.getElementById('addProgrammingBtn');
    if (addProgrammingBtn) {
        addProgrammingBtn.addEventListener('click', () => addQuestion('Programming'));
    }
    
    // Fee batch change listener
    const feeBatch = document.getElementById('feeBatch');
    if (feeBatch) {
        feeBatch.addEventListener('change', function() {
            const studentSelect = document.getElementById('feeStudent');
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select student</option>';
                
                const selectedClassStudents = students.filter(s => s.classId == this.value);
                selectedClassStudents.forEach(student => {
                    studentSelect.innerHTML += `<option value="${student.id}">${student.name}</option>`;
                });
            }
        });
    }
}

// ==================== DATA LOADING ====================

async function loadTeacherData() {
    try {
        console.log('🔄 Loading teacher data for ID:', currentTeacher.id);
        
        // Load teacher's classes
        try {
            const classesResponse = await fetch(`${API_BASE_URL}/teacher/my-classes/${currentTeacher.id}`);
            if (classesResponse.ok) {
                teacherClasses = await classesResponse.json();
                console.log('✅ Classes loaded:', teacherClasses.length);
            } else {
                console.log('⚠️ Classes endpoint returned error');
                teacherClasses = [];
            }
        } catch (error) {
            console.log('⚠️ Classes endpoint not available');
            teacherClasses = [];
        }
        
        // Load teacher's students
        try {
            const studentsResponse = await fetch(`${API_BASE_URL}/teacher/my-students/${currentTeacher.id}`);
            if (studentsResponse.ok) {
                students = await studentsResponse.json();
                console.log('✅ Students loaded:', students.length);
            } else {
                console.log('⚠️ Students endpoint returned error');
                students = [];
            }
        } catch (error) {
            console.log('⚠️ Students endpoint not available');
            students = [];
        }
        
        // Load schedules
        try {
            const schedulesResponse = await fetch(`${API_BASE_URL}/teacher/schedules/${currentTeacher.id}`);
            if (schedulesResponse.ok) {
                schedules = await schedulesResponse.json();
                console.log('✅ Schedules loaded:', schedules.length);
            } else {
                console.log('⚠️ Schedules endpoint returned error');
                schedules = [];
            }
        } catch (error) {
            console.log('⚠️ Schedules endpoint not available');
            schedules = [];
        }
        
        // Load tests
        try {
            const testsResponse = await fetch(`${API_BASE_URL}/teacher/tests/${currentTeacher.id}`);
            if (testsResponse.ok) {
                tests = await testsResponse.json();
                console.log('✅ Tests loaded:', tests.length);
            } else {
                console.log('⚠️ Tests endpoint returned error');
                tests = [];
            }
        } catch (error) {
            console.log('⚠️ Tests endpoint not available');
            tests = [];
        }
        
        // Load test results
        try {
            const resultsResponse = await fetch(`${API_BASE_URL}/teacher/results/${currentTeacher.id}`);
            if (resultsResponse.ok) {
                testResults = await resultsResponse.json();
                console.log('✅ Results loaded:', testResults.length);
            } else {
                console.log('⚠️ Results endpoint returned error');
                testResults = [];
            }
        } catch (error) {
            console.log('⚠️ Results endpoint not available');
            testResults = [];
        }
        
        // Load fees
        try {
            const feesResponse = await fetch(`${API_BASE_URL}/admin/fees`);
            if (feesResponse.ok) {
                const allFees = await feesResponse.json();
                const studentIds = students.map(s => s.id);
                fees = allFees.filter(fee => studentIds.includes(fee.studentId));
                console.log('✅ Fees loaded:', fees.length);
            } else {
                console.log('⚠️ Fees endpoint returned error');
                fees = [];
            }
        } catch (error) {
            console.log('⚠️ Fees endpoint not available');
            fees = [];
        }
        
        // Load applications
        try {
            const appsResponse = await fetch(`${API_BASE_URL}/applications/all`);
            if (appsResponse.ok) {
                const allApplications = await appsResponse.json();
                applications = allApplications.filter(app => app.status === 'PENDING');
                console.log('✅ Applications loaded:', applications.length);
            } else {
                console.log('⚠️ Applications endpoint returned error');
                applications = [];
            }
        } catch (error) {
            console.log('⚠️ Applications endpoint not available');
            applications = [];
        }
        
        // Render all tables after data is loaded
        renderAllTables();
        
        console.log('✅ All teacher data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading teacher data:', error);
        console.log('⚠️ Continuing with available data...');
        renderAllTables();
    }
}

// ==================== SECTION SWITCHING ====================

function switchSection(section) {
    if (!isSessionVerified) {
        showVerificationModal();
        return;
    }
    
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`[data-section="${section}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update active section
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    const activeSection = document.getElementById(`${section}-section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // Handle section-specific initialization
    if (section === 'progress') {
        renderProgressCharts();
    } else if (section === 'schedule') {
        initializeScheduleSection();
    } else if (section === 'applications') {
        renderApplicationsTable();
    }
}

// ==================== CLASS MANAGEMENT ====================

function openClassModal(classId = null) {
    const modal = document.getElementById('classModal');
    const form = document.getElementById('classForm');
    if (!modal || !form) return;
    
    form.reset();
    
    if (classId) {
        const cls = teacherClasses.find(c => c.id === classId);
        if (cls) {
            document.getElementById('classModalTitle').textContent = 'Edit Class';
            document.getElementById('classId').value = cls.id;
            document.getElementById('className').value = cls.name;
            document.getElementById('classStartDate').value = cls.startDate;
            document.getElementById('classSchedule').value = cls.schedule;
            document.getElementById('classStatus').value = cls.status;
            document.getElementById('classFee').value = cls.fee;
        }
    } else {
        document.getElementById('classModalTitle').textContent = 'Create New Class';
    }
    
    modal.classList.add('active');
}

async function saveClass(e) {
    e.preventDefault();
    
    const classId = document.getElementById('classId').value;
    
    const classData = {
        name: document.getElementById('className').value,
        teacherId: currentTeacher.id,
        startDate: document.getElementById('classStartDate').value,
        schedule: document.getElementById('classSchedule').value,
        status: document.getElementById('classStatus').value,
        fee: parseFloat(document.getElementById('classFee').value)
    };
    
    try {
        const url = classId 
            ? `${API_BASE_URL}/admin/classes/${classId}` 
            : `${API_BASE_URL}/admin/classes`;
        const method = classId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(classData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save class');
        }
        
        alert('Class saved successfully!');
        closeModal('classModal');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error saving class:', error);
        alert('Error saving class: ' + error.message);
    }
}

function renderClassesTable() {
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) return;
    
    if (teacherClasses.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">No classes assigned yet. Create your first class above!</td></tr>';
        return;
    }
    
    tbody.innerHTML = teacherClasses.map(cls => {
        const studentCount = cls.studentCount || 0;
        
        return `
            <tr>
                <td><strong>${cls.name}</strong></td>
                <td>${cls.startDate || 'N/A'}</td>
                <td>${cls.schedule || 'N/A'}</td>
                <td>₹${cls.fee || 0}</td>
                <td>${studentCount} students</td>
                <td><span class="status-badge ${(cls.status || 'active').toLowerCase()}">${cls.status || 'Active'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="openClassModal(${cls.id})">Edit</button>
                        <button class="action-btn" onclick="viewClassDetails(${cls.id})">View</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewClassDetails(classId) {
    const cls = teacherClasses.find(c => c.id === classId);
    if (cls) {
        const classStudents = students.filter(s => s.classId === classId);
        alert(`Class Details:\n\n` +
              `Name: ${cls.name}\n` +
              `Schedule: ${cls.schedule}\n` +
              `Start Date: ${cls.startDate}\n` +
              `Students: ${classStudents.length}\n` +
              `Fee: ₹${cls.fee}\n` +
              `Status: ${cls.status}`);
    }
}

// ==================== STUDENTS MANAGEMENT ====================

function populateBatchFilter() {
    const batchFilter = document.getElementById('batchFilter');
    if (!batchFilter) return;
    
    batchFilter.innerHTML = '<option value="">All Batches</option>';
    
    teacherClasses.forEach(cls => {
        batchFilter.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
}

function filterStudentsByBatch() {
    const selectedBatch = document.getElementById('batchFilter')?.value || '';
    renderStudentsTable(selectedBatch);
}

function renderStudentsTable(batchFilter = '') {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    let filteredStudents = students;
    if (batchFilter) {
        filteredStudents = students.filter(s => s.classId == batchFilter);
    }
    
    // Update stats
    const totalStudentsEl = document.getElementById('totalStudents');
    const batchStudentsEl = document.getElementById('batchStudents');
    
    if (totalStudentsEl) totalStudentsEl.textContent = students.length;
    if (batchStudentsEl) batchStudentsEl.textContent = filteredStudents.length;
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No students found for selected batch.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredStudents.map(student => {
        return `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>${student.email}</td>
                <td>${student.phone || 'N/A'}</td>
                <td>${student.className || 'Unknown'}</td>
                <td>N/A</td>
                <td><span class="status-badge active">Active</span></td>
            </tr>
        `;
    }).join('');
}

// ===== REST OF YOUR EXISTING FUNCTIONS (Applications, Schedule, Tests, Results, Fees, Progress) =====
// I'll keep the rest exactly as you have them...

function renderApplicationsTable() {
    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;
    
    if (applications.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No new applications.</td></tr>';
        return;
    }
    
    tbody.innerHTML = applications.map(app => `
        <tr>
            <td><strong>${app.name}</strong></td>
            <td>${app.email}</td>
            <td>${app.phone || 'N/A'}</td>
            <td>${app.year}</td>
            <td>${app.course}</td>
            <td>${app.college}</td>
            <td>${new Date(app.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="approveApplication(${app.id})">✓ Approve</button>
                    <button class="action-btn delete" onclick="rejectApplication(${app.id})">✗ Reject</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function approveApplication(appId) {
    const classId = prompt('Enter Class ID to assign (or leave blank):');
    
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${appId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ classId: classId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to approve application');
        }
        
        alert('Application approved! Student account created.');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error approving application:', error);
        alert('Error approving application: ' + error.message);
    }
}

async function rejectApplication(appId) {
    if (!confirm('Are you sure you want to reject this application?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${appId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to reject application');
        }
        
        alert('Application rejected.');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error rejecting application:', error);
        alert('Error rejecting application: ' + error.message);
    }
}

function initializeScheduleSection() {
    const select = document.getElementById('scheduleClassSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a class</option>';
    teacherClasses.forEach(cls => {
        select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
    
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    newSelect.addEventListener('change', function() {
        if (this.value) {
            loadClassSchedule(this.value);
        } else {
            document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            const display = document.getElementById('currentScheduleDisplay');
            if (display) display.innerHTML = '';
        }
    });
    
    const saveBtn = document.getElementById('saveScheduleDaysBtn');
    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', saveScheduleDays);
    }
}

async function loadClassSchedule(classId) {
    try {
        const cls = teacherClasses.find(c => c.id == classId);
        if (cls && cls.schedule) {
            const days = cls.schedule.split(',').map(d => d.trim());
            
            document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = days.some(day => 
                    checkbox.value.toLowerCase() === day.toLowerCase()
                );
            });
            
            displayCurrentSchedule(cls.name, days);
        } else {
            document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            const display = document.getElementById('currentScheduleDisplay');
            if (display) display.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function saveScheduleDays() {
    const classId = document.getElementById('scheduleClassSelect')?.value;
    
    if (!classId) {
        alert('Please select a class first');
        return;
    }
    
    const selectedDays = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });
    
    if (selectedDays.length === 0) {
        alert('Please select at least one day');
        return;
    }
    
    const scheduleString = selectedDays.join(', ');
    
    try {
        const cls = teacherClasses.find(c => c.id == classId);
        
        const response = await fetch(`${API_BASE_URL}/admin/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: cls.name,
                teacherId: cls.teacherId,
                startDate: cls.startDate,
                schedule: scheduleString,
                status: cls.status,
                fee: cls.fee
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save schedule');
        }
        
        alert('Schedule saved successfully!');
        await loadTeacherData();
        displayCurrentSchedule(cls.name, selectedDays);
        
    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Error saving schedule: ' + error.message);
    }
}

function displayCurrentSchedule(className, days) {
    const display = document.getElementById('currentScheduleDisplay');
    if (!display) return;
    
    display.innerHTML = `
        <h3>Current Schedule for ${className}</h3>
        <div class="schedule-days-list">
            ${days.map(day => `<span class="schedule-day-badge">${day}</span>`).join('')}
        </div>
    `;
}

function openTestModal() {
    const modal = document.getElementById('testModal');
    const form = document.getElementById('testForm');
    if (!modal || !form) return;
    
    form.reset();
    
    const classSelect = document.getElementById('testClass');
    if (classSelect) {
        classSelect.innerHTML = '<option value="">Select class</option>';
        teacherClasses.forEach(cls => {
            classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
    }
    
    const container = document.getElementById('questionsContainer');
    if (container) {
        container.innerHTML = '';
    }
    questionCounter = 0;
    
    modal.classList.add('active');
}

function addQuestion(type) {
    questionCounter++;
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    if (type === 'MCQ') {
        const mcqHtml = `
            <div class="question-card" data-question-id="${questionCounter}" data-type="MCQ">
                <div class="question-header">
                    <h5>MCQ Question ${questionCounter}</h5>
                    <button type="button" class="delete-question-btn" onclick="deleteQuestion(${questionCounter})">✕</button>
                </div>
                <div class="form-group">
                    <label>Question *</label>
                    <textarea class="question-text" required rows="2" placeholder="Enter your question"></textarea>
                </div>
                <div class="form-group">
                    <label>Marks *</label>
                    <input type="number" class="question-marks" required min="1" value="1">
                </div>
                <div class="options-group">
                    <label>Options (select correct answer) *</label>
                    ${[1,2,3,4].map(i => `
                        <div class="option-row">
                            <input type="radio" name="correct_${questionCounter}" value="${i}" ${i === 1 ? 'checked' : ''} required>
                            <input type="text" class="option-input" placeholder="Option ${i}" required>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', mcqHtml);
    } else if (type === 'Programming') {
        const programmingHtml = `
            <div class="question-card" data-question-id="${questionCounter}" data-type="Programming">
                <div class="question-header">
                    <h5>Programming Question ${questionCounter}</h5>
                    <button type="button" class="delete-question-btn" onclick="deleteQuestion(${questionCounter})">✕</button>
                </div>
                <div class="form-group">
                    <label>Problem Title *</label>
                    <input type="text" class="problem-title" required placeholder="e.g., Two Sum">
                </div>
                <div class="form-group">
                    <label>Problem Description *</label>
                    <textarea class="problem-description" required rows="4" placeholder="Describe the problem..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Difficulty *</label>
                        <select class="problem-difficulty" required>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Marks *</label>
                        <input type="number" class="question-marks" required min="1" value="10">
                    </div>
                </div>
                <div class="form-group">
                    <label>Test Cases (one per line, format: input|expected_output) *</label>
                    <textarea class="test-cases" required rows="3" placeholder="Example:
5|120
3|6
4|24"></textarea>
                </div>
                <div class="form-group">
                    <label>Sample Solution (Optional)</label>
                    <textarea class="sample-solution" rows="4" placeholder="def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n-1)"></textarea>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', programmingHtml);
    }
}

function deleteQuestion(id) {
    const questionCard = document.querySelector(`[data-question-id="${id}"]`);
    if (questionCard) {
        if (confirm('Are you sure you want to delete this question?')) {
            questionCard.remove();
        }
    }
}

async function saveTest(e) {
    e.preventDefault();
    
    const questions = [];
    let totalMarks = 0;
    
    // Collect all questions
    document.querySelectorAll('.question-card').forEach((card, index) => {
        const type = card.dataset.type;
        
        if (type === 'MCQ') {
            const questionText = card.querySelector('.question-text')?.value || '';
            const marks = parseInt(card.querySelector('.question-marks')?.value || 1);
            const options = Array.from(card.querySelectorAll('.option-input')).map(input => input.value);
            const correctRadio = card.querySelector('input[type="radio"]:checked');
            const correctAnswer = correctRadio ? parseInt(correctRadio.value) : 1;
            
            questions.push({
                id: 'q_' + Date.now() + '_' + index,
                type: 'MCQ',
                question: questionText,
                marks: marks,
                options: options,
                correctAnswer: correctAnswer
            });
            
            totalMarks += marks;
            
        } else if (type === 'Programming') {
            const title = card.querySelector('.problem-title')?.value || '';
            const description = card.querySelector('.problem-description')?.value || '';
            const difficulty = card.querySelector('.problem-difficulty')?.value || 'Easy';
            const marks = parseInt(card.querySelector('.question-marks')?.value || 10);
            const testCasesText = card.querySelector('.test-cases')?.value || '';
            const sampleSolution = card.querySelector('.sample-solution')?.value || '';
            
            const testCases = testCasesText.split('\n')
                .filter(tc => tc.trim())
                .map(tc => {
                    const [input, output] = tc.split('|');
                    return { 
                        input: input ? input.trim() : '', 
                        expectedOutput: output ? output.trim() : '' 
                    };
                });
            
            questions.push({
                id: 'q_' + Date.now() + '_' + index,
                type: 'Programming',
                title: title,
                description: description,
                difficulty: difficulty,
                marks: marks,
                testCases: testCases,
                sampleSolution: sampleSolution
            });
            
            totalMarks += marks;
        }
    });
    
    if (questions.length === 0) {
        alert('Please add at least one question!');
        return;
    }
    
    const testData = {
        title: document.getElementById('testTitle')?.value || '',
        classId: parseInt(document.getElementById('testClass')?.value || 0),
        teacherId: currentTeacher.id,
        testDate: document.getElementById('testDate')?.value || '',
        duration: parseInt(document.getElementById('testDuration')?.value || 30),
        type: document.getElementById('testType')?.value || 'MCQ',
        description: document.getElementById('testDescription')?.value || '',
        totalMarks: totalMarks,
        questions: JSON.stringify(questions)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/teacher/tests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create test');
        }
        
        alert('Test created successfully!');
        closeModal('testModal');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error creating test:', error);
        alert('Error creating test: ' + error.message);
    }
}

function viewTest(testId) {
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    
    const modal = document.getElementById('viewTestModal');
    const content = document.getElementById('testDetailsContent');
    if (!modal || !content) return;
    
    let questions = [];
    try {
        questions = JSON.parse(test.questions);
    } catch (e) {
        console.error('Error parsing questions:', e);
    }
    
    let questionsHtml = '';
    questions.forEach((q, index) => {
        if (q.type === 'MCQ') {
            questionsHtml += `
                <div class="question-view">
                    <h4>Question ${index + 1} (MCQ) - ${q.marks} marks</h4>
                    <p><strong>Q:</strong> ${q.question}</p>
                    <div class="options-view">
                        ${q.options.map((opt, i) => `
                            <p class="${i + 1 === q.correctAnswer ? 'correct-answer' : ''}">
                                ${i + 1}. ${opt} ${i + 1 === q.correctAnswer ? '✓' : ''}
                            </p>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (q.type === 'Programming') {
            questionsHtml += `
                <div class="question-view">
                    <h4>Question ${index + 1} (Programming) - ${q.marks} marks</h4>
                    <p><strong>Title:</strong> ${q.title}</p>
                    <p><strong>Difficulty:</strong> <span class="difficulty-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span></p>
                    <p><strong>Description:</strong></p>
                    <pre>${q.description}</pre>
                    <p><strong>Test Cases:</strong></p>
                    <ul>
                        ${q.testCases.map(tc => `<li>Input: ${tc.input} → Output: ${tc.expectedOutput}</li>`).join('')}
                    </ul>
                    ${q.sampleSolution ? `<p><strong>Sample Solution:</strong></p><pre>${q.sampleSolution}</pre>` : ''}
                </div>
            `;
        }
    });
    
    content.innerHTML = `
        <div class="test-details">
            <h3>${test.title}</h3>
            <div class="test-meta">
                <p><strong>Class:</strong> ${test.className}</p>
                <p><strong>Date:</strong> ${test.testDate}</p>
                <p><strong>Duration:</strong> ${test.duration} minutes</p>
                <p><strong>Type:</strong> ${test.type}</p>
                <p><strong>Total Marks:</strong> ${test.totalMarks}</p>
                <p><strong>Status:</strong> <span class="status-badge ${test.status.toLowerCase()}">${test.status}</span></p>
            </div>
            ${test.description ? `<p><strong>Description:</strong> ${test.description}</p>` : ''}
            <hr>
            <h3>Questions</h3>
            ${questionsHtml}
        </div>
    `;
    
    modal.classList.add('active');
}

async function deleteTest(testId) {
    if (confirm('Are you sure you want to delete this test? All associated results will also be deleted.')) {
        try {
            const response = await fetch(`${API_BASE_URL}/teacher/tests/${testId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete test');
            }
            
            alert('Test deleted successfully!');
            await loadTeacherData();
            
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('Error deleting test: ' + error.message);
        }
    }
}

function renderTestsTable() {
    const tbody = document.getElementById('testsTableBody');
    if (!tbody) return;
    
    if (tests.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">No tests created yet. Click "Create Test" to get started!</td></tr>';
        return;
    }
    
    tbody.innerHTML = tests.map(test => `
        <tr>
            <td><strong>${test.title}</strong></td>
            <td>${test.className}</td>
            <td>${test.testDate}</td>
            <td>${test.duration} mins</td>
            <td><span class="type-badge">${test.type}</span></td>
            <td><span class="status-badge ${test.status.toLowerCase()}">${test.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="viewTest(${test.id})">View</button>
                    <button class="action-btn delete" onclick="deleteTest(${test.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== RESULTS MANAGEMENT ====================

function renderResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    if (!tbody) return;
    
    if (testResults.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="9">No results available yet. Students need to complete tests first.</td></tr>';
        return;
    }
    
    tbody.innerHTML = testResults.map(result => `
        <tr>
            <td>${result.studentName}</td>
            <td>${result.testTitle}</td>
            <td>${result.className}</td>
            <td>${result.score}</td>
            <td>${result.totalMarks}</td>
            <td>${result.percentage}%</td>
            <td><span class="grade-badge ${result.grade.toLowerCase().replace(/ /g, '-')}">${result.grade}</span></td>
            <td>${new Date(result.submittedAt).toLocaleString()}</td>
            <td>
                <button class="action-btn" onclick="viewResultDetails(${result.id})">Details</button>
            </td>
        </tr>
    `).join('');
}

function viewResultDetails(resultId) {
    const result = testResults.find(r => r.id === resultId);
    if (!result) return;
    
    alert(`Result Details:\n\n` +
          `Student: ${result.studentName}\n` +
          `Test: ${result.testTitle}\n` +
          `Score: ${result.score}/${result.totalMarks}\n` +
          `Percentage: ${result.percentage}%\n` +
          `Grade: ${result.grade}\n` +
          `Submitted: ${new Date(result.submittedAt).toLocaleString()}`);
}

// ==================== FEES MANAGEMENT ====================

function openFeeModal() {
    const modal = document.getElementById('feeModal');
    const form = document.getElementById('feeForm');
    if (!modal || !form) return;
    
    form.reset();
    
    const batchSelect = document.getElementById('feeBatch');
    if (batchSelect) {
        batchSelect.innerHTML = '<option value="">Select batch/class</option>';
        teacherClasses.forEach(cls => {
            batchSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
    }
    
    modal.classList.add('active');
}

async function saveFee(e) {
    e.preventDefault();
    
    const studentId = parseInt(document.getElementById('feeStudent')?.value || 0);
    const classId = parseInt(document.getElementById('feeBatch')?.value || 0);
    const totalAmount = parseFloat(document.getElementById('feeTotalAmount')?.value || 0);
    const dueDate = document.getElementById('feeDueDate')?.value || '';

    const feeData = {
        studentId: studentId,
        classId: classId,
        totalAmount: totalAmount,
        dueDate: dueDate
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/fees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feeData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create fee');
        }
        
        alert('Fee record created successfully!');
        closeModal('feeModal');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error creating fee:', error);
        alert('Error creating fee: ' + error.message);
    }
}

function openPaymentModal(feeId) {
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return;
    
    const modal = document.getElementById('paymentModal');
    if (!modal) return;

    document.getElementById('paymentFeeId').value = fee.id;
    document.getElementById('paymentStudentName').textContent = fee.student?.name || 'Unknown';
    document.getElementById('paymentClassName').textContent = fee.class?.name || 'Unknown';
    document.getElementById('paymentTotalAmount').textContent = fee.totalAmount;
    document.getElementById('paymentPaidAmount').textContent = fee.paidAmount;
    document.getElementById('paymentRemainingAmount').textContent = fee.dueAmount;

    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) {
        amountInput.max = fee.dueAmount;
    }
    
    const dateInput = document.getElementById('paymentDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    modal.classList.add('active');
}

async function recordPayment(e) {
    e.preventDefault();
    
    const feeId = parseInt(document.getElementById('paymentFeeId')?.value || 0);
    const amount = parseFloat(document.getElementById('paymentAmount')?.value || 0);
    const date = document.getElementById('paymentDate')?.value || '';
    const method = document.getElementById('paymentMethod')?.value || 'Cash';

    const paymentData = {
        amount: amount,
        date: date,
        method: method
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/fees/${feeId}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to record payment');
        }
        
        alert('Payment recorded successfully!');
        closeModal('paymentModal');
        await loadTeacherData();
        
    } catch (error) {
        console.error('Error recording payment:', error);
        alert('Error recording payment: ' + error.message);
    }
}

function renderFeesTable() {
    const tbody = document.getElementById('feesTableBody');
    if (!tbody) return;
    
    if (fees.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No fee records yet. Click "Add Fee" to create one.</td></tr>';
        return;
    }

    tbody.innerHTML = fees.map(fee => {
        const studentName = fee.student ? fee.student.name : 'Unknown';
        const className = fee.class ? fee.class.name : 'Unknown';
        
        return `
            <tr>
                <td>${studentName}</td>
                <td>${className}</td>
                <td>₹${fee.totalAmount}</td>
                <td>₹${fee.paidAmount}</td>
                <td>₹${fee.dueAmount}</td>
                <td>${fee.dueDate || 'Not set'}</td>
                <td><span class="status-badge ${fee.status.toLowerCase()}">${fee.status}</span></td>
                <td>
                    <div class="action-btns">
                        ${fee.dueAmount > 0 ? `<button class="action-btn" onclick="openPaymentModal(${fee.id})">Add Payment</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateFeeStats();
}

function updateFeeStats() {
    let totalUnpaid = 0;
    let totalPending = 0;
    let totalCollected = 0;
    
    fees.forEach(fee => {
        totalCollected += fee.paidAmount;
        
        if (fee.status === 'PENDING') {
            totalUnpaid += fee.totalAmount;
        } else if (fee.status === 'PARTIAL') {
            totalPending += fee.dueAmount;
        }
    });

    const totalUnpaidEl = document.getElementById('totalUnpaid');
    const totalPendingEl = document.getElementById('totalPending');
    const totalCollectedEl = document.getElementById('totalCollected');
    
    if (totalUnpaidEl) totalUnpaidEl.textContent = '₹' + totalUnpaid;
    if (totalPendingEl) totalPendingEl.textContent = '₹' + totalPending;
    if (totalCollectedEl) totalCollectedEl.textContent = '₹' + totalCollected;
}

// ==================== PROGRESS TRACKING ====================

function renderProgressCharts() {
    const grid = document.getElementById('progressGrid');
    if (!grid) return;
    
    if (testResults.length === 0) {
        grid.innerHTML = '<div class="empty-state-box"><p>No progress data available yet. Students need to complete tests first.</p></div>';
        return;
    }

    const studentProgress = {};

    testResults.forEach(result => {
        if (!studentProgress[result.studentId]) {
            studentProgress[result.studentId] = {
                name: result.studentName,
                className: result.className,
                grades: { Poor: 0, 'Need to Improve': 0, Good: 0, 'Very Good': 0, Excellent: 0 },
                totalTests: 0,
                totalPercentage: 0
            };
        }
        
        studentProgress[result.studentId].grades[result.grade]++;
        studentProgress[result.studentId].totalTests++;
        studentProgress[result.studentId].totalPercentage += parseFloat(result.percentage);
    });

    grid.innerHTML = '';

    Object.entries(studentProgress).forEach(([studentId, data]) => {
        const avgScore = (data.totalPercentage / data.totalTests).toFixed(1);
        
        const card = document.createElement('div');
        card.className = 'progress-card';
        card.innerHTML = `
            <h3>${data.name}</h3>
            <p class="progress-class">${data.className}</p>
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-label">Total Tests:</span>
                    <span class="stat-value">${data.totalTests}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Average:</span>
                    <span class="stat-value">${avgScore}%</span>
                </div>
            </div>
            <canvas id="chart_${studentId}" width="300" height="300"></canvas>
        `;
        grid.appendChild(card);
        
        // Create pie chart if Chart.js is available
        const ctx = document.getElementById(`chart_${studentId}`)?.getContext('2d');
        if (ctx && window.Chart) {
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Poor', 'Need to Improve', 'Good', 'Very Good', 'Excellent'],
                    datasets: [{
                        data: [
                            data.grades.Poor,
                            data.grades['Need to Improve'],
                            data.grades.Good,
                            data.grades['Very Good'],
                            data.grades.Excellent
                        ],
                        backgroundColor: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Performance Distribution' }
                    }
                }
            });
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderAllTables() {
    renderClassesTable();
    renderStudentsTable();
    populateBatchFilter();
    renderTestsTable();
    renderResultsTable();
    renderFeesTable();
    renderApplicationsTable();
}

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        sessionStorage.removeItem('loggedUser');
        window.location.href = 'signin.html';
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Debug logging
console.log('%c✅ Teacher Dashboard Loaded Successfully', 'color: #00acc1; font-size: 16px; font-weight: bold;');
console.log('%cTeacher:', 'color: #666; font-weight: bold;', currentTeacher ? currentTeacher.name : 'Not logged in');