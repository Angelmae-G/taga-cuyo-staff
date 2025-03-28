// Import Firebase SDKs
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';

// Initialize Firebase Auth
const auth = getAuth();

// Logout function
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default link behavior

            try {
                await signOut(auth);
                console.log('User signed out successfully.');

                // Wait for auth state to update before redirecting
                onAuthStateChanged(auth, (user) => {
                    if (!user) {
                        window.location.href = "index.html"; // Redirect after confirming sign-out
                    }
                });
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error logging out. Please try again.');
            }
        });
    } else {
        console.error("Logout button not found!");
    }
});
