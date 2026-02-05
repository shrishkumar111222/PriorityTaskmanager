import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


  // // Import the functions you need from the SDKs you need
  // import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyA4rOMWZdkDhH9HSf4jWu56HakBE8zGJus",
    authDomain: "loginproject1-445a7.firebaseapp.com",
    projectId: "loginproject1-445a7",
    storageBucket: "loginproject1-445a7.firebasestorage.app",
    messagingSenderId: "204097000754",
    appId: "1:204097000754:web:b0252b19b0836180ec332b"
  };

  // // Initialize Firebase
  // const app = initializeApp(firebaseConfig);

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 4. THE CRITICAL FIX: You MUST use 'export' here
export const auth = getAuth(app);



