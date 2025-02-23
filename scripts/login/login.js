import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

const firebaseConfig = {
            apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
            authDomain: "taga-cuyo-app.firebaseapp.com",
            projectId: "taga-cuyo-app",
            storageBucket: "taga-cuyo-app.firebasestorage.app",
            messagingSenderId: "908851804845",
            appId: "1:908851804845:web:dff839dc552a573a23a424",
            measurementId: "G-NVSY2HPNX4"
        };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Handle Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        alert('Login successful!');
        window.location.href = "dashboard.html";
    } catch (error) {
        // Always display a generic error message
        document.getElementById('error-message').innerText = "Incorrect email/password.";
    }
});


// Handle Forgot Password
document.getElementById('forgot-password-link').addEventListener('click', () => {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
});


document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('forgot-password-modal').classList.add('hidden');
});

document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    // Email validation check
    if (!email) {
        alert("Please enter a valid email.");
        return;
    }

    try {
        // Add the password reset request to the activities collection, regardless of whether the email is found in staff records or not
        await addDoc(collection(db, 'activities'), {
            action: "Forgot Password",
            location: "User",
            addedBy: email,
            isApprove: false,
            timestamp: new Date(),
        });

        alert("New Password request submitted. Admin will review it.");
        document.getElementById('forgot-password-modal').classList.add('hidden');
    } catch (error) {
        alert("Error processing request: " + error.message);
    }
});

