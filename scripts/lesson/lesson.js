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
document.getElementById("lessonSelect").disabled = false; // Enables the select dropdown

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
          <td contenteditable="false">${wordData.translated || 'N/A'}</td>
          <td>
              <ul>
                  ${wordData.options.map(option => `<li contenteditable="false">${option}</li>`).join('')}
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
  event.preventDefault(); // Prevent default anchor behavior
  event.stopPropagation(); // Prevent event bubbling

  const editButton = event.target.closest('.edit');
  if (!editButton || editButton.disabled) return; // Prevent multiple clicks

  editButton.disabled = true; // Disable button to prevent spam

  const row = editButton.closest('tr');
  const wordCell = row.querySelector('td:nth-child(2)');
  const translatedCell = row.querySelector('td:nth-child(3)');
  const optionCells = row.querySelectorAll('ul li');
  const editIcon = editButton.querySelector('i');

  const docId = editButton.getAttribute('data-id'); // Firestore document ID
  const lessonId = document.getElementById('lessonSelect').value;

  const isEditing = wordCell.getAttribute("contenteditable") === "true";

  if (isEditing) {
      // Save the edited values
      const updatedWord = wordCell.innerText.trim();
      const updatedTranslation = translatedCell.innerText.trim();
      const updatedOptions = Array.from(optionCells).map(option => option.innerText.trim());

      // Get original values
      const originalWord = wordCell.dataset.originalWord || wordCell.innerText.trim();
      const originalTranslation = translatedCell.dataset.originalTranslation || translatedCell.innerText.trim();
      const originalOptions = Array.from(optionCells).map(option => option.dataset.originalOption || option.innerText.trim());

      // Restrict numeric input
      if (/\d/.test(updatedWord) || /\d/.test(updatedTranslation) || updatedOptions.some(option => /\d/.test(option))) {
          alert("Numbers are not allowed. Please enter only letters.");
          editButton.disabled = false; // Re-enable button
          return;
      }

      // Prevent approval if nothing changed
      if (
          updatedWord === originalWord &&
          updatedTranslation === originalTranslation &&
          JSON.stringify(updatedOptions) === JSON.stringify(originalOptions)
      ) {
          alert("No changes detected. Please modify the content before submitting.");
          editButton.disabled = false; // Re-enable button
          return;
      }

      console.log({ updatedWord, updatedTranslation, updatedOptions, docId });

      try {
          const lessonDoc = await getDoc(doc(firestore, 'lessons', lessonId));
          if (!lessonDoc.exists()) {
              throw new Error("Lesson not found");
          }

          const lessonData = lessonDoc.data();
          const lessonName = lessonData.lesson_name;
          const lessonNumber = lessonData.lesson_id;

          const activityData = {
              action: 'Edited word in Lesson',
              addedBy: currentUserEmail,
              lesson_id: lessonNumber,  
              location: 'lesson',
              wordId: docId,
              oldWord: originalWord,
              word: updatedWord,
              newWord: updatedWord,
              exactLocation: `lessons/${lessonNumber}/words/${docId}`,
              lesson_name: lessonName,
              options: updatedOptions,
              translated: updatedTranslation,
              timestamp: serverTimestamp(),
              read: false,
              isApprove: false, 
              dismissed: false
          };
          console.log("Final activity data being sent:", activityData);

          await Promise.all([
              setDoc(doc(collection(firestore, 'activities')), activityData),
              setDoc(doc(collection(firestore, 'lesson_activities')), activityData)
          ]);

          alert('Edit request has been submitted for admin approval.');
      } catch (error) {
          console.error('Error updating document:', error);
          alert('Error submitting edit request. Please try again.');
      }

      // Disable editing after saving
      wordCell.setAttribute("contenteditable", "false");
      translatedCell.setAttribute("contenteditable", "false");
      optionCells.forEach(option => option.setAttribute("contenteditable", "false"));

      // Ensure fields lose focus to prevent lingering editability
      wordCell.blur();
      translatedCell.blur();
      optionCells.forEach(option => option.blur());
  } else {
      // Store original values before enabling editing
      wordCell.dataset.originalWord = wordCell.innerText.trim();
      translatedCell.dataset.originalTranslation = translatedCell.innerText.trim();
      optionCells.forEach(option => option.dataset.originalOption = option.innerText.trim());

      // Enable editing only when clicking the edit icon
      wordCell.setAttribute("contenteditable", "true");
      translatedCell.setAttribute("contenteditable", "true");
      optionCells.forEach(option => option.setAttribute("contenteditable", "true"));

      wordCell.focus(); // Auto-focus the first field for better UX
  }

  // Toggle the edit icon
  editIcon.classList.toggle('bxs-pencil', isEditing);
  editIcon.classList.toggle('bxs-check-circle', !isEditing);

  // Re-enable button after 3 seconds
  setTimeout(() => {
      editButton.disabled = false;
  }, 3000);
}



