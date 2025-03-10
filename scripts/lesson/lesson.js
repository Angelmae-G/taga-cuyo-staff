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
    const docId = event.target.closest('.edit').getAttribute('data-id'); // Firestore document ID of the word
    const lessonId = document.getElementById('lessonSelect').value;

    if (isEditing) {
        // Collect updated values
        const updatedWord = wordCell.innerText.trim();
        const updatedTranslation = translatedCell.innerText.trim();
        const updatedOptions = Array.from(optionCells).map(option => option.innerText.trim());

        console.log({ updatedWord, updatedTranslation, updatedOptions, docId });

        try {
            // Fetch lesson details (ID and Name)
            const lessonDoc = await getDoc(doc(firestore, 'lessons', lessonId));
            if (!lessonDoc.exists()) {
                throw new Error("Lesson not found");
            }

            const lessonData = lessonDoc.data();
            const lessonName = lessonData.lesson_name; // Lesson name
            const lessonNumber = lessonData.lesson_id; // Lesson ID (number)

            // Construct activity log data including the document ID
            const activityData = {
                action: 'Edited word in Lesson',
                addedBy: currentUserEmail,
                lesson_id: lessonNumber,  
                location: 'lesson',
                wordId: docId, // Store the document ID of the edited word
                oldWord: wordCell.dataset.originalWord,
                word: updatedWord,
                newWord: updatedWord,
                exactLocation: `lessons/${lessonName}/words/${updatedWord || wordCell.dataset.originalWord}`,
                lesson_name: lessonName,
                options: updatedOptions,
                translated: updatedTranslation,
                timestamp: serverTimestamp(),
                isApprove: false,  // Now pending approval
            };
            console.log("Final activity data being sent:", activityData);


            // Save edit request instead of updating directly
            await Promise.all([
                setDoc(doc(collection(firestore, 'activities')), activityData),
                setDoc(doc(collection(firestore, 'lesson_activities')), activityData)
            ]);

            alert('Edit request has been submitted for admin approval.');
        } catch (error) {
            console.error('Error updating document:', error);
            alert('Error submitting edit request. Please try again.');
        }
    } else {
        // Enable editing
        wordCell.contentEditable = 'true';
        translatedCell.contentEditable = 'true';
        optionCells.forEach(option => option.contentEditable = 'true');
        editIcon.classList.replace('bxs-pencil', 'bxs-check-circle'); 
    }

    // Toggle edit mode
    wordCell.contentEditable = !isEditing;
    translatedCell.contentEditable = !isEditing;
    optionCells.forEach(option => option.contentEditable = !isEditing);
    editIcon.classList.toggle('bxs-pencil', isEditing);
    editIcon.classList.toggle('bxs-check-circle', !isEditing);
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

            // Fetch the word document to get options
            const wordDoc = await getDoc(doc(firestore, 'lessons', lessonId, 'words', docId));
            let wordOptions = []; // Default empty array if no options found

            if (wordDoc.exists()) {
                wordOptions = wordDoc.data().options || []; // Assuming options is an array stored in the word document
            }

            // Construct activity log data
            const activityData = {
                action: 'Deleted word from Lesson',
                addedBy: currentUserEmail,
                timestamp: serverTimestamp(),
                location: 'lesson',
                word: word,
                translated: translated,  
                lesson_id: lessonNumber, // Store lesson_id
                isApprove: false, // Mark as pending approval
                exactLocation: `lessons/${lessonName}/words/${word}`, // Use lesson_name instead of lessonId
                lesson_name: lessonName, // Store lesson name instead of lesson_id
                options: wordOptions // Include options as an array of strings
            };

            // Log deletion request in both `activities` and `lesson_activities`
            await Promise.all([
                addDoc(collection(firestore, 'activities'), activityData),
                addDoc(collection(firestore, 'lesson_activities'), activityData)
            ]);

            alert('Deletion request submitted successfully. Waiting for admin approval.');
            fetchWords(lessonId); // Refresh the word list
        } catch (error) {
            console.error('Error deleting word:', error);
            alert('Error submitting deletion request. Please try again.');
        }
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const notificationDot = document.getElementById('notificationDot');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationWrapper = document.getElementById('notificationWrapper');
  
    if (!notificationDot || !notificationDropdown || !notificationWrapper) {
      console.error('Notification elements are missing!');
      return;
    }
  
    // **Check unseen notifications on page load**
    checkUnseenNotifications();
  
    // **Listen for notifications**
    listenForNotifications();
  
    // **Handle dropdown click to mark notifications as seen**
    notificationWrapper.addEventListener('click', () => {
      notificationDropdown.classList.toggle('active');
  
      if (notificationDot.style.display === 'block') {
        notificationDot.style.display = 'none'; // Hide red dot
        markNotificationsAsSeen(); // Mark as seen
      }
    });
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
  
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
  
        // **Only show approved notifications that haven't been seen**
        if (data.isApprove && !data.isSeen) {
          hasNewNotifications = true;
  
          notifications.push(`
            <p data-id="${docId}" class="notification-item">
              <span class="notification-link">
                <strong>Action:</strong> ${data.action} <br>
                <strong>Added By:</strong> ${data.addedBy} <br>
                <strong>Status:</strong> Approved <br>
              </span>
            </p>
            <hr>
          `);
        }
      });
  
      // **Update UI**
      if (notifications.length > 0) {
        notificationDot.style.display = 'block'; // Show red dot
        notificationDropdown.innerHTML = notifications.join('');
      } else {
        notificationDot.style.display = 'none'; // Hide red dot
        notificationDropdown.innerHTML = '<p>No new notifications</p>';
      }
  
      // **Click event to mark as seen and remove**
      document.querySelectorAll('.notification-item').forEach((item) => {
        item.addEventListener('click', async (event) => {
          const notificationId = event.currentTarget.dataset.id;
  
          // Remove from UI
          event.currentTarget.remove();
  
          // If no more notifications, hide the red dot
          if (document.querySelectorAll('.notification-item').length === 0) {
            notificationDot.style.display = 'none';
            notificationDropdown.innerHTML = '<p>No new notifications</p>';
          }
  
          // **Update Firestore to mark notification as seen**
          const notificationRef = doc(db, 'activities', notificationId);
          await updateDoc(notificationRef, { isSeen: true });
        });
      });
    });
  }
  
  // **Check notification state when the page loads**
  function checkUnseenNotifications() {
    const isSeen = localStorage.getItem('notificationsSeen') === 'true';
    if (isSeen) {
      notificationDot.style.display = 'none'; // Ensure red dot stays hidden if already seen
    }
  }
  