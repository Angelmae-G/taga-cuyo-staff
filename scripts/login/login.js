import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.appspot.com",
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Handle Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Login successful!');
        window.location.href = "dashboard.html";
    } catch (error) {
        document.getElementById('error-message').innerText = "Incorrect email/password.";
    }
});

// Open Forgot Password Modal
document.getElementById('forgot-password-link').addEventListener('click', () => {
    document.getElementById('forgot-password-modal').classList.remove('hidden');
});

// Handle Forgot Password Form Submission (Only Sends Email)
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    try {
        // Send password reset email
        await sendPasswordResetEmail(auth, email);
        alert("A password reset link has been sent to your email.");
        document.getElementById('forgot-password-modal').classList.add('hidden');
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to send password reset email. Please check your email and try again.");
    }
});

// Close Modal
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('forgot-password-modal').classList.add('hidden');
});
