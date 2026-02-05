// --- 1. IMPORTS (ALL IN ONE PLACE) ---
import { auth } from './firebase-config.js'; 
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. GLOBAL VARIABLES ---
const provider = new GoogleAuthProvider();
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const googleBtn = document.getElementById('google-btn');
const forgotPasswordLink = document.getElementById('forgot-password');
const tabLogin = document.getElementById('tab-login');

// --- 3. MAIN FORM SUBMISSION (LOGIN & SIGN UP) ---
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;
        const isLogin = tabLogin.classList.contains('active'); // Check if we are in Login mode

        try {
            if (isLogin) {
                // >>> LOGIN LOGIC <<<
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // CHECK: Is the email verified?
                if (user.emailVerified) {
                    alert("Login Successful! Redirecting...");
                    // Redirect handled by onAuthStateChanged
                } else {
                    await signOut(auth); // Kick them out
                    alert("Access Denied: Please verify your email first. Check your inbox.");
                }
            } else {
                // >>> SIGN UP LOGIC <<<
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Send Verification Email
                await sendEmailVerification(user);
                
                // Sign them out immediately
                await signOut(auth);

                alert("Account Created! We sent a verification link to " + email + ". Click it before logging in.");
                
                // Switch user back to login tab
                tabLogin.click();
            }
        } catch (error) {
            console.error(error);
            handleError(error);
        }
    });
}

// --- 4. GOOGLE LOGIN ---
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fab fa-google"></i> Loading...';
        
        try {
            await signInWithPopup(auth, provider);
            alert("Google Login Successful!");
        } catch (error) {
            console.error(error);
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
            if (error.code !== 'auth/cancelled-popup-request') {
                alert("Google Error: " + error.message);
            }
        }
    });
}

// --- 5. FORGOT PASSWORD ---
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        if (!email) {
            alert("Please enter your email address in the box first!");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Reset link sent! Check your inbox (and spam folder).");
        } catch (error) {
            handleError(error);
        }
    });
}

// --- 6. AUTO-REDIRECT (THE GATEKEEPER) ---
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        console.log("User verified and logged in.");
        // Stop redirect loop if already on dashboard
        if (!window.location.href.includes("dashboard.html")) {
             window.location.href = "dashboard.html";
        }
    }
});

// --- 7. UI FEATURES (EYE ICON, STRENGTH, TERMS) ---

// A. Eye Icon
const togglePasswordIcon = document.getElementById('toggle-password');
if (togglePasswordIcon) {
    togglePasswordIcon.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordIcon.classList.toggle('fa-eye');
        togglePasswordIcon.classList.toggle('fa-eye-slash');
    });
}

// B. Strength Meter
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = 0;
        if (val.length >= 8) strength++;
        if (val.match(/[0-9]/)) strength++;
        if (val.match(/[!@#$%^&*]/)) strength++;
        if (val.match(/[A-Z]/)) strength++;

        const colors = ['red', '#ff4d4d', '#ffa500', '#ffff00', '#00ff00'];
        const texts = ['Too Weak', 'Weak', 'Medium', 'Good', 'Strong'];
        
        // Simple clamp to prevent array errors
        const index = Math.min(strength, 4); 
        
        strengthBar.style.width = (index * 25) + '%';
        if (index === 0) strengthBar.style.width = '10%'; // Min width to see it
        strengthBar.style.backgroundColor = colors[index];
        strengthText.innerText = texts[index];
    });
}

// C. Terms Checkbox
const termsCheck = document.getElementById('terms-check');
const tabSignup = document.getElementById('tab-signup');
if (termsCheck) {
    termsCheck.addEventListener('change', () => {
        if (tabSignup.classList.contains('active')) {
            submitBtn.disabled = !termsCheck.checked;
        }
    });
}

// --- 8. HELPER: ERROR HANDLER ---
function handleError(error) {
    if (error.code === 'auth/email-already-in-use') {
        alert("Email already exists. Please login.");
    } else if (error.code === 'auth/weak-password') {
        alert("Password is too weak (min 6 chars).");
    } else if (error.code === 'auth/user-not-found') {
        alert("User not found.");
    } else if (error.code === 'auth/wrong-password') {
        alert("Incorrect password.");
    } else {
        alert("Error: " + error.message);
    }
}

