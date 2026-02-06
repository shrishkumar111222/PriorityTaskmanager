import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==================== 1. STATE & DATA ====================
let allTasks = []; 
let myLists = [];  
let taskHistory = []; 
let currentFilter = 'today'; 
let tempSubtasks = []; 
let editingTaskId = null;
let taskToDeleteId = null; 

// ==================== 2. DOM ELEMENTS ====================
const p1Sidebar = document.querySelector('.sidebar-p1');
const p3Sidebar = document.querySelector('.details-p3');
const mobileOverlay = document.getElementById('mobile-overlay');

// Buttons
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileProfileBtn = document.getElementById('mobile-profile-btn'); // New Button
const mobileCloseP1 = document.querySelector('.mobile-close-btn');
const mobileCloseP3 = document.getElementById('mobile-close-p3');

// P1 Elements
const p1Username = document.getElementById('p1-username');
const p1Email = document.getElementById('p1-email');
const taskSearchInput = document.getElementById('task-search');
const searchSuggestions = document.getElementById('search-suggestions');
const staticNavItems = document.querySelectorAll('.nav-menu .nav-item'); 
const listContainer = document.getElementById('my-lists-container');
const createListBtn = document.getElementById('create-list-btn');

// P2 Elements
const p2Title = document.getElementById('p2-title');
const p2Subtitle = document.getElementById('p2-subtitle');
const p2Container = document.getElementById('p2-task-container');
const addTaskFab = document.getElementById('add-task-fab');

// P3 & Modals
const taskModal = document.getElementById('task-modal');
const listModal = document.getElementById('list-modal');
const deleteModal = document.getElementById('delete-modal');
const helpModal = document.getElementById('help-modal');
const traceModal = document.getElementById('trace-modal'); 

// P3 Content
const btnTaskTrace = document.getElementById('btn-task-trace');
const btnRoutineTrace = document.getElementById('btn-routine-trace');
const btnUserManual = document.getElementById('btn-user-manual');
const themeToggleInput = document.getElementById('theme-toggle-input');
const modeLabel = document.getElementById('mode-label');

// Modal Inputs
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-desc');
const dateSection = document.getElementById('date-section-container');
const modalHeading = document.getElementById('modal-heading');
const saveTaskBtn = document.getElementById('save-task');
const saveListBtn = document.getElementById('save-list');
const cancelTaskBtn = document.getElementById('cancel-task');
const cancelListBtn = document.getElementById('cancel-list');
const confirmDeleteYes = document.getElementById('confirm-delete-yes');
const confirmDeleteNo = document.getElementById('confirm-delete-no');

// ==================== 3. INITIALIZATION ====================
onAuthStateChanged(auth, (user) => {
    if (user) {
        p1Username.innerText = user.displayName || "User";
        p1Email.innerText = user.email;
        document.getElementById('user-avatar-img').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
        loadDataFromStorage(); 
        renderTasks('today');
        renderLists();
        checkDailyRoutineReset(); 
        if (themeToggleInput) {
            themeToggleInput.checked = document.body.classList.contains('dark-mode');
            updateThemeLabel();
        }
    } else {
        window.location.href = "index.html";
    }
});

function loadDataFromStorage() {
    const storedTasks = localStorage.getItem('ptm_tasks');
    const storedLists = localStorage.getItem('ptm_lists');
    const storedHistory = localStorage.getItem('ptm_history');
    if (storedTasks) allTasks = JSON.parse(storedTasks);
    if (storedLists) myLists = JSON.parse(storedLists);
    if (storedHistory) taskHistory = JSON.parse(storedHistory);
}

function saveData() {
    localStorage.setItem('ptm_tasks', JSON.stringify(allTasks));
    localStorage.setItem('ptm_lists', JSON.stringify(myLists));
    localStorage.setItem('ptm_history', JSON.stringify(taskHistory));
}

// ==================== 4. MOBILE NAVIGATION LOGIC (FIXED) ====================

// A. Open Sidebar (P1)
mobileMenuBtn.addEventListener('click', () => {
    openMobileMenu(p1Sidebar);
});

// B. Open Profile/Details (P3)
if (mobileProfileBtn) {
    mobileProfileBtn.addEventListener('click', () => {
        openMobileMenu(p3Sidebar);
    });
}

// C. Close Function (Handles X button and Overlay)
function closeMobileMenu() {
    p1Sidebar.classList.remove('active');
    p3Sidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
}

