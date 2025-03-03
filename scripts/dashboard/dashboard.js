// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import { getFirestore, query, where, collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.firebasestorage.app",
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// Declare activitiesRef here
let activitiesRef;

onAuthStateChanged(auth, async (user) => {
    const loginMessage = document.getElementById('loginMessage');
    const dashboardContent = document.getElementById('dashboardContent');

    if (user) {
        // User is logged in, show the dashboard
        loginMessage.style.display = 'none';
        dashboardContent.style.display = 'block';
        await fetchStaffInfo(user.uid);
        activitiesRef = collection(firestore, 'activities');
        fetchRecentActivities();
    } else {
    console.log("No user is signed in.");
    window.location.href = "staff_login.html"; // Redirect to login page if not signed in
}
});


document.getElementById('profilePicUpload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const user = auth.currentUser;
        if (!user) {
            alert("User not authenticated.");
            return;
        }

        const fileName = `${user.uid}.jpg`;  // Store using UID
        const storageRef = ref(storage, `profilePictures/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
            },
            (error) => {
                console.error("Upload failed:", error);
                alert("Error uploading image. Please try again.");
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                // ✅ Store only the filename in Firestore
                const userRef = doc(firestore, "admin", user.uid);
                await updateDoc(userRef, { profilePicture: fileName });

                // ✅ Immediately update UI with new profile picture
                document.getElementById("profileImage").src = downloadURL;
                document.getElementById("navbarProfileImage").src = downloadURL;

                alert("Profile picture updated successfully.");
            }
        );
    } catch (error) {
        console.error("Error uploading profile picture:", error);
    }
});


document.addEventListener("DOMContentLoaded", () => {
const profile = document.querySelector(".profile");
const profileLink = document.querySelector(".profile-link");

profile.addEventListener("click", (event) => {
event.stopPropagation(); // Prevents the click from propagating to the document
profileLink.classList.toggle("show");
});

document.addEventListener("click", () => {
profileLink.classList.remove("show"); // Hide the menu when clicking outside
});
});

// Sign out functionality
document.getElementById('logoutButton').addEventListener('click', async (event) => {
    event.preventDefault();
    try {
        await signOut(auth);
        alert('You have been logged out successfully.');
        window.location.href = "staff_login.html"; // Redirect to the login page after logout
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
});

// Function to fetch staff info
async function fetchStaffInfo(uid) {
    try {
        const staffRef = collection(firestore, "admin");
        const staffQuery = query(staffRef, where("role", "==", "staff"), where("__name__", "==", uid));
        const staffSnapshot = await getDocs(staffQuery);

        if (staffSnapshot.empty) {
            console.error("No staff member found.");
            return;
        }

        const doc = staffSnapshot.docs[0];
        const data = doc.data();

        // Update UI with name & email
        document.getElementById("staffName").textContent = data.firstName || "Unknown";
        document.getElementById("staffEmail").textContent = data.email || "No Email";

        // Load Profile Picture
        if (data.profilePicture) {
            const storage = getStorage();
            const profileImageRef = ref(storage, `profilePictures/${data.profilePicture}`);

            getDownloadURL(profileImageRef)
                .then((url) => {
                    document.getElementById("profileImage").src = url;
                    document.getElementById("navbarProfileImage").src = url;
                })
                .catch((error) => {
                    console.error("Error fetching profile image:", error);
                    setDefaultProfileImage();
                });
        } else {
            setDefaultProfileImage();
        }
    } catch (error) {
        console.error("Error fetching staff info:", error);
    }
}

function setDefaultProfileImage() {
    document.getElementById("profileImage").src = "images/default-profile.png"; // Ensure this file exists
    document.getElementById("navbarProfileImage").src = "images/default-profile.png";
}


function fetchRecentActivities() {
const activityTableBody = document.getElementById('activityTable').getElementsByTagName('tbody')[0];
const activityModal = document.getElementById('activityModal');
const modalCloseButton = document.getElementById('modalClose');
const activityDetailsDiv = document.getElementById('activityDetails');

onSnapshot(activitiesRef, (activitiesSnapshot) => {
const activitiesArray = [];
activityTableBody.innerHTML = ''; // Clear existing rows

if (activitiesSnapshot.empty) {
    activityTableBody.innerHTML = '<tr><td colspan="3">No recent activities</td></tr>';
    return;
}

activitiesSnapshot.forEach(doc => {
    const activityData = doc.data();
    const timestamp = activityData.timestamp ? activityData.timestamp.toDate() : new Date();
    activitiesArray.push({ id: doc.id, ...activityData, timestamp });
});

// Sort activities by timestamp (newest first)
activitiesArray.sort((a, b) => b.timestamp - a.timestamp);

activitiesArray.forEach(activity => {
    const formattedDate = activity.timestamp.toLocaleString();
    const newRow = activityTableBody.insertRow();

    newRow.innerHTML = `
        <td>${activity.action}</td>
        <td>${formattedDate}</td>
        <td>${activity.addedBy}</td>
    `;

    newRow.addEventListener('click', () => {
        let activityDetails = `
            <p><strong>Action:</strong> ${activity.action}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Executed by:</strong> ${activity.addedBy}</p>
        `;

        console.log("Activity Data:", activity); // Debugging log

        // Handle deleted and edited activities
        if (activity.action.includes('Deleted')) {
            activityDetails += `
                <p><strong>Exact Location:</strong> ${activity.exactLocation || "N/A"}</p>
                <p><strong>Word Deleted:</strong> ${activity.word || activity.oldWord || "N/A"}</p>
            `;
        } else if (activity.action.includes('Edited')) {
            activityDetails += `
                <p><strong>Old Word:</strong> ${activity.oldWord || "N/A"}</p>
                <p><strong>New Word:</strong> ${activity.word || "N/A"}</p>
                <p><strong>Options:</strong> ${activity.options ? activity.options.join(", ") : "N/A"}</p>
            `;
        }

        // Display lesson details if the action involves lessons
        if (activity.action.includes('Lesson')) {
            activityDetails += `
                <hr>
                <h3>LESSON DETAILS:</h3>
                <p><strong>Lesson ID:</strong> ${activity.lesson_id || "N/A"}</p>
                <p><strong>Lesson Name:</strong> ${activity.lesson_name || "N/A"}</p>
                <p><strong>Word:</strong> ${activity.word || "N/A"}</p>
                <p><strong>Translated:</strong> ${activity.translated || "N/A"}</p>
                <p><strong>Options:</strong> ${activity.options || "N/A"}</p>
            `;
        }

        // Display category details if the action involves categories
        if (activity.action.includes('Category')) {
            activityDetails += `
                <hr>
                <h3>CATEGORY DETAILS:</h3>
                <p><strong>Category Name:</strong> ${activity.category_name || "N/A"}</p>
                <p><strong>Sub-Category Name:</strong> ${activity.subcategory_name || "N/A"}</p>
                <p><strong>Word:</strong> ${activity.word || "N/A"}</p>
                <p><strong>Translated:</strong> ${activity.translated || "N/A"}</p>
                <p><strong>Options:</strong> ${activity.options ? activity.options.join(", ") : "N/A"}</p>
                <p><strong>Image Path:</strong> <a href="${activity.image_path || '#'}" target="_blank">${activity.image_path || "N/A"}</a></p>
            `;
        }

        // Show modal with details
        activityDetailsDiv.innerHTML = activityDetails;
        activityModal.style.display = 'block';

        modalCloseButton.onclick = () => {
            activityModal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target == activityModal) {
                activityModal.style.display = 'none';
            }
        };
    });
});
});
}



document.addEventListener('DOMContentLoaded', function () {
const notificationDot = document.getElementById('notificationDot');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationWrapper = document.getElementById('notificationWrapper');

if (!notificationDot || !notificationDropdown || !notificationWrapper) {
console.error('Notification elements are missing!');
return;
}

// Check for unseen notifications on page load
checkUnseenNotifications();

// Handle notification dropdown toggle and mark as seen
notificationWrapper.addEventListener('click', () => {
notificationDropdown.classList.toggle('active');
if (notificationDot.style.display === 'block') {
notificationDot.style.display = 'none'; // Hide the red dot
markNotificationsAsSeen(); // Mark notifications as seen
}
});

// Listen for new notifications in real-time
listenForNotifications();
});

function markNotificationsAsSeen() {
// Store the "seen" state in localStorage
localStorage.setItem('notificationsSeen', 'true');
console.log('Notifications marked as seen');
}

function listenForNotifications() {
const activitiesRef = collection(db, 'activities');

onSnapshot(activitiesRef, (snapshot) => {
const notifications = [];
let hasNewNotifications = false;

snapshot.forEach((doc) => {
const data = doc.data();
console.log('Document Data:', data);
console.log(notificationDot.style.display)

// Ensure isApprove exists and is true for the notification to show
if (data.isApprove !== null && data.isApprove) {
hasNewNotifications = true;

let redirectLink = '#';
if (data.action.includes('Added word in Lesson')) {
  redirectLink = 'lesson.html';
} else if (data.action.includes('Added word in Category')) {
  redirectLink = 'category.html';
}

notifications.push(`
  <p>
    <a href="${redirectLink}" class="notification-link">
      <strong>Action:</strong> ${data.action} <br>
      <strong>Added By:</strong> ${data.addedBy} <br>
      <strong>Status:</strong> ${data.isApprove ? 'Accepted' : 'Pending'} <br>
    </a>
  </p>
  <hr>
`);
}
});

// Sort notifications by timestamp (if timestamps are available)
notifications.sort((a, b) => b.timestamp - a.timestamp);

// Update the notification dropdown content
const dropdownContent = notifications.length
? notifications.join('')
: '<p>No new notifications</p>';
notificationDropdown.innerHTML = dropdownContent;

// Show red dot if there are new notifications and they haven't been seen
const notificationsSeen = localStorage.getItem('notificationsSeen') === 'true';
if (hasNewNotifications && !notificationsSeen) {
notificationDot.style.display = 'block'; // Show the red dot
}
});
}

function checkUnseenNotifications() {
const isSeen = localStorage.getItem('notificationsSeen') === 'true';
notificationDot.style.display = isSeen ? 'none' : 'block'; // Show or hide based on localStorage
}






async function logDeletion(type, word, translation, options, contextId) {
const user = auth.currentUser; // Get the current user
const currentUserEmail = user.email; // Get the email of the user making the change

const activityData = {
action: `Deleted word from ${type.charAt(0).toUpperCase() + type.slice(1)}`, // e.g., "Deleted word from Lesson"
addedBy: currentUserEmail,
exactLocation: `${type}s/${contextId}/words/${word}`, // e.g., "lessons/Aralin 1/words/try"
location: type, // "lesson" or "category"
contextId: contextId, // ID of the lesson or category
oldWord: word,
translation: translation,
options: options || [], // Include options if relevant
timestamp: serverTimestamp(), // Timestamp for when the action occurred
};

await addDoc(activitiesRef, activityData);
alert(`${type.charAt(0).toUpperCase() + type.slice(1)} word deleted successfully.`);
}

// Deletion event listener for lessons
document.querySelector("#deleteLessonWordBtn").addEventListener("click", async () => {
const lessonId = "lessonId"; // Replace with actual lesson ID
const word = "word"; // Replace with actual word
const translation = "translation"; // Replace with actual translation
const options = []; // Add options if relevant
await logDeletion("lesson", word, translation, options, lessonId);
});

// Deletion event listener for categories
document.querySelector("#deleteCategoryWordBtn").addEventListener("click", async () => {
const categoryId = "categoryId"; // Replace with actual category ID
const word = "word"; // Replace with actual word
const translation = "translation"; // Replace with actual translation
const options = []; // Add options if relevant
await logDeletion("category", word, translation, options, categoryId);
});

async function updateWordInLesson(lessonId, oldWord, updatedWord, options) {
const user = auth.currentUser; // Get the current user
const currentUserEmail = user.email; // Get the email of the user making the change

// Assume you have the reference to the lesson document
const lessonRef = doc(firestore, 'lessons', lessonId);

try {
// Perform the update
await updateDoc(lessonRef, {
    // your update fields here, e.g., words: updatedWord
});

// Prepare the log data
const logData = {
    action: 'Edited word in Lesson',
    addedBy: currentUserEmail,
    exactLocation: `lessons/${lessonId}/words/${oldWord}`, // Adjust to the correct path
    location: 'lesson', // Location type
    lessonId: lessonId,
    newWord: updatedWord,
    oldWord: oldWord,
    options: options || [], // Include options
    timestamp: serverTimestamp() // Will be added when logging to Firestore
};

// Log the activity to Firestore
await addDoc(activitiesRef, logData);

// Optionally, show a success message to the user
alert('Word updated successfully.');

} catch (error) {
console.error('Error updating word:', error);
alert('Error updating word. Please try again.');
}
}