// --- 9. PROFESSIONAL TERMS MODAL LOGIC ---
const modal = document.getElementById('terms-modal');
const termsLink = document.getElementById('terms-link');
const closeBtn = document.querySelector('.close-btn');
const acceptBtn = document.getElementById('accept-terms-btn');

if (termsLink && modal) {
    // 1. Open Modal when clicking the link
    termsLink.addEventListener('click', (e) => {
        e.preventDefault(); // Stop it from jumping to top
        modal.style.display = "flex";
    });

    // 2. Close when clicking (x)
    closeBtn.addEventListener('click', () => {
        modal.style.display = "none";
    });

    // 3. Close when clicking "I Understand" button
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            modal.style.display = "none";
            // Optional: Automatically check the box for them
            const termsCheck = document.getElementById('terms-check');
            if (termsCheck) {
                termsCheck.checked = true;
                // Trigger the change event to unlock the Sign Up button
                termsCheck.dispatchEvent(new Event('change'));
            }
        });
    }

    // 4. Close if clicking outside the box
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}


// import { auth } from './firebase-config.js'; 
// import { 
//     signInWithEmailAndPassword, 
//     createUserWithEmailAndPassword, 
//     GoogleAuthProvider, 
//     signInWithPopup, 
//     onAuthStateChanged,     // <--- COMMA IS CRITICAL HERE
//     sendPasswordResetEmail  
//     sendEmailVerification,
//     signOut                
// } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// const provider = new GoogleAuthProvider();

// // --- 1. GOOGLE LOGIN (Handles both Sign Up & Login automatically) ---

// // --- 1. GOOGLE LOGIN ---
// const googleBtn = document.getElementById('google-btn');
// if (googleBtn) {
//     googleBtn.addEventListener('click', async () => {
        
//         // 1. DISABLE BUTTON (Stop double clicks)
//         googleBtn.disabled = true;
//         googleBtn.innerHTML = '<i class="fab fa-google"></i> Loading...';
        
//         try {
//             await signInWithPopup(auth, provider);
//             // Success!
//             alert("Google Login Successful!");
//         } catch (error) {
//             console.error(error);
            
//             // If it failed, RE-ENABLE the button so they can try again
//             googleBtn.disabled = false;
//             googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
            
//             // Only show alert if it's NOT just the user closing the popup
//             if (error.code !== 'auth/cancelled-popup-request') {
//                  alert("Google Error: " + error.message);
//             }
//         }
//     });
// }





// // const googleBtn = document.getElementById('google-btn');
// // if (googleBtn) {
// //     googleBtn.addEventListener('click', async () => {
// //         try {
// //             await signInWithPopup(auth, provider);
// //             // Success! The auto-redirect below handles the rest.
// //             alert("Google Login Successful! Redirecting...");
// //         } catch (error) {
// //             console.error(error);
// //             alert("Google Error: " + error.message);
// //         }
// //     });
// // }

// // --- 2. EMAIL/PASSWORD LOGIN (Your Tab System) ---
// const authForm = document.getElementById('auth-form');
// if (authForm) {
//     authForm.addEventListener('submit', async (e) => {
//         e.preventDefault();
        
//         const email = document.getElementById('email').value;
//         const password = document.getElementById('password').value;
        
//         // Check which tab is active (Login or Sign Up)
//         const isLogin = document.getElementById('tab-login').classList.contains('active');

//         try {
//             if (isLogin) {
//                 // User is trying to Login
//                 await signInWithEmailAndPassword(auth, email, password);
//                 alert("Login Successful"); 
//             } else {
//                 // User is trying to Create Account
//                 await createUserWithEmailAndPassword(auth, email, password);
//                 alert("Account Created Successfully");
//             }
//         } catch (error) {
//             console.error(error);
//             // Helpful error mapping
//             if (error.code === 'auth/email-already-in-use') {
//                 alert("That email is already registered. Try logging in.");
//             } else {
//                 alert("Error: " + error.message);
//             }
//         }
//     });
// }

