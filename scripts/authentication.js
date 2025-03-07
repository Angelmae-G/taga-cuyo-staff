import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.appspot.com",
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};

// ✅ Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;

// ✅ Function to get the current user (for other scripts to use)
export const getCurrentUser = () => currentUser;

// ✅ Authentication Listener (Runs on all pages)
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("❌ No user signed in. Redirecting...");
        alert("Please log in to continue.");
        window.location.href = "staff_login.html";
        return;
    }

    currentUser = user;
    console.log("✅ User logged in:", user);

    try {
        const userRef = doc(db, "admin", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("🔹 User Data:", userData);

            // ✅ Update HTML Elements (if available)
            document.addEventListener("DOMContentLoaded", () => {
                const userEmailElement = document.getElementById('user-email');
                const userRoleElement = document.getElementById('user-role');

                if (userEmailElement) userEmailElement.textContent = `Logged in as: ${user.email}`;
                if (userRoleElement) userRoleElement.textContent = `Role: ${userData.role}`;
            });

            // ✅ Set user active in Firestore
            await updateDoc(userRef, { isActive: true });

        } else {
            alert("User data not found.");
            window.location.href = "staff_login.html";
        }
    } catch (error) {
        console.error("❌ Error fetching user data:", error);
    }
});

// ✅ Logout Function (Can be used globally)
export async function logoutUser() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "admin", currentUser.uid);
        await updateDoc(userRef, { isActive: false });
        await signOut(auth);
        alert('✅ Successfully logged out.');
        window.location.href = "staff_login.html";
    } catch (error) {
        console.error('❌ Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
}

// ✅ Attach Logout Event Listener (If Button Exists)
document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) logoutButton.addEventListener('click', (event) => {
        event.preventDefault();
        logoutUser();
    });
});