async function handleDelete(event) {
  event.preventDefault(); // Prevents default link behavior
  event.stopPropagation(); // Stops bubbling

  const row = event.target.closest('tr');
  const wordCell = row.querySelector('td:nth-child(2)');
  const translatedCell = row.querySelector('td:nth-child(3)');
  const docId = row.querySelector('.delete')?.getAttribute('data-id'); // Ensure delete button has 'data-id'
  const lessonId = document.getElementById('lessonSelect').value;

  if (!lessonId || !docId) {
      alert("❌ Error: Missing lesson ID or document ID.");
      return;
  }

  if (confirm('Are you sure you want to delete this word? This action will require admin approval.')) {
      try {
          const word = wordCell ? wordCell.dataset.originalWord : null;
          const translated = translatedCell ? translatedCell.innerText.trim() : '';

          if (!word) {
              alert('❌ Error: Word data not found.');
              return;
          }

          // Fetch lesson details
          const lessonDocRef = doc(firestore, 'lessons', lessonId);
          const lessonDoc = await getDoc(lessonDocRef);
          if (!lessonDoc.exists()) {
              throw new Error("❌ Lesson not found");
          }

          const lessonData = lessonDoc.data();
          const lessonName = lessonData.lesson_name || "Unknown Lesson"; // Default value
          const lessonNumber = lessonData.lesson_id || lessonId; // Ensure we have an ID

          // Fetch the word document to get additional details
          const wordDocRef = doc(firestore, 'lessons', lessonId, 'words', docId);
          const wordDoc = await getDoc(wordDocRef);
          let wordOptions = [];

          if (wordDoc.exists()) {
              wordOptions = wordDoc.data().options || []; // Ensure `options` is an array
          }

          // ✅ Correct exactLocation using document IDs
          const exactLocation = `/lessons/${lessonId}/words/${docId}`;

          // Construct activity log data
          const activityData = {
              action: 'Deleted word from Lesson',
              addedBy: currentUserEmail,
              timestamp: serverTimestamp(),
              location: 'lesson',
              read: false,
              delete: false,
              word: word,
              translated: translated,
              lesson_id: lessonNumber,
              isApprove: false, // Mark as pending approval
              exactLocation: exactLocation, // ✅ Stores correct path with IDs
              lesson_name: lessonName,
              options: wordOptions // Stores as an array
          };

          // Log deletion request in `activities` and `lesson_activities`
          await Promise.all([
              addDoc(collection(firestore, 'activities'), activityData),
              addDoc(collection(firestore, 'lesson_activities'), activityData)
          ]);

          alert('✅ Deletion request submitted successfully. Waiting for admin approval.');
          fetchWords(lessonId); // Refresh the word list
      } catch (error) {
          console.error('❌ Error deleting word:', error);
          alert('⚠️ Error submitting deletion request. Please try again.');
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
  