// D. Helper to Open and Push History State (Fixes Back Button)
function openMobileMenu(sidebar) {
    sidebar.classList.add('active');
    mobileOverlay.classList.add('active');
    // PUSH A FAKE STATE so "Back" button closes menu instead of leaving page
    history.pushState({menuOpen: true}, null, "");
}

// E. Listen for Browser Back Button
window.addEventListener('popstate', (event) => {
    // When user hits back, this runs.
    // If a menu is open, the act of "going back" naturally removes the state we pushed.
    // We just need to visually close the menu.
    if (p1Sidebar.classList.contains('active') || p3Sidebar.classList.contains('active')) {
        closeMobileMenu(); 
    }
});

// F. Handle Manual Closing (X button or Overlay)
// If user clicks X, we must go back in history manually to keep history clean
const manualClose = () => {
    if (p1Sidebar.classList.contains('active') || p3Sidebar.classList.contains('active')) {
        history.back(); // This triggers 'popstate' which runs closeMobileMenu()
    }
};

mobileCloseP1.addEventListener('click', manualClose);
if(mobileCloseP3) mobileCloseP3.addEventListener('click', manualClose);
mobileOverlay.addEventListener('click', manualClose);


// ==================== 5. SEARCH FUNCTIONALITY ====================
taskSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    searchSuggestions.innerHTML = ""; 
    if (query.length === 0) {
        searchSuggestions.style.display = "none";
        return;
    }
    const matches = allTasks.filter(t => t.title.toLowerCase().includes(query));
    if (matches.length > 0) {
        searchSuggestions.style.display = "block";
        matches.forEach(task => {
            const div = document.createElement('div');
            div.className = "suggestion-item";
            div.innerHTML = `<i class="fas fa-check-circle"></i> ${task.title}`;
            div.addEventListener('click', () => {
                renderTasks('all'); 
                taskSearchInput.value = "";
                searchSuggestions.style.display = "none";
                openTaskInP3(task);
                // On mobile, close search sidebar and open P3
                if (window.innerWidth <= 900) {
                     // We swap menus, so we replace the history state instead of adding new
                     p1Sidebar.classList.remove('active');
                     p3Sidebar.classList.add('active');
                }
            });
            searchSuggestions.appendChild(div);
        });
    } else {
        searchSuggestions.style.display = "none";
    }
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) searchSuggestions.style.display = "none";
});

// ==================== 6. CORE LOGIC (Trace, Lists, Tasks) ====================

// ... (Keep your History/Trace Logic exactly as it was) ...
function checkDailyRoutineReset() {
    const lastLogin = localStorage.getItem('ptm_last_login');
    const today = new Date().toDateString();
    if (lastLogin && lastLogin !== today) {
        archiveYesterdayStats(lastLogin);
        allTasks.forEach(t => { if(t.isRoutine) t.completed = false; });
        localStorage.setItem('ptm_last_login', today);
        saveData();
    } else if (!lastLogin) {
        localStorage.setItem('ptm_last_login', today);
    }
}
function archiveYesterdayStats(dateString) {
    const totalTasks = allTasks.filter(t => !t.isRoutine).length;
    const completedTasks = allTasks.filter(t => !t.isRoutine && t.completed).length;
    const totalRoutine = allTasks.filter(t => t.isRoutine).length;
    const completedRoutine = allTasks.filter(t => t.isRoutine && t.completed).length;
    taskHistory.unshift({ date: dateString, total: totalTasks, done: completedTasks, rTotal: totalRoutine, rDone: completedRoutine });
    if (taskHistory.length > 21) taskHistory.pop(); 
    saveData();
}
function openTraceModal(mode) {
    const container = document.getElementById('trace-cards-container');
    const title = document.getElementById('trace-modal-title');
    container.innerHTML = "";
    title.innerText = mode === 'task' ? "Task Trace (History)" : "Routine Check (History)";
    if (taskHistory.length === 0) {
        container.innerHTML = `<p style="color:#888; text-align:center; width:100%;">No history yet.</p>`;
        traceModal.style.display = "flex";
        return;
    }
    taskHistory.forEach(day => {
        const total = mode === 'task' ? day.total : day.rTotal;
        const done = mode === 'task' ? day.done : day.rDone;
        let percentage = total > 0 ? Math.round((done / total) * 100) : 0;
        let colorClass = percentage > 80 ? 'circle-green' : (percentage > 60 ? 'circle-yellow' : 'circle-red');
        const card = document.createElement('div');
        card.className = "day-card";
        card.innerHTML = `<div class="day-date">${new Date(day.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div><div class="progress-circle ${colorClass}">${percentage}%</div>`;
        container.appendChild(card);
    });
    traceModal.style.display = "flex";
}