// // --- 3. AUTO-REDIRECT (The Gatekeeper) ---
// onAuthStateChanged(auth, (user) => {
//     if (user) {
//         console.log("User Verified:", user.email);
//         // Only redirect if we are NOT already on the dashboard
//         if (!window.location.href.includes("dashboard.html")) {
//              window.location.href = "dashboard.html";
//         }
//     }
// });
// // import { auth } from './firebase-config.js'; 
// // import { 
// //     signInWithEmailAndPassword, 
// //     createUserWithEmailAndPassword, 
// //     GoogleAuthProvider, 
// //     signInWithPopup, 
// //     onAuthStateChanged,
// //     sendPasswordResetEmail // <--- NEW IMPORT
// // } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// // ... [Your existing Google and Login code] ...

// // --- 4. FORGOT PASSWORD LOGIC (NEW) ---
// const forgotPasswordLink = document.getElementById('forgot-password');
// if (forgotPasswordLink) {
//     forgotPasswordLink.addEventListener('click', async (e) => {
//         e.preventDefault();

//         const email = document.getElementById('email').value;

//         if (!email) {
//             alert("Please enter your email address first!");
//             return;
//         }

//         try {
//             await sendPasswordResetEmail(auth, email);
//             alert("Password reset email sent! Check your inbox.");
//         } catch (error) {
//             console.error(error);
//             if (error.code === 'auth/user-not-found') {
//                 alert("No account found with this email.");
//             } else {
//                 alert("Error: " + error.message);
//             }
//         }
//     });
// }


// // --- NEW FEATURES LOGIC ---

// // 1. SHOW/HIDE PASSWORD
// const togglePasswordIcon = document.getElementById('toggle-password');
// if (togglePasswordIcon) {
//     togglePasswordIcon.addEventListener('click', () => {
//         const passwordInput = document.getElementById('password');
//         const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
//         passwordInput.setAttribute('type', type);
//         togglePasswordIcon.classList.toggle('fa-eye');
//         togglePasswordIcon.classList.toggle('fa-eye-slash');
//     });
// }

// // 2. PASSWORD STRENGTH METER
// const passwordInputForMeter = document.getElementById('password');
// const strengthBar = document.getElementById('strength-bar');
// const strengthText = document.getElementById('strength-text');

// if (passwordInputForMeter) {
//     passwordInputForMeter.addEventListener('input', () => {
//         const val = passwordInputForMeter.value;
//         let strength = 0;

//         if (val.length >= 8) strength++;
//         if (val.match(/[0-9]/)) strength++;
//         if (val.match(/[!@#$%^&*]/)) strength++;
//         if (val.match(/[A-Z]/)) strength++;

//         switch(strength) {
//             case 0:
//                 strengthBar.style.width = '10%'; strengthBar.style.backgroundColor = 'red'; strengthText.innerText = 'Too Weak'; break;
//             case 1:
//                 strengthBar.style.width = '25%'; strengthBar.style.backgroundColor = '#ff4d4d'; strengthText.innerText = 'Weak'; break;
//             case 2:
//                 strengthBar.style.width = '50%'; strengthBar.style.backgroundColor = '#ffa500'; strengthText.innerText = 'Medium'; break;
//             case 3:
//                 strengthBar.style.width = '75%'; strengthBar.style.backgroundColor = '#ffff00'; strengthText.innerText = 'Good'; break;
//             case 4:
//                 strengthBar.style.width = '100%'; strengthBar.style.backgroundColor = '#00ff00'; strengthText.innerText = 'Strong'; break;
//         }
//     });
// }

// // 3. TERMS OF SERVICE CHECKER
// const termsCheck = document.getElementById('terms-check');
// if (termsCheck) {
//     termsCheck.addEventListener('change', () => {
//         const submitBtn = document.getElementById('submit-btn');
//         // Only unlock if checked
//         if (termsCheck.checked) {
//             submitBtn.disabled = false;
//         } else {
//             submitBtn.disabled = true;
//         }
//     });
// }