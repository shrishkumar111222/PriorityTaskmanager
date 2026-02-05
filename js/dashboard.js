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
// P1
const p1Username = document.getElementById('p1-username');
const p1Email = document.getElementById('p1-email');
const taskSearchInput = document.getElementById('task-search');
const searchSuggestions = document.getElementById('search-suggestions');
const staticNavItems = document.querySelectorAll('.nav-menu .nav-item'); 
const listContainer = document.getElementById('my-lists-container');

// P2
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

// P3 Buttons & Toggles
const btnTaskTrace = document.getElementById('btn-task-trace');
const btnRoutineTrace = document.getElementById('btn-routine-trace');
const btnUserManual = document.getElementById('btn-user-manual');
const themeToggleInput = document.getElementById('theme-toggle-input');
const modeLabel = document.getElementById('mode-label');

// Inputs & Buttons
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
const createListBtn = document.getElementById('create-list-btn');

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

        // Theme Init
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

// ==================== 4. SEARCH FUNCTIONALITY ====================
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
            });
            searchSuggestions.appendChild(div);
        });
    } else {
        searchSuggestions.style.display = "none";
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        searchSuggestions.style.display = "none";
    }
});

// ==================== 5. HISTORY & TRACE LOGIC ====================
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

    const yesterdayEntry = {
        date: dateString, 
        total: totalTasks,
        done: completedTasks,
        rTotal: totalRoutine,
        rDone: completedRoutine
    };

    taskHistory.unshift(yesterdayEntry); 
    if (taskHistory.length > 21) taskHistory.pop(); 
    saveData();
}