// P3 Menu Events
btnTaskTrace.addEventListener('click', () => { openTraceModal('task'); if(window.innerWidth<=900) manualClose(); });
btnRoutineTrace.addEventListener('click', () => { openTraceModal('routine'); if(window.innerWidth<=900) manualClose(); });
btnUserManual.addEventListener('click', () => helpModal.style.display = "flex");

document.getElementById('close-trace-btn').onclick = () => traceModal.style.display = "none";
document.getElementById('close-help-btn').onclick = () => helpModal.style.display = "none";


// ==================== 7. ADD / EDIT TASK LOGIC ====================
addTaskFab.addEventListener('click', () => {
    resetModal();
    editingTaskId = null; 
    modalHeading.innerText = currentFilter === 'routine' ? "Add Daily Routine" : "Add New Task";
    dateSection.style.display = currentFilter === 'routine' ? "none" : "flex";
    taskModal.style.display = "flex";
});

function resetModal() {
    titleInput.value = ""; descInput.value = ""; 
    document.getElementById('task-start').value = ""; document.getElementById('task-due').value = ""; 
    document.getElementById('new-step-input').value = ""; tempSubtasks = []; 
    renderModalSteps();
}

saveTaskBtn.addEventListener('click', () => {
    const title = titleInput.value;
    if (!title) return alert("Title required");
    const isRoutine = currentFilter === 'routine';
    
    if (editingTaskId) {
        const idx = allTasks.findIndex(t => t.id === editingTaskId);
        if (idx > -1) {
            allTasks[idx].title = title;
            allTasks[idx].desc = descInput.value;
            allTasks[idx].steps = [...tempSubtasks];
            if(!isRoutine) allTasks[idx].dueDate = document.getElementById('task-due').value;
        }
    } else {
        allTasks.push({
            id: Date.now(),
            title,
            desc: descInput.value,
            steps: [...tempSubtasks],
            isRoutine,
            dueDate: isRoutine ? null : document.getElementById('task-due').value,
            completed: false,
            createdAt: new Date().toISOString(),
            listId: currentFilter.startsWith('list_') ? currentFilter.split('_')[1] : null
        });
    }
    saveData();
    taskModal.style.display = "none";
    renderTasks(currentFilter);
});

