// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js"; 
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

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
const firestore = getFirestore(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId;
let currentUserEmail;
let isLoggingOut = false;

document.getElementById('logoutButton').addEventListener('click', async (event) => {
    event.preventDefault();
    isLoggingOut = true;
    try {
        await signOut(auth);
        alert('You have been logged out successfully.');
        window.location.href = "staff_login.html";
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
});

onAuthStateChanged(auth, async (user) => {
    const loginMessage = document.getElementById('loginMessage');
    const dashboardContent = document.getElementById('dashboardContent');

    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        loginMessage.style.display = 'none';
        dashboardContent.style.display = 'block';
        await loadLessons();
    } else if (!isLoggingOut) {
        loginMessage.style.display = 'block';
        dashboardContent.style.display = 'none';
    }
});

async function loadLessons() {
    const lessonSelect = document.getElementById('lessonSelect');
    const lessonsRef = collection(firestore, 'lessons');
    const snapshot = await getDocs(lessonsRef);

    snapshot.forEach(doc => {
const lessonData = doc.data();
const lessonOption = document.createElement("option");
lessonOption.value = doc.id; // Keep the document ID as value
lessonOption.text = lessonData.lesson_name || 'Unnamed Lesson'; // Use the 'lessonName' field as the text
lessonSelect.appendChild(lessonOption);
});
}

window.fetchWords = async function (lessonId) {
    const wordsTableBody = document.getElementById('wordsTableBody');
    wordsTableBody.innerHTML = '';

    if (!lessonId) return;

    const wordsRef = collection(firestore, 'lessons', lessonId, 'words');
    const snapshot = await getDocs(wordsRef);

    let rowNumber = 1;
    snapshot.forEach(doc => {
        const wordData = doc.data();
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${rowNumber++}</td>
            <td contenteditable="false" data-original-word="${wordData.word || 'N/A'}">${wordData.word || 'N/A'}</td>
            <td contenteditable="true">${wordData.translated || 'N/A'}</td>
            <td>
                <ul>
                    ${wordData.options.map(option => `<li contenteditable="true">${option}</li>`).join('')}
                </ul>
            </td>
            <td class="action">
                <a href="#" class="edit" data-id="${doc.id}"><i class='bx bxs-pencil'></i></a> |
                <a href="#" class="delete" data-id="${doc.id}"><i class='bx bxs-trash'></i></a>
            </td>
        `;

        wordsTableBody.appendChild(row);
    });

    document.querySelectorAll('.edit').forEach(editBtn => editBtn.addEventListener('click', handleEdit));
    document.querySelectorAll('.delete').forEach(deleteBtn => deleteBtn.addEventListener('click', handleDelete));
};


async function handleEdit(event) {
const row = event.target.closest('tr');
const wordCell = row.querySelector('td:nth-child(2)');
const translatedCell = row.querySelector('td:nth-child(3)');
const optionCells = row.querySelectorAll('ul li');
const editIcon = event.target.closest('.edit')?.querySelector('i');

if (!editIcon) {
console.error("Edit icon not found.");
return; 
}

const isEditing = wordCell.contentEditable === 'true';
const docId = event.target.closest('.edit').getAttribute('data-id');
const lessonId = document.getElementById('lessonSelect').value;

if (isEditing) {
const updatedWord = wordCell.innerText.trim();
const updatedTranslation = translatedCell.innerText.trim();
const updatedOptions = Array.from(optionCells).map(option => option.innerText.trim());

console.log({ updatedWord, updatedTranslation, updatedOptions });

try {
    // Fetch lesson details (both ID and Name)
    const lessonDoc = await getDoc(doc(firestore, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
        throw new Error("Lesson not found");
    }

    const lessonData = lessonDoc.data();
    const lessonName = lessonData.lesson_name; // Fetch lesson name
    const lessonNumber = lessonData.lesson_id; // Fetch lesson number

    // Log the edit to activities collection with lesson_id and lesson_name
    await logActivity(
        'Edited word in Lesson',
        currentUserEmail,
        lessonNumber,   // lesson_id (number)
        lessonName,     // lesson_name (string)
        wordCell.dataset.originalWord,
        updatedWord,
        updatedOptions,
        updatedTranslation,
        'lessons',
        true
    );

    // Update Firestore with the new word, translation, and options
    await updateDoc(doc(firestore, 'lessons', lessonId, 'words', docId), {
        word: updatedWord,
        translated: updatedTranslation,
        options: updatedOptions
    });

    alert('Word edited successfully.');
} catch (error) {
    console.error('Error updating document:', error);
    alert('Error updating word. Please try again.');
}
} else {
wordCell.contentEditable = 'true';
translatedCell.contentEditable = 'true';
optionCells.forEach(option => option.contentEditable = 'true');
editIcon.classList.replace('bxs-pencil', 'bxs-check-circle'); 
}

wordCell.contentEditable = !isEditing;
translatedCell.contentEditable = !isEditing;0-[]
optionCells.forEach(option => option.contentEditable = !isEditing);
editIcon.classList.toggle('bxs-pencil', isEditing);
editIcon.classList.toggle('bxs-check-circle', !isEditing);
}

// Log activity with lesson_id and lesson_name
async function logActivity(action, addedBy, lesson_id, lesson_name, oldWord, word, options, translated, type, isApprove = true) {
const activityRef = doc(collection(firestore, 'activities')); // Use auto-generated IDs
await setDoc(activityRef, {
action: action,
addedBy: addedBy,
lesson_id: lesson_id, // Use lesson_id (number)
oldWord: oldWord || null,
word: word || null,
exactLocation: `${type}/${lesson_name}/words/${word || oldWord}`, // Use lesson_name instead of ID
lesson_name: lesson_name, // Set location to lesson_name
options: options || null,
translated: translated || null,
timestamp: serverTimestamp(),
isApprove: isApprove  // Set isApprove to true by default
});
}




async function handleDelete(event) {
const row = event.target.closest('tr');
const wordCell = row.querySelector('td:nth-child(2)');
const translatedCell = row.querySelector('td:nth-child(3)');
const docId = row.querySelector('.delete')?.getAttribute('data-id'); // Ensure delete button has 'data-id'
const lessonId = document.getElementById('lessonSelect').value;

if (confirm('Are you sure you want to delete this word? This action will require admin approval.')) {
try {
    const word = wordCell ? wordCell.dataset.originalWord : null; // Ensure word is retrieved correctly
    const translated = translatedCell ? translatedCell.innerText.trim() : ''; // Retrieve translated word

    if (!word) {
        alert('Word data not found.');
        return;
    }

    // Fetch lesson details
    const lessonDoc = await getDoc(doc(firestore, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
        throw new Error("Lesson not found");
    }

    const lessonData = lessonDoc.data();
    const lessonName = lessonData.lesson_name; // Fetch lesson name
    const lessonNumber = lessonData.lesson_id; // Fetch lesson ID

    // Assume options are an array stored in the word document (example structure)
    const wordDoc = await getDoc(doc(firestore, 'lessons', lessonId, 'words', word)); // Adjust path if necessary
    let wordOptions = []; // Default empty array if no options found

    if (wordDoc.exists()) {
        wordOptions = wordDoc.data().options || []; // Assuming options is an array stored in the word document
    }

    // Log the deletion in the 'activities' collection with isApprove: false (pending approval)
    await addDoc(collection(firestore, 'activities'), {
        action: 'Deleted word from Lesson',
        addedBy: currentUserEmail,
        timestamp: serverTimestamp(),
        word: word,
        translated: translated,  // Add the translated field
        lesson_id: lessonNumber, // Store lesson_id
        isApprove: false, // Mark as pending approval
        exactLocation: `lessons/${lessonName}/words/${word}`, // Use lesson_name instead of lessonId
        lesson_name: lessonName, // Store lesson name instead of lesson_id
        options: wordOptions // Include options as an array of strings
    });

    alert('Deletion request submitted successfully. Waiting for admin approval.');
    fetchWords(lessonId); // Refresh the word list
} catch (error) {
    console.error('Error deleting word:', error);
    alert('Error submitting deletion request. Please try again.');
}
}
}


function listenForNotifications() {
const activitiesRef = collection(db, 'activities');

onSnapshot(activitiesRef, (snapshot) => {
const notifications = [];
let hasNewNotifications = false;

snapshot.forEach((doc) => {
const data = doc.data();

// Check if the activity is approved, rejected, or pending
if (data.isApprove !== null) {
hasNewNotifications = true;

// Determine the redirection link based on the action and type
let redirectLink = '#'; // Default fallback link
if (data.isApprove) {
  if (data.action.includes('Added word in Lesson')) {
    redirectLink = 'lesson.html'; // Replace with your lesson page URL
  } else if (data.action.includes('Added word in Category')) {
    redirectLink = 'category.html'; // Replace with your category page URL
  }
} else {
  // Pending actions go to the status page
  redirectLink = 'status.html'; // Replace with your status page URL
}

// Add notification with a clickable link
notifications.push({
  content: `
    <p>
      <a href="${redirectLink}" class="notification-link">
        <strong>Action:</strong> ${data.action} <br>
        <strong>Added By:</strong> ${data.addedBy} <br>
        <strong>Status:</strong> ${data.isApprove ? 'Accepted' : 'Pending'} <br>
      </a>
    </p>
    <hr>
  `,
  timestamp: data.timestamp, // Use this field for sorting
});
}
});

// Sort notifications by timestamp (newest first)
notifications.sort((a, b) => b.timestamp - a.timestamp);

// Update the UI based on whether the user has already seen notifications
const notificationsSeen = localStorage.getItem('notificationsSeen') === 'true';

if (hasNewNotifications && !notificationsSeen) {
notificationDot.style.display = 'block'; // Show red dot
notificationDropdown.innerHTML = notifications.map((n) => n.content).join('');
} else {
notificationDot.style.display = 'none'; // Hide red dot
notificationDropdown.innerHTML = hasNewNotifications
? notifications.map((n) => n.content).join('')
: '<p>No new notifications</p>';
}
});
}

// Mark notifications as seen when the dropdown is clicked
notificationWrapper.addEventListener('click', () => {
notificationDropdown.classList.toggle('active');

// Hide the red dot and mark notifications as seen in localStorage
notificationDot.style.display = 'none';
localStorage.setItem('notificationsSeen', 'true');
});

// Check the state of notifications when the page loads
if (localStorage.getItem('notificationsSeen') === 'true') {
notificationDot.style.display = 'none'; // Ensure the red dot is hidden
}

// Start listening for notifications
listenForNotifications();