function openTraceModal(mode) {
    const container = document.getElementById('trace-cards-container');
    const title = document.getElementById('trace-modal-title');
    container.innerHTML = "";

    title.innerText = mode === 'task' ? "Task Trace (History)" : "Routine Check (History)";

    if (taskHistory.length === 0) {
        container.innerHTML = `<p style="color:#888; text-align:center; width:100%; grid-column: 1 / -1; padding: 20px;">No history yet. Check back tomorrow!</p>`;
        traceModal.style.display = "flex";
        return;
    }

    taskHistory.forEach(day => {
        const total = mode === 'task' ? day.total : day.rTotal;
        const done = mode === 'task' ? day.done : day.rDone;
        
        let percentage = 0;
        if (total > 0) percentage = Math.round((done / total) * 100);
        
        let colorClass = 'circle-red';
        if (percentage > 60) colorClass = 'circle-yellow';
        if (percentage > 80) colorClass = 'circle-green';

        const dateObj = new Date(day.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const card = document.createElement('div');
        card.className = "day-card";
        card.innerHTML = `
            <div class="day-date">${dateStr}</div>
            <div class="progress-circle ${colorClass}">${percentage}%</div>
            <div class="day-stats">
                <div>Done: ${done}</div>
                <div>Total: ${total}</div>
            </div>
        `;
        container.appendChild(card);
    });

    traceModal.style.display = "flex";
}

// ==================== 6. P3 BUTTON EVENTS ====================
btnTaskTrace.addEventListener('click', () => openTraceModal('task'));
btnRoutineTrace.addEventListener('click', () => openTraceModal('routine'));

btnUserManual.addEventListener('click', () => {
    helpModal.style.display = "flex";
});

document.getElementById('close-trace-btn').onclick = () => traceModal.style.display = "none";
document.getElementById('close-help-btn').onclick = () => helpModal.style.display = "none";


// ==================== 7. ADD / EDIT TASK LOGIC ====================
addTaskFab.addEventListener('click', () => {
    resetModal();
    editingTaskId = null; 
    
    if (currentFilter === 'routine') {
        modalHeading.innerText = "Add Daily Routine";
        dateSection.style.display = "none"; 
    } else {
        modalHeading.innerText = "Add New Task";
        dateSection.style.display = "flex"; 
    }
    taskModal.style.display = "flex";
});

function resetModal() {
    titleInput.value = "";
    descInput.value = "";
    document.getElementById('task-start').value = "";
    document.getElementById('task-due').value = "";
    document.getElementById('new-step-input').value = "";
    tempSubtasks = []; 
    renderModalSteps();
    updateWordCounts();
}

function updateWordCounts() {
    const titleWords = titleInput.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('title-counter').innerText = `${titleWords}/30 words`;
    document.getElementById('title-counter').className = titleWords > 30 ? 'limit-counter limit-error' : 'limit-counter';

    const descWords = descInput.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('desc-counter').innerText = `${descWords}/1000 words`;
    document.getElementById('desc-counter').className = descWords > 1000 ? 'limit-counter limit-error' : 'limit-counter';
}
titleInput.addEventListener('input', updateWordCounts);
descInput.addEventListener('input', updateWordCounts);

saveTaskBtn.addEventListener('click', () => {
    const title = titleInput.value;
    const desc = descInput.value;
    const isRoutineMode = (currentFilter === 'routine');
    
    const titleWords = title.trim().split(/\s+/).filter(w => w.length > 0).length;
    const descWords = desc.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (titleWords > 30) return alert("Title exceeds 30 words!");
    if (descWords > 1000) return alert("Description exceeds 1000 words!");
    if (!title) return alert("Title is required.");
    
    let dueDateVal = document.getElementById('task-due').value;
    if (!isRoutineMode && !dueDateVal && !editingTaskId) return alert("Due Date is required.");

    if (editingTaskId) {
        const taskIndex = allTasks.findIndex(t => t.id === editingTaskId);
        if (taskIndex > -1) {
            allTasks[taskIndex].title = title;
            allTasks[taskIndex].desc = desc;
            allTasks[taskIndex].steps = [...tempSubtasks];
            if (!allTasks[taskIndex].isRoutine) {
                allTasks[taskIndex].dueDate = dueDateVal;
            }
        }
    } else {
        const newTask = {
            id: Date.now(),
            title,
            desc,
            steps: [...tempSubtasks],
            isRoutine: isRoutineMode,
            dueDate: isRoutineMode ? null : dueDateVal,
            completed: false,
            createdAt: new Date().toISOString(),
            listId: currentFilter.startsWith('list_') ? currentFilter.split('_')[1] : null
        };
        allTasks.push(newTask);
    }

    saveData();
    taskModal.style.display = "none";
    renderTasks(currentFilter);
});

function openEditModal(task) {
    editingTaskId = task.id; 
    titleInput.value = task.title;
    descInput.value = task.desc;
    tempSubtasks = [...(task.steps || [])];
    renderModalSteps();
    updateWordCounts();
    
    modalHeading.innerText = "Edit Task";
    if (task.isRoutine) {
        dateSection.style.display = "none";
    } else {
        dateSection.style.display = "flex";
        document.getElementById('task-due').value = task.dueDate;
    }
    taskModal.style.display = "flex";
}

// ==================== 8. SUB-TASKS ====================
const addStepBtn = document.getElementById('add-step-btn');
const stepInput = document.getElementById('new-step-input');
const stepsList = document.getElementById('steps-list');

addStepBtn.addEventListener('click', () => {
    if(stepInput.value.trim()) {
        tempSubtasks.push(stepInput.value.trim());
        stepInput.value = "";
        renderModalSteps();
    }
});

function renderModalSteps() {
    stepsList.innerHTML = "";
    tempSubtasks.forEach((step, index) => {
        const li = document.createElement('li');
        li.className = "step-item";
        li.draggable = true;
        li.innerHTML = `<span><i class="fas fa-grip-lines" style="color:#666; margin-right:8px;"></i> ${step}</span> <i class="fas fa-times" style="cursor:pointer; color:#ff4d4d;"></i>`;
        li.querySelector('.fa-times').onclick = () => {
            tempSubtasks.splice(index, 1);
            renderModalSteps();
        };
        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            updateStepOrder();
        });
        stepsList.appendChild(li);
    });
}
stepsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    const siblings = [...stepsList.querySelectorAll('.step-item:not(.dragging)')];
    const nextSibling = siblings.find(sibling => e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2);
    stepsList.insertBefore(draggingItem, nextSibling);
});
function updateStepOrder() {
    const newOrder = [];
    stepsList.querySelectorAll('.step-item span').forEach(span => newOrder.push(span.innerText.trim()));
    tempSubtasks = newOrder;
}