// ==================== 8. RENDER ENGINE & NAV ====================
function renderTasks(filterType) {
    currentFilter = filterType;
    p2Container.innerHTML = "";
    updateP2Header(filterType);
    
    // Highlight Active Sidebar Item
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (filterType.startsWith('list_')) {
        document.getElementById(`nav-list-${filterType.split('_')[1]}`)?.classList.add('active');
    } else {
        document.querySelector(`[data-filter="${filterType}"]`)?.classList.add('active');
    }

    const filtered = allTasks.filter(task => {
        if (filterType === 'routine') return task.isRoutine;
        if (task.isRoutine) return false;
        
        const now = new Date();
        const due = new Date(task.dueDate);
        const hours = (due - now) / 36e5;

        if (filterType === 'today') return hours > -24 && hours <= 48 && !task.completed;
        if (filterType === 'priority2') return hours > 48 && hours <= 96 && !task.completed;
        if (filterType === 'priority3') return hours > 96 && !task.completed;
        if (filterType === 'all') return true;
        if (filterType.startsWith('list_')) return task.listId == filterType.split('_')[1];
    });

    if (filtered.length === 0) p2Container.innerHTML = `<div class="empty-state">No tasks found.</div>`;

    filtered.forEach(task => {
        const el = document.createElement('div');
        el.className = `task-card ${!task.isRoutine && new Date(task.dueDate).getDate() === new Date().getDate() ? 'urgent-today' : ''}`;
        el.innerHTML = `
            <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''}>
            <div class="task-info"><h4>${task.title}</h4></div>
            <div class="task-actions">
                <button class="edit-btn"><i class="fas fa-pencil-alt"></i></button>
                <button class="del-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // OPEN P3 ON CLICK (Using the new openMobileMenu logic)
        el.addEventListener('click', (e) => {
            if(e.target.type !== 'checkbox' && !e.target.closest('button')) {
                openTaskInP3(task);
                if(window.innerWidth <= 900) openMobileMenu(p3Sidebar);
            }
        });

        // Checkbox
        el.querySelector('.task-check').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            saveData();
            renderTasks(currentFilter);
        });
        // Edit
        el.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEditModal(task); });
        // Delete
        el.querySelector('.del-btn').addEventListener('click', (e) => { 
            e.stopPropagation(); taskToDeleteId = task.id; deleteModal.style.display = "flex"; 
        });

        p2Container.appendChild(el);
    });
}

function openEditModal(task) {
    editingTaskId = task.id;
    titleInput.value = task.title;
    descInput.value = task.desc;
    tempSubtasks = [...(task.steps||[])];
    renderModalSteps();
    modalHeading.innerText = "Edit Task";
    dateSection.style.display = task.isRoutine ? "none" : "flex";
    if(!task.isRoutine) document.getElementById('task-due').value = task.dueDate;
    taskModal.style.display = "flex";
}

function openTaskInP3(task) {
    document.getElementById('p3-default-view').style.display = "none";
    document.getElementById('p3-task-details').style.display = "block";
    document.getElementById('detail-title').innerText = task.title;
    document.getElementById('detail-desc').innerText = task.desc || "No description";
    // Populate steps...
    const stepsUl = document.getElementById('detail-steps');
    stepsUl.innerHTML = "";
    (task.steps || []).forEach(s => stepsUl.innerHTML += `<li>${s}</li>`);
    
    document.getElementById('delete-open-task-btn').onclick = () => {
        taskToDeleteId = task.id; deleteModal.style.display = "flex";
    };
}

// Sidebar Clicks
staticNavItems.forEach(item => {
    item.addEventListener('click', () => {
        renderTasks(item.getAttribute('data-filter'));
        if(window.innerWidth <= 900) manualClose(); // Close sidebar on selection
    });
});

function updateP2Header(filter) {
    const map = { 'today': 'Today', 'priority2': 'Priority 2', 'priority3': 'Priority 3', 'all': 'All Tasks', 'routine': 'Daily Routine' };
    p2Title.innerText = map[filter] || "Custom List";
}

// Lists
createListBtn.addEventListener('click', () => { document.getElementById('list-name-input').value = ""; listModal.style.display = "flex"; });
saveListBtn.addEventListener('click', () => {
    myLists.push({ id: Date.now(), name: document.getElementById('list-name-input').value });
    saveData(); renderLists(); listModal.style.display = "none";
});
function renderLists() {
    listContainer.innerHTML = "";
    myLists.forEach(l => {
        const div = document.createElement('div');
        div.className = "nav-item";
        div.id = `nav-list-${l.id}`;
        div.innerHTML = `<i class="fas fa-list"></i> ${l.name}`;
        div.addEventListener('click', () => { 
            renderTasks(`list_${l.id}`); 
            if(window.innerWidth <= 900) manualClose(); 
        });
        listContainer.appendChild(div);
    });
}

// Subtasks Logic
const addStepBtn = document.getElementById('add-step-btn');
const stepInput = document.getElementById('new-step-input');
const stepsList = document.getElementById('steps-list');
addStepBtn.addEventListener('click', () => {
    if(stepInput.value.trim()) { tempSubtasks.push(stepInput.value.trim()); stepInput.value = ""; renderModalSteps(); }
});
function renderModalSteps() {
    stepsList.innerHTML = "";
    tempSubtasks.forEach((s, i) => {
        const li = document.createElement('li');
        li.className = "step-item";
        li.innerHTML = `<span>${s}</span> <i class="fas fa-times" onclick="tempSubtasks.splice(${i},1); renderModalSteps();"></i>`;
        stepsList.appendChild(li);
    });
}

// Theme
if(themeToggleInput) {
    themeToggleInput.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', themeToggleInput.checked);
        modeLabel.innerText = themeToggleInput.checked ? "Dark" : "Light";
    });
}

// Logout
document.getElementById('logout-btn').onclick = () => signOut(auth).then(() => window.location.href="index.html");
document.getElementById('user-avatar-btn').onclick = (e) => { e.stopPropagation(); document.getElementById('user-dropdown').style.display = 'block'; };
window.addEventListener('click', () => document.getElementById('user-dropdown').style.display = 'none');

// Global Modals
cancelTaskBtn.onclick = () => taskModal.style.display = "none";
cancelListBtn.onclick = () => listModal.style.display = "none";
confirmDeleteNo.onclick = () => deleteModal.style.display = "none";
confirmDeleteYes.onclick = () => {
    allTasks = allTasks.filter(t => t.id !== taskToDeleteId);
    saveData(); renderTasks(currentFilter); deleteModal.style.display = "none";
    if(window.innerWidth<=900) manualClose();
};
document.getElementById('mobile-close-p3').onclick = manualClose;
document.getElementById('close-details-btn').onclick = () => {
    document.getElementById('p3-task-details').style.display = "none";
    document.getElementById('p3-default-view').style.display = "block";
};
