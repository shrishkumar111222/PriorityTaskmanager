// import { db, auth } from './firebase-config.js';
// import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// // 4-Day Rule Logic
// function getQuad(date, priority) {
//     const isUrgent = (new Date(date) - new Date()) / 86400000 <= 4;
//     const isImportant = priority === 'high';
//     if (isUrgent && isImportant) return 'q1';
//     if (!isUrgent && isImportant) return 'q2';
//     if (isUrgent && !isImportant) return 'q3';
//     return 'q4';
// }

// auth.onAuthStateChanged(user => {
//     if (!user) window.location.href = 'index.html';
//     document.getElementById('user-email').innerText = user.email;
    
//     // Real-time listener
//     const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
//     onSnapshot(q, (snapshot) => {
//         document.querySelectorAll('.list').forEach(l => l.innerHTML = '');
//         snapshot.forEach(d => {
//             const t = d.data();
//             const target = document.querySelector(`#${getQuad(t.date, t.priority)} .list`);
//             target.innerHTML += `<div class="card"><b>${t.name}</b><button onclick="removeTask('${d.id}')">X</button></div>`;
//         });
//     });
// });

// document.getElementById('add-btn').onclick = async () => {
//     await addDoc(collection(db, "tasks"), {
//         userId: auth.currentUser.uid,
//         name: document.getElementById('t-name').value,
//         date: document.getElementById('t-date').value,
//         priority: document.getElementById('t-priority').value
//     });
// };

// document.getElementById('logout-btn').onclick = () => signOut(auth);
// window.removeTask = (id) => deleteDoc(doc(db, "tasks", id));