// ==================== 9. RENDER ENGINE & DELETE ====================
function renderTasks(filterType, searchQuery = "") {
    currentFilter = filterType;
    p2Container.innerHTML = "";
    updateP2Header(filterType);

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (filterType.startsWith('list_')) {
        document.getElementById(`nav-list-${filterType.split('_')[1]}`)?.classList.add('active');
    } else {
        document.querySelector(`[data-filter="${filterType}"]`)?.classList.add('active');
    }

    let filtered = allTasks.filter(task => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterType === 'routine') return task.isRoutine;
        if (task.isRoutine) return false; 
        
        const now = new Date();
        const due = new Date(task.dueDate);
        const hoursLeft = (due - now) / (1000 * 60 * 60);

        if (filterType === 'today') return hoursLeft > -24 && hoursLeft <= 48 && !task.completed;
        if (filterType === 'priority2') return hoursLeft > 48 && hoursLeft <= 96 && !task.completed;
        if (filterType === 'priority3') return hoursLeft > 96 && hoursLeft <= (120 * 24) && !task.completed;
        if (filterType === 'all') return true;
        if (filterType.startsWith('list_')) return task.listId == filterType.split('_')[1];
    });

    filtered.sort((a, b) => {
        if(a.isRoutine) return 0;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    if (filtered.length === 0) {
        p2Container.innerHTML = `<div class="empty-state">No tasks found.</div>`;
        return;
    }

    filtered.forEach(task => {
        const taskEl = document.createElement('div');
        const dueText = task.isRoutine ? 'Daily Routine' : new Date(task.dueDate).toLocaleString();
        
        let urgencyClass = '';
        if (!task.isRoutine) {
            const isToday = new Date(task.dueDate).getDate() === new Date().getDate();
            urgencyClass = isToday ? 'urgent-today' : 'urgent-tomorrow';
        }
        
        taskEl.className = `task-card ${urgencyClass}`;
        taskEl.innerHTML = `
            <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''}>
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${dueText}</p>
            </div>
            <div class="task-actions">
                <button class="edit-task-btn"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-task-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;

        taskEl.addEventListener('click', (e) => {
            if(e.target.type !== 'checkbox' && !e.target.closest('.task-actions')) openTaskInP3(task);
        });

        taskEl.querySelector('.task-check').addEventListener('change', (e) => {
            task.completed = e.target.checked;
            saveData();
            renderTasks(currentFilter);
        });

        taskEl.querySelector('.edit-task-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            openEditModal(task);
        });

        taskEl.querySelector('.delete-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            taskToDeleteId = task.id; 
            deleteModal.style.display = "flex"; 
        });

        p2Container.appendChild(taskEl);
    });
}

confirmDeleteNo.addEventListener('click', () => {
    deleteModal.style.display = "none";
    taskToDeleteId = null;
});

confirmDeleteYes.addEventListener('click', () => {
    if (taskToDeleteId) {
        allTasks = allTasks.filter(t => t.id !== taskToDeleteId);
        saveData();
        renderTasks(currentFilter);
        
        const p3Title = document.getElementById('detail-title').innerText;
        if(p3Title) closeP3Details(); 
    }
    deleteModal.style.display = "none";
});

function updateP2Header(filter) {
    const map = {
        'today': ['Today', 'Tasks expiring in next 48h'],
        'priority2': ['Priority 2', 'Tasks due in 2-4 days'],
        'priority3': ['Priority 3', 'Tasks due in 4-120 days'],
        'all': ['All Tasks', 'Overview of all work'],
        'routine': ['Daily Routine', 'Resets daily at 12:01 AM']
    };
    if (map[filter]) {
        p2Title.innerText = map[filter][0];
        p2Subtitle.innerText = map[filter][1];
    } else if (filter.startsWith('list_')) {
        const list = myLists.find(l => l.id == filter.split('_')[1]);
        p2Title.innerText = list ? list.name : "List";
        p2Subtitle.innerText = "Custom List";
    }
}

// ==================== 10. P3 DETAILS & NAVIGATION ====================
function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
}

function openTaskInP3(task) {
    document.getElementById('p3-default-view').style.display = "none";
    document.getElementById('p3-task-details').style.display = "block";
    document.getElementById('detail-title').innerText = task.title;
    document.getElementById('detail-desc').innerHTML = linkify(task.desc || "No description");

    const badge = document.getElementById('detail-routine-badge');
    const dateSpan = document.getElementById('detail-date');
    if (task.isRoutine) {
        badge.style.display = "inline-block";
        dateSpan.innerText = "";
    } else {
        badge.style.display = "none";
        dateSpan.innerText = "Due: " + new Date(task.dueDate).toLocaleString();
    }

    const stepsUl = document.getElementById('detail-steps');
    stepsUl.innerHTML = "";
    if (task.steps && task.steps.length) {
        task.steps.forEach(step => stepsUl.innerHTML += `<li>${step}</li>`);
    } else {
        stepsUl.innerHTML = "<li style='list-style:none; opacity:0.5'>No sub-tasks</li>";
    }

    document.getElementById('delete-open-task-btn').onclick = () => {
        taskToDeleteId = task.id;
        deleteModal.style.display = "flex";
    };
}

document.getElementById('close-details-btn').addEventListener('click', closeP3Details);
function closeP3Details() {
    document.getElementById('p3-task-details').style.display = "none";
    document.getElementById('p3-default-view').style.display = "block";
}

createListBtn.addEventListener('click', () => {
    if (myLists.length >= 50) return alert("Limit 50 lists.");
    document.getElementById('list-name-input').value = "";
    listModal.style.display = "flex";
});

saveListBtn.addEventListener('click', () => {
    const name = document.getElementById('list-name-input').value;
    if(name) {
        myLists.push({ id: Date.now(), name });
        saveData();
        renderLists();
        listModal.style.display = "none";
    }
});

function renderLists() {
    listContainer.innerHTML = "";
    myLists.forEach(list => {
        const div = document.createElement('div');
        div.className = "nav-item";
        div.id = `nav-list-${list.id}`; 
        div.innerHTML = `<i class="fas fa-list"></i> <span>${list.name}</span>`;
        div.addEventListener('click', () => renderTasks(`list_${list.id}`));
        listContainer.appendChild(div);
    });
}

// NAVIGATION
staticNavItems.forEach(item => {
    item.addEventListener('click', () => {
        const filter = item.getAttribute('data-filter');
        if (filter) renderTasks(filter);
    });
});

// THEME TOGGLE LISTENER
if (themeToggleInput) {
    themeToggleInput.addEventListener('change', () => {
        updateThemeLabel();
        if (themeToggleInput.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
}

function updateThemeLabel() {
    if (themeToggleInput.checked) {
        modeLabel.innerText = "Dark";
    } else {
        modeLabel.innerText = "Light";
    }
}

// LOGOUT
document.getElementById('logout-btn').onclick = () => signOut(auth).then(() => window.location.href="index.html");

// DROPDOWN
document.getElementById('user-avatar-btn').onclick = (e) => {
    e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
};
window.addEventListener('click', () => document.getElementById('user-dropdown').style.display = 'none');

// Global Modal Close
cancelTaskBtn.onclick = () => taskModal.style.display = "none";
cancelListBtn.onclick = () => listModal.style.display = "none";
