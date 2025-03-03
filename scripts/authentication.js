import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.appspot.com",
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};

// ✅ Check if Firebase is already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let isLoggingOut = false;
let currentUser = null;

// Getter function for the current user
const getCurrentUser = () => currentUser;
const userEmailElement = document.getElementById('user-email');
const userRoleElement = document.getElementById('user-role');

if (userEmailElement && userRoleElement) {
    userEmailElement.textContent = `Logged in as: ${user.email}`;
    userRoleElement.textContent = `Role: ${userData.role}`;
} else {
    console.warn("⚠️ User info elements not found in the HTML.");
}

// Ensure HTML elements exist
document.addEventListener("DOMContentLoaded", function () {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("❌ No user is signed in.");
            alert("Please log in to continue.");
            window.location.href = "staff_login.html";
            return;
        }

        currentUser = user;
        console.log("✅ User is signed in:", user);

        try {
            const userRef = doc(db, "admin", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();

                // ✅ Get elements only AFTER the page has loaded
                const userEmailElement = document.getElementById('user-email');
                const userRoleElement = document.getElementById('user-role');

                if (userEmailElement && userRoleElement) {
                    userEmailElement.textContent = `Logged in as: ${user.email}`;
                    userRoleElement.textContent = `Role: ${userData.role}`;
                } else {
                    console.warn("⚠️ User info elements not found in the HTML.");
                }

                await updateDoc(userRef, { isActive: true });
            } else {
                alert("User data not found in Firestore.");
                window.location.href = "staff_login.html";
            }
        } catch (error) {
            console.error("❌ Error fetching user data:", error);
        }
    });
});


// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
    if (isLoggingOut) return;

    if (user) {
        currentUser = user;
        console.log("✅ User is signed in:", user);

        try {
            const userRef = doc(db, "admin", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();

                document.addEventListener("DOMContentLoaded", function () {
                    const userEmailElement = document.getElementById('user-email');
                    const userRoleElement = document.getElementById('user-role');

                    if (userEmailElement && userRoleElement) {
                        userEmailElement.textContent = `Logged in as: ${user.email}`;
                        userRoleElement.textContent = `Role: ${userData.role}`;
                    } else {
                        console.warn("⚠️ User info elements not found.");
                    }
                });

                await updateDoc(userRef, { isActive: true });
            } else {
                alert("User data not found in Firestore.");
                window.location.href = "staff_login.html";
            }
        } catch (error) {
            console.error("❌ Error fetching user data:", error);
        }
    } else {
        console.log("❌ No user is signed in.");
        alert("Please log in to continue.");
        window.location.href = "staff_login.html";
    }
});

// Logout functionality
document.getElementById('logoutButton')?.addEventListener('click', async (event) => {
    event.preventDefault();
    isLoggingOut = true;

    if (currentUser) {
        const userRef = doc(db, "admin", currentUser.uid);
        try {
            await updateDoc(userRef, { isActive: false });
        } catch (error) {
            console.error("❌ Error updating user status on logout:", error);
        }
    }

    try {
        await signOut(auth);
        alert('✅ You have been logged out successfully.');
        window.location.href = "staff_login.html";
    } catch (error) {
        console.error('❌ Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
});

